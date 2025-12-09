from __future__ import annotations
from typing import Dict, Any, List
from pathlib import Path
import json
import threading

from ..config import DATA_DIR  # 👈 yahan se data folder ka path le rahe hain

# memory_cache.json ko app/data ke andar store karenge
MEMORY_PATH = DATA_DIR / "memory_cache.json"
_lock = threading.Lock()

# In-memory cache
_memory: Dict[str, Any] = {}


def _make_key(molecule: str | None, therapy: str | None, region: str | None, tasks: List[str] | None) -> str:
    m = (molecule or "").upper()
    t = (therapy or "").upper()
    r = (region or "").upper()
    task_str = ",".join(sorted(tasks or []))
    return f"{m}|{t}|{r}|{task_str}"


def load_memory_from_disk() -> None:
    """Server start pe existing cache JSON se load karega (agar file hai)."""
    global _memory
    try:
        if MEMORY_PATH.exists():
            data = json.loads(MEMORY_PATH.read_text(encoding="utf-8"))
            if isinstance(data, dict):
                _memory = data
    except Exception:
        # koi issue aaya to empty se start karenge
        _memory = {}


def save_memory_to_disk() -> None:
    """Har update ke baad memory ko disk pe dump karega."""
    with _lock:
        # ensure parent folder exists:
        MEMORY_PATH.parent.mkdir(parents=True, exist_ok=True)
        MEMORY_PATH.write_text(json.dumps(_memory, indent=2), encoding="utf-8")


def get_cached_result(molecule: str | None, therapy: str | None, region: str | None, tasks: List[str] | None):
    key = _make_key(molecule, therapy, region, tasks)
    return _memory.get(key)


def set_cached_result(molecule: str | None, therapy: str | None, region: str | None, tasks: List[str] | None, value: Any):
    key = _make_key(molecule, therapy, region, tasks)
    _memory[key] = value
    save_memory_to_disk()
