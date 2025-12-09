from typing import Dict, Any
from ..services.data_loader import load_json


def run_patent_agent(molecule: str | None,
                     therapy_area: str | None) -> Dict[str, Any]:
    data = load_json("patents.json")
    filtered = [
        p for p in data
        if (not molecule or p["molecule"] == molecule)
        and (not therapy_area or p["indication"] == therapy_area)
    ]

    if not filtered:
        summary = "No patents found for selection."
    else:
        years = [p["expiry_year"] for p in filtered]
        earliest_expiry = min(years)
        summary = (
            f"Found {len(filtered)} relevant patents. "
            f"Earliest expiry year: {earliest_expiry}."
        )

    return {
        "summary": summary,
        "patents": filtered[:10],
    }
