// ===================================
// Detalle de Feedbacks - Lógica
// ===================================

let currentFilters = {
    dateFrom: null,
    dateTo: null,
    type: '',
    priority: ''
};

// Cargar datos al iniciar
document.addEventListener('DOMContentLoaded', async function() {
    // Establecer fechas por defecto (últimos 30 días)
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    document.getElementById('filterDateFrom').valueAsDate = thirtyDaysAgo;
    document.getElementById('filterDateTo').valueAsDate = today;
    
    currentFilters.dateFrom = thirtyDaysAgo.toISOString().split('T')[0];
    currentFilters.dateTo = today.toISOString().split('T')[0];
    
    await loadAgentsWithFeedbacks();
    
    // Verificar si hay parámetros en la URL para abrir automáticamente un agente
    const urlParams = new URLSearchParams(window.location.search);
    const agentId = urlParams.get('agentId');
    const feedbackId = urlParams.get('feedbackId');
    
    if (agentId) {
        // Esperar a que se carguen los datos y luego abrir el agente
        setTimeout(() => {
            toggleAgentFeedbacks(agentId);
            // Hacer scroll al agente
            const agentCard = document.querySelector(`[onclick="toggleAgentFeedbacks('${agentId}')"]`);
            if (agentCard) {
                agentCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            
            // Si hay un feedbackId específico, hacer scroll
            if (feedbackId) {
                setTimeout(() => {
                    const feedbackCard = document.querySelector(`[data-feedback-id="${feedbackId}"]`);
                    if (feedbackCard) {
                        feedbackCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        feedbackCard.style.animation = 'pulse 1s ease';
                    }
                }, 500);
            }
        }, 500);
    }
});

// Aplicar filtros
async function applyFilters() {
    const dateFrom = document.getElementById('filterDateFrom').value;
    const dateTo = document.getElementById('filterDateTo').value;
    const type = document.getElementById('filterType').value;
    const priority = document.getElementById('filterPriority').value;
    
    if (dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo)) {
        alert('La fecha inicial no puede ser mayor a la fecha final');
        return;
    }
    
    currentFilters.dateFrom = dateFrom || null;
    currentFilters.dateTo = dateTo || null;
    currentFilters.type = type;
    currentFilters.priority = priority;
    
    await loadAgentsWithFeedbacks();
}

// Cargar agentes con sus feedbacks
async function loadAgentsWithFeedbacks() {
    const agents = await getAgents();
    const feedbacks = await getFeedbacks();
    const container = document.getElementById('agentsContainer');
    
    if (agents.length === 0) {
        container.innerHTML = `
            <div class="no-feedbacks">
                <div style="font-size: 3rem; margin-bottom: 1rem;">👥</div>
                <p>No hay agentes registrados en el sistema</p>
                <a href="agentes.html" class="btn btn-primary" style="margin-top: 1rem;">Registrar Agente</a>
            </div>
        `;
        return;
    }
    
    // Filtrar y agrupar feedbacks por agente
    const agentsWithFeedbacks = agents.map(agent => {
        let agentFeedbacks = feedbacks.filter(feedback => feedback.agentId === agent.id);
        
        // Aplicar filtros
        if (currentFilters.dateFrom) {
            agentFeedbacks = agentFeedbacks.filter(feedback => 
                new Date(feedback.feedbackDate) >= new Date(currentFilters.dateFrom)
            );
        }
        if (currentFilters.dateTo) {
            agentFeedbacks = agentFeedbacks.filter(feedback => 
                new Date(feedback.feedbackDate) <= new Date(currentFilters.dateTo)
            );
        }
        if (currentFilters.type) {
            agentFeedbacks = agentFeedbacks.filter(feedback => 
                feedback.feedbackType === currentFilters.type
            );
        }
        if (currentFilters.priority) {
            agentFeedbacks = agentFeedbacks.filter(feedback => 
                feedback.priority === currentFilters.priority
            );
        }
        
        // Ordenar por fecha (más recientes primero)
        agentFeedbacks.sort((a, b) => new Date(b.feedbackDate) - new Date(a.feedbackDate));
        
        // Calcular estadísticas del agente
        const totalFeedbacks = agentFeedbacks.length;
        const correctivos = agentFeedbacks.filter(f => f.feedbackType === 'correctivo').length;
        const positivos = agentFeedbacks.filter(f => f.feedbackType === 'positivo').length;
        const constructivos = agentFeedbacks.filter(f => f.feedbackType === 'constructivo').length;
        
        return {
            agent,
            feedbacks: agentFeedbacks,
            totalFeedbacks,
            correctivos,
            positivos,
            constructivos
        };
    });
    
    // Filtrar agentes sin feedbacks en el período seleccionado
    const agentsWithData = agentsWithFeedbacks.filter(a => a.totalFeedbacks > 0);
    
    if (agentsWithData.length === 0) {
        container.innerHTML = `
            <div class="no-feedbacks">
                <div style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
                <p>No se encontraron feedbacks con los filtros aplicados</p>
                <button onclick="clearFilters()" class="btn btn-secondary" style="margin-top: 1rem;">Limpiar Filtros</button>
            </div>
        `;
        return;
    }
    
    // Ordenar por total de feedbacks (descendente)
    agentsWithData.sort((a, b) => b.totalFeedbacks - a.totalFeedbacks);
    
    // Generar HTML
    container.innerHTML = agentsWithData.map(agentData => `
        <div class="agent-card">
            <div class="agent-header" onclick="toggleAgentFeedbacks('${agentData.agent.id}')">
                <div class="agent-info">
                    <div class="agent-name">${agentData.agent.name}</div>
                    <div class="agent-stats">
                        <div class="agent-stat">
                            <span class="agent-stat-label">Total Feedbacks</span>
                            <span class="agent-stat-value">${agentData.totalFeedbacks}</span>
                        </div>
                        <div class="agent-stat">
                            <span class="agent-stat-label">🔴 Correctivos</span>
                            <span class="agent-stat-value">${agentData.correctivos}</span>
                        </div>
                        <div class="agent-stat">
                            <span class="agent-stat-label">🟡 Constructivos</span>
                            <span class="agent-stat-value">${agentData.constructivos}</span>
                        </div>
                        <div class="agent-stat">
                            <span class="agent-stat-label">🟢 Positivos</span>
                            <span class="agent-stat-value">${agentData.positivos}</span>
                        </div>
                    </div>
                </div>
                <div class="expand-icon" id="icon-${agentData.agent.id}">▼</div>
            </div>
            <div class="agent-feedbacks" id="feedbacks-${agentData.agent.id}">
                ${renderFeedbacks(agentData.feedbacks)}
            </div>
        </div>
    `).join('');
}

// Alternar visualización de feedbacks de un agente
function toggleAgentFeedbacks(agentId) {
    const feedbacksContainer = document.getElementById(`feedbacks-${agentId}`);
    const icon = document.getElementById(`icon-${agentId}`);
    
    if (feedbacksContainer.classList.contains('expanded')) {
        feedbacksContainer.classList.remove('expanded');
        icon.classList.remove('expanded');
    } else {
        feedbacksContainer.classList.add('expanded');
        icon.classList.add('expanded');
    }
}

// Renderizar feedbacks
function renderFeedbacks(feedbacks) {
    if (feedbacks.length === 0) {
        return '<div class="no-feedbacks">No hay feedbacks para este agente</div>';
    }
    
    return feedbacks.map(feedback => {
        return `
        <div class="feedback-item" data-feedback-id="${feedback.id}">
            <div class="feedback-header-info">
                <div class="feedback-date">📅 ${formatDate(feedback.feedbackDate)}</div>
                <div class="feedback-badges">
                    ${getFeedbackTypeBadge(feedback.feedbackType)}
                    ${getPriorityBadge(feedback.priority)}
                    ${feedback.feedbackProcess ? getProcessBadge(feedback.feedbackProcess) : ''}
                    ${feedback.additionalSteps ? getAdditionalStepsBadge(feedback.additionalSteps) : ''}
                </div>
            </div>
            
            <div class="feedback-details">
                <div class="feedback-detail-item">
                    <span class="feedback-detail-label">Dado por</span>
                    <span class="feedback-detail-value">${feedback.feedbackGivenBy}</span>
                </div>
                ${feedback.feedbackProcess ? `
                <div class="feedback-detail-item">
                    <span class="feedback-detail-label">Proceso</span>
                    <span class="feedback-detail-value">${getProcessLabel(feedback.feedbackProcess)}</span>
                </div>
                ` : ''}
                ${feedback.followUpDate ? `
                <div class="feedback-detail-item">
                    <span class="feedback-detail-label">Fecha de Seguimiento</span>
                    <span class="feedback-detail-value">${formatDate(feedback.followUpDate)}</span>
                </div>
                ` : ''}
            </div>
            
            <div class="feedback-message-box">
                <div class="feedback-message-title">💬 Mensaje del Feedback:</div>
                <p class="feedback-message-text">${feedback.feedbackMessage}</p>
            </div>
            
            ${feedback.actionPlan ? `
            <div class="feedback-message-box" style="border-left-color: var(--success-color); margin-top: 1rem;">
                <div class="feedback-message-title">📋 Plan de Acción:</div>
                <p class="feedback-message-text">${feedback.actionPlan}</p>
            </div>
            ` : ''}
            
            ${feedback.relatedCalls && feedback.relatedCalls.length > 0 ? `
            <div class="feedback-message-box" style="border-left-color: var(--info-color); margin-top: 1rem;">
                <div class="feedback-message-title">🔗 Llamadas Relacionadas:</div>
                <p class="feedback-message-text">${feedback.relatedCalls.length} llamada(s) relacionada(s)</p>
            </div>
            ` : ''}
            
            <div class="feedback-actions">
                <button onclick="editFeedbackFromDetail('${feedback.id}')" class="btn btn-primary" style="padding: 0.5rem 1rem; font-size: 0.9rem;">
                    ✏️ Editar
                </button>
                <button onclick="deleteFeedbackFromDetail('${feedback.id}')" class="btn btn-danger" style="padding: 0.5rem 1rem; font-size: 0.9rem;">
                    🗑️ Eliminar
                </button>
            </div>
        </div>
        `;
    }).join('');
}

// Editar feedback desde el detalle
function editFeedbackFromDetail(feedbackId) {
    localStorage.setItem('editingFeedbackId', feedbackId);
    window.location.href = 'registrar-feedback.html?edit=' + feedbackId;
}

// Eliminar feedback desde el detalle
async function deleteFeedbackFromDetail(feedbackId) {
    if (confirm('¿Estás seguro de que deseas eliminar este feedback?\n\nEsta acción no se puede deshacer.')) {
        await deleteFeedback(feedbackId);
        await loadAgentsWithFeedbacks();
        alert('✅ Feedback eliminado correctamente');
    }
}

// Limpiar filtros
async function clearFilters() {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    document.getElementById('filterDateFrom').valueAsDate = thirtyDaysAgo;
    document.getElementById('filterDateTo').valueAsDate = today;
    document.getElementById('filterType').value = '';
    document.getElementById('filterPriority').value = '';
    
    currentFilters = {
        dateFrom: thirtyDaysAgo.toISOString().split('T')[0],
        dateTo: today.toISOString().split('T')[0],
        type: '',
        priority: ''
    };
    
    await loadAgentsWithFeedbacks();
}
