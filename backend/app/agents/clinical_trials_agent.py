from typing import Dict, Any
from ..services.data_loader import load_csv


def run_clinical_trials_agent(molecule: str | None,
                              therapy_area: str | None,
                              region: str | None) -> Dict[str, Any]:
    df = load_csv("clinical_trials.csv")

    if molecule:
        df = df[df["molecule"] == molecule]
    if therapy_area:
        df = df[df["indication"] == therapy_area]
    if region:
        df = df[df["country"] == region]

    if df.empty:
        summary = "No clinical trials found for given filters."
    else:
        summary = f"Found {len(df)} clinical trials matching the criteria."

    table = df.head(10).to_dict(orient="records")
    return {
        "summary": summary,
        "table": table,
    }
