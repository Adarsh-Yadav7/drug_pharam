// assets/js/ui.js

// ---------- Toast ----------
function showToast(message) {
  const toast = document.getElementById("toast");
  const toastMsg = document.getElementById("toast-message");
  if (!toast || !toastMsg) return;

  toastMsg.textContent = message;
  toast.hidden = false;

  setTimeout(() => {
    toast.hidden = true;
  }, 3000);
}

// ---------- Loading ----------
function setLoading(isLoading) {
  const btn = document.getElementById("btn-run-query");
  const spinner = document.getElementById("loading-spinner");
  const text = btn ? btn.querySelector(".btn-text") : null;
  const statusChip = document.getElementById("api-status-chip");
  const statusLabel = document.getElementById("api-status-label");

  if (!btn || !spinner || !text) return;

  if (isLoading) {
    btn.disabled = true;
    spinner.hidden = false;
    text.style.opacity = 0.3;
    if (statusChip) statusChip.textContent = "Running...";
    if (statusLabel) statusLabel.textContent = "Running portfolio analysis…";
  } else {
    btn.disabled = false;
    spinner.hidden = true;
    text.style.opacity = 1;
  }
}

// ---------- Summary ----------
function renderSummary(summary, score, meta) {
  const summarySection = document.getElementById("summary-section");
  const summaryText = document.getElementById("summary-text");
  const scoreBadge = document.getElementById("score-badge");
  const contextEl = document.getElementById("summary-context");
  const agentsChip = document.getElementById("agents-chip");
  const statusChip = document.getElementById("api-status-chip");
  const statusLabel = document.getElementById("api-status-label");

  if (!summarySection || !summaryText) return;

  summarySection.classList.remove("summary-empty");
  summaryText.textContent = summary || "No summary returned from backend.";

  // score
  if (scoreBadge) {
    scoreBadge.hidden = false;
    const pct = Math.round((score || 0) * 100);
    scoreBadge.textContent = `${pct}% Opportunity`;
  }

  // context
  if (meta && contextEl) {
    const parts = [];
    if (meta.molecule) parts.push(meta.molecule);
    if (meta.therapy) parts.push(meta.therapy);
    if (meta.region) parts.push(meta.region);

    if (parts.length > 0) {
      contextEl.hidden = false;
      contextEl.textContent = parts.join(" • ");
    }
  }

  if (meta && meta.tasks && meta.tasks.length > 0 && agentsChip) {
    agentsChip.textContent = meta.tasks.map((t) => t.toUpperCase()).join(" · ");
  }

  // status
  const now = new Date();
  const t = now.toLocaleTimeString();
  if (statusChip) statusChip.textContent = "Completed";
  if (statusLabel) statusLabel.textContent = `Last run at ${t}`;
}

// ---------- Tabs + Agent panels ----------
function createTab(title, index, active = false) {
  const tab = document.createElement("button");
  tab.className = active ? "tab tab-active" : "tab";
  tab.textContent = title || `Agent ${index + 1}`;
  tab.dataset.index = index;
  return tab;
}

function createAgentPanel(result) {
  const div = document.createElement("div");
  div.className = "agent-panel";

  const safeData =
    result && typeof result.data !== "undefined"
      ? JSON.stringify(result.data, null, 2)
      : "{}";

  div.innerHTML = `
    <h3 class="agent-title">${result.agent_name || "Agent"}</h3>
    <p class="agent-summary">${result.summary || "No summary."}</p>
    <pre class="agent-data">${safeData}</pre>
  `;
  return div;
}

function renderResults(agentResults, reportId) {
  const resultsSection = document.getElementById("results-section");
  const tabsContainer = document.getElementById("results-tabs");
  const bodyContainer = document.getElementById("results-body");
  const lastBtn = document.getElementById("btn-download-last");

  if (!resultsSection || !tabsContainer || !bodyContainer || !lastBtn) return;

  if (!Array.isArray(agentResults) || agentResults.length === 0) {
    resultsSection.hidden = true;
  } else {
    resultsSection.hidden = false;
    tabsContainer.innerHTML = "";
    bodyContainer.innerHTML = "";

    agentResults.forEach((res, i) => {
      const tab = createTab(res.agent_name, i, i === 0);
      tabsContainer.appendChild(tab);

      const panel = createAgentPanel(res);
      if (i !== 0) panel.style.display = "none";
      bodyContainer.appendChild(panel);
    });

    // tab switching
    document.querySelectorAll(".tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        const activeIndex = tab.dataset.index;

        document.querySelectorAll(".tab").forEach((t) =>
          t.classList.remove("tab-active")
        );
        tab.classList.add("tab-active");

        document.querySelectorAll(".agent-panel").forEach((p, i) => {
          p.style.display = i == activeIndex ? "block" : "none";
        });
      });
    });
  }

  // Last report button
  if (reportId) {
    lastBtn.disabled = false;
    lastBtn.onclick = () => {
      downloadReport(reportId);
    };
  } else {
    lastBtn.disabled = true;
    lastBtn.onclick = null;
  }
}
// ---------- Radar Chart (DYNAMIC + LEGEND) ----------
let radarChart = null;

function classifyBand(score) {
  if (score >= 8) return { label: "High", cls: "radar-band-high" };
  if (score >= 5) return { label: "Medium", cls: "radar-band-medium" };
  return { label: "Low", cls: "radar-band-low" };
}

function renderRadar(factorScores) {
  const canvas = document.getElementById("opportunity-radar");
  const legend = document.getElementById("radar-legend");
  console.log("renderRadar called, scores:", factorScores);

  if (!canvas || !window.Chart || !factorScores) return;

  const market = factorScores.market ?? 0;
  const trials = factorScores.trials ?? 0;
  const patent = factorScores.patent ?? 0;
  const trade = factorScores.trade ?? 0;
  const unmet = factorScores.unmet ?? 0;

  const data = [market, trials, patent, trade, unmet];
  const labels = ["Market", "Trials", "Patents", "Trade", "Unmet"];

  // Chart destroy + redraw
  if (radarChart) {
    radarChart.destroy();
  }

  radarChart = new Chart(canvas.getContext("2d"), {
    type: "radar",
    data: {
      labels,
      datasets: [
        {
          data,
          fill: true,
          pointRadius: 3,
          borderWidth: 2,
          borderColor: "rgba(34,197,94,0.9)",     // green
          backgroundColor: "rgba(34,197,94,0.15)" // light green fill
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        r: {
          suggestedMin: 0,
          suggestedMax: 10,
          ticks: { stepSize: 2 },
          grid: { color: "rgba(148,163,184,0.3)" },
          angleLines: { color: "rgba(148,163,184,0.4)" },
        },
      },
    },
  });

  // --- Legend / signal box ---
  if (legend) {
    const bands = {
      market: classifyBand(market),
      trials: classifyBand(trials),
      patent: classifyBand(patent),
      trade: classifyBand(trade),
      unmet: classifyBand(unmet),
    };

    legend.innerHTML = `
      <div class="radar-legend-title">Whitespace signal</div>
      <div class="radar-legend-item">
        <div class="radar-pill">
          <span class="radar-dot radar-dot-market"></span>
          <span>Market</span>
        </div>
        <div>
          <span>${market.toFixed(1)}/10</span>
          <span class="radar-band ${bands.market.cls}">${bands.market.label}</span>
        </div>
      </div>
      <div class="radar-legend-item">
        <div class="radar-pill">
          <span class="radar-dot radar-dot-trials"></span>
          <span>Trials</span>
        </div>
        <div>
          <span>${trials.toFixed(1)}/10</span>
          <span class="radar-band ${bands.trials.cls}">${bands.trials.label}</span>
        </div>
      </div>
      <div class="radar-legend-item">
        <div class="radar-pill">
          <span class="radar-dot radar-dot-patent"></span>
          <span>Patents</span>
        </div>
        <div>
          <span>${patent.toFixed(1)}/10</span>
          <span class="radar-band ${bands.patent.cls}">${bands.patent.label}</span>
        </div>
      </div>
      <div class="radar-legend-item">
        <div class="radar-pill">
          <span class="radar-dot radar-dot-trade"></span>
          <span>Trade</span>
        </div>
        <div>
          <span>${trade.toFixed(1)}/10</span>
          <span class="radar-band ${bands.trade.cls}">${bands.trade.label}</span>
        </div>
      </div>
      <div class="radar-legend-item">
        <div class="radar-pill">
          <span class="radar-dot radar-dot-unmet"></span>
          <span>Unmet need</span>
        </div>
        <div>
          <span>${unmet.toFixed(1)}/10</span>
          <span class="radar-band ${bands.unmet.cls}">${bands.unmet.label}</span>
        </div>
      </div>
    `;
  }
}


// expose to main.js
window.renderRadar = renderRadar;
window.showToast = showToast;
window.setLoading = setLoading;
window.renderSummary = renderSummary;
window.renderResults = renderResults;
