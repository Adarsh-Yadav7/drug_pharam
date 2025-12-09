// assets/js/api.js
// NOTE: backend FastAPI ka URL
const API_BASE = "http://127.0.0.1:8000";

async function runQuery(payload) {
  const res = await fetch(`${API_BASE}/api/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `API error: ${res.status}`);
  }

  return res.json(); // { overall_summary, opportunity_score, agent_results, report_id }
}

function downloadReport(reportId) {
  const url = `${API_BASE}/api/report/${reportId}`;
  window.open(url, "_blank");
}

// global expose for other scripts
window.API_BASE = API_BASE;
window.runQuery = runQuery;
window.downloadReport = downloadReport;
