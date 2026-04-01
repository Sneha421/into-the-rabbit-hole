from pydantic import BaseModel


class DiscoverRequest(BaseModel):
    topic: str
    max_depth: int = 2


class ExpandRequest(BaseModel):
    node_id: str
    session_id: str


class StudyAskRequest(BaseModel):
    question: str
    session_id: str
    node_ids: list[str] = []

class DeepenRequest(BaseModel):
    target_depth: int
