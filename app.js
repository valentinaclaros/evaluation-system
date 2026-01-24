// ===================================
// Funciones comunes y gestión de datos con Supabase
// ===================================

// ===================================
// AGENTES
// ===================================

// Obtener todos los agentes
async function getAgents() {
    try {
        const { data, error } = await supabase
            .from('agents')
            .select('*')
            .order('name', { ascending: true });
        
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error al obtener agentes:', error);
        return [];
    }
}

// Agregar un agente
async function addAgent(agent) {
    try {
        agent.id = generateId();
        agent.created_at = new Date().toISOString();
        
        const { data, error } = await supabase
            .from('agents')
            .insert([agent])
            .select()
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error al agregar agente:', error);
        throw error;
    }
}

// Actualizar un agente
async function updateAgent(agentId, updatedData) {
    try {
        const { data, error } = await supabase
            .from('agents')
            .update(updatedData)
            .eq('id', agentId)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error al actualizar agente:', error);
        throw error;
    }
}

// Eliminar un agente
async function deleteAgent(agentId) {
    try {
        const { error } = await supabase
            .from('agents')
            .delete()
            .eq('id', agentId);
        
        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error al eliminar agente:', error);
        throw error;
    }
}

// ===================================
// AUDITORÍAS
// ===================================

// Obtener todas las auditorías
async function getAudits() {
    try {
        const { data, error } = await supabase
            .from('audits')
            .select('*')
            .order('call_date', { ascending: false });
        
        if (error) throw error;
        
        // Convertir snake_case a camelCase para compatibilidad
        return (data || []).map(audit => ({
            id: audit.id,
            callDate: audit.call_date,
            customerId: audit.customer_id,
            callType: audit.call_type,
            cancellationReason: audit.cancellation_reason,
            auditDate: audit.audit_date,
            enlacePv: audit.enlace_pv,
            bpo: audit.bpo,
            agentId: audit.agent_id,
            auditor: audit.auditor,
            criticality: audit.criticality,
            tnps: audit.tnps,
            errorDescription: audit.error_description,
            errors: audit.errors,
            callNotes: audit.call_notes,
            callDuration: audit.call_duration,
            transferAttempt: audit.transfer_attempt,
            excessiveHold: audit.excessive_hold,
            holdTime: audit.hold_time,
            createdAt: audit.created_at
        }));
    } catch (error) {
        console.error('Error al obtener auditorías:', error);
        return [];
    }
}

// Guardar auditorías (para compatibilidad - ahora usa addAudit o updateAudit)
async function saveAudits(audits) {
    console.warn('saveAudits() ya no se usa directamente. Usa addAudit() o updateAudit()');
}

// Agregar una auditoría
async function addAudit(audit) {
    try {
        audit.id = generateId();
        
        // Convertir camelCase a snake_case
        const auditData = {
            id: audit.id,
            call_date: audit.callDate,
            customer_id: audit.customerId,
            call_type: audit.callType,
            cancellation_reason: audit.cancellationReason || null,
            audit_date: audit.auditDate,
            enlace_pv: audit.enlacePv || null,
            bpo: audit.bpo,
            agent_id: audit.agentId,
            auditor: audit.auditor,
            criticality: audit.criticality,
            tnps: audit.tnps ? parseInt(audit.tnps) : null,
            error_description: audit.errorDescription || '',
            errors: audit.errors || [],
            call_notes: audit.callNotes || '',
            call_duration: audit.callDuration || 0,
            transfer_attempt: audit.transferAttempt || '',
            excessive_hold: audit.excessiveHold || '',
            hold_time: audit.holdTime || 0
        };
        
        const { data, error } = await supabase
            .from('audits')
            .insert([auditData])
            .select()
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error al agregar auditoría:', error);
        throw error;
    }
}

// Actualizar una auditoría existente
async function updateAudit(auditId, audit) {
    try {
        const auditData = {
            call_date: audit.callDate,
            customer_id: audit.customerId,
            call_type: audit.callType,
            cancellation_reason: audit.cancellationReason || null,
            audit_date: audit.auditDate,
            enlace_pv: audit.enlacePv || null,
            bpo: audit.bpo,
            agent_id: audit.agentId,
            auditor: audit.auditor,
            criticality: audit.criticality,
            tnps: audit.tnps ? parseInt(audit.tnps) : null,
            error_description: audit.errorDescription || '',
            errors: audit.errors || [],
            call_notes: audit.callNotes || '',
            call_duration: audit.callDuration || 0,
            transfer_attempt: audit.transferAttempt || '',
            excessive_hold: audit.excessiveHold || '',
            hold_time: audit.holdTime || 0
        };
        
        const { data, error } = await supabase
            .from('audits')
            .update(auditData)
            .eq('id', auditId)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error al actualizar auditoría:', error);
        throw error;
    }
}

// Eliminar una auditoría
async function deleteAudit(auditId) {
    try {
        const { error } = await supabase
            .from('audits')
            .delete()
            .eq('id', auditId);
        
        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error al eliminar auditoría:', error);
        throw error;
    }
}

// ===================================
// FEEDBACKS
// ===================================

// Obtener todos los feedbacks
async function getFeedbacks() {
    try {
        const { data, error } = await supabase
            .from('feedbacks')
            .select('*')
            .order('feedback_date', { ascending: false });
        
        if (error) throw error;
        
        // Convertir snake_case a camelCase
        return (data || []).map(feedback => ({
            id: feedback.id,
            agentId: feedback.agent_id,
            feedbackDate: feedback.feedback_date,
            feedbackType: feedback.feedback_type,
            feedbackProcess: feedback.feedback_process,
            additionalSteps: feedback.additional_steps,
            priority: feedback.priority,
            feedbackMessage: feedback.feedback_message,
            feedbackGivenBy: feedback.feedback_given_by,
            actionPlan: feedback.action_plan,
            followUpDate: feedback.follow_up_date,
            relatedCalls: feedback.related_calls || [],
            createdAt: feedback.created_at
        }));
    } catch (error) {
        console.error('Error al obtener feedbacks:', error);
        return [];
    }
}

// Guardar feedbacks (para compatibilidad)
async function saveFeedbacks(feedbacks) {
    console.warn('saveFeedbacks() ya no se usa directamente. Usa addFeedback()');
}

// Agregar un feedback
async function addFeedback(feedback) {
    try {
        feedback.id = generateId();
        
        const feedbackData = {
            id: feedback.id,
            agent_id: feedback.agentId,
            feedback_date: feedback.feedbackDate,
            feedback_type: feedback.feedbackType,
            feedback_process: feedback.feedbackProcess || null,
            additional_steps: feedback.additionalSteps || null,
            priority: feedback.priority,
            feedback_message: feedback.feedbackMessage,
            feedback_given_by: feedback.feedbackGivenBy,
            action_plan: feedback.actionPlan || '',
            follow_up_date: feedback.followUpDate || null,
            related_calls: feedback.relatedCalls || []
        };
        
        const { data, error } = await supabase
            .from('feedbacks')
            .insert([feedbackData])
            .select()
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error al agregar feedback:', error);
        throw error;
    }
}

// Eliminar un feedback
async function deleteFeedback(feedbackId) {
    try {
        const { error } = await supabase
            .from('feedbacks')
            .delete()
            .eq('id', feedbackId);
        
        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error al eliminar feedback:', error);
        throw error;
    }
}

// ===================================
// FUNCIONES AUXILIARES (sin cambios)
// ===================================

// Generar ID único
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Formatear fecha
function formatDate(dateString) {
    if (!dateString) return '-';
    
    // Usar el formato de fecha local sin conversión de zona horaria
    const [year, month, day] = dateString.split('T')[0].split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Obtener nombre del agente por ID
async function getAgentName(agentId) {
    const agents = await getAgents();
    const agent = agents.find(a => a.id === agentId);
    return agent ? agent.name : 'Agente desconocido';
}

// Obtener badge de criticidad
function getCriticalityBadge(criticality) {
    const badges = {
        'critico': '<span class="badge badge-critico">Crítico</span>',
        'alto': '<span class="badge badge-alto">Alto</span>',
        'medio': '<span class="badge badge-medio">Medio</span>',
        'perfecto': '<span class="badge badge-perfecto">Perfecto</span>',
        'alta': '<span class="badge badge-critico">Alta</span>',
        'media': '<span class="badge badge-medio">Media</span>',
        'baja': '<span class="badge badge-perfecto">Baja</span>'
    };
    return badges[criticality] || criticality;
}

// Obtener badge de TNPS con círculos de colores
function getTnpsBadge(tnps) {
    const badges = {
        'promoter': '<span class="badge badge-promoter"><span class="circle-indicator green"></span> Promoter</span>',
        'neutral': '<span class="badge badge-neutral"><span class="circle-indicator yellow"></span> Neutral</span>',
        'detractor': '<span class="badge badge-detractor"><span class="circle-indicator red"></span> Detractor</span>',
        'null': '<span class="badge badge-null"><span class="circle-indicator gray"></span> Sin respuesta</span>'
    };
    return badges[tnps] || tnps;
}

// Obtener badge de BPO
function getBpoBadge(bpo) {
    const badges = {
        'teleperformance': '<span class="badge badge-bpo-tp">Teleperformance</span>',
        'konecta': '<span class="badge badge-bpo-konecta">Konecta</span>'
    };
    return badges[bpo] || bpo;
}

// Obtener label de Proceso
function getProcessLabel(process) {
    const labels = {
        'cancelaciones': 'Cancelaciones',
        'nu_plus': 'Nu Plus',
        'certificados': 'Certificados'
    };
    return labels[process] || process;
}

// Obtener badge de Proceso
function getProcessBadge(process) {
    const badges = {
        'cancelaciones': '<span class="badge badge-process-cancelaciones">Cancelaciones</span>',
        'nu_plus': '<span class="badge badge-process-nu-plus">Nu Plus</span>',
        'certificados': '<span class="badge badge-process-certificados">Certificados</span>'
    };
    return badges[process] || `<span class="badge">${process}</span>`;
}

// Obtener badge de pasos adicionales
function getAdditionalStepsBadge(steps) {
    const badges = {
        'auditoria_adicional': '<span class="badge badge-info">📋 Auditoría Adicional</span>',
        'calibracion': '<span class="badge badge-info">🎯 Calibración</span>',
        'escalamiento': '<span class="badge badge-warning">⬆️ Escalamiento</span>',
        'seguimiento_semanal': '<span class="badge badge-success">📅 Seguimiento Semanal</span>',
        'plan_mejora': '<span class="badge badge-primary">📈 Plan de Mejora</span>'
    };
    return badges[steps] || `<span class="badge">${steps}</span>`;
}

// Obtener badge de tipo de feedback
function getFeedbackTypeBadge(type) {
    const badges = {
        'correctivo': '<span class="badge badge-critico">🔴 Correctivo</span>',
        'constructivo': '<span class="badge badge-medio">🟡 Constructivo</span>',
        'positivo': '<span class="badge badge-perfecto">🟢 Positivo</span>'
    };
    return badges[type] || `<span class="badge">${type}</span>`;
}

// Obtener badge de prioridad
function getPriorityBadge(priority) {
    const badges = {
        'alta': '<span class="badge badge-critico">Alta</span>',
        'media': '<span class="badge badge-medio">Media</span>',
        'baja': '<span class="badge badge-perfecto">Baja</span>'
    };
    return badges[priority] || `<span class="badge">${priority}</span>`;
}

// Calcular métricas de un agente
async function calculateAgentMetrics(agentId, startDate = null, endDate = null) {
    const allAudits = await getAudits();
    let agentAudits = allAudits.filter(audit => audit.agentId === agentId);
    
    // Filtrar por fechas si se proporcionan
    if (startDate) {
        agentAudits = agentAudits.filter(audit => new Date(audit.callDate) >= new Date(startDate));
    }
    if (endDate) {
        agentAudits = agentAudits.filter(audit => new Date(audit.callDate) <= new Date(endDate));
    }
    
    const totalCalls = agentAudits.length;
    const errorsCount = agentAudits.filter(a => a.errorDescription).length;
    const errorRate = totalCalls > 0 ? ((errorsCount / totalCalls) * 100).toFixed(1) : 0;
    
    const criticalErrors = agentAudits.filter(a => 
        a.criticality === 'critico' || a.criticality === 'alta' || a.criticality === 'alto'
    ).length;
    const mediumErrors = agentAudits.filter(a => 
        a.criticality === 'medio' || a.criticality === 'media'
    ).length;
    const lowErrors = agentAudits.filter(a => 
        a.criticality === 'perfecto' || a.criticality === 'baja'
    ).length;
    
    const promoters = agentAudits.filter(a => a.tnps === 'promoter').length;
    const neutrals = agentAudits.filter(a => a.tnps === 'neutral').length;
    const detractors = agentAudits.filter(a => a.tnps === 'detractor').length;
    const nullResponses = agentAudits.filter(a => a.tnps === 'null').length;
    
    return {
        totalCalls,
        errorsCount,
        errorRate,
        criticalErrors,
        mediumErrors,
        lowErrors,
        promoters,
        neutrals,
        detractors,
        nullResponses,
        audits: agentAudits
    };
}

// Exportar a CSV
async function exportToCSV() {
    const audits = await getAudits();
    const agents = await getAgents();
    
    if (audits.length === 0) {
        alert('No hay datos para exportar');
        return;
    }
    
    let csv = 'Fecha,Customer ID,Motivo,Agente,Auditor,BPO,Criticidad,Error,TNPS,Enlace PV,Notas\n';
    
    audits.forEach(audit => {
        const agent = agents.find(a => a.id === audit.agentId);
        const agentName = agent ? agent.name : 'Desconocido';
        const callTypeLabels = {
            'cancelacion_tarjeta_credito': 'Cancelación Tarjeta de Crédito',
            'cancelacion_cuenta_ahorros': 'Cancelación Cuenta de Ahorros',
            'cancelacion_multiproducto': 'Cancelación Multiproducto',
            'nu_plus': 'Nu Plus',
            'certificados': 'Certificados'
        };
        const row = [
            audit.callDate,
            audit.customerId,
            callTypeLabels[audit.callType] || audit.callType,
            agentName,
            audit.auditor,
            audit.bpo || '',
            audit.criticality,
            `"${(audit.errorDescription || '').replace(/"/g, '""')}"`,
            audit.tnps,
            audit.enlacePv || '',
            audit.callNotes ? `"${audit.callNotes.replace(/"/g, '""')}"` : ''
        ];
        csv += row.join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `auditorias_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Mostrar mensaje temporal
function showMessage(elementId, message, type = 'success') {
    const element = document.getElementById(elementId);
    if (element) {
        if (type === 'error') {
            const errorTextEl = document.getElementById('errorText');
            if (errorTextEl) {
                errorTextEl.textContent = message;
            }
        }
        element.style.display = 'block';
        setTimeout(() => {
            element.style.display = 'none';
        }, 5000);
    }
}

// Calcular días entre fechas
function daysBetween(date1, date2) {
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.round(Math.abs((new Date(date1) - new Date(date2)) / oneDay));
}

console.log('✅ app.js cargado con soporte Supabase');
