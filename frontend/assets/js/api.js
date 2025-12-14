// API Configuration
const API_BASE = "http://127.0.0.1:8000";

// Run query analysis
async function runQuery(payload) {
    try {
        const res = await fetch(`${API_BASE}/api/query`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error('API Error Response:', errorText);
            throw new Error(`API error: ${res.status} - ${errorText}`);
        }

        const data = await res.json();
        console.log('API Response:', data);
        return data;
    } catch (error) {
        console.error('API Request Failed:', error);
        throw error;
    }
}

// Download report PDF
function downloadReport(reportId) {
    if (!reportId) {
        alert('Report ID not found');
        return;
    }
    const url = `${API_BASE}/api/report/${reportId}`;
    window.open(url, "_blank");
}

// Check API status
async function checkAPIStatus() {
    try {
        const res = await fetch(`${API_BASE}/health`);
        return res.ok;
    } catch (error) {
        return false;
    }
}

// Global exposure
window.API_BASE = API_BASE;
window.runQuery = runQuery;
window.downloadReport = downloadReport;
window.checkAPIStatus = checkAPIStatus;