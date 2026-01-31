// ===================================
// Registrar Feedback - Nueva Lógica
// ===================================

let currentIncidenciaLevel = 0;

document.addEventListener('DOMContentLoaded', async function() {
    await loadAgentsDropdown();
    setupForm();
    setDefaultDate();
    setupEventListeners();
});

// Cargar agentes en los dropdowns
async function loadAgentsDropdown() {
    const agents = await getAgents();
    const selectAgente = document.getElementById('feedbackAgentId');
    
    selectAgente.innerHTML = '<option value="">Seleccionar agente...</option>';
    
    if (agents.length === 0) {
        selectAgente.innerHTML += '<option value="" disabled>No hay agentes registrados</option>';
    } else {
        agents.forEach(agent => {
            const option = document.createElement('option');
            option.value = agent.id;
            option.textContent = agent.name;
            selectAgente.appendChild(option);
        });
    }
}

// Establecer fecha por defecto
function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('feedbackDate').value = today;
}

// Configurar event listeners
function setupEventListeners() {
    // Cuando cambia el agente seleccionado
    document.getElementById('feedbackAgentId').addEventListener('change', async function() {
        const agentId = this.value;
        if (agentId) {
            await loadRelatedAudits(agentId);
            // Si la matriz disciplinaria ya está seleccionada como "Sí", analizar incidencias
            if (document.getElementById('matrizDisciplinaria').value === 'Si') {
                await analizarIncidenciasAgente(agentId);
            }
        } else {
            document.getElementById('relatedCallsCheckboxes').innerHTML = '<p class="info-text">Primero selecciona un agente...</p>';
        }
    });

    // Cuando cambia la matriz disciplinaria
    document.getElementById('matrizDisciplinaria').addEventListener('change', async function() {
        const matrizDetalles = document.getElementById('matrizDetallesSection');
        const incidenciasContainer = document.getElementById('incidenciasContainer');
        
        if (this.value === 'Si') {
            matrizDetalles.style.display = 'block';
            
            const agentId = document.getElementById('feedbackAgentId').value;
            if (agentId) {
                // Agente ya seleccionado, proceder con análisis
                incidenciasContainer.style.display = 'block';
                await analizarIncidenciasAgente(agentId);
            } else {
                // No hay agente, ocultar incidencias
                incidenciasContainer.style.display = 'none';
            }

            // Hacer campos requeridos
            document.getElementById('tipoFalta').required = true;
            document.getElementById('gravedad').required = true;
            document.getElementById('descripcionFalta').required = true;
        } else {
            matrizDetalles.style.display = 'none';
            incidenciasContainer.style.display = 'none';
            
            // Quitar requeridos
            document.getElementById('tipoFalta').required = false;
            document.getElementById('gravedad').required = false;
            document.getElementById('descripcionFalta').required = false;
        }
    });
}

// Analizar incidencias previas del agente
async function analizarIncidenciasAgente(agentId) {
    console.log('Analizando incidencias para agente:', agentId);
    
    try {
        // Intentar obtener feedbacks previos del agente
        const feedbacks = await getFeedbacks();
        console.log('Feedbacks obtenidos:', feedbacks.length);
        
        // Filtrar feedbacks del agente que aplican matriz disciplinaria
        const feedbacksConMatriz = feedbacks.filter(f => 
            f.agentId === agentId && f.additionalSteps === 'matriz_disciplinaria'
        );
        
        console.log('Feedbacks con matriz del agente:', feedbacksConMatriz.length);
        
        // Determinar nivel de incidencia (1-4)
        currentIncidenciaLevel = feedbacksConMatriz.length + 1;
        if (currentIncidenciaLevel > 4) {
            currentIncidenciaLevel = 4; // Máximo 4 incidencias
        }
    } catch (error) {
        // Si hay error, asumir que es primera incidencia
        console.log('Error al cargar feedbacks, asumiendo primera incidencia:', error);
        currentIncidenciaLevel = 1;
    }
    
    console.log('Nivel de incidencia determinado:', currentIncidenciaLevel);
    mostrarIncidenciaCorrespondiente(currentIncidenciaLevel);
}

// Mostrar solo el campo de incidencia correspondiente
function mostrarIncidenciaCorrespondiente(nivel) {
    console.log('Mostrando incidencia nivel:', nivel);
    
    const incidenciasContainer = document.getElementById('incidenciasContainer');
    const incidenciaTitle = document.getElementById('incidenciaTitle');
    
    // Ocultar todas las incidencias
    document.getElementById('primeraIncidencia').style.display = 'none';
    document.getElementById('segundaIncidencia').style.display = 'none';
    document.getElementById('terceraIncidencia').style.display = 'none';
    document.getElementById('cuartaIncidencia').style.display = 'none';
    
    // Quitar required de todas
    document.getElementById('accionPrimeraIncidencia').required = false;
    document.getElementById('accionSegundaIncidencia').required = false;
    document.getElementById('accionTerceraIncidencia').required = false;
    document.getElementById('accionCuartaIncidencia').required = false;
    
    // Mostrar contenedor
    incidenciasContainer.style.display = 'block';
    console.log('Container de incidencias mostrado');
    
    // Mostrar la incidencia correspondiente
    switch(nivel) {
        case 1:
            incidenciaTitle.textContent = 'Primera Incidencia';
            document.getElementById('primeraIncidencia').style.display = 'block';
            document.getElementById('accionPrimeraIncidencia').required = true;
            console.log('Primera incidencia mostrada');
            break;
        case 2:
            incidenciaTitle.textContent = 'Segunda Incidencia';
            document.getElementById('segundaIncidencia').style.display = 'block';
            document.getElementById('accionSegundaIncidencia').required = true;
            console.log('Segunda incidencia mostrada');
            break;
        case 3:
            incidenciaTitle.textContent = 'Tercera Incidencia';
            document.getElementById('terceraIncidencia').style.display = 'block';
            document.getElementById('accionTerceraIncidencia').required = true;
            console.log('Tercera incidencia mostrada');
            break;
        case 4:
            incidenciaTitle.textContent = 'Cuarta Incidencia';
            document.getElementById('cuartaIncidencia').style.display = 'block';
            document.getElementById('accionCuartaIncidencia').required = true;
            console.log('Cuarta incidencia mostrada');
            break;
    }
}

// Cargar auditorías relacionadas del agente
async function loadRelatedAudits(agentId) {
    const audits = await getAudits();
    const container = document.getElementById('relatedCallsCheckboxes');
    
    // Filtrar auditorías del agente seleccionado
    const agentAudits = audits.filter(a => a.agentId === agentId)
        .sort((a, b) => new Date(b.callDate) - new Date(a.callDate))
        .slice(0, 20); // Últimas 20 auditorías
    
    if (agentAudits.length === 0) {
        container.innerHTML = '<p class="info-text">Este agente no tiene auditorías registradas</p>';
        return;
    }
    
    container.innerHTML = agentAudits.map(audit => {
        const date = new Date(audit.callDate).toLocaleDateString('es-ES');
        const criticalityLabel = {
            'perfecto': 'Perfecto',
            'medio': 'Medio',
            'alto': 'Alto',
            'critico': 'Crítico'
        }[audit.criticality] || audit.criticality;
        
        const criticalityClass = `badge-${audit.criticality}`;
        
        return `
            <div class="checkbox-item">
                <input type="checkbox" id="audit_${audit.id}" name="relatedAudits" value="${audit.id}">
                <label for="audit_${audit.id}">
                    <strong>${date}</strong> - Customer: ${audit.customerId}
                    <br>
                    <span class="badge ${criticalityClass}">${criticalityLabel}</span>
                    ${audit.specificError || 'Sin error específico'}
                </label>
            </div>
        `;
    }).join('');
}

// Configurar formulario
function setupForm() {
    const form = document.getElementById('feedbackForm');
    form.addEventListener('submit', handleSubmit);
}

// Manejar envío del formulario
async function handleSubmit(e) {
    e.preventDefault();
    
    const formData = {
        agentId: document.getElementById('feedbackAgentId').value,
        givenBy: document.getElementById('feedbackGivenBy').value,
        feedbackDate: document.getElementById('feedbackDate').value,
        feedbackType: document.getElementById('feedbackType').value,
        channel: document.getElementById('channel').value,
        owner: document.getElementById('owner').value,
        message: document.getElementById('planAccion').value,
        additionalSteps: document.getElementById('matrizDisciplinaria').value === 'Si' ? 'matriz_disciplinaria' : 'na',
        priority: 'media'
    };
    
    // Recopilar auditorías seleccionadas
    const selectedAudits = Array.from(document.querySelectorAll('input[name="relatedAudits"]:checked'))
        .map(cb => cb.value);
    formData.relatedCallIds = selectedAudits;
    
    // Si aplica matriz disciplinaria, agregar datos adicionales
    if (document.getElementById('matrizDisciplinaria').value === 'Si') {
        formData.matrizDisciplinaria = {
            tipoFalta: document.getElementById('tipoFalta').value,
            gravedad: document.getElementById('gravedad').value,
            descripcionFalta: document.getElementById('descripcionFalta').value,
            numeroIncidencia: currentIncidenciaLevel
        };
        
        // Obtener la acción de incidencia correspondiente
        let accionIncidencia = '';
        switch(currentIncidenciaLevel) {
            case 1:
                accionIncidencia = document.getElementById('accionPrimeraIncidencia').value;
                break;
            case 2:
                accionIncidencia = document.getElementById('accionSegundaIncidencia').value;
                break;
            case 3:
                accionIncidencia = document.getElementById('accionTerceraIncidencia').value;
                break;
            case 4:
                accionIncidencia = document.getElementById('accionCuartaIncidencia').value;
                break;
        }
        formData.matrizDisciplinaria.accionIncidencia = accionIncidencia;
    }
    
    // Obtener el nivel de strike seleccionado (independiente de la matriz)
    const strikeLevelValue = document.getElementById('strikeLevel').value;
    if (strikeLevelValue) {
        formData.strikeLevel = parseInt(strikeLevelValue);
    }
    
    try {
        await saveFeedback(formData);
        showSuccess('Feedback guardado exitosamente');
        setTimeout(() => {
            window.location.href = 'detalle-feedbacks.html';
        }, 1500);
    } catch (error) {
        showError('Error al guardar el feedback: ' + error.message);
    }
}

// Guardar feedback y generar strike si aplica
async function saveFeedback(formData) {
    // Preparar datos del feedback para Supabase
    const feedbackData = {
        id: generateId(), // Generar ID único
        agent_id: formData.agentId,
        feedback_date: formData.feedbackDate,
        feedback_given_by: formData.givenBy,
        feedback_message: formData.message,
        feedback_type: formData.feedbackType,
        priority: 'media',
        additional_steps: formData.matrizDisciplinaria ? 'matriz_disciplinaria' : 'na'
    };
    
    console.log('Guardando feedback:', feedbackData);
    
    // Insertar feedback en Supabase
    const { data: feedback, error: feedbackError } = await supabase
        .from('feedbacks')
        .insert([feedbackData])
        .select()
        .single();
    
    if (feedbackError) {
        console.error('Error al guardar feedback:', feedbackError);
        throw feedbackError;
    }
    
    console.log('Feedback guardado exitosamente:', feedback);
    
    // Si hay strike seleccionado, generar strike (independiente de matriz)
    if (formData.strikeLevel) {
        await generateStrike(formData, feedback.id);
    }
    
    return feedback;
}

// Generar strike manualmente según selección del usuario
async function generateStrike(formData, feedbackId) {
    // Determinar descripción del strike
    let feedbackDescription = `Tipo: ${formData.feedbackType} - ${formData.message}`;
    
    // Si tiene matriz disciplinaria, usar esos datos
    if (formData.matrizDisciplinaria) {
        feedbackDescription = `${formData.matrizDisciplinaria.tipoFalta} - ${formData.matrizDisciplinaria.descripcionFalta}`;
    }
    
    // Determinar accionable
    let accionable = 'Advertencia verbal'; // Por defecto
    if (formData.matrizDisciplinaria && formData.matrizDisciplinaria.accionIncidencia) {
        accionable = formData.matrizDisciplinaria.accionIncidencia;
    }
    
    // Preparar datos del strike (incluye más información ya que feedback es simple)
    const strikeData = {
        agent_id: formData.agentId,
        strike_level: formData.strikeLevel,
        feedback_id: feedbackId,
        feedback_description: feedbackDescription,
        aplica_matriz: formData.matrizDisciplinaria ? 'Si' : 'No',
        accionable: accionable,
        // Campos adicionales para guardar info del formulario
        tipo_feedback: formData.feedbackType,
        channel: formData.channel,
        owner: formData.owner
    };
    
    console.log('Guardando strike:', strikeData);
    
    // Insertar strike en Supabase
    const { data: strike, error: strikeError } = await supabase
        .from('strikes')
        .insert([strikeData])
        .select()
        .single();
    
    if (strikeError) {
        console.error('Error al guardar strike:', strikeError);
        throw strikeError;
    }
    
    console.log('Strike guardado exitosamente:', strike);
    
    return strike;
}

// Mostrar mensaje de éxito
function showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    setTimeout(() => {
        successDiv.style.display = 'none';
    }, 5000);
}

// Mostrar mensaje de error
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    document.getElementById('errorText').textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}
