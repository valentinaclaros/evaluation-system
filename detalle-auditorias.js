// ===================================
// Detalle de Auditorías - Lógica
// ===================================

let currentFilters = {
    dateFrom: null,
    dateTo: null,
    criticality: '',
    bpo: ''
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
    
    await loadAgentsWithAudits();
    
    // Verificar si hay parámetros en la URL para abrir automáticamente un agente
    const urlParams = new URLSearchParams(window.location.search);
    const agentId = urlParams.get('agentId');
    const auditId = urlParams.get('auditId');
    
    if (agentId) {
        // Esperar a que se carguen los datos y luego abrir el agente
        setTimeout(() => {
            toggleAgentAudits(agentId);
            // Hacer scroll al agente
            const agentCard = document.querySelector(`[onclick="toggleAgentAudits('${agentId}')"]`);
            if (agentCard) {
                agentCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            
            // Si hay un auditId específico, abrir su detalle
            if (auditId) {
                setTimeout(() => {
                    const detailBtn = document.getElementById(`toggle-btn-${auditId}`);
                    if (detailBtn) {
                        detailBtn.click();
                        detailBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
    const criticality = document.getElementById('filterCriticality').value;
    const bpo = document.getElementById('filterBpo').value;
    
    if (dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo)) {
        alert('La fecha inicial no puede ser mayor a la fecha final');
        return;
    }
    
    currentFilters.dateFrom = dateFrom || null;
    currentFilters.dateTo = dateTo || null;
    currentFilters.criticality = criticality;
    currentFilters.bpo = bpo;
    
    await loadAgentsWithAudits();
}

// Cargar agentes con sus auditorías
async function loadAgentsWithAudits() {
    const agents = await getAgents();
    const audits = await getAudits();
    const container = document.getElementById('agentsContainer');
    
    if (agents.length === 0) {
        container.innerHTML = `
            <div class="no-audits">
                <div style="font-size: 3rem; margin-bottom: 1rem;">👥</div>
                <p>No hay agentes registrados en el sistema</p>
                <a href="agentes.html" class="btn btn-primary" style="margin-top: 1rem;">Registrar Agente</a>
            </div>
        `;
        return;
    }
    
    // Filtrar y agrupar auditorías por agente
    const agentsWithAudits = agents.map(agent => {
        let agentAudits = audits.filter(audit => audit.agentId === agent.id);
        
        // Aplicar filtros
        if (currentFilters.dateFrom) {
            agentAudits = agentAudits.filter(audit => 
                new Date(audit.callDate) >= new Date(currentFilters.dateFrom)
            );
        }
        if (currentFilters.dateTo) {
            agentAudits = agentAudits.filter(audit => 
                new Date(audit.callDate) <= new Date(currentFilters.dateTo)
            );
        }
        if (currentFilters.criticality) {
            agentAudits = agentAudits.filter(audit => 
                audit.criticality === currentFilters.criticality
            );
        }
        if (currentFilters.bpo) {
            agentAudits = agentAudits.filter(audit => 
                audit.bpo === currentFilters.bpo
            );
        }
        
        // Ordenar por fecha (más recientes primero)
        agentAudits.sort((a, b) => new Date(b.callDate) - new Date(a.callDate));
        
        // Calcular estadísticas del agente
        const totalAudits = agentAudits.length;
        const criticalCount = agentAudits.filter(a => 
            a.criticality === 'critico' || a.criticality === 'alto'
        ).length;
        const errorRate = totalAudits > 0 ? ((criticalCount / totalAudits) * 100).toFixed(1) : 0;
        
        return {
            agent,
            audits: agentAudits,
            totalAudits,
            criticalCount,
            errorRate
        };
    });
    
    // Filtrar agentes sin auditorías en el período seleccionado
    const agentsWithData = agentsWithAudits.filter(a => a.totalAudits > 0);
    
    if (agentsWithData.length === 0) {
        container.innerHTML = `
            <div class="no-audits">
                <div style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
                <p>No se encontraron auditorías con los filtros aplicados</p>
                <button onclick="clearFilters()" class="btn btn-secondary" style="margin-top: 1rem;">Limpiar Filtros</button>
            </div>
        `;
        return;
    }
    
    // Ordenar por total de auditorías (descendente)
    agentsWithData.sort((a, b) => b.totalAudits - a.totalAudits);
    
    // Generar HTML
    container.innerHTML = agentsWithData.map(agentData => `
        <div class="agent-card">
            <div class="agent-header" onclick="toggleAgentAudits('${agentData.agent.id}')">
                <div class="agent-info">
                    <div class="agent-name">${agentData.agent.name}</div>
                    <div class="agent-stats">
                        <div class="agent-stat">
                            <span class="agent-stat-label">Total Auditorías</span>
                            <span class="agent-stat-value">${agentData.totalAudits}</span>
                        </div>
                        <div class="agent-stat">
                            <span class="agent-stat-label">Errores Críticos/Altos</span>
                            <span class="agent-stat-value">${agentData.criticalCount}</span>
                        </div>
                        <div class="agent-stat">
                            <span class="agent-stat-label">Tasa de Error</span>
                            <span class="agent-stat-value">${agentData.errorRate}%</span>
                        </div>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <button onclick="event.stopPropagation(); exportAgentScorecard('${agentData.agent.id}')" class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.9rem;">
                        📊 Scorecard
                    </button>
                    <div class="expand-icon" id="icon-${agentData.agent.id}">▼</div>
                </div>
            </div>
            <div class="agent-audits" id="audits-${agentData.agent.id}">
                ${renderAudits(agentData.audits)}
            </div>
        </div>
    `).join('');
}

// Alternar visualización de auditorías de un agente
function toggleAgentAudits(agentId) {
    const auditsContainer = document.getElementById(`audits-${agentId}`);
    const icon = document.getElementById(`icon-${agentId}`);
    
    if (auditsContainer.classList.contains('expanded')) {
        auditsContainer.classList.remove('expanded');
        icon.classList.remove('expanded');
    } else {
        auditsContainer.classList.add('expanded');
        icon.classList.add('expanded');
    }
}

// Renderizar auditorías
function renderAudits(audits) {
    if (audits.length === 0) {
        return '<div class="no-audits">No hay auditorías para este agente</div>';
    }
    
    const callTypeLabels = {
        'cancelacion_tarjeta_credito': 'Cancelación Tarjeta de Crédito',
        'cancelacion_cuenta_ahorros': 'Cancelación Cuenta de Ahorros',
        'cancelacion_multiproducto': 'Cancelación Multiproducto',
        'nu_plus': 'Nu Plus',
        'certificados': 'Certificados',
        'tarjeta_credito': 'Tarjeta de Crédito',
        'cuenta_ahorros': 'Cuenta de Ahorros',
        'multiproducto': 'Multiproducto'
    };
    
    return audits.map(audit => {
        // Procesar errores
        let errorsList = [];
        if (audit.errors && Array.isArray(audit.errors)) {
            errorsList = audit.errors;
        } else if (audit.errorDescription) {
            errorsList = audit.errorDescription.split(';').map(e => e.trim()).filter(e => e);
        }
        
        return `
        <div class="audit-item">
            <div class="audit-header-info">
                <div class="audit-date">📅 ${formatDate(audit.callDate)}</div>
                <div class="audit-badges">
                    ${getCriticalityBadge(audit.criticality)}
                    ${getTnpsBadge(audit.tnps)}
                    ${audit.bpo ? getBpoBadge(audit.bpo) : ''}
                </div>
            </div>
            
            <div class="audit-details">
                <div class="audit-detail-item">
                    <span class="audit-detail-label">Customer ID</span>
                    <span class="audit-detail-value">${audit.customerId}</span>
                </div>
                <div class="audit-detail-item">
                    <span class="audit-detail-label">Motivo</span>
                    <span class="audit-detail-value">${callTypeLabels[audit.callType] || audit.callType}</span>
                </div>
                <div class="audit-detail-item">
                    <span class="audit-detail-label">Auditor</span>
                    <span class="audit-detail-value">${audit.auditor}</span>
                </div>
                ${audit.enlacePv ? `
                <div class="audit-detail-item">
                    <span class="audit-detail-label">Enlace PV</span>
                    <a href="${audit.enlacePv}" target="_blank" class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; width: fit-content;">🔗 Ver</a>
                </div>
                ` : ''}
            </div>
            
            ${audit.callDuration || audit.transferAttempt || audit.excessiveHold ? `
            <div class="audit-errors" style="border-left-color: var(--info-color); margin-top: 1rem;">
                <div class="audit-errors-title">📊 Métricas Operativas:</div>
                <div class="audit-details" style="margin-top: 0.5rem;">
                    ${audit.callDuration ? `
                    <div class="audit-detail-item">
                        <span class="audit-detail-label">Duración de la llamada</span>
                        <span class="audit-detail-value">${audit.callDuration} minutos</span>
                    </div>
                    ` : ''}
                    ${audit.transferAttempt ? `
                    <div class="audit-detail-item">
                        <span class="audit-detail-label">Intentó transferir</span>
                        <span class="audit-detail-value">${audit.transferAttempt === 'si' ? '✅ Sí' : '❌ No'}</span>
                    </div>
                    ` : ''}
                    ${audit.excessiveHold ? `
                    <div class="audit-detail-item">
                        <span class="audit-detail-label">Tiempo de espera injustificado</span>
                        <span class="audit-detail-value">${audit.excessiveHold === 'si' ? '✅ Sí' : '❌ No'}</span>
                    </div>
                    ` : ''}
                    ${audit.holdTime && audit.excessiveHold === 'si' ? `
                    <div class="audit-detail-item">
                        <span class="audit-detail-label">Tiempo de espera</span>
                        <span class="audit-detail-value">${audit.holdTime} minutos</span>
                    </div>
                    ` : ''}
                    ${audit.cancellationReason ? `
                    <div class="audit-detail-item">
                        <span class="audit-detail-label">Motivo de cancelación</span>
                        <span class="audit-detail-value">${audit.cancellationReason}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
            ` : ''}
            
            ${errorsList.length > 0 ? `
            <div class="audit-errors">
                <div class="audit-errors-title">Errores Detectados:</div>
                <ul class="audit-errors-list">
                    ${errorsList.map(error => `<li>${error}</li>`).join('')}
                </ul>
            </div>
            ` : ''}
            
            ${audit.callNotes ? `
            <div class="audit-errors" style="border-left-color: var(--info-color); margin-top: 1rem;">
                <div class="audit-errors-title">Notas Adicionales:</div>
                <p style="margin-top: 0.5rem; color: var(--text-primary);">${audit.callNotes}</p>
            </div>
            ` : ''}
            
            <div class="audit-actions">
                <button onclick="editAuditFromDetail('${audit.id}')" class="btn btn-primary" style="padding: 0.5rem 1rem; font-size: 0.9rem;">
                    ✏️ Editar
                </button>
                <button onclick="deleteAuditFromDetail('${audit.id}')" class="btn btn-danger" style="padding: 0.5rem 1rem; font-size: 0.9rem;">
                    🗑️ Eliminar
                </button>
            </div>
        </div>
        `;
    }).join('');
}

// Editar auditoría desde el detalle
function editAuditFromDetail(auditId) {
    localStorage.setItem('editingAuditId', auditId);
    window.location.href = 'registrar-llamada.html?edit=' + auditId;
}

// Eliminar auditoría desde el detalle
async function deleteAuditFromDetail(auditId) {
    if (confirm('¿Estás seguro de que deseas eliminar esta auditoría?\n\nEsta acción no se puede deshacer.')) {
        await deleteAudit(auditId);
        await loadAgentsWithAudits();
        alert('✅ Auditoría eliminada correctamente');
    }
}

// Limpiar filtros
async function clearFilters() {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    document.getElementById('filterDateFrom').valueAsDate = thirtyDaysAgo;
    document.getElementById('filterDateTo').valueAsDate = today;
    document.getElementById('filterCriticality').value = '';
    document.getElementById('filterBpo').value = '';
    
    currentFilters = {
        dateFrom: thirtyDaysAgo.toISOString().split('T')[0],
        dateTo: today.toISOString().split('T')[0],
        criticality: '',
        bpo: ''
    };
    
    await loadAgentsWithAudits();
}

// Exportar Scorecard Individual de Agente
async function exportAgentScorecard(agentId) {
    const agents = await getAgents();
    const audits = await getAudits();
    const feedbacks = await getFeedbacks();
    
    const agent = agents.find(a => a.id === agentId);
    if (!agent) {
        alert('Agente no encontrado');
        return;
    }
    
    // Filtrar auditorías del agente
    let agentAudits = audits.filter(a => a.agentId === agentId);
    
    // Aplicar filtros actuales
    if (currentFilters.dateFrom) {
        agentAudits = agentAudits.filter(audit => 
            new Date(audit.callDate) >= new Date(currentFilters.dateFrom)
        );
    }
    if (currentFilters.dateTo) {
        agentAudits = agentAudits.filter(audit => 
            new Date(audit.callDate) <= new Date(currentFilters.dateTo)
        );
    }
    if (currentFilters.criticality) {
        agentAudits = agentAudits.filter(audit => 
            audit.criticality === currentFilters.criticality
        );
    }
    if (currentFilters.bpo) {
        agentAudits = agentAudits.filter(audit => 
            audit.bpo === currentFilters.bpo
        );
    }
    
    if (agentAudits.length === 0) {
        alert('No hay auditorías para este agente en el período seleccionado');
        return;
    }
    
    // Calcular métricas
    const totalAudits = agentAudits.length;
    const criticalCount = agentAudits.filter(a => a.criticality === 'critico').length;
    const highCount = agentAudits.filter(a => a.criticality === 'alto').length;
    const mediumCount = agentAudits.filter(a => a.criticality === 'medio').length;
    const perfectCount = agentAudits.filter(a => a.criticality === 'perfecto').length;
    
    const errorRate = ((criticalCount + highCount) / totalAudits * 100).toFixed(1);
    const perfectRate = (perfectCount / totalAudits * 100).toFixed(1);
    
    // TNPS
    const promoters = agentAudits.filter(a => a.tnps === 'promoter').length;
    const neutrals = agentAudits.filter(a => a.tnps === 'neutral').length;
    const detractors = agentAudits.filter(a => a.tnps === 'detractor').length;
    
    // Errores más frecuentes
    const errorCounts = {};
    agentAudits.forEach(audit => {
        if (audit.errors && Array.isArray(audit.errors)) {
            audit.errors.forEach(error => {
                errorCounts[error] = (errorCounts[error] || 0) + 1;
            });
        }
    });
    
    const topErrors = Object.entries(errorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    // Feedbacks recibidos
    const agentFeedbacks = feedbacks.filter(f => f.agentId === agentId);
    
    // Calcular consistency score (últimas 10 auditorías)
    const last10 = agentAudits.slice(-10);
    const errorRates = [];
    for (let i = 0; i < last10.length; i++) {
        const window = last10.slice(Math.max(0, i - 4), i + 1);
        const errors = window.filter(a => a.criticality === 'critico' || a.criticality === 'alto').length;
        errorRates.push((errors / window.length) * 100);
    }
    
    const mean = errorRates.reduce((a, b) => a + b, 0) / errorRates.length;
    const variance = errorRates.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / errorRates.length;
    const stdDev = Math.sqrt(variance);
    const consistencyScore = Math.max(0, 100 - stdDev * 2).toFixed(0);
    
    // Determinar tendencia
    const recent5 = agentAudits.slice(-5);
    const previous5 = agentAudits.slice(-10, -5);
    let trendText = 'Estable';
    
    if (previous5.length >= 3) {
        const recentErrors = recent5.filter(a => a.criticality === 'critico' || a.criticality === 'alto').length / recent5.length;
        const previousErrors = previous5.filter(a => a.criticality === 'critico' || a.criticality === 'alto').length / previous5.length;
        
        if (recentErrors < previousErrors - 0.1) trendText = 'Mejorando 📈';
        else if (recentErrors > previousErrors + 0.1) trendText = 'Empeorando 📉';
        else trendText = 'Estable ➡️';
    }
    
    // Generar HTML para scorecard
    const scorecardHTML = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Scorecard - ${agent.name}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            padding: 2rem;
            background: #f8f9fa;
            color: #333;
        }
        
        .scorecard {
            max-width: 1000px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2rem;
            margin-bottom: 0.5rem;
        }
        
        .header p {
            opacity: 0.9;
            font-size: 1.1rem;
        }
        
        .content {
            padding: 2rem;
        }
        
        .section {
            margin-bottom: 2rem;
        }
        
        .section-title {
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 1rem;
            color: #667eea;
            border-bottom: 2px solid #667eea;
            padding-bottom: 0.5rem;
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 1.5rem;
        }
        
        .metric-card {
            background: #f8f9fa;
            padding: 1.5rem;
            border-radius: 8px;
            border-left: 4px solid #667eea;
        }
        
        .metric-card.success {
            border-left-color: #10b981;
        }
        
        .metric-card.warning {
            border-left-color: #f59e0b;
        }
        
        .metric-card.error {
            border-left-color: #ef4444;
        }
        
        .metric-value {
            font-size: 2rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
        }
        
        .metric-value.success { color: #10b981; }
        .metric-value.warning { color: #f59e0b; }
        .metric-value.error { color: #ef4444; }
        .metric-value.primary { color: #667eea; }
        
        .metric-label {
            font-size: 0.9rem;
            color: #666;
            font-weight: 500;
        }
        
        .table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 1rem;
        }
        
        .table th,
        .table td {
            padding: 0.75rem;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .table th {
            background: #f8f9fa;
            font-weight: 700;
            color: #667eea;
        }
        
        .footer {
            background: #f8f9fa;
            padding: 1.5rem;
            text-align: center;
            color: #666;
            font-size: 0.9rem;
        }
        
        .badge {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 999px;
            font-size: 0.85rem;
            font-weight: 600;
        }
        
        .badge-critico { background: #fee2e2; color: #dc2626; }
        .badge-alto { background: #fed7aa; color: #ea580c; }
        .badge-medio { background: #fef3c7; color: #d97706; }
        .badge-perfecto { background: #d1fae5; color: #059669; }
        
        @media print {
            body { padding: 0; background: white; }
            .scorecard { box-shadow: none; }
        }
    </style>
</head>
<body>
    <div class="scorecard">
        <div class="header">
            <h1>📊 Scorecard de Desempeño</h1>
            <p>${agent.name}</p>
            <p style="font-size: 0.9rem; margin-top: 0.5rem;">
                Período: ${currentFilters.dateFrom || 'Inicio'} al ${currentFilters.dateTo || 'Hoy'}
            </p>
            <p style="font-size: 0.85rem; opacity: 0.8;">
                Generado el ${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
        </div>
        
        <div class="content">
            <!-- Métricas Principales -->
            <div class="section">
                <h2 class="section-title">📈 Métricas Principales</h2>
                <div class="metrics-grid">
                    <div class="metric-card">
                        <div class="metric-value primary">${totalAudits}</div>
                        <div class="metric-label">Total Auditorías</div>
                    </div>
                    <div class="metric-card success">
                        <div class="metric-value success">${perfectRate}%</div>
                        <div class="metric-label">Tasa de Perfección</div>
                    </div>
                    <div class="metric-card ${errorRate > 30 ? 'error' : errorRate > 15 ? 'warning' : 'success'}">
                        <div class="metric-value ${errorRate > 30 ? 'error' : errorRate > 15 ? 'warning' : 'success'}">${errorRate}%</div>
                        <div class="metric-label">Tasa de Error Crítico/Alto</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value primary">${consistencyScore}</div>
                        <div class="metric-label">Consistency Score</div>
                    </div>
                </div>
            </div>
            
            <!-- Distribución por Criticidad -->
            <div class="section">
                <h2 class="section-title">🎯 Distribución por Criticidad</h2>
                <div class="metrics-grid">
                    <div class="metric-card error">
                        <div class="metric-value error">${criticalCount}</div>
                        <div class="metric-label">Críticos</div>
                    </div>
                    <div class="metric-card warning">
                        <div class="metric-value warning">${highCount}</div>
                        <div class="metric-label">Altos</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value primary">${mediumCount}</div>
                        <div class="metric-label">Medios</div>
                    </div>
                    <div class="metric-card success">
                        <div class="metric-value success">${perfectCount}</div>
                        <div class="metric-label">Perfectos</div>
                    </div>
                </div>
            </div>
            
            <!-- TNPS -->
            <div class="section">
                <h2 class="section-title">😊 Distribución TNPS</h2>
                <div class="metrics-grid">
                    <div class="metric-card success">
                        <div class="metric-value success">${promoters}</div>
                        <div class="metric-label">Promotores</div>
                    </div>
                    <div class="metric-card warning">
                        <div class="metric-value warning">${neutrals}</div>
                        <div class="metric-label">Neutrales</div>
                    </div>
                    <div class="metric-card error">
                        <div class="metric-value error">${detractors}</div>
                        <div class="metric-label">Detractores</div>
                    </div>
                </div>
            </div>
            
            <!-- Tendencia y Análisis -->
            <div class="section">
                <h2 class="section-title">📊 Análisis de Tendencia</h2>
                <div class="metric-card">
                    <div class="metric-value primary">${trendText}</div>
                    <div class="metric-label">Tendencia de las últimas 10 auditorías</div>
                </div>
            </div>
            
            <!-- Top 5 Errores -->
            ${topErrors.length > 0 ? `
            <div class="section">
                <h2 class="section-title">🚨 Top 5 Errores Más Frecuentes</h2>
                <table class="table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Error</th>
                            <th>Frecuencia</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${topErrors.map(([error, count], index) => `
                        <tr>
                            <td><strong>${index + 1}</strong></td>
                            <td>${error}</td>
                            <td><strong>${count}</strong></td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ` : ''}
            
            <!-- Feedbacks Recibidos -->
            ${agentFeedbacks.length > 0 ? `
            <div class="section">
                <h2 class="section-title">💬 Feedbacks Recibidos</h2>
                <div class="metric-card">
                    <div class="metric-value primary">${agentFeedbacks.length}</div>
                    <div class="metric-label">Total de Feedbacks Recibidos</div>
                </div>
            </div>
            ` : ''}
            
            <!-- Recomendaciones -->
            <div class="section">
                <h2 class="section-title">💡 Recomendaciones</h2>
                <ul style="line-height: 1.8; padding-left: 1.5rem;">
                    ${errorRate > 30 
                        ? '<li><strong>Alta Prioridad:</strong> Tasa de error elevada. Se recomienda sesión 1:1 urgente y plan de mejora específico.</li>'
                        : errorRate > 15
                        ? '<li>Tasa de error moderada. Considerar feedback adicional y seguimiento continuo.</li>'
                        : '<li>Buen desempeño general. Mantener el nivel y buscar oportunidades de mentoría.</li>'}
                    
                    ${consistencyScore < 60
                        ? '<li>Consistency Score bajo indica desempeño variable. Revisar factores externos o necesidad de capacitación adicional.</li>'
                        : consistencyScore > 80
                        ? '<li>Excelente consistencia en el desempeño. Considerar como referente para otros agentes.</li>'
                        : '<li>Consistency Score aceptable. Continuar con monitoreo regular.</li>'}
                    
                    ${topErrors.length > 0
                        ? `<li>Enfocarse en reducir: <strong>${topErrors[0][0]}</strong> (error más frecuente).</li>`
                        : ''}
                    
                    ${perfectRate > 50
                        ? '<li>Alta tasa de perfección. Excelente trabajo, continuar con buenas prácticas.</li>'
                        : ''}
                </ul>
            </div>
        </div>
        
        <div class="footer">
            Sistema de Evaluación del Desempeño - Generado automáticamente
        </div>
    </div>
    
    <script>
        // Auto-imprimir al abrir
        window.onload = function() {
            window.print();
        };
    </script>
</body>
</html>
    `;
    
    // Abrir en nueva ventana
    const newWindow = window.open('', '_blank');
    newWindow.document.write(scorecardHTML);
    newWindow.document.close();
}
