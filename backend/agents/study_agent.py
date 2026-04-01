from __future__ import annotations
import os
import chromadb
from openai import AsyncOpenAI
from utils.chunker import parse_file, chunk_text

oai = AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])
_chroma = chromadb.Client()


class StudyAgent:
    def __init__(self, session_id: str):
        self.session_id = session_id
        try:
            self.col = _chroma.get_or_create_collection(f"notes_{session_id}")
        except Exception as e:
            print(f"[Study] collection init failed: {e}")
            self.col = None

    async def _embed(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []

        embeddings: list[list[float]] = []
        for i in range(0, len(texts), 100):
            batch = texts[i: i + 100]
            try:
                resp = await oai.embeddings.create(
                    model="text-embedding-3-small", input=batch
                )
            except Exception as e:
                print(f"[Study] embedding failed: {e}")
                return []
            embeddings.extend([item.embedding for item in resp.data])
        return embeddings

    async def ingest(self, file_bytes: bytes, filename: str) -> dict:
        text = parse_file(file_bytes, filename)
        chunks = chunk_text(text)
        if not chunks:
            return {"chunks_ingested": 0}

        all_embeddings = await self._embed(chunks)
        if not all_embeddings or self.col is None:
            return {"chunks_ingested": 0}

        ids = [f"{filename}_{i}" for i in range(len(chunks))]
        try:
            self.col.add(documents=chunks, embeddings=all_embeddings, ids=ids)
        except Exception as e:
            print(f"[Study] add failed: {e}")
            return {"chunks_ingested": 0}
        return {"chunks_ingested": len(chunks)}

    async def link_to_graph(self, graph_store) -> int:
        """
        For every graph node, query ChromaDB for matching note chunks.
        If similarity threshold met, mark node.has_user_notes = True.
        Returns count of nodes linked.
        """
        linked = 0
        node_items = [
            (nid, data["label"])
            for nid, data in graph_store.G.nodes(data=True)
        ]
        if not node_items or self.col is None:
            return 0

        labels = [label for _, label in node_items]
        embeddings = await self._embed(labels)
        if not embeddings:
            return 0

        for (node_id, _), emb in zip(node_items, embeddings):
            try:
                results = self.col.query(query_embeddings=[emb], n_results=2)
                distances = results["distances"][0]
                if distances and distances[0] < 0.4:  # cosine distance threshold
                    graph_store.G.nodes[node_id]["has_user_notes"] = True
                    linked += 1
            except Exception as e:
                print(f"[Study] query failed: {e}")

        return linked

    async def ask(self, question: str) -> dict:
        question_embeddings = await self._embed([question])
        if not question_embeddings or self.col is None:
            return {"answer": "No notes found.", "source_chunks": []}

        try:
            results = self.col.query(query_embeddings=[question_embeddings[0]], n_results=5)
            chunks = results["documents"][0]
        except Exception as e:
            print(f"[Study] query failed: {e}")
            return {"answer": "No notes found.", "source_chunks": []}

        context = "\n\n".join(chunks)
        try:
            resp = await oai.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "system",
                        "content": "Answer the question using ONLY the provided notes. "
                                   "Be concise. If not in the notes, say so.",
                    },
                    {
                        "role": "user",
                        "content": f"Notes:\n{context}\n\nQuestion: {question}",
                    },
                ],
                max_tokens=400,
            )
        except Exception as e:
            print(f"[Study] answer generation failed: {e}")
            return {"answer": "No notes found.", "source_chunks": chunks}

        return {
            "answer": resp.choices[0].message.content,
            "source_chunks": chunks,
        }
