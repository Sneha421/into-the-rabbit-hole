from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


class NodeType(str, Enum):
    PERSON = "person"
    WORK = "work"
    CONCEPT = "concept"
    EVENT = "event"
    PLACE = "place"


class EdgeType(str, Enum):
    INFLUENCED_BY = "influenced_by"
    PART_OF = "part_of"
    CONTEMPORARY_OF = "contemporary_of"
    REFERENCED_IN = "referenced_in"
    LED_TO = "led_to"
    CREATED_BY = "created_by"
    YOUR_NOTES_MENTION = "your_notes_mention"


class Node(BaseModel):
    id: str
    label: str
    node_type: NodeType
    summary: str = ""
    year: Optional[int] = None
    tags: list[str] = Field(default_factory=list)
    depth: int = 0
    pagerank: float = 0.0
    betweenness: float = 0.0
    eigenvector: float = 0.0
    hub_score: float = 0.0
    authority_score: float = 0.0
    rabbit_hole_score: float = 0.0
    cluster_id: int = 0
    is_seed: bool = False
    source_url: Optional[str] = None
    has_user_notes: bool = False


class Edge(BaseModel):
    id: str
    source: str
    target: str
    edge_type: EdgeType
    label: str
    weight: float = 1.0


class GraphDelta(BaseModel):
    session_id: str
    nodes: list[Node]
    edges: list[Edge]
