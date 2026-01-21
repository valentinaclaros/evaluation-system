// Global state
let agents = [];
let auditors = [];
let audits = [];
let feedbacks = [];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
});

async function initializeApp() {
    await loadDashboard();
    await loadAgents();
    await loadAuditors();
}

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            showSection(section);
        });
    });

    // Forms
    document.getElementById('agent-form').addEventListener('submit', handleAgentSubmit);
    document.getElementById('audit-form').addEventListener('submit', handleAuditSubmit);
    document.getElementById('feedback-form').addEventListener('submit', handleFeedbackSubmit);
}

function showSection(sectionId) {
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-section="${sectionId}"]`).classList.add('active');

    // Update content
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(sectionId).classList.add('active');

    // Load section data
    switch(sectionId) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'agents':
            loadAgentsTable();
            break;
        case 'audits':
            loadAuditsTable();
            break;
        case 'feedbacks':
            loadFeedbacksTable();
            break;
        case 'analytics':
            loadAnalyticsAgents();
            break;
    }
}

// API calls
async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(endpoint, options);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        showNotification('Error en la conexión con el servidor', 'error');
        throw error;
    }
}

// Dashboard
async function loadDashboard() {
    try {
        const stats = await apiCall('/api/analytics/dashboard');
        
        document.getElementById('total-agents').textContent = stats.total_agents;
        document.getElementById('total-audits').textContent = stats.total_audits;
        document.getElementById('total-feedbacks').textContent = stats.total_feedbacks;
        document.getElementById('critical-errors').textContent = stats.critical_errors_count;
        document.getElementById('avg-error-rate').textContent = `${stats.average_error_rate}%`;
        document.getElementById('promoter-pct').textContent = `${stats.tnps_promoter_percentage}%`;
        document.getElementById('detractor-pct').textContent = `${stats.tnps_detractor_percentage}%`;

        // Load agents ranking
        await loadAgentsRanking();
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

async function loadAgentsRanking() {
    try {
        const ranking = await apiCall('/api/analytics/agents/ranking?limit=10&order_by=error_rate');
        
        const tableHTML = `
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Agente</th>
                        <th>Departamento</th>
                        <th>Total Llamadas</th>
                        <th>Tasa de Error</th>
                        <th>TNPS</th>
                    </tr>
                </thead>
                <tbody>
                    ${ranking.map((agent, index) => `
                        <tr>
                            <td><strong>${index + 1}</strong></td>
                            <td>${agent.agent_name}</td>
                            <td>${agent.department || '-'}</td>
                            <td>${agent.total_calls}</td>
                            <td>
                                <span class="badge ${agent.error_rate < 10 ? 'badge-success' : agent.error_rate < 20 ? 'badge-warning' : 'badge-danger'}">
                                    ${agent.error_rate}%
                                </span>
                            </td>
                            <td>${agent.tnps_score}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        document.getElementById('agents-ranking-table').innerHTML = ranking.length > 0 ? tableHTML : '<p class="empty-state">No hay datos disponibles</p>';
    } catch (error) {
        console.error('Error loading ranking:', error);
    }
}

// Agents
async function loadAgents() {
    try {
        agents = await apiCall('/api/agents/');
        populateAgentSelects();
    } catch (error) {
        console.error('Error loading agents:', error);
    }
}

function populateAgentSelects() {
    const selects = [
        document.getElementById('audit-agent-select'),
        document.getElementById('feedback-agent-select'),
        document.getElementById('filter-agent'),
        document.getElementById('analytics-agent-select')
    ];

    selects.forEach(select => {
        if (select) {
            const currentValue = select.value;
            select.innerHTML = '<option value="">Seleccionar...</option>' + 
                agents.map(agent => `<option value="${agent.id}">${agent.name}</option>`).join('');
            if (currentValue) select.value = currentValue;
        }
    });
}

async function loadAgentsTable() {
    try {
        const agentsList = await apiCall('/api/agents/');
        
        const tableHTML = `
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Nombre</th>
                        <th>Email</th>
                        <th>Departamento</th>
                        <th>Cargo</th>
                        <th>Fecha de Ingreso</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${agentsList.map(agent => `
                        <tr>
                            <td>${agent.id}</td>
                            <td><strong>${agent.name}</strong></td>
                            <td>${agent.email}</td>
                            <td>${agent.department || '-'}</td>
                            <td>${agent.position || '-'}</td>
                            <td>${formatDate(agent.hire_date)}</td>
                            <td>
                                <div class="action-buttons">
                                    <button class="action-btn btn-primary" onclick="viewAgentPerformance(${agent.id})">
                                        <i class="fas fa-chart-line"></i> Ver Desempeño
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        document.getElementById('agents-table').innerHTML = agentsList.length > 0 ? tableHTML : '<p class="empty-state">No hay agentes registrados</p>';
    } catch (error) {
        console.error('Error loading agents table:', error);
    }
}

function showAgentForm() {
    document.getElementById('agent-modal').classList.add('active');
}

async function handleAgentSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    try {
        await apiCall('/api/agents/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        showNotification('Agente creado exitosamente', 'success');
        closeModal('agent-modal');
        e.target.reset();
        await loadAgents();
        await loadAgentsTable();
    } catch (error) {
        showNotification('Error al crear agente', 'error');
    }
}

// Auditors
async function loadAuditors() {
    try {
        auditors = await apiCall('/api/auditors/');
        populateAuditorSelects();
    } catch (error) {
        console.error('Error loading auditors:', error);
        // If no auditors exist, create a default one
        if (auditors.length === 0) {
            await createDefaultAuditor();
        }
    }
}

async function createDefaultAuditor() {
    try {
        await apiCall('/api/auditors/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Sistema de Auditoría',
                email: 'sistema@auditoria.com'
            })
        });
        await loadAuditors();
    } catch (error) {
        console.error('Error creating default auditor:', error);
    }
}

function populateAuditorSelects() {
    const select = document.getElementById('audit-auditor-select');
    if (select) {
        select.innerHTML = '<option value="">Seleccionar...</option>' + 
            auditors.map(auditor => `<option value="${auditor.id}">${auditor.name}</option>`).join('');
    }
}

// Audits
async function loadAuditsTable(filters = {}) {
    try {
        let url = '/api/audits/?limit=100';
        
        if (filters.agent_id) url += `&agent_id=${filters.agent_id}`;
        if (filters.start_date) url += `&start_date=${filters.start_date}`;
        if (filters.end_date) url += `&end_date=${filters.end_date}`;
        if (filters.criticality) url += `&criticality=${filters.criticality}`;

        audits = await apiCall(url);
        
        const tableHTML = `
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Fecha Llamada</th>
                        <th>Customer ID</th>
                        <th>Agente</th>
                        <th>Tipo</th>
                        <th>Criticidad</th>
                        <th>Error</th>
                        <th>TNPS</th>
                    </tr>
                </thead>
                <tbody>
                    ${audits.map(audit => `
                        <tr>
                            <td>${audit.id}</td>
                            <td>${formatDateTime(audit.call_date)}</td>
                            <td>${audit.customer_id}</td>
                            <td>${audit.agent.name}</td>
                            <td>
                                <span class="badge badge-info">
                                    ${audit.call_type === 'tarjeta_credito' ? 'Tarjeta' : 'Cuenta'}
                                </span>
                            </td>
                            <td>
                                <span class="badge ${getCriticalityClass(audit.criticality_level)}">
                                    ${audit.criticality_level}
                                </span>
                            </td>
                            <td>${audit.error_type || '-'}</td>
                            <td>
                                ${audit.tnps_score ? `<span class="badge ${getTNPSClass(audit.tnps_score)}">${audit.tnps_score}</span>` : '-'}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        document.getElementById('audits-table').innerHTML = audits.length > 0 ? tableHTML : '<p class="empty-state">No hay auditorías registradas</p>';
    } catch (error) {
        console.error('Error loading audits:', error);
    }
}

function showAuditForm() {
    document.getElementById('audit-modal').classList.add('active');
}

async function handleAuditSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    // Convert to proper format
    data.agent_id = parseInt(data.agent_id);
    data.auditor_id = parseInt(data.auditor_id);
    data.call_date = new Date(data.call_date).toISOString();

    try {
        await apiCall('/api/audits/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        showNotification('Auditoría registrada exitosamente', 'success');
        closeModal('audit-modal');
        e.target.reset();
        await loadAuditsTable();
        await loadDashboard();
    } catch (error) {
        showNotification('Error al registrar auditoría', 'error');
    }
}

function applyAuditFilters() {
    const filters = {
        agent_id: document.getElementById('filter-agent').value,
        start_date: document.getElementById('filter-start-date').value,
        end_date: document.getElementById('filter-end-date').value,
        criticality: document.getElementById('filter-criticality').value
    };
    
    loadAuditsTable(filters);
}

// Feedbacks
async function loadFeedbacksTable(agentId = null) {
    try {
        let url = '/api/feedbacks/?limit=100';
        if (agentId) url += `&agent_id=${agentId}`;

        feedbacks = await apiCall(url);
        
        const tableHTML = `
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Fecha</th>
                        <th>Agente</th>
                        <th>Título</th>
                        <th>Mejora</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${feedbacks.map(feedback => `
                        <tr>
                            <td>${feedback.id}</td>
                            <td>${formatDateTime(feedback.feedback_date)}</td>
                            <td>${feedback.agent.name}</td>
                            <td><strong>${feedback.title}</strong></td>
                            <td>
                                ${feedback.improvement_percentage !== null ? 
                                    `<span class="badge ${feedback.improvement_percentage > 0 ? 'badge-success' : 'badge-danger'}">
                                        ${feedback.improvement_percentage > 0 ? '+' : ''}${feedback.improvement_percentage.toFixed(1)}%
                                    </span>` 
                                    : '<span class="badge badge-secondary">Pendiente</span>'}
                            </td>
                            <td>
                                <div class="action-buttons">
                                    <button class="action-btn btn-primary" onclick="analyzeFeedback(${feedback.id})">
                                        <i class="fas fa-chart-line"></i> Analizar
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        document.getElementById('feedbacks-table').innerHTML = feedbacks.length > 0 ? tableHTML : '<p class="empty-state">No hay feedbacks registrados</p>';
    } catch (error) {
        console.error('Error loading feedbacks:', error);
    }
}

function showFeedbackForm() {
    document.getElementById('feedback-modal').classList.add('active');
}

async function handleFeedbackSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    // Convert to proper format
    data.agent_id = parseInt(data.agent_id);
    data.feedback_date = new Date(data.feedback_date).toISOString();

    try {
        await apiCall('/api/feedbacks/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        showNotification('Feedback registrado exitosamente', 'success');
        closeModal('feedback-modal');
        e.target.reset();
        await loadFeedbacksTable();
        await loadDashboard();
    } catch (error) {
        showNotification('Error al registrar feedback', 'error');
    }
}

async function analyzeFeedback(feedbackId) {
    try {
        const result = await apiCall(`/api/feedbacks/${feedbackId}/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ days_before: 30, days_after: 30 })
        });

        showNotification(`Análisis completado: ${result.status}. Mejora: ${result.improvement_percentage.toFixed(1)}%`, 'success');
        await loadFeedbacksTable();
    } catch (error) {
        showNotification('Error al analizar feedback', 'error');
    }
}

// Analytics
async function loadAnalyticsAgents() {
    await loadAgents();
}

async function loadAgentAnalytics() {
    const agentId = document.getElementById('analytics-agent-select').value;
    
    if (!agentId) {
        document.getElementById('analytics-content').style.display = 'none';
        return;
    }

    try {
        const performance = await apiCall(`/api/analytics/agents/${agentId}/performance`);
        
        document.getElementById('analytics-content').style.display = 'block';
        
        // Update stats
        document.getElementById('agent-total-calls').textContent = performance.total_calls;
        document.getElementById('agent-total-errors').textContent = performance.total_errors;
        document.getElementById('agent-error-rate').textContent = `${performance.error_rate}%`;
        document.getElementById('agent-tnps').textContent = performance.tnps_score || '-';

        // Update TNPS distribution
        const total = performance.promoter_count + performance.neutral_count + performance.detractor_count + performance.null_count;
        
        const promoterPct = (performance.promoter_count / total * 100) || 0;
        const neutralPct = (performance.neutral_count / total * 100) || 0;
        const detractorPct = (performance.detractor_count / total * 100) || 0;
        const nullPct = (performance.null_count / total * 100) || 0;

        document.getElementById('promoter-bar').style.width = `${promoterPct}%`;
        document.getElementById('neutral-bar').style.width = `${neutralPct}%`;
        document.getElementById('detractor-bar').style.width = `${detractorPct}%`;
        document.getElementById('null-bar').style.width = `${nullPct}%`;

        document.getElementById('promoter-legend').textContent = `Promotores: ${performance.promoter_count}`;
        document.getElementById('neutral-legend').textContent = `Neutrales: ${performance.neutral_count}`;
        document.getElementById('detractor-legend').textContent = `Detractores: ${performance.detractor_count}`;
        document.getElementById('null-legend').textContent = `Sin respuesta: ${performance.null_count}`;

        // Update error distribution
        const errorDist = performance.error_distribution || {};
        const maxErrors = Math.max(...Object.values(errorDist), 1);
        
        const errorHTML = Object.entries(errorDist).length > 0 ? 
            Object.entries(errorDist).map(([type, count]) => `
                <div class="error-bar">
                    <div class="error-label">${type}</div>
                    <div class="error-bar-container">
                        <div class="error-bar-fill" style="width: ${(count / maxErrors * 100)}%">
                            ${count}
                        </div>
                    </div>
                </div>
            `).join('') : '<p class="empty-state">No hay errores registrados</p>';
        
        document.getElementById('error-distribution').innerHTML = errorHTML;

        // Load agent feedbacks
        await loadAgentFeedbacks(agentId);

    } catch (error) {
        console.error('Error loading agent analytics:', error);
        showNotification('Error al cargar análisis del agente', 'error');
    }
}

async function loadAgentFeedbacks(agentId) {
    try {
        const feedbacks = await apiCall(`/api/feedbacks/?agent_id=${agentId}`);
        
        const feedbackHTML = feedbacks.length > 0 ?
            feedbacks.map(feedback => `
                <div class="feedback-card">
                    <div class="feedback-header">
                        <div>
                            <div class="feedback-title">${feedback.title}</div>
                            <div class="feedback-date">${formatDateTime(feedback.feedback_date)}</div>
                        </div>
                        ${feedback.improvement_percentage === null ? 
                            `<button class="btn btn-primary btn-sm" onclick="analyzeFeedback(${feedback.id})">
                                <i class="fas fa-chart-line"></i> Analizar Impacto
                            </button>` : ''}
                    </div>
                    <div class="feedback-description">${feedback.description}</div>
                    ${feedback.improvement_percentage !== null ? `
                        <div class="feedback-metrics">
                            <div class="feedback-metric">
                                <span class="feedback-metric-value">${feedback.errors_before}</span>
                                <span class="feedback-metric-label">Errores Antes</span>
                            </div>
                            <div class="feedback-metric">
                                <span class="feedback-metric-value">${feedback.errors_after}</span>
                                <span class="feedback-metric-label">Errores Después</span>
                            </div>
                            <div class="feedback-metric">
                                <span class="feedback-metric-value ${feedback.improvement_percentage > 0 ? 'improvement-positive' : 'improvement-negative'}">
                                    ${feedback.improvement_percentage > 0 ? '+' : ''}${feedback.improvement_percentage.toFixed(1)}%
                                </span>
                                <span class="feedback-metric-label">Mejora</span>
                            </div>
                        </div>
                    ` : ''}
                </div>
            `).join('') : '<p class="empty-state">No hay feedbacks registrados para este agente</p>';
        
        document.getElementById('agent-feedbacks').innerHTML = feedbackHTML;
    } catch (error) {
        console.error('Error loading agent feedbacks:', error);
    }
}

function viewAgentPerformance(agentId) {
    document.getElementById('analytics-agent-select').value = agentId;
    showSection('analytics');
    loadAgentAnalytics();
}

// Utility Functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getCriticalityClass(level) {
    const classes = {
        'baja': 'badge-info',
        'media': 'badge-warning',
        'alta': 'badge-danger',
        'crítica': 'badge-danger'
    };
    return classes[level] || 'badge-secondary';
}

function getTNPSClass(score) {
    const classes = {
        'promoter': 'badge-success',
        'neutral': 'badge-warning',
        'detractor': 'badge-danger',
        'null': 'badge-secondary'
    };
    return classes[score] || 'badge-secondary';
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        border-radius: 0.5rem;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        z-index: 9999;
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

