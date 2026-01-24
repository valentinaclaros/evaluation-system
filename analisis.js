// ===================================
// Análisis de Mejoras - Lógica y comparativas
// ===================================

document.addEventListener('DOMContentLoaded', async function() {
    await loadAgentsDropdown();
    setupAgentChangeListener();
    
    // Verificar si viene con parámetro de agente
    const urlParams = new URLSearchParams(window.location.search);
    const agentId = urlParams.get('agentId');
    if (agentId) {
        document.getElementById('analysisAgentId').value = agentId;
        await loadFeedbacksDropdown(agentId);
    }
});

// Cargar agentes en el dropdown
async function loadAgentsDropdown() {
    const agents = await getAgents();
    const select = document.getElementById('analysisAgentId');
    
    select.innerHTML = '<option value="">Selecciona un agente para analizar</option>';
    
    if (agents.length === 0) {
        select.innerHTML += '<option value="" disabled>No hay agentes registrados</option>';
    } else {
        agents.forEach(agent => {
            const option = document.createElement('option');
            option.value = agent.id;
            const deptLabels = {
                'phone': 'Phone',
                'chat': 'Chat',
                'email': 'Email',
                'cancelaciones': 'Cancelaciones',
                'servicio_cliente': 'Servicio al Cliente',
                'retenciones': 'Retenciones',
                'ventas': 'Ventas'
            };
            const deptLabel = deptLabels[agent.department] || agent.department;
            option.textContent = `${agent.name} - ${deptLabel}`;
            select.appendChild(option);
        });
    }
}

// Cargar feedbacks del agente
async function loadFeedbacksDropdown(agentId) {
    const allFeedbacks = (await getFeedbacks()).filter(f => f.agentId === agentId);
    const startDate2026 = new Date('2026-01-01');
    
    // Filtrar solo feedbacks desde el 1 de enero de 2026
    const feedbacks = allFeedbacks.filter(f => new Date(f.feedbackDate) >= startDate2026);
    
    const select = document.getElementById('analysisFeedbackId');
    
    select.innerHTML = '<option value="">Selecciona un feedback</option>';
    
    if (feedbacks.length === 0) {
        select.innerHTML += '<option value="" disabled>Este agente no tiene feedbacks registrados</option>';
    } else {
        feedbacks.sort((a, b) => new Date(b.feedbackDate) - new Date(a.feedbackDate));
        feedbacks.forEach(feedback => {
            const option = document.createElement('option');
            option.value = feedback.id;
            option.textContent = `${formatDate(feedback.feedbackDate)} - ${feedback.feedbackType.toUpperCase()}`;
            select.appendChild(option);
        });
    }
}

// Escuchar cambios en agente
function setupAgentChangeListener() {
    document.getElementById('analysisAgentId').addEventListener('change', async function() {
        const agentId = this.value;
        if (agentId) {
            await loadFeedbacksDropdown(agentId);
        } else {
            document.getElementById('analysisFeedbackId').innerHTML = '<option value="">Primero selecciona un agente</option>';
        }
        document.getElementById('analysisResults').style.display = 'none';
        document.getElementById('noDataMessage').style.display = 'block';
    });
}

// Realizar análisis
async function performAnalysis() {
    const agentId = document.getElementById('analysisAgentId').value;
    const feedbackId = document.getElementById('analysisFeedbackId').value;
    
    if (!agentId || !feedbackId) {
        alert('Por favor selecciona un agente y un feedback');
        return;
    }
    
    const feedback = (await getFeedbacks()).find(f => f.id === feedbackId);
    if (!feedback) {
        alert('Feedback no encontrado');
        return;
    }
    
    const feedbackDate = new Date(feedback.feedbackDate);
    const startDate2026 = new Date('2026-01-01');
    
    // Validar que el feedback sea desde 2026
    if (feedbackDate < startDate2026) {
        alert('Solo se pueden analizar feedbacks desde el 1 de enero de 2026 en adelante');
        return;
    }
    
    // Calcular período de 30 días antes y después
    const beforeStart = new Date(feedbackDate);
    beforeStart.setDate(beforeStart.getDate() - 30);
    const beforeEnd = new Date(feedbackDate);
    beforeEnd.setDate(beforeEnd.getDate() - 1); // Excluir el día del feedback
    
    const afterStart = new Date(feedbackDate);
    afterStart.setDate(afterStart.getDate() + 1); // Día después del feedback
    const afterEnd = new Date(feedbackDate);
    afterEnd.setDate(afterEnd.getDate() + 30);
    
    // Asegurar que beforeStart no sea antes del 1 de enero de 2026
    if (beforeStart < startDate2026) {
        beforeStart.setTime(startDate2026.getTime());
    }
    
    // Obtener métricas antes y después
    const beforeMetrics = calculateAgentMetrics(agentId, 
        beforeStart.toISOString().split('T')[0], 
        beforeEnd.toISOString().split('T')[0]);
    
    const afterMetrics = calculateAgentMetrics(agentId, 
        afterStart.toISOString().split('T')[0], 
        afterEnd.toISOString().split('T')[0]);
    
    // Mostrar resultados
    displayAnalysisResults(feedback, beforeMetrics, afterMetrics, beforeStart, beforeEnd, afterStart, afterEnd);
}

// Mostrar resultados del análisis
function displayAnalysisResults(feedback, beforeMetrics, afterMetrics, beforeStart, beforeEnd, afterStart, afterEnd) {
    // Ocultar mensaje vacío y mostrar resultados
    document.getElementById('noDataMessage').style.display = 'none';
    document.getElementById('analysisResults').style.display = 'block';
    
    // Información del feedback
    document.getElementById('feedbackDateInfo').textContent = formatDate(feedback.feedbackDate);
    document.getElementById('feedbackGivenByInfo').textContent = feedback.feedbackGivenBy;
    document.getElementById('feedbackTypeInfo').innerHTML = getFeedbackTypeBadge(feedback.feedbackType);
    document.getElementById('feedbackPriorityInfo').innerHTML = getPriorityBadge(feedback.priority);
    document.getElementById('feedbackMessageInfo').textContent = feedback.feedbackMessage;
    
    // Mostrar proceso y additional steps con badges
    document.getElementById('feedbackProcessInfo').innerHTML = 
        feedback.feedbackProcess ? getProcessBadge(feedback.feedbackProcess) : '<span class="badge">N/A</span>';
    document.getElementById('feedbackAdditionalStepsInfo').innerHTML = 
        feedback.additionalSteps ? getAdditionalStepsBadge(feedback.additionalSteps) : '<span class="badge">N/A</span>';
    
    // Períodos
    document.getElementById('beforePeriod').textContent = 
        `${formatDate(beforeStart.toISOString())} - ${formatDate(beforeEnd.toISOString())}`;
    document.getElementById('afterPeriod').textContent = 
        `${formatDate(afterStart.toISOString())} - ${formatDate(afterEnd.toISOString())}`;
    
    // Métricas ANTES
    document.getElementById('beforeCallsCount').textContent = beforeMetrics.totalCalls;
    document.getElementById('beforeErrorsCount').textContent = beforeMetrics.errorsCount;
    document.getElementById('beforeErrorRate').textContent = beforeMetrics.errorRate + '%';
    document.getElementById('beforeCriticalErrors').textContent = beforeMetrics.criticalErrors;
    
    // Métricas DESPUÉS
    document.getElementById('afterCallsCount').textContent = afterMetrics.totalCalls;
    document.getElementById('afterErrorsCount').textContent = afterMetrics.errorsCount;
    document.getElementById('afterErrorRate').textContent = afterMetrics.errorRate + '%';
    document.getElementById('afterCriticalErrors').textContent = afterMetrics.criticalErrors;
    
    // Calcular cambios
    const errorRateChange = afterMetrics.errorRate - beforeMetrics.errorRate;
    const criticalErrorsChange = afterMetrics.criticalErrors - beforeMetrics.criticalErrors;
    
    // Indicadores de mejora
    displayErrorRateChange(errorRateChange);
    displayCriticalErrorsChange(criticalErrorsChange);
    displayTnpsComparison(beforeMetrics, afterMetrics);
    
    // Conclusión
    generateConclusion(errorRateChange, criticalErrorsChange, beforeMetrics, afterMetrics);
    
    // TNPS antes y después
    document.getElementById('beforePromoters').textContent = beforeMetrics.promoters;
    document.getElementById('beforeNeutral').textContent = beforeMetrics.neutrals;
    document.getElementById('beforeDetractors').textContent = beforeMetrics.detractors;
    
    document.getElementById('afterPromoters').textContent = afterMetrics.promoters;
    document.getElementById('afterNeutral').textContent = afterMetrics.neutrals;
    document.getElementById('afterDetractors').textContent = afterMetrics.detractors;
    
    // Tablas de llamadas
    displayCallsTable('beforeCallsTable', beforeMetrics.audits);
    displayCallsTable('afterCallsTable', afterMetrics.audits);
}

// Mostrar cambio en tasa de error
function displayErrorRateChange(change) {
    const changeElement = document.getElementById('errorRateChange');
    const iconElement = document.getElementById('errorRateIcon');
    
    if (change < 0) {
        // Mejora
        changeElement.innerHTML = `
            <span class="change-value positive">↓ ${Math.abs(change).toFixed(1)}%</span>
            <span class="change-label">Reducción en tasa de error</span>
        `;
        iconElement.textContent = '✅';
    } else if (change > 0) {
        // Empeoró
        changeElement.innerHTML = `
            <span class="change-value negative">↑ ${change.toFixed(1)}%</span>
            <span class="change-label">Aumento en tasa de error</span>
        `;
        iconElement.textContent = '⚠️';
    } else {
        // Sin cambio
        changeElement.innerHTML = `
            <span class="change-value">→ Sin cambio</span>
            <span class="change-label">Misma tasa de error</span>
        `;
        iconElement.textContent = '➡️';
    }
}

// Mostrar cambio en errores críticos
function displayCriticalErrorsChange(change) {
    const changeElement = document.getElementById('criticalErrorsChange');
    const iconElement = document.getElementById('criticalErrorsIcon');
    
    if (change < 0) {
        changeElement.innerHTML = `
            <span class="change-value positive">↓ ${Math.abs(change)} errores menos</span>
            <span class="change-label">Reducción de errores críticos</span>
        `;
        iconElement.textContent = '✅';
    } else if (change > 0) {
        changeElement.innerHTML = `
            <span class="change-value negative">↑ ${change} errores más</span>
            <span class="change-label">Aumento de errores críticos</span>
        `;
        iconElement.textContent = '❌';
    } else {
        changeElement.innerHTML = `
            <span class="change-value">→ Sin cambio</span>
            <span class="change-label">Mismos errores críticos</span>
        `;
        iconElement.textContent = '➡️';
    }
}

// Comparación TNPS
function displayTnpsComparison(beforeMetrics, afterMetrics) {
    const changeElement = document.getElementById('tnpsChange');
    const iconElement = document.getElementById('tnpsIcon');
    
    const beforeScore = beforeMetrics.promoters - beforeMetrics.detractors;
    const afterScore = afterMetrics.promoters - afterMetrics.detractors;
    const change = afterScore - beforeScore;
    
    if (change > 0) {
        changeElement.innerHTML = `
            <span class="change-value positive">↑ +${change} puntos</span>
            <span class="change-label">Mejora en satisfacción</span>
        `;
        iconElement.textContent = '⭐';
    } else if (change < 0) {
        changeElement.innerHTML = `
            <span class="change-value negative">↓ ${change} puntos</span>
            <span class="change-label">Reducción en satisfacción</span>
        `;
        iconElement.textContent = '😞';
    } else {
        changeElement.innerHTML = `
            <span class="change-value">→ Sin cambio</span>
            <span class="change-label">Misma satisfacción</span>
        `;
        iconElement.textContent = '😐';
    }
}

// Generar conclusión
function generateConclusion(errorRateChange, criticalErrorsChange, beforeMetrics, afterMetrics) {
    const conclusionElement = document.getElementById('conclusionText');
    
    let conclusion = '';
    
    if (afterMetrics.totalCalls === 0) {
        conclusion = 'No hay suficientes datos del período posterior al feedback para realizar un análisis completo. Se recomienda esperar a que se registren más auditorías.';
    } else if (errorRateChange < -10 && criticalErrorsChange <= 0) {
        conclusion = `¡Excelente mejora! El agente ha reducido significativamente su tasa de error en ${Math.abs(errorRateChange).toFixed(1)}% después del feedback. Los errores críticos también han disminuido. El feedback tuvo un impacto muy positivo en el desempeño.`;
    } else if (errorRateChange < 0 && criticalErrorsChange <= 0) {
        conclusion = `Se observa una mejora en el desempeño. La tasa de error se redujo en ${Math.abs(errorRateChange).toFixed(1)}% y los errores críticos están controlados. El agente está respondiendo positivamente al feedback proporcionado.`;
    } else if (errorRateChange > 10 || criticalErrorsChange > 2) {
        conclusion = `Se requiere atención inmediata. El desempeño del agente ha empeorado después del feedback, con un aumento de ${errorRateChange.toFixed(1)}% en la tasa de error. Se recomienda una sesión de seguimiento para identificar las causas y proporcionar apoyo adicional.`;
    } else if (errorRateChange > 0) {
        conclusion = `El desempeño no ha mejorado como se esperaba. Aunque el cambio es menor, se recomienda dar seguimiento y considerar capacitación adicional o mentoría para ayudar al agente a mejorar.`;
    } else {
        conclusion = `El desempeño se ha mantenido estable. Continuar monitoreando y proporcionar refuerzo positivo para mantener los estándares actuales.`;
    }
    
    conclusionElement.textContent = conclusion;
}

// Mostrar tabla de llamadas
function displayCallsTable(tableId, audits) {
    const tbody = document.getElementById(tableId);
    
    if (audits.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="no-data">No hay auditorías en este período</td></tr>';
        return;
    }
    
    const callTypeLabels = {
        'cancelacion_tarjeta_credito': 'Canc. TC',
        'cancelacion_cuenta_ahorros': 'Canc. CA',
        'cancelacion_multiproducto': 'Canc. Multi',
        'nu_plus': 'Nu Plus',
        'certificados': 'Certificados',
        // Backward compatibility
        'tarjeta_credito': 'T. Crédito',
        'cuenta_ahorros': 'C. Ahorros',
        'multiproducto': 'Multiproducto'
    };
    
    tbody.innerHTML = audits.sort((a, b) => new Date(b.callDate) - new Date(a.callDate)).map(audit => `
        <tr>
            <td>${formatDate(audit.callDate)}</td>
            <td>${audit.customerId}</td>
            <td>${callTypeLabels[audit.callType] || audit.callType}</td>
            <td>${getCriticalityBadge(audit.criticality)}</td>
            <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" 
                title="${audit.errorDescription}">
                ${audit.errorDescription}
            </td>
            <td>${getTnpsBadge(audit.tnps)}</td>
        </tr>
    `).join('');
}

// Cambiar tabs
function switchTab(tab) {
    // Remover clase active de todos los botones y contenidos
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // Agregar clase active al botón y contenido seleccionado
    event.target.classList.add('active');
    document.getElementById(tab + 'CallsTab').classList.add('active');
}

// Helpers para badges
function getFeedbackTypeBadge(type) {
    const badges = {
        'correctivo': '<span class="badge badge-critical">Correctivo</span>',
        'constructivo': '<span class="badge badge-medium">Constructivo</span>',
        'positivo': '<span class="badge badge-promoter">Positivo</span>'
    };
    return badges[type] || type;
}

function getPriorityBadge(priority) {
    const badges = {
        'alta': '<span class="badge badge-critical">Alta</span>',
        'media': '<span class="badge badge-medium">Media</span>',
        'baja': '<span class="badge badge-low">Baja</span>'
    };
    return badges[priority] || priority;
}

