import asyncio
import json
import httpx

async def test():
    async with httpx.AsyncClient(timeout=120) as client:
        # Start discovery
        r1 = await client.post("http://127.0.0.1:8000/api/discover", json={"topic": "David Fincher", "max_depth": 0})
        sess = r1.json().get("session_id")
        print(f"Session: {sess}")
        
        # Poll for completion
        data = {}
        for _ in range(30):
            r2 = await client.get(f"http://127.0.0.1:8000/api/graph/{sess}")
            data = r2.json()
            status = data.get("status", "")
            print(f"Status: {status} | Nodes: {len(data.get('nodes', []))} | Edges: {len(data.get('edges', []))}")
            if status == "Rabbit hole complete. Click any node to go deeper." or "failed" in status.lower() or "not found" in status.lower() or "no rabbit holes" in status.lower():
                break
            await asyncio.sleep(2)
        print(json.dumps(data, indent=2)[:500])

if __name__ == "__main__":
    asyncio.run(test())
