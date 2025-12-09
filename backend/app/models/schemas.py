# app/models/schemas.py
from pydantic import BaseModel
from typing import List, Optional, Dict, Any


class QueryRequest(BaseModel):
    user_id: str = "demo_user"
    prompt: str
    molecule: Optional[str] = None
    therapy_area: Optional[str] = None
    region: Optional[str] = None
    tasks: Optional[List[str]] = None
    output_format: str = "summary+pdf"


class AgentResult(BaseModel):
    agent_name: str
    summary: str
    data: Dict[str, Any] = {}


class FactorScores(BaseModel):
    market: float
    trials: float
    patent: float
    trade: float
    unmet: float


class QueryResponse(BaseModel):
    overall_summary: str
    opportunity_score: float
    agent_results: List[AgentResult]
    report_id: Optional[str] = None
    factor_scores: Optional[FactorScores] = None   # sirf EK baar
