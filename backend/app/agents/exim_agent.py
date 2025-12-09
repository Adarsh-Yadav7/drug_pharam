from typing import Dict, Any
from ..services.data_loader import load_csv


def run_exim_agent(molecule: str | None,
                   region: str | None) -> Dict[str, Any]:
    df = load_csv("exim_trades.csv")
    if molecule:
        df = df[df["molecule"] == molecule]
    if region:
        df = df[df["country"] == region]

    if df.empty:
        summary = "No EXIM trade data found for given filters."
    else:
        total_import = float(df["import_tonnes"].sum())
        total_export = float(df["export_tonnes"].sum())
        summary = (
            f"Total imports: {total_import:.1f} tonnes, "
            f"total exports: {total_export:.1f} tonnes "
            f"across {len(df)} records."
        )

    table = df.head(10).to_dict(orient="records")
    return {
        "summary": summary,
        "table": table,
    }
