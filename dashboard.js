// ===================================
// Dashboard - Lógica y visualización
// ===================================

let currentDateFilter = {
    from: null,
    to: null
};

// Cargar dashboard al iniciar
document.addEventListener('DOMContentLoaded', async function() {
    // Establecer fechas por defecto (últimos 30 días)
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    document.getElementById('dateFrom').valueAsDate = thirtyDaysAgo;
    document.getElementById('dateTo').valueAsDate = today;
    
    currentDateFilter.from = thirtyDaysAgo.toISOString().split('T')[0];
    currentDateFilter.to = today.toISOString().split('T')[0];
    
    await loadDashboard();
});

// Filtrar por fecha
async function filterByDate() {
    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;
    
    if (!dateFrom || !dateTo) {
        alert('Por favor selecciona ambas fechas');
        return;
    }
    
    if (new Date(dateFrom) > new Date(dateTo)) {
        alert('La fecha inicial no puede ser mayor a la fecha final');
        return;
    }
    
    currentDateFilter.from = dateFrom;
    currentDateFilter.to = dateTo;
    
    await loadDashboard();
}

// Cargar todos los datos del dashboard
async function loadDashboard() {
    await loadMetrics();
    await loadTnpsDistribution();
    await loadCriticalityDistribution();
    await loadAgentsRanking();
    await loadRecentCalls();
    await loadRecentFeedbacks();
}

// Cargar métricas principales
async function loadMetrics() {
    const audits = await getAudits();
    const feedbacks = await getFeedbacks();
    const agents = await getAgents();
    
    // Filtrar auditorías por fecha
    const filteredAudits = audits.filter(audit => {
        const callDate = new Date(audit.callDate);
        return callDate >= new Date(currentDateFilter.from) && 
               callDate <= new Date(currentDateFilter.to);
    });
    
    // Total de llamadas
    document.getElementById('totalCalls').textContent = filteredAudits.length;
    
    // Errores críticos y altos
    const criticalErrors = filteredAudits.filter(a => 
        a.criticality === 'critico' || a.criticality === 'alto' || a.criticality === 'alta'
    ).length;
    document.getElementById('criticalErrors').textContent = criticalErrors;
    
    // Total feedbacks
    document.getElementById('totalFeedbacks').textContent = feedbacks.length;
    
    // Agentes activos
    const activeAgents = agents.filter(a => a.status === 'activo').length;
    document.getElementById('activeAgents').textContent = activeAgents;
}

// Cargar distribución TNPS
async function loadTnpsDistribution() {
    const audits = await getAudits();
    
    const filteredAudits = audits.filter(audit => {
        const callDate = new Date(audit.callDate);
        return callDate >= new Date(currentDateFilter.from) && 
               callDate <= new Date(currentDateFilter.to);
    });
    
    const promoters = filteredAudits.filter(a => a.tnps === 'promoter').length;
    const neutrals = filteredAudits.filter(a => a.tnps === 'neutral').length;
    const detractors = filteredAudits.filter(a => a.tnps === 'detractor').length;
    const nulls = filteredAudits.filter(a => a.tnps === 'null').length;
    
    const total = filteredAudits.length || 1; // Evitar división por cero
    
    // Actualizar contadores
    document.getElementById('promoterCount').textContent = promoters;
    document.getElementById('neutralCount').textContent = neutrals;
    document.getElementById('detractorCount').textContent = detractors;
    document.getElementById('nullCount').textContent = nulls;
    
    // Actualizar barras
    document.getElementById('promoterBar').style.width = `${(promoters / total) * 100}%`;
    document.getElementById('neutralBar').style.width = `${(neutrals / total) * 100}%`;
    document.getElementById('detractorBar').style.width = `${(detractors / total) * 100}%`;
    document.getElementById('nullBar').style.width = `${(nulls / total) * 100}%`;
}

// Cargar distribución de criticidad
async function loadCriticalityDistribution() {
    const audits = await getAudits();
    
    const filteredAudits = audits.filter(audit => {
        const callDate = new Date(audit.callDate);
        return callDate >= new Date(currentDateFilter.from) && 
               callDate <= new Date(currentDateFilter.to);
    });
    
    // Compatibilidad con valores antiguos y nuevos
    const critical = filteredAudits.filter(a => a.criticality === 'critico').length;
    const high = filteredAudits.filter(a => a.criticality === 'alto' || a.criticality === 'alta').length;
    const medium = filteredAudits.filter(a => a.criticality === 'medio' || a.criticality === 'media').length;
    const perfect = filteredAudits.filter(a => a.criticality === 'perfecto' || a.criticality === 'baja').length;
    
    const total = filteredAudits.length || 1;
    
    // Mostrar cada nivel por separado
    document.getElementById('criticalityCritical').textContent = critical;
    document.getElementById('criticalityHigh').textContent = high;
    document.getElementById('criticalityMedium').textContent = medium;
    document.getElementById('criticalityPerfect').textContent = perfect;
    
    document.getElementById('criticalityCriticalBar').style.width = `${(critical / total) * 100}%`;
    document.getElementById('criticalityHighBar').style.width = `${(high / total) * 100}%`;
    document.getElementById('criticalityMediumBar').style.width = `${(medium / total) * 100}%`;
    document.getElementById('criticalityPerfectBar').style.width = `${(perfect / total) * 100}%`;
}

// Cargar ranking de agentes
async function loadAgentsRanking() {
    const agents = await getAgents();
    const audits = await getAudits();
    const feedbacks = await getFeedbacks();
    
    const tbody = document.getElementById('agentsTableBody');
    
    if (agents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="no-data">No hay agentes registrados</td></tr>';
        return;
    }
    
    // Calcular métricas para cada agente
    const agentMetrics = agents.map(agent => {
        const agentAudits = audits.filter(a => {
            const callDate = new Date(a.callDate);
            return a.agentId === agent.id && 
                   callDate >= new Date(currentDateFilter.from) && 
                   callDate <= new Date(currentDateFilter.to);
        });
        
        const agentFeedbacks = feedbacks.filter(f => f.agentId === agent.id);
        
        const totalCalls = agentAudits.length;
        const totalErrors = agentAudits.length; // Todas las auditorías registran errores
        const errorRate = totalCalls > 0 ? ((totalErrors / totalCalls) * 100).toFixed(1) : 0;
        
        // Calcular promedio TNPS (simplificado)
        const promoters = agentAudits.filter(a => a.tnps === 'promoter').length;
        const detractors = agentAudits.filter(a => a.tnps === 'detractor').length;
        const tnpsScore = totalCalls > 0 ? 
            (((promoters - detractors) / totalCalls) * 100).toFixed(0) : 'N/A';
        
        return {
            agent,
            totalCalls,
            totalErrors,
            errorRate,
            tnpsScore,
            recentFeedbacks: agentFeedbacks.length
        };
    });
    
    // Ordenar por tasa de error (menor es mejor)
    agentMetrics.sort((a, b) => parseFloat(a.errorRate) - parseFloat(b.errorRate));
    
    // Generar tabla
    tbody.innerHTML = agentMetrics.map((metric, index) => `
        <tr>
            <td>${index + 1}</td>
            <td><strong>${metric.agent.name}</strong></td>
            <td>${metric.totalCalls}</td>
            <td>${metric.totalErrors}</td>
            <td>${metric.errorRate}%</td>
            <td>${metric.tnpsScore}${typeof metric.tnpsScore === 'number' ? '%' : ''}</td>
            <td>${metric.recentFeedbacks}</td>
            <td>
                <button onclick="viewAgentDetail('${metric.agent.id}')" class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;">
                    Ver Detalle
                </button>
            </td>
        </tr>
    `).join('');
}

// Cargar llamadas recientes
async function loadRecentCalls() {
    const audits = await getAudits();
    const agents = await getAgents(); // Pre-cargar agentes
    const tbody = document.getElementById('recentCallsTableBody');
    
    const filteredAudits = audits.filter(audit => {
        const callDate = new Date(audit.callDate);
        return callDate >= new Date(currentDateFilter.from) && 
               callDate <= new Date(currentDateFilter.to);
    });
    
    if (filteredAudits.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" class="no-data">No hay auditorías en este período</td></tr>';
        return;
    }
    
    // Ordenar por fecha (más recientes primero)
    const sortedAudits = filteredAudits.sort((a, b) => 
        new Date(b.callDate) - new Date(a.callDate)
    ).slice(0, 10); // Mostrar solo las 10 más recientes
    
    tbody.innerHTML = sortedAudits.map(audit => {
        const agent = agents.find(a => a.id === audit.agentId);
        const agentName = agent ? agent.name : 'Agente no encontrado';
        
        const callTypeLabels = {
            'cancelacion_tarjeta_credito': 'Cancelación TC',
            'cancelacion_cuenta_ahorros': 'Cancelación CA',
            'cancelacion_multiproducto': 'Cancelación Multi',
            'nu_plus': 'Nu Plus',
            'certificados': 'Certificados',
            // Backward compatibility
            'tarjeta_credito': 'Tarjeta Crédito',
            'cuenta_ahorros': 'Cuenta Ahorros',
            'multiproducto': 'Multiproducto'
        };
        return `
        <tr>
            <td>${formatDate(audit.callDate)}</td>
            <td>${audit.customerId}</td>
            <td><strong>${agentName}</strong></td>
            <td>${audit.auditor}</td>
            <td>${callTypeLabels[audit.callType] || audit.callType}</td>
            <td>${audit.bpo ? getBpoBadge(audit.bpo) : '-'}</td>
            <td>${getCriticalityBadge(audit.criticality)}</td>
            <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" 
                title="${audit.errorDescription}">
                ${audit.errors && audit.errors.length > 0 ? audit.errors.length + ' error(es)' : audit.errorDescription.substring(0, 50) + '...'}
            </td>
            <td>${getTnpsBadge(audit.tnps)}</td>
            <td>${audit.enlacePv ? `<a href="${audit.enlacePv}" target="_blank" class="btn btn-secondary" style="padding: 0.3rem 0.6rem; font-size: 0.8rem;">🔗 Ver</a>` : '-'}</td>
            <td>
                <button onclick="viewCallDetail('${audit.id}')" class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;">
                    Ver
                </button>
            </td>
        </tr>
    `;
    }).join('');
}

// Ver detalle de agente (redirigir a página de análisis)
function viewAgentDetail(agentId) {
    window.location.href = `analisis.html?agentId=${agentId}`;
}

// Ver detalle de llamada
async function viewCallDetail(callId) {
    const audits = await getAudits();
    const audit = audits.find(a => a.id === callId);
    
    if (audit) {
        // Redirigir a la página de detalle de auditorías con el agente específico
        window.location.href = `detalle-auditorias.html?agentId=${audit.agentId}&auditId=${callId}`;
    }
}

// Eliminar auditoría
function deleteCall(callId) {
    if (confirm('¿Estás seguro de que deseas eliminar esta auditoría? Esta acción no se puede deshacer.')) {
        deleteAudit(callId);
        loadDashboard(); // Recargar dashboard
        alert('Auditoría eliminada correctamente');
    }
}

// Limpiar todos los datos
function clearAllData() {
    const confirmation = confirm('⚠️ ATENCIÓN: Esto eliminará TODOS los datos del sistema (agentes, auditorías y feedbacks).\n\n¿Estás completamente seguro?');
    
    if (confirmation) {
        const secondConfirmation = confirm('Esta es tu última oportunidad. ¿Realmente deseas eliminar todo?');
        
        if (secondConfirmation) {
            localStorage.clear();
            alert('✅ Todos los datos han sido eliminados. La página se recargará.');
            location.reload();
        }
    }
}

// Cargar feedbacks recientes
async function loadRecentFeedbacks() {
    const feedbacks = await getFeedbacks();
    const agents = await getAgents(); // Pre-cargar agentes
    const tbody = document.getElementById('recentFeedbacksTableBody');
    
    const filteredFeedbacks = feedbacks.filter(feedback => {
        const feedbackDate = new Date(feedback.feedbackDate);
        return feedbackDate >= new Date(currentDateFilter.from) && 
               feedbackDate <= new Date(currentDateFilter.to);
    });
    
    if (filteredFeedbacks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="no-data">No hay feedbacks en este período</td></tr>';
        return;
    }
    
    // Ordenar por fecha (más recientes primero)
    const sortedFeedbacks = filteredFeedbacks.sort((a, b) => 
        new Date(b.feedbackDate) - new Date(a.feedbackDate)
    ).slice(0, 10); // Mostrar solo los 10 más recientes
    
    tbody.innerHTML = sortedFeedbacks.map(feedback => {
        const agent = agents.find(a => a.id === feedback.agentId);
        const agentName = agent ? agent.name : 'Agente no encontrado';
        
        return `
        <tr>
            <td>${formatDate(feedback.feedbackDate)}</td>
            <td><strong>${agentName}</strong></td>
            <td>${feedback.feedbackGivenBy}</td>
            <td>${getFeedbackTypeBadge(feedback.feedbackType)}</td>
            <td>${feedback.feedbackProcess ? getProcessBadge(feedback.feedbackProcess) : '-'}</td>
            <td>${feedback.additionalSteps ? getAdditionalStepsBadge(feedback.additionalSteps) : '-'}</td>
            <td>${getPriorityBadge(feedback.priority)}</td>
            <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" 
                title="${feedback.feedbackMessage}">
                ${feedback.feedbackMessage.substring(0, 60)}${feedback.feedbackMessage.length > 60 ? '...' : ''}
            </td>
            <td>
                <button onclick="viewFeedbackDetail('${feedback.id}')" class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;">
                    Ver
                </button>
            </td>
        </tr>
    `;
    }).join('');
}

// Ver detalle de feedback
async function viewFeedbackDetail(feedbackId) {
    const feedbacks = await getFeedbacks();
    const feedback = feedbacks.find(f => f.id === feedbackId);
    
    if (feedback) {
        // Redirigir a la página de detalle de feedbacks con el agente específico
        window.location.href = `detalle-feedbacks.html?agentId=${feedback.agentId}&feedbackId=${feedbackId}`;
    }
}

// Editar feedback
function editFeedback(feedbackId) {
    // Guardar el ID en localStorage para que la página de edición lo use
    localStorage.setItem('editingFeedbackId', feedbackId);
    window.location.href = 'registrar-feedback.html?edit=' + feedbackId;
}

// Eliminar feedback
function deleteFeedback(feedbackId) {
    if (confirm('¿Estás seguro de que deseas eliminar este feedback? Esta acción no se puede deshacer.')) {
        const feedbacks = getFeedbacks();
        const updatedFeedbacks = feedbacks.filter(f => f.id !== feedbackId);
        localStorage.setItem('feedbacks', JSON.stringify(updatedFeedbacks));
        loadDashboard(); // Recargar dashboard
        alert('Feedback eliminado correctamente');
    }
}

