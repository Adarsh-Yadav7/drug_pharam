# backend/app/agents/memory_agent.py
from typing import Any, List
from ..models.schemas import AgentResult
from ..services.memory_store import get_cached_result, set_cached_result


def check_memory(molecule: str | None, therapy: str | None, region: str | None, tasks: list[str] | None) -> List[AgentResult] | None:
    cached = get_cached_result(molecule, therapy, region, tasks)
    if not cached:
        return None

    # cached me plain dict list store karoge, usko AgentResult objects me convert karo
    return [AgentResult(**item) for item in cached]


def save_to_memory(molecule: str | None, therapy: str | None, region: str | None, tasks: list[str] | None, results: List[AgentResult]) -> None:
    # AgentResult ko dict me convert karo
    payload = [r.model_dump() for r in results]
    set_cached_result(molecule, therapy, region, tasks, payload)
