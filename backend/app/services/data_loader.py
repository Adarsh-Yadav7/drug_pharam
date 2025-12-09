from pathlib import Path
import json
import pandas as pd
from ..config import DATA_DIR


def load_csv(filename: str) -> pd.DataFrame:
    path = DATA_DIR / filename
    return pd.read_csv(path)


def load_json(filename: str):
    path = DATA_DIR / filename
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_internal_docs_list():
    docs_dir = DATA_DIR / "internal_docs"
    return [p.name for p in docs_dir.glob("*.pdf")]
