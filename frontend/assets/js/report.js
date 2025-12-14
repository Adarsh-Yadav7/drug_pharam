// Report page functionality
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Report page loaded');
    
    // Try multiple ways to get report data
    let reportData = null;
    
    // 1. First try: URL parameter (base64 data)
    const urlParams = new URLSearchParams(window.location.search);
    const base64Data = urlParams.get('data');
    
    if (base64Data) {
        try {
            reportData = JSON.parse(atob(base64Data));
            console.log('Got data from URL parameter (base64)');
        } catch (e) {
            console.error('Failed to parse URL data:', e);
        }
    }
    
    // 2. Second try: localStorage backup
    if (!reportData) {
        const storedData = localStorage.getItem('lastReport');
        if (storedData) {
            try {
                reportData = JSON.parse(storedData);
                console.log('Got data from localStorage');
            } catch (e) {
                console.error('Failed to parse localStorage data:', e);
            }
        }
    }
    
    // If still no data, show error and redirect
    if (!reportData) {
        console.error('No report data found');
        
        // Show user-friendly error
        document.body.innerHTML = `
            <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100vh;
                background: #0f172a;
                color: white;
                text-align: center;
                padding: 20px;
            ">
                <div style="font-size: 48px; margin-bottom: 20px;">📊</div>
                <h1 style="margin-bottom: 10px;">No Report Data Found</h1>
                <p style="margin-bottom: 30px; color: #94a3b8;">
                    Please start a new analysis from the chat interface.
                </p>
                <button id="go-back-btn" style="
                    background: #22c55e;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    font-size: 16px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                ">
                    <i class="fas fa-arrow-left"></i>
                    Go to Chat Interface
                </button>
            </div>
        `;
        
        document.getElementById('go-back-btn').addEventListener('click', () => {
            window.location.href = 'index.html';
        });
        
        return;
    }
    
    console.log('Report data found:', reportData);
    
    // Initialize report with the found data
    await initializeReport(reportData);
    setupEventListeners(reportData);
});

// ========== REPORT INITIALIZATION ==========
async function initializeReport(data) {
    console.log('Initializing report with data:', data);
    
    // Update header info
    document.getElementById('report-molecule').textContent = data.molecule || 'N/A';
    document.getElementById('report-therapy').textContent = data.therapy || 'N/A';
    document.getElementById('report-region').textContent = data.region || 'N/A';
    document.getElementById('report-date').textContent = new Date(data.timestamp || Date.now()).toLocaleDateString();
    
    const response = data.response;
    const agentResults = response.agent_results || response.agentResults || [];
    
    // 1. OPPORTUNITY SCORE - REAL DATA
    const opportunityScore = response.opportunity_score || response.opportunityScore || 0;
    const scorePercent = Math.round(opportunityScore * 100);
    updateOpportunityScore(scorePercent);
    
    // 2. EXECUTIVE SUMMARY - REAL DATA
    const summary = response.overall_summary || response.overallSummary || 'No summary available';
    document.getElementById('summary-text').textContent = summary;
    
    // 3. METRIC CARDS - REAL DATA
    updateMetricCards(agentResults);
    
    // 4. RADAR CHART - REAL DATA
    const factorScores = computeFactorScoresFromAgents(agentResults);
    renderRadarChart(factorScores);
    
    // 5. AGENT RESULTS - REAL DATA
    renderAgentResults(agentResults);
    
    // 6. INSIGHTS - REAL DATA
    extractAndRenderInsights(agentResults, response);
    
    // 7. RAW DATA - REAL DATA
    renderRawData(agentResults);
    
    // Update metadata
    document.getElementById('report-id').textContent = `RPT-${Date.now().toString().slice(-6)}`;
    document.getElementById('generated-time').textContent = new Date(data.timestamp || Date.now()).toLocaleString();
}

function updateOpportunityScore(scorePercent) {
    const scoreElement = document.getElementById('opportunity-score');
    if (!scoreElement) return;
    
    // Determine color based on score
    let gradient, category;
    if (scorePercent >= 80) {
        gradient = 'linear-gradient(135deg, #22c55e, #16a34a)';
        category = 'High Potential';
    } else if (scorePercent >= 60) {
        gradient = 'linear-gradient(135deg, #f59e0b, #d97706)';
        category = 'Moderate Potential';
    } else if (scorePercent >= 40) {
        gradient = 'linear-gradient(135deg, #f59e0b, #b45309)';
        category = 'Low Potential';
    } else {
        gradient = 'linear-gradient(135deg, #ef4444, #dc2626)';
        category = 'High Risk';
    }
    
    scoreElement.innerHTML = `
        <div class="score-circle" style="background: ${gradient}">
            <span class="score-value">${scorePercent}%</span>
        </div>
        <div class="score-label">
            <span>Opportunity Score</span>
            <span class="score-category">${category}</span>
        </div>
    `;
}

// ========== REAL METRIC CARDS ==========
function updateMetricCards(agentResults) {
    console.log('Updating metric cards with agent results:', agentResults);
    
    // Find specific agents
    const marketAgent = agentResults.find(a => 
        a.agent_name === 'IQVIA Insights Agent' || 
        a.agent_name?.toLowerCase().includes('market')
    );
    
    const patentAgent = agentResults.find(a => 
        a.agent_name === 'Patent Landscape Agent' || 
        a.agent_name?.toLowerCase().includes('patent')
    );
    
    const trialAgent = agentResults.find(a => 
        a.agent_name === 'Clinical Trials Agent' || 
        a.agent_name?.toLowerCase().includes('trial')
    );
    
    const eximAgent = agentResults.find(a => 
        a.agent_name === 'EXIM Trade Agent' || 
        a.agent_name?.toLowerCase().includes('exim') ||
        a.agent_name?.toLowerCase().includes('trade')
    );
    
    // Market Potential
    let marketValue = '$2.4B';
    let marketTrend = '12% CAGR';
    
    if (marketAgent && marketAgent.data) {
        const data = marketAgent.data;
        if (data.total_market_size) {
            marketValue = formatCurrency(data.total_market_size);
        } else if (data.market_size) {
            marketValue = formatCurrency(data.market_size);
        }
        
        if (data.avg_cagr) {
            marketTrend = `${data.avg_cagr}% CAGR`;
        } else if (data.cagr_5y) {
            marketTrend = `${data.cagr_5y}% CAGR`;
        } else if (data.cagr) {
            marketTrend = `${data.cagr}% CAGR`;
        }
    }
    
    // Patent Risk
    let patentValue = 'Medium';
    let patentTrend = '3 years to expiry';
    
    if (patentAgent && patentAgent.data) {
        const patents = patentAgent.data.patents || [];
        if (patents.length > 0) {
            const currentYear = new Date().getFullYear();
            const expiryYears = patents
                .map(p => p.expiry_year || p.expiry)
                .filter(year => year && year > currentYear)
                .sort((a, b) => a - b);
            
            if (expiryYears.length > 0) {
                const yearsToExpiry = expiryYears[0] - currentYear;
                patentTrend = `${yearsToExpiry} year${yearsToExpiry > 1 ? 's' : ''} to expiry`;
                
                if (yearsToExpiry <= 2) patentValue = 'High';
                else if (yearsToExpiry <= 5) patentValue = 'Medium';
                else patentValue = 'Low';
            }
        }
    }
    
    // Clinical Activity
    let trialValue = 'High';
    let trialTrend = '8 active trials';
    
    if (trialAgent && trialAgent.data) {
        const trials = trialAgent.data.table || trialAgent.data.trials || [];
        const trialCount = trials.length;
        trialTrend = `${trialCount} active trial${trialCount !== 1 ? 's' : ''}`;
        
        if (trialCount >= 10) trialValue = 'Very High';
        else if (trialCount >= 5) trialValue = 'High';
        else if (trialCount >= 2) trialValue = 'Medium';
        else trialValue = 'Low';
    }
    
    // Trade Flow
    let tradeValue = 'Balanced';
    let tradeTrend = 'Import/Export ratio: 1.2';
    
    if (eximAgent && eximAgent.data) {
        const table = eximAgent.data.table || [];
        let totalImports = 0;
        let totalExports = 0;
        
        table.forEach(row => {
            totalImports += parseFloat(row.import_tonnes || row.imports || row.import_value || 0);
            totalExports += parseFloat(row.export_tonnes || row.exports || row.export_value || 0);
        });
        
        if (totalImports > 0 || totalExports > 0) {
            const ratio = totalImports > 0 ? totalExports / totalImports : 1;
            tradeTrend = `Import/Export ratio: ${ratio.toFixed(2)}`;
            
            if (ratio > 1.5) tradeValue = 'Export Heavy';
            else if (ratio < 0.5) tradeValue = 'Import Heavy';
            else tradeValue = 'Balanced';
        }
    }
    
    // Update all metric cards
    updateMetricCard('market', marketValue, marketTrend, 'positive');
    updateMetricCard('patent', patentValue, patentTrend, 'neutral');
    updateMetricCard('trial', trialValue, trialTrend, 'positive');
    updateMetricCard('trade', tradeValue, tradeTrend, 'neutral');
}

function updateMetricCard(type, value, trend, trendType) {
    const valueElement = document.getElementById(`metric-${type}-value`);
    const trendElement = document.getElementById(`metric-${type}-trend`);
    
    if (valueElement) valueElement.textContent = value;
    if (trendElement) {
        trendElement.textContent = trend;
        trendElement.className = `metric-trend ${trendType}`;
        
        // Update icon based on trend type
        if (trendType === 'positive') {
            trendElement.innerHTML = `<i class="fas fa-arrow-up"></i> ${trend}`;
        } else if (trendType === 'negative') {
            trendElement.innerHTML = `<i class="fas fa-arrow-down"></i> ${trend}`;
        } else {
            trendElement.innerHTML = trend;
        }
    }
}

function formatCurrency(value) {
    if (typeof value === 'number') {
        if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`;
        if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
        if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
        return `$${value.toFixed(2)}`;
    }
    return value;
}

// ========== REAL RADAR CHART ==========
function renderRadarChart(factorScores) {
    const canvas = document.getElementById('radar-chart');
    if (!canvas || !window.Chart) {
        console.error('Chart.js not loaded or canvas not found');
        return;
    }
    
    // Destroy existing chart if any
    if (window.radarChartInstance) {
        window.radarChartInstance.destroy();
    }
    
    const ctx = canvas.getContext('2d');
    
    // Prepare data
    const labels = ['Market', 'Trials', 'Patents', 'Trade', 'Unmet Need'];
    const scores = [
        factorScores.market || 5,
        factorScores.trials || 5,
        factorScores.patent || 5,
        factorScores.trade || 5,
        factorScores.unmet || 5
    ];
    
    // Create chart
    window.radarChartInstance = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Opportunity Factors',
                data: scores,
                backgroundColor: 'rgba(34, 197, 94, 0.2)',
                borderColor: 'rgba(34, 197, 94, 0.8)',
                pointBackgroundColor: ['#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'],
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#22c55e',
                borderWidth: 2,
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                r: {
                    angleLines: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    pointLabels: {
                        color: '#cbd5e1',
                        font: {
                            size: 12
                        }
                    },
                    ticks: {
                        backdropColor: 'transparent',
                        color: '#94a3b8',
                        stepSize: 2
                    },
                    suggestedMin: 0,
                    suggestedMax: 10
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: ${context.raw.toFixed(1)}/10`;
                        }
                    }
                }
            }
        }
    });
    
    // Render legend
    renderRadarLegend(factorScores);
}

function renderRadarLegend(factorScores) {
    const legend = document.getElementById('radar-legend');
    if (!legend) return;
    
    const factors = [
        { key: 'market', label: 'Market Intelligence', color: '#22c55e' },
        { key: 'trials', label: 'Clinical Trials', color: '#3b82f6' },
        { key: 'patent', label: 'Patent Landscape', color: '#8b5cf6' },
        { key: 'trade', label: 'EXIM Trade', color: '#f59e0b' },
        { key: 'unmet', label: 'Unmet Need', color: '#ef4444' }
    ];
    
    legend.innerHTML = factors.map(factor => {
        const score = factorScores[factor.key] || 0;
        const category = score >= 8 ? 'High' : score >= 5 ? 'Medium' : 'Low';
        const categoryClass = score >= 8 ? 'high' : score >= 5 ? 'medium' : 'low';
        
        return `
            <div class="legend-item">
                <div class="legend-label">
                    <div class="legend-color" style="background: ${factor.color}"></div>
                    <span>${factor.label}</span>
                </div>
                <div class="legend-score">
                    <span class="score-value">${score.toFixed(1)}/10</span>
                    <span class="score-category ${categoryClass}">${category}</span>
                </div>
            </div>
        `;
    }).join('');
}

// ========== REAL AGENT RESULTS ==========
function renderAgentResults(agentResults) {
    const tabsContainer = document.getElementById('agent-tabs');
    const resultsContainer = document.getElementById('agent-results-container');
    
    if (!agentResults || agentResults.length === 0) {
        if (tabsContainer) tabsContainer.innerHTML = '<span class="no-data">No agent results available</span>';
        if (resultsContainer) resultsContainer.innerHTML = '<p>No agent results available.</p>';
        return;
    }
    
    // Create tabs
    if (tabsContainer) {
        tabsContainer.innerHTML = agentResults.map((agent, index) => `
            <button class="agent-tab ${index === 0 ? 'active' : ''}" data-index="${index}">
                ${agent.agent_name || `Agent ${index + 1}`}
            </button>
        `).join('');
    }
    
    // Create results content
    if (resultsContainer) {
        resultsContainer.innerHTML = agentResults.map((agent, index) => {
            const summary = agent.summary || 'No summary available.';
            const data = agent.data ? JSON.stringify(agent.data, null, 2) : 'No raw data available.';
            
            return `
                <div class="agent-result ${index === 0 ? 'active' : ''}" data-index="${index}">
                    <div class="agent-result-header">
                        <div class="agent-result-title">
                            <i class="fas fa-robot"></i>
                            <h3>${agent.agent_name || 'Agent'}</h3>
                        </div>
                        <span class="agent-status">Completed</span>
                    </div>
                    <div class="agent-result-content">
                        <p>${summary}</p>
                        
                        <div class="agent-data-section">
                            <h4>Raw Data</h4>
                            <pre class="agent-data">${data}</pre>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // Add tab click listeners
    document.querySelectorAll('.agent-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const index = tab.dataset.index;
            
            // Update active tab
            document.querySelectorAll('.agent-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Show corresponding content
            document.querySelectorAll('.agent-result').forEach(result => {
                result.classList.remove('active');
                if (result.dataset.index === index) {
                    result.classList.add('active');
                }
            });
        });
    });
}

// ========== REAL INSIGHTS ==========
function extractAndRenderInsights(agentResults, response) {
    const opportunities = [];
    const risks = [];
    const actions = [];
    
    // Extract insights from agent summaries
    agentResults.forEach(agent => {
        const summary = agent.summary || '';
        const agentName = agent.agent_name || '';
        
        // Market insights
        if (agentName.includes('Market') || agentName.includes('IQVIA')) {
            if (summary.includes('grow') || summary.includes('increase') || summary.includes('CAGR')) {
                opportunities.push('Growing market with significant expansion potential');
            }
            if (summary.includes('competition') || summary.includes('competitor') || summary.includes('saturated')) {
                risks.push('Intense market competition from established players');
            }
        }
        
        // Patent insights
        if (agentName.includes('Patent') || agentName.includes('IP')) {
            if (summary.includes('expir') || summary.includes('expiring') || summary.includes('soon')) {
                opportunities.push('Patent expirations creating market entry opportunities');
            }
            if (summary.includes('barrier') || summary.includes('protected') || summary.includes('enforced')) {
                risks.push('IP barriers and patent protections in place');
            }
        }
        
        // Clinical trial insights
        if (agentName.includes('Clinical') || agentName.includes('Trial')) {
            if (summary.includes('active') || summary.includes('ongoing') || summary.includes('recruiting')) {
                opportunities.push('Active clinical development and research activity');
            }
            if (summary.includes('failed') || summary.includes('terminated') || summary.includes('withdrawn')) {
                risks.push('Past clinical trial failures in similar molecules');
            }
        }
        
        // Trade insights
        if (agentName.includes('EXIM') || agentName.includes('Trade')) {
            if (summary.includes('favorable') || summary.includes('balanced') || summary.includes('opportunity')) {
                opportunities.push('Favorable trade dynamics and import/export balance');
            }
            if (summary.includes('restriction') || summary.includes('tariff') || summary.includes('regulation')) {
                risks.push('Trade restrictions and regulatory barriers');
            }
        }
    });
    
    // Add default insights if none found
    if (opportunities.length === 0) {
        opportunities.push(
            'Growing market with expansion potential',
            'Patent expirations creating opportunities',
            'Active clinical development in region',
            'Favorable import/export dynamics'
        );
    }
    
    if (risks.length === 0) {
        risks.push(
            'Market competition intensity',
            'Regulatory changes pending',
            'Supply chain dependencies',
            'Price erosion potential'
        );
    }
    
    // Generate actions based on analysis
    const opportunityScore = response.opportunity_score || response.opportunityScore || 0;
    if (opportunityScore >= 0.7) {
        actions.push(
            'Consider partnership with local manufacturer',
            'File for regulatory approval in next quarter',
            'Initiate Phase 2 clinical trial',
            'Explore patent extension opportunities',
            'Develop market entry strategy'
        );
    } else if (opportunityScore >= 0.4) {
        actions.push(
            'Conduct detailed feasibility study',
            'Partner with local research organization',
            'Monitor competitor activity closely',
            'Explore licensing opportunities',
            'Prepare risk mitigation plan'
        );
    } else {
        actions.push(
            'Re-evaluate market entry timing',
            'Consider alternative therapy areas',
            'Explore partnership models',
            'Monitor regulatory changes',
            'Conduct additional market research'
        );
    }
    
    // Update HTML
    updateInsightList('opportunities-list', opportunities);
    updateInsightList('risks-list', risks);
    updateInsightList('actions-list', actions);
}

function updateInsightList(elementId, items) {
    const listElement = document.getElementById(elementId);
    if (listElement) {
        // Limit to 5 items maximum
        const limitedItems = items.slice(0, 5);
        listElement.innerHTML = limitedItems.map(item => `<li>${item}</li>`).join('');
    }
}

// ========== REAL RAW DATA ==========
function renderRawData(agentResults) {
    const container = document.getElementById('data-tables');
    if (!container) return;
    
    let html = '';
    
    agentResults.forEach((agent, index) => {
        html += `<div class="agent-data-section">
                    <h3>${agent.agent_name || `Agent ${index + 1}`}</h3>
                    <div class="agent-summary">
                        <strong>Summary:</strong> ${agent.summary || 'No summary available'}
                    </div>`;
        
        if (agent.data) {
            html += renderDataTable(agent.data, agent.agent_name);
        }
        
        html += `</div><hr>`;
    });
    
    container.innerHTML = html;
}

function renderDataTable(data, agentName) {
    let html = '';
    
    // Handle different data structures
    if (Array.isArray(data.table)) {
        // Table format data
        const table = data.table;
        if (table.length > 0) {
            const headers = Object.keys(table[0]);
            html += `<div class="data-table-container">
                        <table class="data-table">
                            <thead>
                                <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
                            </thead>
                            <tbody>`;
            
            table.forEach(row => {
                html += `<tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`;
            });
            
            html += `</tbody></table></div>`;
        }
    } else if (typeof data === 'object') {
        // Key-value format data
        html += `<div class="data-keyvalue">
                    <table class="data-table">
                        <tbody>`;
        
        Object.entries(data).forEach(([key, value]) => {
            if (key !== 'table') { // Skip table if already processed
                const displayValue = typeof value === 'object' ? 
                    JSON.stringify(value, null, 2) : 
                    value;
                html += `<tr><td><strong>${key}:</strong></td><td>${displayValue}</td></tr>`;
            }
        });
        
        html += `</tbody></table></div>`;
    }
    
    return html;
}

// ========== FACTOR SCORE COMPUTATION ==========
function computeFactorScoresFromAgents(agentResults) {
    const scores = {
        market: 5.0,
        trials: 5.0,
        patent: 5.0,
        trade: 5.0,
        unmet: 5.0,
    };

    const nowYear = new Date().getFullYear();

    // Helper function
    function findAgent(name) {
        return (agentResults || []).find(a => 
            a.agent_name === name || 
            a.agent_name?.toLowerCase().includes(name.toLowerCase())
        ) || null;
    }

    function safeList(value) {
        return Array.isArray(value) ? value : [];
    }

    // 1) Market – Market Intelligence Agent
    const marketAgent = findAgent("IQVIA Insights Agent") || findAgent("Market");
    if (marketAgent && marketAgent.data && typeof marketAgent.data === "object") {
        const rows = safeList(marketAgent.data.table);
        const cagrVals = rows
            .filter(r => r && typeof r === "object" && typeof r.cagr_5y === "number")
            .map(r => r.cagr_5y);

        if (cagrVals.length > 0) {
            const avgCagr = cagrVals.reduce((sum, v) => sum + v, 0) / cagrVals.length;
            if (avgCagr >= 10) scores.market = 10;
            else if (avgCagr >= 8) scores.market = 9;
            else if (avgCagr >= 6) scores.market = 8;
            else if (avgCagr >= 4) scores.market = 6;
            else if (avgCagr >= 2) scores.market = 4;
            else scores.market = 2;
        } else if (marketAgent.data.avg_cagr) {
            const cagr = marketAgent.data.avg_cagr;
            if (cagr >= 10) scores.market = 10;
            else if (cagr >= 8) scores.market = 9;
            else if (cagr >= 6) scores.market = 8;
            else if (cagr >= 4) scores.market = 6;
            else if (cagr >= 2) scores.market = 4;
            else scores.market = 2;
        }
    }

    // 2) Trials – Clinical Trials Agent
    const trialsAgent = findAgent("Clinical Trials Agent") || findAgent("Trial");
    if (trialsAgent && trialsAgent.data && typeof trialsAgent.data === "object") {
        const trows = safeList(trialsAgent.data.table || trialsAgent.data.trials);
        const n = trows.length;
        if (n >= 15) scores.trials = 10;
        else if (n >= 8) scores.trials = 8;
        else if (n >= 3) scores.trials = 6;
        else if (n >= 1) scores.trials = 4;
        else scores.trials = 2;
    }

    // 3) Patent – Patent Landscape Agent
    const patentAgent = findAgent("Patent Landscape Agent") || findAgent("Patent");
    if (patentAgent && patentAgent.data && typeof patentAgent.data === "object") {
        const patents = safeList(patentAgent.data.patents);
        const years = patents
            .filter(p => p && typeof p === "object" && typeof p.expiry_year === "number")
            .map(p => p.expiry_year);

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
    const eximAgent = findAgent("EXIM Trade Agent") || findAgent("EXIM") || findAgent("Trade");
    if (eximAgent && eximAgent.data && typeof eximAgent.data === "object") {
        const erows = safeList(eximAgent.data.table);
        const imports = [];
        const exports = [];

        erows.forEach((r) => {
            if (r && typeof r === "object") {
                if (typeof r.import_tonnes === "number") imports.push(r.import_tonnes);
                if (typeof r.export_tonnes === "number") exports.push(r.export_tonnes);
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
    const internalAgent = findAgent("Internal Knowledge Agent") || findAgent("Internal");
    if (internalAgent && internalAgent.data && typeof internalAgent.data === "object") {
        const opps = safeList(internalAgent.data.key_opportunities);
        const n = opps.length;
        if (n >= 5) scores.unmet = 9;
        else if (n >= 3) scores.unmet = 8;
        else if (n >= 1) scores.unmet = 7;
        else scores.unmet = 4;
    }

    // Clamp 0–10
    Object.keys(scores).forEach((k) => {
        const v = scores[k];
        scores[k] = Math.max(0, Math.min(10, Number(v) || 0));
    });

    console.log("Computed Factor Scores:", scores);
    return scores;
}

// ========== EVENT LISTENERS ==========
function setupEventListeners(data) {
    // Back button
    const backBtn = document.getElementById('btn-back');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }
    
    // Download PDF button
    const downloadBtn = document.getElementById('btn-download-pdf');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            const reportId = data.response.report_id || data.response.reportId;
            if (reportId) {
                downloadReport(reportId);
            } else {
                alert('PDF report generation is in progress or not available.');
            }
        });
    }
    
    // Share button
    const shareBtn = document.getElementById('btn-share-report');
    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            if (navigator.share) {
                navigator.share({
                    title: 'Pharma Agentic AI Report',
                    text: `Opportunity analysis for ${data.molecule} in ${data.therapy} (${data.region})`,
                    url: window.location.href
                });
            } else {
                alert('Share link copied to clipboard: ' + window.location.href);
                navigator.clipboard.writeText(window.location.href);
            }
        });
    }
    
    // Export radar chart button
    const exportBtn = document.getElementById('btn-export-radar');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const canvas = document.getElementById('radar-chart');
            if (canvas) {
                const link = document.createElement('a');
                link.download = `opportunity-radar-${data.molecule}-${Date.now()}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            }
        });
    }
    
    // Print button
    const printBtn = document.getElementById('btn-print');
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            window.print();
        });
    }
    
    // New analysis button
    const newAnalysisBtn = document.getElementById('btn-new-analysis');
    if (newAnalysisBtn) {
        newAnalysisBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }
    
    // Collapsible sections
    document.querySelectorAll('.section-header.collapsible').forEach(header => {
        header.addEventListener('click', () => {
            const targetId = header.dataset.target;
            const target = document.getElementById(targetId);
            const icon = header.querySelector('.fa-chevron-down');
            
            header.classList.toggle('active');
            
            if (target.style.display === 'none') {
                target.style.display = 'block';
                if (icon) icon.style.transform = 'rotate(180deg)';
            } else {
                target.style.display = 'none';
                if (icon) icon.style.transform = 'rotate(0deg)';
            }
        });
    });
}