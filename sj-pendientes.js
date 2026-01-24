// ===================================
// SJ Pendientes - Lógica
// ===================================

let currentFilter = 'todos';

// Cargar datos al iniciar
document.addEventListener('DOMContentLoaded', async function() {
    await loadSJCases();
});

// Obtener o inicializar el estado de gestión de SJ
function getSJStatuses() {
    const statuses = localStorage.getItem('sjStatuses');
    return statuses ? JSON.parse(statuses) : {};
}

// Guardar estado de gestión de SJ
function saveSJStatus(auditId, status) {
    const statuses = getSJStatuses();
    statuses[auditId] = status;
    localStorage.setItem('sjStatuses', JSON.stringify(statuses));
}

// Obtener estado de un SJ específico
function getSJStatus(auditId) {
    const statuses = getSJStatuses();
    return statuses[auditId] || 'pendiente';
}

// Obtener o inicializar comentarios de SJ
function getSJComments() {
    const comments = localStorage.getItem('sjComments');
    return comments ? JSON.parse(comments) : {};
}

// Guardar comentario de un SJ
function saveSJComment(auditId, comment) {
    const comments = getSJComments();
    comments[auditId] = comment;
    localStorage.setItem('sjComments', JSON.stringify(comments));
}

// Obtener comentario de un SJ específico
function getSJComment(auditId) {
    const comments = getSJComments();
    return comments[auditId] || '';
}

// Cambiar estado de un SJ
async function toggleSJStatus(auditId, newStatus) {
    saveSJStatus(auditId, newStatus);
    
    // Mostrar/ocultar el textarea de comentarios
    const commentsContainer = document.getElementById(`comments-${auditId}`);
    if (commentsContainer) {
        if (newStatus === 'pendiente') {
            commentsContainer.classList.add('visible');
        } else {
            commentsContainer.classList.remove('visible');
        }
    }
    
    await loadSJCases(); // Recargar la vista
}

// Guardar comentario cuando el usuario escribe
function updateSJComment(auditId, comment) {
    saveSJComment(auditId, comment);
}

// Habilitar edición del comentario
function enableCommentEdit(auditId) {
    const textarea = document.getElementById(`comment-${auditId}`);
    const saveBtn = document.getElementById(`save-btn-${auditId}`);
    
    if (textarea && saveBtn) {
        textarea.disabled = false;
        textarea.focus();
        saveBtn.style.display = 'inline-flex';
        
        // Ocultar el botón de editar temporalmente
        event.target.style.display = 'none';
    }
}

// Guardar comentario con botón
function saveSJCommentWithButton(auditId) {
    const textarea = document.getElementById(`comment-${auditId}`);
    const saveBtn = document.getElementById(`save-btn-${auditId}`);
    
    if (textarea) {
        const comment = textarea.value.trim();
        saveSJComment(auditId, comment);
        textarea.disabled = true;
        saveBtn.style.display = 'none';
        
        // Recargar para mostrar el botón de editar
        loadSJCases();
        
        // Mensaje de confirmación
        alert('✅ Comentario guardado correctamente');
    }
}

// Alternar vista de detalle completo
function toggleFullDetail(auditId) {
    const detailSection = document.getElementById(`detail-${auditId}`);
    const toggleIcon = document.getElementById(`toggle-icon-${auditId}`);
    const toggleBtn = document.getElementById(`toggle-btn-${auditId}`);
    
    if (detailSection.classList.contains('expanded')) {
        detailSection.classList.remove('expanded');
        toggleIcon.classList.remove('rotated');
        toggleBtn.innerHTML = '<span class="sj-toggle-icon" id="toggle-icon-' + auditId + '">▼</span> Ver Detalle Completo';
    } else {
        detailSection.classList.add('expanded');
        toggleIcon.classList.add('rotated');
        toggleBtn.innerHTML = '<span class="sj-toggle-icon rotated" id="toggle-icon-' + auditId + '">▼</span> Ocultar Detalle';
    }
}

// Filtrar casos por estado
async function filterBySJStatus(filter) {
    currentFilter = filter;
    
    // Actualizar tabs activos
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.getElementById(`tab-${filter}`).classList.add('active');
    
    await loadSJCases();
}

// Cargar todos los casos de SJ no escalado
async function loadSJCases() {
    const audits = await getAudits();
    const agents = await getAgents(); // Pre-cargar agentes
    const container = document.getElementById('sjContainer');
    
    // Filtrar auditorías que contengan error de SJ no escalado
    // Buscar variaciones: escaló/subió, Secundary/Secondary
    const sjCases = audits.filter(audit => {
        if (audit.errors && Array.isArray(audit.errors)) {
            const hasSJError = audit.errors.some(error => {
                const errorLower = error.toLowerCase();
                return errorLower.includes('secundary job') || errorLower.includes('secondary job');
            });
            return hasSJError;
        } else if (audit.errorDescription) {
            const descLower = audit.errorDescription.toLowerCase();
            return descLower.includes('secundary job') || descLower.includes('secondary job');
        }
        return false;
    });
    
    if (sjCases.length === 0) {
        container.innerHTML = `
            <div class="no-sj">
                <div class="no-sj-icon">🎉</div>
                <h3>¡Excelente!</h3>
                <p>No hay casos de Secondary Jobs no escalados</p>
            </div>
        `;
        updateStats([], []);
        return;
    }
    
    // Ordenar por fecha (más recientes primero)
    sjCases.sort((a, b) => new Date(b.callDate) - new Date(a.callDate));
    
    // Agregar estado a cada caso
    const casesWithStatus = sjCases.map(sjCase => ({
        ...sjCase,
        sjStatus: getSJStatus(sjCase.id)
    }));
    
    // Filtrar según el filtro activo
    let filteredCases = casesWithStatus;
    if (currentFilter === 'pendiente') {
        filteredCases = casesWithStatus.filter(c => c.sjStatus === 'pendiente');
    } else if (currentFilter === 'gestionado') {
        filteredCases = casesWithStatus.filter(c => c.sjStatus === 'gestionado');
    }
    
    // Actualizar estadísticas
    updateStats(casesWithStatus, filteredCases);
    
    if (filteredCases.length === 0) {
        container.innerHTML = `
            <div class="no-sj">
                <div class="no-sj-icon">🔍</div>
                <p>No hay casos ${currentFilter === 'pendiente' ? 'pendientes' : 'gestionados'} para mostrar</p>
            </div>
        `;
        return;
    }
    
    // Renderizar casos
    container.innerHTML = filteredCases.map(sjCase => renderSJCase(sjCase, agents)).join('');
}

// Actualizar estadísticas
function updateStats(allCases, filteredCases) {
    const total = allCases.length;
    const pendientes = allCases.filter(c => c.sjStatus === 'pendiente').length;
    const gestionados = allCases.filter(c => c.sjStatus === 'gestionado').length;
    const porcentaje = total > 0 ? ((gestionados / total) * 100).toFixed(1) : 0;
    
    document.getElementById('totalSJ').textContent = total;
    document.getElementById('pendientesSJ').textContent = pendientes;
    document.getElementById('gestionadosSJ').textContent = gestionados;
    document.getElementById('porcentajeSJ').textContent = porcentaje + '%';
}

// Renderizar un caso individual
function renderSJCase(sjCase, agents) {
    const isGestionado = sjCase.sjStatus === 'gestionado';
    const currentComment = getSJComment(sjCase.id);
    
    // Buscar nombre del agente
    const agent = agents.find(a => a.id === sjCase.agentId);
    const agentName = agent ? agent.name : 'Agente no encontrado';
    
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
    
    const bpoLabels = {
        'teleperformance': 'Teleperformance',
        'konecta': 'Konecta'
    };
    
    // Procesar todos los errores
    let allErrors = [];
    if (sjCase.errors && Array.isArray(sjCase.errors)) {
        allErrors = sjCase.errors;
    } else if (sjCase.errorDescription) {
        allErrors = sjCase.errorDescription.split(';').map(e => e.trim()).filter(e => e);
    }
    
    return `
        <div class="sj-card ${isGestionado ? 'gestionado' : ''}">
            <div class="sj-header">
                <div class="sj-info">
                    <div class="sj-agent-name">👤 ${agentName}</div>
                    <div class="sj-date">📅 ${formatDate(sjCase.callDate)}</div>
                    <div class="sj-customer">🆔 Customer ID: ${sjCase.customerId}</div>
                    ${sjCase.enlacePv ? `
                    <div class="sj-date" style="margin-top: 0.5rem;">
                        <a href="${sjCase.enlacePv}" target="_blank" class="btn btn-secondary" 
                           style="padding: 0.4rem 0.8rem; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 0.5rem;">
                            🔗 Abrir Enlace PV
                        </a>
                    </div>
                    ` : ''}
                    
                    <button onclick="toggleFullDetail('${sjCase.id}')" class="sj-toggle-detail-btn" id="toggle-btn-${sjCase.id}">
                        <span class="sj-toggle-icon" id="toggle-icon-${sjCase.id}">▼</span> Ver Detalle Completo
                    </button>
                </div>
                <div class="sj-status-toggle">
                    <label class="status-label">Estado de Gestión:</label>
                    <select class="status-select ${sjCase.sjStatus}" 
                            onchange="toggleSJStatus('${sjCase.id}', this.value)"
                            value="${sjCase.sjStatus}">
                        <option value="pendiente" ${sjCase.sjStatus === 'pendiente' ? 'selected' : ''}>
                            ⚠️ No se ha gestionado
                        </option>
                        <option value="gestionado" ${sjCase.sjStatus === 'gestionado' ? 'selected' : ''}>
                            ✅ Sí se gestionó
                        </option>
                    </select>
                    
                    <div class="sj-comments-container ${sjCase.sjStatus === 'pendiente' ? 'visible' : ''}" id="comments-${sjCase.id}">
                        <label class="sj-comments-label" for="comment-${sjCase.id}">¿Qué falta para proceder?</label>
                        <textarea 
                            id="comment-${sjCase.id}" 
                            class="sj-comments-textarea"
                            placeholder="Escribe aquí lo que falta para gestionar este caso..."
                            ${currentComment ? 'disabled' : ''}
                        >${currentComment}</textarea>
                        <div class="sj-comments-actions">
                            ${currentComment ? `
                                <button class="btn btn-secondary" onclick="enableCommentEdit('${sjCase.id}')">
                                    ✏️ Editar
                                </button>
                            ` : ''}
                            <button class="btn btn-primary" id="save-btn-${sjCase.id}" onclick="saveSJCommentWithButton('${sjCase.id}')" ${currentComment ? 'style="display: none;"' : ''}>
                                💾 Guardar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Sección de Detalle Expandible -->
            <div class="sj-detail-section" id="detail-${sjCase.id}">
                <h3 style="margin-bottom: 1.5rem; color: var(--primary-color); font-size: 1.1rem;">
                    📋 Detalle Completo de la Auditoría
                </h3>
                
                <div class="sj-detail-grid">
                    <div class="sj-detail-field">
                        <span class="sj-detail-field-label">Fecha de Auditoría</span>
                        <span class="sj-detail-field-value">📅 ${formatDate(sjCase.callDate)}</span>
                    </div>
                    <div class="sj-detail-field">
                        <span class="sj-detail-field-label">Customer ID</span>
                        <span class="sj-detail-field-value">🆔 ${sjCase.customerId}</span>
                    </div>
                    <div class="sj-detail-field">
                        <span class="sj-detail-field-label">Agente</span>
                        <span class="sj-detail-field-value">👤 ${agentName}</span>
                    </div>
                    <div class="sj-detail-field">
                        <span class="sj-detail-field-label">Auditor</span>
                        <span class="sj-detail-field-value">👨‍💼 ${sjCase.auditor}</span>
                    </div>
                    <div class="sj-detail-field">
                        <span class="sj-detail-field-label">Motivo</span>
                        <span class="sj-detail-field-value">📋 ${callTypeLabels[sjCase.callType] || sjCase.callType}</span>
                    </div>
                    <div class="sj-detail-field">
                        <span class="sj-detail-field-label">BPO</span>
                        <span class="sj-detail-field-value">🏢 ${bpoLabels[sjCase.bpo] || sjCase.bpo || 'No especificado'}</span>
                    </div>
                    <div class="sj-detail-field">
                        <span class="sj-detail-field-label">Criticidad</span>
                        <span class="sj-detail-field-value">${getCriticalityBadge(sjCase.criticality)}</span>
                    </div>
                    <div class="sj-detail-field">
                        <span class="sj-detail-field-label">TNPS</span>
                        <span class="sj-detail-field-value">${getTnpsBadge(sjCase.tnps)}</span>
                    </div>
                </div>
                
                ${allErrors.length > 0 ? `
                <div class="sj-errors-section">
                    <div class="sj-errors-section-title">🚨 Errores Detectados en la Auditoría:</div>
                    <ul class="sj-errors-list">
                        ${allErrors.map(error => {
                            const isSJError = error.includes('No se escaló Secundary Job') || 
                                             error.includes('No se escaló Secondary Job');
                            return `<li class="${isSJError ? 'sj-error' : ''}">${error}</li>`;
                        }).join('')}
                    </ul>
                </div>
                ` : ''}
                
                ${sjCase.callNotes ? `
                <div class="sj-errors-section" style="border-left-color: var(--info-color); margin-top: 1rem;">
                    <div class="sj-errors-section-title">📝 Notas Adicionales:</div>
                    <p style="margin-top: 0.5rem; color: var(--text-primary); line-height: 1.6;">${sjCase.callNotes}</p>
                </div>
                ` : ''}
            </div>
        </div>
    `;
}

// Redirigir a crear feedback para este agente
function openCreateFeedback(agentId, auditId) {
    // Guardar información del contexto para pre-llenar el formulario
    localStorage.setItem('feedbackContext', JSON.stringify({
        agentId: agentId,
        relatedAudit: auditId,
        reason: 'SJ_no_escalado'
    }));
    
    window.location.href = 'registrar-feedback.html';
}

// Exportar casos de SJ a CSV
async function exportSJToCSV() {
    const audits = await getAudits();
    
    // Filtrar auditorías que contengan error de SJ no escalado
    const sjCases = audits.filter(audit => {
        if (audit.errors && Array.isArray(audit.errors)) {
            return audit.errors.some(error => 
                error.includes('No se escaló Secundary Job') ||
                error.includes('No se escaló Secondary Job')
            );
        } else if (audit.errorDescription) {
            return audit.errorDescription.includes('No se escaló Secundary Job') ||
                   audit.errorDescription.includes('No se escaló Secondary Job');
        }
        return false;
    });
    
    if (sjCases.length === 0) {
        alert('No hay casos para exportar');
        return;
    }
    
    // Crear CSV header
    let csv = 'Fecha,Customer ID,Agente,Auditor,BPO,Criticidad,TNPS,Estado Gestión,Comentarios,Enlace PV\n';
    
    // Agregar filas
    sjCases.forEach(sjCase => {
        const agentName = getAgentName(sjCase.agentId);
        const status = getSJStatus(sjCase.id);
        const comment = getSJComment(sjCase.id);
        const row = [
            sjCase.callDate,
            sjCase.customerId,
            agentName,
            sjCase.auditor,
            sjCase.bpo || '',
            sjCase.criticality,
            sjCase.tnps,
            status === 'gestionado' ? 'Gestionado' : 'Pendiente',
            comment ? `"${comment.replace(/"/g, '""')}"` : '',
            sjCase.enlacePv || ''
        ];
        csv += row.join(',') + '\n';
    });
    
    // Descargar archivo
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `sj_pendientes_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
