// assets/js/main.js
// uses global: runQuery, setLoading, showToast, renderSummary, renderResults, renderRadar

// ---------- Chips & Presets ----------
function collectTasks() {
  const chips = document.querySelectorAll(".chip");
  const tasks = [];
  chips.forEach((chip) => {
    if (chip.classList.contains("chip-selected")) {
      tasks.push(chip.dataset.task);
    }
  });
  return tasks;
}

function setupChips() {
  document.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      chip.classList.toggle("chip-selected");
    });
  });
}

function applyPreset(id) {
  const prompt = document.getElementById("prompt-input");
  const mol = document.getElementById("molecule-input");
  const th = document.getElementById("therapy-input");
  const reg = document.getElementById("region-input");

  if (id === "asthma-india") {
    prompt.value =
      "Perform a complete opportunity assessment for MOLX in the Indian Asthma market including market, EXIM, patents, trials, internal insights and guidelines.";
    mol.value = "MOLX";
    th.value = "Asthma";
    reg.value = "India";
  } else if (id === "lung-au") {
    prompt.value =
      "Assess the Lung Cancer market opportunity for MOLH1 in Australia with focus on CAGR, competitor density, clinical trials and IP barriers.";
    mol.value = "MOLH1";
    th.value = "Lung Cancer";
    reg.value = "Australia";
  } else if (id === "ckd-india") {
    prompt.value =
      "Evaluate MOL2 in the Indian Chronic Kidney Disease space, highlighting decline risk, unmet needs and whitespace.";
    mol.value = "MOL2";
    th.value = "Chronic Kidney Disease";
    reg.value = "India";
  } else if (id === "resp-global") {
    prompt.value =
      "Generate a global respiratory assessment for MOLR3 with special focus on Canada and China trade flows and trial activity.";
    mol.value = "MOLR3";
    th.value = "Respiratory";
    reg.value = "Global";
  }
}

function setupPresets() {
  document.querySelectorAll(".preset-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      applyPreset(btn.dataset.preset);
    });
  });

  const clearBtn = document.getElementById("btn-clear-form");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      document.getElementById("prompt-input").value = "";
      document.getElementById("molecule-input").value = "";
      document.getElementById("therapy-input").value = "";
      document.getElementById("region-input").value = "";
    });
  }
}

// ---------- FRONTEND FACTOR SCORE ENGINE ----------
function findAgent(agentResults, name) {
  return (agentResults || []).find((a) => a.agent_name === name) || null;
}

function safeList(value) {
  return Array.isArray(value) ? value : [];
}

function computeFactorScoresFromAgents(agentResults) {
  const scores = {
    market: 5.0,
    trials: 5.0,
    patent: 5.0,
    trade: 5.0,
    unmet: 5.0,
  };

  const nowYear = new Date().getFullYear();

  // 1) Market – IQVIA Insights Agent
  const marketAgent = findAgent(agentResults, "IQVIA Insights Agent");
  if (marketAgent && marketAgent.data && typeof marketAgent.data === "object") {
    const rows = safeList(marketAgent.data.table);
    const cagrVals = rows
      .filter(
        (r) =>
          r &&
          typeof r === "object" &&
          typeof r.cagr_5y === "number"
      )
      .map((r) => r.cagr_5y);

    if (cagrVals.length > 0) {
      const avgCagr =
        cagrVals.reduce((sum, v) => sum + v, 0) / cagrVals.length;

      if (avgCagr >= 10) scores.market = 10;
      else if (avgCagr >= 8) scores.market = 9;
      else if (avgCagr >= 6) scores.market = 8;
      else if (avgCagr >= 4) scores.market = 6;
      else if (avgCagr >= 2) scores.market = 4;
      else scores.market = 2;
    }
  }

  // 2) Trials – Clinical Trials Agent
  const trialsAgent = findAgent(agentResults, "Clinical Trials Agent");
  if (trialsAgent && trialsAgent.data && typeof trialsAgent.data === "object") {
    const trows = safeList(trialsAgent.data.table);
    const n = trows.length;
    if (n >= 15) scores.trials = 10;
    else if (n >= 8) scores.trials = 8;
    else if (n >= 3) scores.trials = 6;
    else if (n >= 1) scores.trials = 4;
    else scores.trials = 2;
  }

  // 3) Patent – Patent Landscape Agent
  const patentAgent = findAgent(agentResults, "Patent Landscape Agent");
  if (patentAgent && patentAgent.data && typeof patentAgent.data === "object") {
    const patents = safeList(patentAgent.data.patents);
    const years = patents
      .filter(
        (p) =>
          p &&
          typeof p === "object" &&
          typeof p.expiry_year === "number"
      )
      .map((p) => p.expiry_year);

    if (years.length > 0) {
      const earliest = Math.min(...years);
      const delta = earliest - nowYear;

      if (delta <= 0) scores.patent = 9;
      else if (delta <= 2) scores.patent = 8;
      else if (delta <= 5) scores.patent = 7;
      else if (delta <= 8) scores.patent = 5;
      else scores.patent = 3;
    }
  }

  // 4) Trade – EXIM Trade Agent
  const eximAgent = findAgent(agentResults, "EXIM Trade Agent");
  if (eximAgent && eximAgent.data && typeof eximAgent.data === "object") {
    const erows = safeList(eximAgent.data.table);
    const imports = [];
    const exports = [];

    erows.forEach((r) => {
      if (r && typeof r === "object") {
        if (typeof r.import_tonnes === "number") {
          imports.push(r.import_tonnes);
        }
        if (typeof r.export_tonnes === "number") {
          exports.push(r.export_tonnes);
        }
      }
    });

    if (imports.length && exports.length) {
      const totImp = imports.reduce((s, v) => s + v, 0);
      const totExp = exports.reduce((s, v) => s + v, 0);
      const high = Math.max(totImp, totExp);
      const low = Math.min(totImp, totExp);
      const ratio = high ? low / high : 1.0;

      if (ratio >= 0.9) scores.trade = 9;
      else if (ratio >= 0.6) scores.trade = 8;
      else if (ratio >= 0.3) scores.trade = 6;
      else scores.trade = 4;
    }
  }

  // 5) Unmet – Internal Knowledge Agent
  const internalAgent = findAgent(agentResults, "Internal Knowledge Agent");
  if (internalAgent && internalAgent.data && typeof internalAgent.data === "object") {
    const opps = safeList(internalAgent.data.key_opportunities);
    const n = opps.length;
    if (n >= 5) scores.unmet = 9;
    else if (n >= 3) scores.unmet = 8;
    else if (n >= 1) scores.unmet = 7;
    else scores.unmet = 4;
  }

  // clamp 0–10
  Object.keys(scores).forEach((k) => {
    const v = scores[k];
    scores[k] = Math.max(0, Math.min(10, Number(v) || 0));
  });

  console.log("factorScores (frontend computed):", scores);
  return scores;
}

// ---------- Form ----------
function setupForm() {
  const form = document.getElementById("query-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const prompt = document.getElementById("prompt-input").value.trim();
    const molecule = document.getElementById("molecule-input").value.trim();
    const therapy = document.getElementById("therapy-input").value.trim();
    const region = document.getElementById("region-input").value.trim();
    const tasks = collectTasks();

    if (!prompt || !molecule || !therapy || !region) {
      showToast("Please fill prompt, molecule, therapy area and region.");
      return;
    }

    const payload = {
      prompt,
      molecule,
      therapy_area: therapy,
      region,
      tasks,
      output_format: "summary+pdf",
    };

    try {
      setLoading(true);

      const res = await runQuery(payload);
      console.log("API response:", res);

      const overall =
        res.overall_summary || res.overallSummary || "No overall summary.";
      const score =
        res.opportunity_score ?? res.opportunityScore ?? 0;

      const agentResults = res.agent_results || res.agentResults || [];
      const reportId = res.report_id || res.reportId || null;

      const meta = {
        molecule,
        therapy,
        region,
        tasks,
      };

      // Summary + tabs
      renderSummary(overall, score, meta);
      renderResults(agentResults, reportId);

      // REAL radar from agent_results (no backend dependency)
      const factorScores = computeFactorScoresFromAgents(agentResults);
      if (typeof renderRadar === "function" && factorScores) {
        renderRadar(factorScores);
      }
    } catch (err) {
      console.error(err);
      showToast("API error: " + err.message);
    } finally {
      setLoading(false);
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupChips();
  setupPresets();
  setupForm();
});
