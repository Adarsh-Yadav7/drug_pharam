# app/services/opportunity_engine.py
from typing import Dict, List
from datetime import datetime

from ..models.schemas import AgentResult


def _find_agent(results: List[AgentResult], name: str):
    """Helper: given agent name, return its AgentResult or None."""
    for r in results:
        if r.agent_name == name:
            return r
    return None


def _safe_list(value):
    """Guarantee we always get a list (otherwise empty list)."""
    return value if isinstance(value, list) else []


def compute_factor_scores(agent_results: List[AgentResult]) -> Dict[str, float]:
    """
    Har agent ke structured data se 0–10 scale par scores nikalta hai:

    - market: IQVIA CAGR → growth potential
    - trials: clinical trial count → pipeline depth
    - patent: earliest expiry window → FTO / IP risk
    - trade: import/export balance → trade exposure
    - unmet: internal key_opportunities count → unmet need strength
    """
    # default neutral scores (5/10)
    scores: Dict[str, float] = {
        "market": 5.0,
        "trials": 5.0,
        "patent": 5.0,
        "trade": 5.0,
        "unmet": 5.0,
    }

    now_year = datetime.now().year

    # 1) Market score – IQVIA Insights Agent
    market_agent = _find_agent(agent_results, "IQVIA Insights Agent")
    if market_agent and isinstance(market_agent.data, dict):
        rows = _safe_list(market_agent.data.get("table"))
        cagr_vals = [
            row.get("cagr_5y")
            for row in rows
            if isinstance(row, dict) and isinstance(row.get("cagr_5y"), (int, float))
        ]
        if cagr_vals:
            avg_cagr = sum(cagr_vals) / len(cagr_vals)
            # Map avg CAGR → 0–10-ish score
            if avg_cagr >= 10:
                scores["market"] = 10
            elif avg_cagr >= 8:
                scores["market"] = 9
            elif avg_cagr >= 6:
                scores["market"] = 8
            elif avg_cagr >= 4:
                scores["market"] = 6
            elif avg_cagr >= 2:
                scores["market"] = 4
            else:
                scores["market"] = 2

    # 2) Trials score – Clinical Trials Agent
    trials_agent = _find_agent(agent_results, "Clinical Trials Agent")
    if trials_agent and isinstance(trials_agent.data, dict):
        trows = _safe_list(trials_agent.data.get("table"))
        n = len(trows)
        if n >= 15:
            scores["trials"] = 10
        elif n >= 8:
            scores["trials"] = 8
        elif n >= 3:
            scores["trials"] = 6
        elif n >= 1:
            scores["trials"] = 4
        else:
            scores["trials"] = 2

    # 3) Patent score – Patent Landscape Agent
    patent_agent = _find_agent(agent_results, "Patent Landscape Agent")
    if patent_agent and isinstance(patent_agent.data, dict):
        patents = _safe_list(patent_agent.data.get("patents"))
        years = [
            p.get("expiry_year")
            for p in patents
            if isinstance(p, dict) and isinstance(p.get("expiry_year"), (int, float))
        ]
        if years:
            earliest = min(years)
            delta = earliest - now_year  # kitne saal baad expire honge
            if delta <= 0:          # already expired / expiring
                scores["patent"] = 9
            elif delta <= 2:
                scores["patent"] = 8
            elif delta <= 5:
                scores["patent"] = 7
            elif delta <= 8:
                scores["patent"] = 5
            else:
                scores["patent"] = 3  # bahut door expiry → kam near-term opportunity

    # 4) Trade score – EXIM Trade Agent
    exim_agent = _find_agent(agent_results, "EXIM Trade Agent")
    if exim_agent and isinstance(exim_agent.data, dict):
        erows = _safe_list(exim_agent.data.get("table"))
        imports, exports = [], []
        for r in erows:
            if isinstance(r, dict):
                imp = r.get("import_tonnes")
                exp = r.get("export_tonnes")
                if isinstance(imp, (int, float)):
                    imports.append(imp)
                if isinstance(exp, (int, float)):
                    exports.append(exp)
        if imports and exports:
            tot_imp = sum(imports)
            tot_exp = sum(exports)
            high = max(tot_imp, tot_exp)
            low = min(tot_imp, tot_exp)
            ratio = low / high if high else 1.0
            if ratio >= 0.9:
                scores["trade"] = 9   # balanced / diversified
            elif ratio >= 0.6:
                scores["trade"] = 8
            elif ratio >= 0.3:
                scores["trade"] = 6
            else:
                scores["trade"] = 4   # heavy dependency / imbalance

    # 5) Unmet need score – Internal Knowledge Agent
    internal_agent = _find_agent(agent_results, "Internal Knowledge Agent")
    if internal_agent and isinstance(internal_agent.data, dict):
        opps = _safe_list(internal_agent.data.get("key_opportunities"))
        n = len(opps)
        if n >= 5:
            scores["unmet"] = 9
        elif n >= 3:
            scores["unmet"] = 8
        elif n >= 1:
            scores["unmet"] = 7
        else:
            scores["unmet"] = 4

    # clamp safety (0–10)
    for k, v in scores.items():
        scores[k] = max(0.0, min(10.0, float(v)))

    return scores


def compute_overall_index(scores: Dict[str, float]) -> float:
    """
    Weighted 0–10 index; same weights jo tumne bola:

    - Market 25%
    - Trials 25%
    - Patent 20%
    - Trade 15%
    - Unmet 15%
    """
    return (
        scores.get("market", 5.0) * 0.25
        + scores.get("trials", 5.0) * 0.25
        + scores.get("patent", 5.0) * 0.20
        + scores.get("trade", 5.0) * 0.15
        + scores.get("unmet", 5.0) * 0.15
    )
