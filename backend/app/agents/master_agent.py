from typing import List, Optional

from ..models.schemas import QueryRequest, AgentResult
from .iqvia_agent import run_iqvia_agent
from .exim_agent import run_exim_agent
from .patent_agent import run_patent_agent
from .clinical_trials_agent import run_clinical_trials_agent
from .internal_docs_agent import run_internal_docs_agent
from .web_intel_agent import run_web_intel_agent
from .memory_agent import check_memory, save_to_memory


def _get_summary_by_name(results: List[AgentResult], name: str) -> Optional[str]:
    """Helper: kisi specific agent ka summary nikaalne ke liye."""
    for r in results:
        if r.agent_name == name:
            return r.summary
    return None


def build_overall_summary(agent_results: List[AgentResult]) -> str:
    """
    Saare worker agents ke summaries se ek coherent, business-style
    overall summary banata hai.

    Isko main.py me use kar sakte ho instead of simple ' | '.join(...)
    """

    market = _get_summary_by_name(agent_results, "IQVIA Insights Agent")
    exim = _get_summary_by_name(agent_results, "EXIM Trade Agent")
    patent = _get_summary_by_name(agent_results, "Patent Landscape Agent")
    trials = _get_summary_by_name(agent_results, "Clinical Trials Agent")
    internal = _get_summary_by_name(agent_results, "Internal Knowledge Agent")
    web = _get_summary_by_name(agent_results, "Web Intelligence Agent")

    parts: List[str] = []

    if market:
        parts.append(f"Market & growth view: {market}")
    if exim:
        parts.append(f"Supply and trade dynamics: {exim}")
    if patent:
        parts.append(f"IP barriers and freedom-to-operate: {patent}")
    if trials:
        parts.append(f"Clinical development and pipeline: {trials}")
    if internal:
        parts.append(f"Internal strategy and unmet needs: {internal}")
    if web:
        parts.append(f"Guidelines and real-world evidence: {web}")

    if not parts:
        return "No agent outputs were available for synthesis."

    # In sabko ek coherent paragraph me jod do
    return " ".join(parts)


def run_master_agent(req: QueryRequest) -> List[AgentResult]:
    """
    Master Agent – Conversation Orchestrator

    - User prompt samajhta hai (high-level)
    - Tasks decide karta hai (market, exim, patent, trials, internal, web)
    - Worker agents se results collect karta hai
    - Har agent ka output AgentResult me wrap karke return karta hai
    """

    # 0) Task list normalize karo
    tasks = req.tasks or ["market", "exim", "patent", "trials", "internal", "web"]

    # 1) Memory check – same molecule + therapy + region + tasks ke liye
    cached_results = check_memory(req.molecule, req.therapy_area, req.region, tasks)
    if cached_results is not None:
        # Yaha se direct cached AgentResult list return kar sakte ho
        return cached_results

    results: List[AgentResult] = []

    # 2) IQVIA / Market Insights
    if "market" in tasks:
        res = run_iqvia_agent(req.molecule, req.therapy_area, req.region)
        results.append(
            AgentResult(
                agent_name="IQVIA Insights Agent",
                summary=res["summary"],
                data={"table": res.get("table", [])},
            )
        )

    # 3) EXIM Trade Analysis
    if "exim" in tasks:
        res = run_exim_agent(req.molecule, req.region)
        results.append(
            AgentResult(
                agent_name="EXIM Trade Agent",
                summary=res["summary"],
                data={"table": res.get("table", [])},
            )
        )

    # 4) Patent Landscape
    if "patent" in tasks:
        res = run_patent_agent(req.molecule, req.therapy_area)
        results.append(
            AgentResult(
                agent_name="Patent Landscape Agent",
                summary=res["summary"],
                data={"patents": res.get("patents", [])},
            )
        )

    # 5) Clinical Trials
    if "trials" in tasks:
        res = run_clinical_trials_agent(req.molecule, req.therapy_area, req.region)
        results.append(
            AgentResult(
                agent_name="Clinical Trials Agent",
                summary=res["summary"],
                data={"table": res.get("table", [])},
            )
        )

    # 6) Internal Knowledge / Strategy Docs (LangChain + Groq)
    if "internal" in tasks:
        res = run_internal_docs_agent(
            req.molecule,
            req.therapy_area,
            req.region,
            req.prompt,  # user_prompt
        )
        results.append(
            AgentResult(
                agent_name="Internal Knowledge Agent",
                summary=res["summary"],
                data={
                    "documents": res.get("documents", []),
                    # "highlights" hata diya, sirf clean structured cheezein:
                    "key_opportunities": res.get("key_opportunities", []),
                    "key_risks": res.get("key_risks", []),
                },
            )
        )

    # 7) Web Intelligence (guidelines, RWE, news – JSON + LLM)
    if "web" in tasks:
        res = run_web_intel_agent(req.therapy_area)
        results.append(
            AgentResult(
                agent_name="Web Intelligence Agent",
                summary=res["summary"],
                data={
                    "links": res.get("links", []),
                    # agar web agent future me key_updates ya bullets bheje to:
                    "key_updates": res.get("key_updates", []),
                },
            )
        )

    # 8) Ab jo bhi results aae, unko memory me save karo
    save_to_memory(req.molecule, req.therapy_area, req.region, tasks, results)

    return results
