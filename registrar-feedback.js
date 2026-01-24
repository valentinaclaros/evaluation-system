// ===================================
// Registrar Feedback - Lógica del formulario
// ===================================

document.addEventListener('DOMContentLoaded', async function() {
    await loadAgentsDropdown();
    setupForm();
    setDefaultDate();
    setupAgentChangeListener();
    await checkForEdit(); // Verificar si estamos editando un feedback existente
});

// Cargar agentes en el dropdown
async function loadAgentsDropdown() {
    const agents = await getAgents();
    const select = document.getElementById('feedbackAgentId');
    
    select.innerHTML = '<option value="">Selecciona un agente</option>';
    
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

// Establecer fecha por defecto
function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('feedbackDate').value = today;
}

// Escuchar cambios en la selección de agente
function setupAgentChangeListener() {
    const select = document.getElementById('feedbackAgentId');
    
    select.addEventListener('change', async function() {
        const agentId = this.value;
        if (agentId) {
            await loadAgentSummary(agentId);
            await loadRecentErrors(agentId);
            await loadRelatedCalls(agentId);
        } else {
            document.getElementById('agentErrorsSummary').style.display = 'none';
            document.getElementById('relatedCallsCheckboxes').innerHTML = '';
        }
    });
}

// Cargar resumen de errores del agente
async function loadAgentSummary(agentId) {
    const audits = await getAudits();
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    const recentAudits = audits.filter(audit => {
        return audit.agentId === agentId && 
               new Date(audit.callDate) >= thirtyDaysAgo;
    });
    
    const errorsCount = recentAudits.length;
    const errorRate = recentAudits.length > 0 ? '100%' : '0%'; // Todas las auditorías registran errores
    
    document.getElementById('recentCallsCount').textContent = recentAudits.length;
    document.getElementById('recentErrorsCount').textContent = errorsCount;
    document.getElementById('errorRate').textContent = errorRate;
    
    document.getElementById('agentErrorsSummary').style.display = 'block';
}

// Cargar errores recientes
async function loadRecentErrors(agentId) {
    const audits = await getAudits();
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    const recentAudits = audits.filter(audit => {
        return audit.agentId === agentId && 
               new Date(audit.callDate) >= thirtyDaysAgo;
    }).sort((a, b) => new Date(b.callDate) - new Date(a.callDate)).slice(0, 5);
    
    const container = document.getElementById('recentErrorsList');
    
    if (recentAudits.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-light);">No hay errores recientes</p>';
    } else {
        container.innerHTML = recentAudits.map(audit => `
            <div class="error-item">
                <div class="error-item-date">
                    ${formatDate(audit.callDate)} - ${getCriticalityBadge(audit.criticality)}
                </div>
                <div class="error-item-text">
                    ${audit.errorDescription}
                </div>
            </div>
        `).join('');
    }
}

// Cargar llamadas relacionadas como checkboxes
async function loadRelatedCalls(agentId) {
    const audits = await getAudits();
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    const recentAudits = audits.filter(audit => {
        return audit.agentId === agentId && 
               new Date(audit.callDate) >= thirtyDaysAgo;
    }).sort((a, b) => new Date(b.callDate) - new Date(a.callDate));
    
    const container = document.getElementById('relatedCallsCheckboxes');
    
    if (recentAudits.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 1rem;">No hay auditorías recientes para seleccionar</p>';
    } else {
        container.innerHTML = recentAudits.map(audit => `
            <div class="checkbox-item">
                <input type="checkbox" id="call-${audit.id}" name="relatedCalls" value="${audit.id}">
                <label for="call-${audit.id}" class="checkbox-label">
                    <strong>${formatDate(audit.callDate)}</strong> - ${audit.customerId}<br>
                    <small>${audit.errorDescription.substring(0, 100)}${audit.errorDescription.length > 100 ? '...' : ''}</small>
                </label>
            </div>
        `).join('');
    }
}

// Configurar el formulario
function setupForm() {
    const form = document.getElementById('feedbackForm');
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Validar que haya agentes
        const agents = await getAgents();
        if (agents.length === 0) {
            showMessage('errorMessage', 'Primero debes agregar agentes en la sección de Gestión de Agentes', 'error');
            return;
        }
        
        // Recopilar datos del formulario
        const formData = {
            agentId: document.getElementById('feedbackAgentId').value,
            feedbackDate: document.getElementById('feedbackDate').value,
            feedbackGivenBy: document.getElementById('feedbackGivenBy').value,
            feedbackType: document.getElementById('feedbackType').value,
            feedbackProcess: document.getElementById('feedbackProcess').value,
            additionalSteps: document.getElementById('additionalSteps').value,
            feedbackMessage: document.getElementById('feedbackMessage').value.trim(),
            actionPlan: document.getElementById('actionPlan').value.trim(),
            followUpDate: document.getElementById('followUpDate').value,
            priority: document.getElementById('priority').value,
            relatedCalls: []
        };
        
        // Recopilar llamadas relacionadas seleccionadas
        const checkboxes = document.querySelectorAll('input[name="relatedCalls"]:checked');
        formData.relatedCalls = Array.from(checkboxes).map(cb => cb.value);
        
        // Validaciones
        if (!formData.agentId) {
            showMessage('errorMessage', 'Debes seleccionar un agente', 'error');
            return;
        }
        
        // Verificar si estamos editando
        const urlParams = new URLSearchParams(window.location.search);
        const editId = urlParams.get('edit');
        
        // Guardar feedback
        try {
            if (editId) {
                // Editar feedback existente
                await updateFeedback(editId, formData);
                showMessage('successMessage', 'Feedback actualizado correctamente', 'success');
            } else {
                // Crear nuevo feedback
                await addFeedback(formData);
                showMessage('successMessage', 'Feedback registrado correctamente', 'success');
            }
            
            // Limpiar formulario
            form.reset();
            setDefaultDate();
            document.getElementById('agentErrorsSummary').style.display = 'none';
            document.getElementById('relatedCallsCheckboxes').innerHTML = '';
            
            // Redirigir al dashboard después de 2 segundos
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
            
        } catch (error) {
            showMessage('errorMessage', 'Error al guardar el feedback. Por favor intenta nuevamente.', 'error');
            console.error('Error:', error);
        }
    });
}

// Verificar si estamos editando un feedback
async function checkForEdit() {
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');
    
    if (editId) {
        const feedbacks = await getFeedbacks();
        const feedback = feedbacks.find(f => f.id === editId);
        
        if (feedback) {
            // Cambiar el título de la página
            const pageHeader = document.querySelector('.page-header h2');
            if (pageHeader) {
                pageHeader.textContent = '✏️ Editar Feedback';
            }
            
            // Cambiar el texto del botón
            const submitButton = document.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.textContent = '💾 Actualizar Feedback';
            }
            
            // Rellenar el formulario con los datos existentes
            document.getElementById('feedbackAgentId').value = feedback.agentId;
            document.getElementById('feedbackDate').value = feedback.feedbackDate;
            document.getElementById('feedbackGivenBy').value = feedback.feedbackGivenBy;
            document.getElementById('feedbackType').value = feedback.feedbackType;
            document.getElementById('feedbackProcess').value = feedback.feedbackProcess || '';
            document.getElementById('additionalSteps').value = feedback.additionalSteps || '';
            document.getElementById('feedbackMessage').value = feedback.feedbackMessage;
            document.getElementById('actionPlan').value = feedback.actionPlan || '';
            document.getElementById('followUpDate').value = feedback.followUpDate || '';
            document.getElementById('priority').value = feedback.priority;
            
            // Cargar datos del agente
            await loadAgentSummary(feedback.agentId);
            await loadRecentErrors(feedback.agentId);
            await loadRelatedCalls(feedback.agentId);
            
            // Después de un breve delay, marcar las llamadas relacionadas
            setTimeout(() => {
                if (feedback.relatedCalls && feedback.relatedCalls.length > 0) {
                    feedback.relatedCalls.forEach(callId => {
                        const checkbox = document.getElementById(`call-${callId}`);
                        if (checkbox) {
                            checkbox.checked = true;
                        }
                    });
                }
            }, 500);
        }
    }
}

// Actualizar un feedback existente
async function updateFeedback(feedbackId, updatedData) {
    try {
        // Convertir camelCase a snake_case para Supabase
        const feedbackData = {
            agent_id: updatedData.agentId,
            feedback_date: updatedData.feedbackDate,
            feedback_type: updatedData.feedbackType,
            feedback_process: updatedData.feedbackProcess || null,
            additional_steps: updatedData.additionalSteps || null,
            priority: updatedData.priority,
            feedback_message: updatedData.feedbackMessage,
            feedback_given_by: updatedData.feedbackGivenBy,
            action_plan: updatedData.actionPlan || '',
            follow_up_date: updatedData.followUpDate || null,
            related_calls: updatedData.relatedCalls || []
        };
        
        const { data, error } = await supabase
            .from('feedbacks')
            .update(feedbackData)
            .eq('id', feedbackId)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error al actualizar feedback:', error);
        throw error;
    }
}

