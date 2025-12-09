from typing import Dict, Any
from ..services.data_loader import load_csv


def run_iqvia_agent(molecule: str | None,
                    therapy_area: str | None,
                    region: str | None) -> Dict[str, Any]:
    df = load_csv("iqvia_market_insights.csv")

    if molecule:
        df = df[df["molecule"] == molecule]
    if therapy_area:
        df = df[df["indication"] == therapy_area]
    if region:
        df = df[df["country"] == region]

    if df.empty:
        summary = "No IQVIA data found for given filters."
    else:
        total_sales = float(df["sales_usd_mn"].sum())
        avg_cagr = float(df["cagr_5y"].mean())
        summary = (
            f"Total market size: {total_sales:.1f} Mn USD with "
            f"average 5Y CAGR {avg_cagr:.1f}%. "
            f"Records: {len(df)}."
        )

    table = df.head(10).to_dict(orient="records")

    return {
        "summary": summary,
        "table": table,
    }
