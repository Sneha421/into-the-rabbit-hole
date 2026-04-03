import asyncio
import os
import httpx

API_BASE = os.environ.get("NEXT_PUBLIC_API_URL", "http://127.0.0.1:8000")

async def test():
    async with httpx.AsyncClient(timeout=300) as client:
        r1 = await client.post(f"{API_BASE}/api/discover", json={"topic": "Black Mirror", "max_depth": 0})
        print(f"POST status: {r1.status_code}")
        print(f"POST response: {r1.text}")
        sess = r1.json().get("session_id")
        if not sess: return
        
        while True:
            r2 = await client.get(f"{API_BASE}/api/graph/{sess}")
            data = r2.json()
            status = data.get("status", "")
            print(f"Status: {status} | Nodes: {len(data.get('nodes', []))}", flush=True)
            if "complete" in status.lower() or "failed" in status.lower() or "not found" in status.lower():
                break
            await asyncio.sleep(4)

if __name__ == "__main__":
    asyncio.run(test())
