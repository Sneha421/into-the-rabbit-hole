import asyncio
import os
import json
import sys
from dotenv import load_dotenv
load_dotenv()

# Set current dir as path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from agents.scout_agent import ScoutAgent

async def debug():
    # Make sure API keys are present
    if not os.getenv("TINYFISH_API_KEY"):
        print("ERROR: TINYFISH_API_KEY not set", flush=True)

    scout = ScoutAgent()
    topic = "The Zodiac Killer"
    print(f"--- Debugging Scout for topic: {topic} ---", flush=True)
    
    # Try discovery - increase query_limit to be more reliable
    pages = await scout.discover(topic, depth=0, query_limit=2)
    
    print(f"\n--- Summary ---", flush=True)
    print(f"Total pages: {len(pages)}", flush=True)
    if getattr(scout, "last_error", ""):
        print(f"Last Error: {scout.last_error}", flush=True)
    
    for i, p in enumerate(pages):
        print(f"Page {i+1}: {p.get('title', 'No Title')} ({p.get('url', 'No URL')}) - Content chars: {len(p.get('content', ''))}", flush=True)

if __name__ == "__main__":
    asyncio.run(debug())
