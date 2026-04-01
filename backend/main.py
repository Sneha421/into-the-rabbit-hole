from __future__ import annotations
import asyncio
import uuid
import os
import json
import math
import enum
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from orchestrator import RabbitHoleOrchestrator, SESSIONS
from agents.ranker_agent import RankerAgent
from agents.study_agent import StudyAgent
from models.api_models import DiscoverRequest, ExpandRequest, StudyAskRequest, DeepenRequest

app = FastAPI(title="Rabbit Hole API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Active WebSocket connections
WS: dict[str, WebSocket] = {}
SESSION_STATUS: dict[str, str] = {}


def _safe_json(payload: dict) -> str:
    """Serialize payload, converting numpy/non-standard floats to Python primitives."""
    def default(obj):
        # numpy scalar types and any float-like
        try:
            f = float(obj)
            if math.isfinite(f):
                return f
            return None
        except (TypeError, ValueError):
            pass
        # Enums -> their value
        if isinstance(obj, enum.Enum):
            return obj.value
        try:
            return int(obj)
        except (TypeError, ValueError):
            pass
        raise TypeError(f"Object of type {type(obj)} is not JSON serializable")
    return json.dumps(payload, default=default)


async def broadcast(session_id: str, payload: dict) -> None:
    if payload.get("type") == "status":
        message = payload.get("message")
        if isinstance(message, str):
            SESSION_STATUS[session_id] = message

    ws = WS.get(session_id)
    if ws:
        try:
            await ws.send_text(_safe_json(payload))
        except Exception as exc:
            print(f"[broadcast:{session_id}] send failed: {exc}")
            WS.pop(session_id, None)


@app.websocket("/ws/{session_id}")
async def ws_endpoint(ws: WebSocket, session_id: str):
    await ws.accept()
    WS[session_id] = ws

    graph = SESSIONS.get(session_id)
    if graph:
        try:
            await ws.send_text(_safe_json({"type": "graph_full", **graph.to_json()}))
        except Exception as exc:
            print(f"[ws:{session_id}] initial graph_full send failed: {exc}")
            WS.pop(session_id, None)
            await ws.close()
            return

    status = SESSION_STATUS.get(session_id)
    if status:
        try:
            await ws.send_text(_safe_json({"type": "status", "message": status}))
        except Exception as exc:
            print(f"[ws:{session_id}] initial status send failed: {exc}")
            WS.pop(session_id, None)
            await ws.close()
            return

    try:
        while True:
            await ws.receive_text()  # keep-alive ping
    except WebSocketDisconnect:
        WS.pop(session_id, None)


@app.post("/api/discover")
async def discover(req: DiscoverRequest):
    session_id = str(uuid.uuid4())
    print(f"[API] /api/discover topic={req.topic!r} max_depth={req.max_depth} session_id={session_id}")

    async def _bcast(payload: dict):
        await broadcast(session_id, payload)

    orch = RabbitHoleOrchestrator(session_id, _bcast)
    SESSION_STATUS[session_id] = "Opening rabbit hole..."
    task = asyncio.create_task(orch.start(req.topic, req.max_depth))
    task.add_done_callback(
        lambda finished: print(
            f"[discover:{session_id}] background task failed: {finished.exception()}"
        )
        if finished.exception()
        else None
    )
    return {"session_id": session_id}


@app.post("/api/session/new")
async def create_new_session():
    session_id = str(uuid.uuid4())
    print(f"[API] /api/session/new session_id={session_id}")

    async def _bcast(payload: dict):
        await broadcast(session_id, payload)

    orch = RabbitHoleOrchestrator(session_id, _bcast)
    SESSION_STATUS[session_id] = "Ready for study notes."
    return {"session_id": session_id}



@app.post("/api/expand/{node_id}")
async def expand_node(node_id: str, req: ExpandRequest):
    print(f"[API] /api/expand node_id={node_id} session_id={req.session_id}")
    graph = SESSIONS.get(req.session_id)
    if not graph:
        return {"error": "session not found"}

    async def _bcast(payload: dict):
        await broadcast(req.session_id, payload)

    orch = RabbitHoleOrchestrator.__new__(RabbitHoleOrchestrator)
    orch.session_id = req.session_id
    orch.broadcast = _bcast
    orch.graph = graph
    from agents.scout_agent import ScoutAgent
    from agents.analyst_agent import AnalystAgent
    orch.scout = ScoutAgent()
    orch.analyst = AnalystAgent()
    orch.ranker = RankerAgent()
    task = asyncio.create_task(orch.expand_node(node_id))
    task.add_done_callback(
        lambda finished: print(
            f"[expand:{req.session_id}:{node_id}] background task failed: {finished.exception()}"
        )
        if finished.exception()
        else None
    )
    return {"status": "expanding"}


@app.post("/api/deepen/{session_id}")
async def deepen_graph(session_id: str, req: DeepenRequest):
    print(f"[API] /api/deepen session_id={session_id} target_depth={req.target_depth}")
    graph = SESSIONS.get(session_id)
    if not graph:
        return {"error": "session not found"}

    async def _bcast(payload: dict):
        await broadcast(session_id, payload)

    orch = RabbitHoleOrchestrator.__new__(RabbitHoleOrchestrator)
    orch.session_id = session_id
    orch.broadcast = _bcast
    orch.graph = graph
    from agents.scout_agent import ScoutAgent
    from agents.analyst_agent import AnalystAgent
    orch.scout = ScoutAgent()
    orch.analyst = AnalystAgent()
    orch.ranker = RankerAgent()
    
    task = asyncio.create_task(orch.deepen(req.target_depth))
    task.add_done_callback(
        lambda finished: print(
            f"[deepen:{session_id}] background task failed: {finished.exception()}"
        )
        if finished.exception()
        else None
    )
    return {"status": "deepening"}

@app.get("/api/graph/{session_id}")
async def get_graph(session_id: str):
    print(f"[API] /api/graph session_id={session_id}")
    graph = SESSIONS.get(session_id)
    if not graph:
        return {"error": "not found"}
    payload = graph.to_json()
    status = SESSION_STATUS.get(session_id)
    if status:
        payload["status"] = status
    return payload


@app.get("/api/path/{session_id}/{source}/{target}")
async def get_path(session_id: str, source: str, target: str):
    graph = SESSIONS.get(session_id)
    if not graph:
        return {"error": "not found"}
    path = RankerAgent().get_path(graph.G, source, target)
    return {"path": path}


@app.post("/api/study/upload/{session_id}")
async def upload_notes(session_id: str, file: UploadFile = File(...)):
    print(f"[API] /api/study/upload session_id={session_id} filename={file.filename!r}")
    graph = SESSIONS.get(session_id)
    if not graph:
        return {"error": "session not found"}
    study = StudyAgent(session_id)
    content = await file.read()
    result = await study.ingest(content, file.filename or "notes.txt")
    links = await study.link_to_graph(graph)
    return {**result, "nodes_linked": links}


@app.post("/api/study/ask")
async def study_ask(req: StudyAskRequest):
    print(f"[API] /api/study/ask session_id={req.session_id} question={req.question!r}")
    study = StudyAgent(req.session_id)
    return await study.ask(req.question)
