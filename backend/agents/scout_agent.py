from __future__ import annotations
import asyncio
import json
import os
from typing import Any
from openai import AsyncOpenAI
from tinyfish import AsyncTinyFish, BrowserProfile, RunStatus
import urllib

oai = AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])
_TINYFISH_CONCURRENCY = int(os.getenv("TINYFISH_CONCURRENCY", "4"))
_TINYFISH_RUN_SEMAPHORE = asyncio.Semaphore(_TINYFISH_CONCURRENCY)
_SCOUT_QUERY_LIMIT = int(os.getenv("TINYFISH_QUERY_LIMIT", "2"))
_SCOUT_RESULTS_PER_QUERY = int(os.getenv("TINYFISH_RESULTS_PER_QUERY", "3"))
_TINYFISH_TIMEOUT_SECONDS = float(os.getenv("TINYFISH_TIMEOUT_SECONDS", "300"))
_TINYFISH_POLL_INTERVAL_SECONDS = float(os.getenv("TINYFISH_POLL_INTERVAL_SECONDS", "3.0"))

QUERY_GEN_PROMPT = (
    'Given the topic "{topic}", generate exactly {n} web search queries that surface '
    "interesting connected people, works, events, concepts, and places. "
    "Prefer surprising, non-obvious connections over Wikipedia summary facts. "
    'Return ONLY a JSON array of strings, nothing else. Example: ["q1", "q2", "q3"]'
)

SEARCH_GOAL = (
    'You are on a search results page for the query: "{query}". '
    "Find and extract the top 3 organic web results (ignore ads). "
    "For each result return: url (the full href link), title (the link text), snippet (the description). "
    "Return ONLY a JSON array of objects with keys url, title, snippet. No other text."
)

PAGE_GOAL = (
    "Read the main editorial content of this page carefully. "
    "Ignore navigation, ads, footers, and sidebars. "
    "Return ONLY a JSON object with keys: "
    "title (string — the page headline), "
    "summary (string — a 3 to 5 sentence summary of the key ideas, arguments, or facts on this page, written in your own words)."
)


def _parse_json_payload(content: str) -> list[str] | list[dict] | dict:
    text = content.strip()
    
    # Extract json strictly inside the first ``` block if present
    import re
    match = re.search(r"```(?:json)?\s*(.*?)\s*```", text, re.DOTALL | re.IGNORECASE)
    if match:
        text = match.group(1).strip()
    else:
        # Fallback to finding the first { or [ if no markdown is found
        start_bracket = text.find("{")
        start_square = text.find("[")
        if start_bracket != -1 and (start_square == -1 or start_bracket < start_square):
            text = text[start_bracket:]
        elif start_square != -1:
            text = text[start_square:]
            
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        print(f"[Scout] JSON extract failed. Raw preview: {text[:200]}")
        raise e


def _extract_result_items(payload: Any) -> list[dict]:
    items: list[dict] = []

    def walk(value: Any) -> None:
        if isinstance(value, list):
            if value and all(isinstance(item, dict) for item in value):
                for item in value:
                    normalized_url = item.get("url") or item.get("link") or item.get("href")
                    normalized_title = item.get("title") or item.get("name") or item.get("headline") or ""
                    normalized_snippet = (
                        item.get("snippet")
                        or item.get("description")
                        or item.get("summary")
                        or item.get("text")
                        or ""
                    )
                    if normalized_url:
                        items.append(
                            {
                                "url": str(normalized_url),
                                "title": str(normalized_title),
                                "snippet": str(normalized_snippet),
                            }
                        )
                return

            for nested in value:
                walk(nested)
            return

        if isinstance(value, dict):
            direct_url = value.get("url") or value.get("link") or value.get("href")
            if direct_url:
                items.append(
                    {
                        "url": str(direct_url),
                        "title": str(
                            value.get("title") or value.get("name") or value.get("headline") or ""
                        ),
                        "snippet": str(
                            value.get("snippet")
                            or value.get("description")
                            or value.get("summary")
                            or value.get("text")
                            or ""
                        ),
                    }
                )

            for nested in value.values():
                walk(nested)

    walk(payload)

    deduped: list[dict] = []
    seen_urls: set[str] = set()
    for item in items:
        url = item.get("url", "").strip()
        if not url or url in seen_urls:
            continue
        seen_urls.add(url)
        deduped.append(item)
    return deduped


async def _generate_queries(topic: str, n: int = _SCOUT_QUERY_LIMIT) -> list[str]:
    try:
        resp = await oai.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": QUERY_GEN_PROMPT.format(topic=topic, n=n)}],
            temperature=0.85,
            max_tokens=300,
        )
        raw = _parse_json_payload(resp.choices[0].message.content or "[]")
        if isinstance(raw, list):
            return raw[:n]
        return list(raw.values())[0][:n]
    except Exception as e:
        print(f"[Scout] query gen failed: {e}")
        return [topic]


class ScoutAgent:
    def __init__(self):
        self.tf = AsyncTinyFish(api_key=os.environ["TINYFISH_API_KEY"])
        self.last_error = ""

    @staticmethod
    def _parse_run_result(result: Any) -> Any:
        # Unwrap nested 'result' key if present
        if isinstance(result, dict) and "result" in result:
            result = result["result"]
        
        if isinstance(result, str):
            try:
                return _parse_json_payload(result)
            except Exception:
                return {}
        return result

    async def _poll_run(self, run_id: str) -> Any | None:
        elapsed = 0.0
        while elapsed < _TINYFISH_TIMEOUT_SECONDS:
            try:
                run = await self.tf.runs.get(run_id)
            except Exception as e:
                self.last_error = f"Run polling failed: {e}"
                print(f"[Scout] poll error for run '{run_id}': {e}")
                return None

            if run.status == RunStatus.COMPLETED:
                # Add check for result field actually existing
                raw_res = getattr(run, "result", None)
                if raw_res is None:
                    # In some versions it might be in 'data'
                    raw_res = getattr(run, "data", None)
                return self._parse_run_result(raw_res)

            if run.status in (RunStatus.FAILED, RunStatus.CANCELLED):
                error = getattr(run, "error", None)
                print(f"[Scout] run '{run_id}' terminal state: {run.status} (error: {error})")
                return None

            await asyncio.sleep(_TINYFISH_POLL_INTERVAL_SECONDS)
            elapsed += _TINYFISH_POLL_INTERVAL_SECONDS

        print(f"[Scout] run '{run_id}' timed out after {_TINYFISH_TIMEOUT_SECONDS:.0f}s")
        return None

    async def _run_tinyfish(self, url: str, goal: str) -> Any | None:
        last_error: Exception | None = None
        
        # Always use STEALTH for all runs as per SDK instructions to ensure max reliability
        browser_profile = BrowserProfile.STEALTH

        for attempt in range(4):
            try:
                if hasattr(self.tf.agent, "queue"):
                    async with _TINYFISH_RUN_SEMAPHORE:
                        queued = await self.tf.agent.queue(
                            url=url,
                            goal=goal,
                            browser_profile=browser_profile,
                        )
                    run_id = getattr(queued, "run_id", None)
                    if not run_id:
                        self.last_error = "TinyFish queue response did not include a run_id."
                        return None
                    return await self._poll_run(run_id)
                else:
                    # Fallback for library versions without queue
                    async with _TINYFISH_RUN_SEMAPHORE:
                        completed = await self.tf.agent.run(
                            url=url,
                            goal=goal,
                            browser_profile=browser_profile,
                        )
                        return self._parse_run_result(getattr(completed, "result", None))
            except Exception as e:
                last_error = e
                message = str(e)
                if "Too many pending runs" in message or "429" in message:
                    wait_seconds = 5 * (attempt + 1)
                    print(f"[Scout] TinyFish saturated. Retrying in {wait_seconds}s...")
                    await asyncio.sleep(wait_seconds)
                    continue
                
                print(f"[Scout] TinyFish run fatal error for '{url}': {e}")
                return None

        if last_error is not None:
            self.last_error = str(last_error)
        return None

    async def _search_one_query(self, query: str) -> list[dict]:
        # Use DuckDuckGo instead — Google blocks headless browsers aggressively
        encoded = query.replace(' ', '+')
        search_url = f"https://duckduckgo.com/?q={encoded}&ia=web"
        
        # Also update goal to match DDG's result structure
        resp = await self._run_tinyfish(
            url=search_url,
            goal=SEARCH_GOAL.format(query=query)
        )
        if not resp:
            print(f"[Scout] search failed for '{query}'")
            return []

        result = resp
        if not result:
            return []

        extracted = _extract_result_items(result)
        print(
            f"[Scout] extracted {len(extracted)} search result candidate(s) "
            f"for query={query!r}"
        )
        if extracted:
            for item in extracted[:3]:
                print(
                    f"[Scout] candidate title={item.get('title', '')!r} "
                    f"url={item.get('url', '')}"
                )
        return extracted[:5]

    async def _fetch_page(self, url: str, title: str = "") -> dict | None:
        print(f"[Scout] fetching page url={url}")
        resp = await self._run_tinyfish(url=url, goal=PAGE_GOAL)
        if not resp:
            print(f"[Scout] page fetch failed for '{url}'")
            return None

        result = resp
        if not result:
            print(f"[Scout] page fetch returned empty result for '{url}'")
            return None

        def extract_page_data(blob: Any) -> tuple[str, str]:
            if isinstance(blob, dict):
                # Try all common content keys
                c = (
                    blob.get("summary")    
                    or blob.get("content")
                    or blob.get("text")
                    or blob.get("body")
                    or blob.get("article_text")
                    or blob.get("main_content")
                    or blob.get("description")
                )
                t = blob.get("title") or blob.get("headline") or blob.get("name")
                if c and isinstance(c, str) and len(c.strip()) > 10:
                    return str(t or ""), c
                
                # Recursively walk dict values
                for v in blob.values():
                    found_t, found_c = extract_page_data(v)
                    if found_c:
                        return found_t, found_c
            
            elif isinstance(blob, list):
                # Recursively walk list items
                for item in blob:
                    found_t, found_c = extract_page_data(item)
                    if found_c:
                        return found_t, found_c
            return "", ""

        resolved_title, parsed_content = extract_page_data(result)
        
        content = str(parsed_content)[:3000]
        if not content.strip():
            print(f"[Scout] page fetch for '{url}' returned no content. Raw snippet: {str(result)[:500]}")
            return None
        
        if not resolved_title:
            resolved_title = result.get("title", title) if isinstance(result, dict) else title
        print(
            f"[Scout] fetched page title={resolved_title!r} url={url} "
            f"content_chars={len(content)}"
        )
        return {
            "url": url,
            "title": resolved_title,
            "content": content,
        }

    async def _discover_from_query(self, query: str, depth: int) -> list[dict]:
        candidates = (await self._search_one_query(query))[:_SCOUT_RESULTS_PER_QUERY]
        print(f"[Scout] query {query!r} yielded {len(candidates)} candidate(s) for page fetch")
        if not candidates:
            return []

        fetched = await asyncio.gather(
            *[self._fetch_page(candidate["url"], candidate.get("title", "")) for candidate in candidates],
            return_exceptions=True,
        )

        pages: list[dict] = []
        failed_fetches = 0
        for item in fetched:
            if isinstance(item, dict) and item.get("content"):
                item["depth"] = depth
                item["query"] = query
                pages.append(item)
            else:
                failed_fetches += 1

        if not pages:
            self.last_error = (
                f"Search results were extracted for query '{query}', but "
                f"{failed_fetches} article page fetch(es) returned no usable content."
            )
            print(f"[Scout] {self.last_error}")
        return pages

    async def discover_stream(self, topic: str, depth: int = 0, query_limit: int | None = None):
        self.last_error = ""
        limit = query_limit if query_limit is not None else _SCOUT_QUERY_LIMIT
        queries = await _generate_queries(topic, n=limit)
        queries = queries[:limit]
        if not queries:
            self.last_error = f"No queries generated for topic '{topic}'."
            return

        tasks = [
            asyncio.create_task(self._discover_from_query(query, depth))
            for query in queries
        ]

        yielded_pages = 0
        try:
            for task in asyncio.as_completed(tasks):
                try:
                    pages = await task
                except Exception as e:
                    self.last_error = str(e)
                    print(f"[Scout] query batch failed for topic='{topic}': {e}")
                    continue

                if not pages:
                    continue

                yielded_pages += len(pages)
                query = pages[0].get("query", "")
                print(
                    f"[Scout] query {query!r} yielded {len(pages)} page(s) "
                    f"for topic='{topic}'"
                )
                yield pages
        finally:
            for task in tasks:
                if not task.done():
                    task.cancel()

        if yielded_pages == 0 and not self.last_error:
            self.last_error = f"No result URLs extracted for topic '{topic}'."

    async def discover(self, topic: str, depth: int = 0, query_limit: int | None = None) -> list[dict]:
        pages: list[dict] = []
        async for batch in self.discover_stream(topic, depth, query_limit=query_limit):
            pages.extend(batch)

        limit = query_limit if query_limit is not None else _SCOUT_QUERY_LIMIT
        print(
            f"[Scout] discovered {len(pages)} pages for '{topic}' "
            f"using stream mode with up to {limit} querie(s)"
        )
        return pages
