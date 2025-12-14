// Chat functionality
document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');
    const agentChips = document.querySelectorAll('.agent-chip');
    const clearAgentsBtn = document.getElementById('btn-clear-agents');
    const presetButtons = document.querySelectorAll('.preset-btn');
    const loadingOverlay = document.getElementById('loading-overlay');
    const paramMolecule = document.getElementById('param-molecule');
    const paramTherapy = document.getElementById('param-therapy');
    const paramRegion = document.getElementById('param-region');
    
    // Initialize
    initializeChat();
    
    function initializeChat() {
        console.log('Initializing chat...');
        
        // Agent chip selection
        agentChips.forEach(chip => {
            chip.addEventListener('click', () => {
                chip.classList.toggle('selected');
            });
        });
        
        // Clear all agents
        clearAgentsBtn.addEventListener('click', () => {
            agentChips.forEach(chip => chip.classList.remove('selected'));
        });
        
        // Preset buttons
        presetButtons.forEach(button => {
            button.addEventListener('click', () => {
                const preset = button.dataset.preset;
                applyPreset(preset);
            });
        });
        
        // Form submission - ✅ YEH IMPORTANT HAI
        if (chatForm) {
            chatForm.addEventListener('submit', handleSubmit);
            console.log('Form submit listener attached');
        } else {
            console.error('Chat form not found!');
        }
        
        // Auto-resize textarea
        if (chatInput) {
            chatInput.addEventListener('input', autoResizeTextarea);
        }
    }
    
    function showToast(message, type = 'info') {
        // Simple toast implementation
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'warning' ? '#f59e0b' : '#22c55e'};
            color: white;
            border-radius: 8px;
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    function autoResizeTextarea() {
        if (chatInput) {
            chatInput.style.height = 'auto';
            chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
        }
    }
    
    function applyPreset(preset) {
        const presets = {
            'asthma-india': {
                text: "Perform a complete opportunity assessment for MOLX in the Indian Asthma market including market, EXIM, patents, trials, internal insights and guidelines.",
                molecule: "MOLX",
                therapy: "Asthma",
                region: "India"
            },
            'lung-cancer-au': {
                text: "Assess the Lung Cancer market opportunity for MOLH1 in Australia with focus on CAGR, competitor density, clinical trials and IP barriers.",
                molecule: "MOLH1",
                therapy: "Lung Cancer",
                region: "Australia"
            },
            'ckd-india': {
                text: "Evaluate MOL2 in the Indian Chronic Kidney Disease space, highlighting decline risk, unmet needs and whitespace.",
                molecule: "MOL2",
                therapy: "Chronic Kidney Disease",
                region: "India"
            },
            'respiratory-global': {
                text: "Generate a global respiratory assessment for MOLR3 with special focus on Canada and China trade flows and trial activity.",
                molecule: "MOLR3",
                therapy: "Respiratory",
                region: "Global"
            }
        };
        
        const presetData = presets[preset];
        if (!presetData) return;
        
        // Fill inputs
        if (chatInput) chatInput.value = presetData.text;
        if (paramMolecule) paramMolecule.value = presetData.molecule;
        if (paramTherapy) paramTherapy.value = presetData.therapy;
        if (paramRegion) paramRegion.value = presetData.region;
        
        // Auto-resize
        autoResizeTextarea();
        
        // Add user message
        addMessage(presetData.text, 'user');
    }
    
    function addMessage(text, sender) {
        if (!chatMessages) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${sender}`;
        
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-${sender === 'user' ? 'user' : 'robot'}"></i>
            </div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-sender">${sender === 'user' ? 'You' : 'Pharma Agentic AI'}</span>
                    <span class="message-time">${timestamp}</span>
                </div>
                <div class="message-text">${text}</div>
            </div>
        `;
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    function showLoading() {
        if (loadingOverlay) {
            loadingOverlay.style.display = 'flex';
            
            // Animate agent loading
            const agents = document.querySelectorAll('.loading-agent');
            let index = 0;
            
            const interval = setInterval(() => {
                agents.forEach((agent, i) => {
                    agent.classList.toggle('active', i === index);
                });
                index = (index + 1) % agents.length;
            }, 1000);
            
            return interval;
        }
        return null;
    }
    
    function hideLoading(interval) {
        if (interval) clearInterval(interval);
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }
    
    // ✅ MAIN SUBMIT HANDLER - Ye function properly defined hai
    async function handleSubmit(e) {
        e.preventDefault();
        console.log('Form submitted!');
        
        if (!chatInput || !paramMolecule || !paramTherapy || !paramRegion) {
            showToast('Form elements not found!', 'warning');
            return;
        }
        
        const query = chatInput.value.trim();
        const molecule = paramMolecule.value.trim();
        const therapy = paramTherapy.value.trim();
        const region = paramRegion.value.trim();
        
        // Get selected agents
        const selectedAgents = Array.from(document.querySelectorAll('.agent-chip.selected'))
            .map(chip => chip.dataset.agent);
        
        // Validation
        if (!query) {
            showToast('Please enter a query', 'warning');
            return;
        }
        
        if (!molecule || !therapy || !region) {
            showToast('Please fill all parameters: Molecule, Therapy Area, and Region', 'warning');
            return;
        }
        
        if (selectedAgents.length === 0) {
            showToast('Please select at least one agent to run', 'warning');
            return;
        }
        
        // Add user message
        addMessage(query, 'user');
        
        // Show loading
        const loadingInterval = showLoading();
        
        // Prepare payload
        const payload = {
            prompt: query,
            molecule: molecule,
            therapy_area: therapy,
            region: region,
            tasks: selectedAgents,
            output_format: "summary+pdf"
        };
        
        console.log('Sending payload:', payload);
        
        try {
            // Call API
            console.log('Calling API...');
            const response = await runQuery(payload);
            console.log('API Response received:', response);
            
            // Create data object
            const reportData = {
                query: query,
                molecule: molecule,
                therapy: therapy,
                region: region,
                agents: selectedAgents,
                response: response,
                timestamp: new Date().toISOString()
            };
            
            // Store in localStorage as backup
            localStorage.setItem('lastReport', JSON.stringify(reportData));
            
            // ✅ SIMPLE SOLUTION: Use base64 in URL
            const base64Data = btoa(JSON.stringify(reportData));
            console.log('Redirecting to report with data length:', base64Data.length);
            
            // Redirect
            window.location.href = `report.html?data=${base64Data}`;
            
        } catch (error) {
            console.error('API Error:', error);
            addMessage(`Error: ${error.message}`, 'system');
            showToast('Analysis failed. Please try again.', 'warning');
        } finally {
            hideLoading(loadingInterval);
        }
    }
    
    // Add CSS for toast animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
});