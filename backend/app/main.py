# app/main.py
from typing import List
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from .services.memory_store import load_memory_from_disk
from .models.schemas import QueryRequest, QueryResponse, AgentResult
from .agents.master_agent import run_master_agent, build_overall_summary
from .services.report_generator import generate_report
from .services.opportunity_engine import compute_factor_scores, compute_overall_index
from .config import APP_NAME, APP_VERSION, REPORTS_DIR

from dotenv import load_dotenv
import os  # ✅ YEH ADD KARO

load_dotenv()

app = FastAPI(title=APP_NAME, version=APP_VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    load_memory_from_disk()

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/api/query")
def query_master(req: QueryRequest):
    # 1) Run worker agents
    agent_results: List[AgentResult] = run_master_agent(req)

    # 2) Build overall summary
    overall = build_overall_summary(agent_results)

    # 3) Compute factor scores + overall index
    factor_scores_dict = compute_factor_scores(agent_results)
    overall_index_0_10 = compute_overall_index(factor_scores_dict)
    smart_score = max(0.0, min(1.0, overall_index_0_10 / 10.0))

    final_score = smart_score

    # 4) PDF report if requested
    report_id = None
    if req.output_format and "pdf" in req.output_format.lower():
        report_id = generate_report(
            overall_summary=overall,
            agent_results=agent_results,
            query_title=req.prompt or "User Query",
            molecule=req.molecule,
            therapy_area=req.therapy_area,
            region=req.region,
            tasks=req.tasks or ["market", "exim", "patent", "trials", "internal", "web"],
        )

    print("FACTOR_SCORES_BACKEND:", factor_scores_dict)

    return {
        "overall_summary": overall,
        "opportunity_score": final_score,
        "agent_results": [r.dict() for r in agent_results],
        "report_id": report_id,
        "factor_scores": factor_scores_dict,
    }

@app.get("/api/report/{report_id}")
def download_report(report_id: str):
    file_path = REPORTS_DIR / f"{report_id}.pdf"
    return FileResponse(
        path=file_path,
        media_type="application/pdf",
        filename=f"pharma_report_{report_id}.pdf",
    )

# ===========================================
# ✅ ADD THESE LINES AT THE VERY END
# ===========================================

if __name__ == "__main__":
    import uvicorn
    
    # Render provides PORT environment variable
    port = int(os.environ.get("PORT", 10000))
    
    # IMPORTANT: String format mein app reference
    uvicorn.run(
        "app.main:app",    # Yeh string format important hai
        host="0.0.0.0",
        port=port,
        reload=False       # Production mein False rakho
    )
