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
    const selectInvolucrados = document.getElementById('agentesInvolucrados');
    
    selectAgente.innerHTML = '<option value="">Seleccionar agente...</option>';
    selectInvolucrados.innerHTML = '<option value="">Seleccionar agente...</option>';
    
    if (agents.length === 0) {
        selectAgente.innerHTML += '<option value="" disabled>No hay agentes registrados</option>';
    } else {
        agents.forEach(agent => {
            const option1 = document.createElement('option');
            option1.value = agent.id;
            option1.textContent = agent.name;
            selectAgente.appendChild(option1);

            const option2 = document.createElement('option');
            option2.value = agent.id;
            option2.textContent = agent.name;
            selectInvolucrados.appendChild(option2);
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
        const incidenciaInfo = document.getElementById('incidenciaInfo');
        const incidenciasContainer = document.getElementById('incidenciasContainer');
        
        if (this.value === 'Si') {
            matrizDetalles.style.display = 'block';
            
            const agentId = document.getElementById('feedbackAgentId').value;
            if (agentId) {
                // Agente ya seleccionado, proceder con análisis
                incidenciaInfo.style.display = 'none';
                incidenciasContainer.style.display = 'block';
                await analizarIncidenciasAgente(agentId);
            } else {
                // No hay agente, mostrar mensaje
                incidenciaInfo.style.display = 'block';
                incidenciasContainer.style.display = 'none';
            }

            // Hacer campos requeridos
            document.getElementById('tipoFalta').required = true;
            document.getElementById('gravedad').required = true;
            document.getElementById('descripcionFalta').required = true;
        } else {
            matrizDetalles.style.display = 'none';
            incidenciaInfo.style.display = 'none';
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
    const feedbacks = await getFeedbacks();
    const agent = await getAgentById(agentId);
    
    // Filtrar feedbacks del agente que aplican matriz disciplinaria
    const feedbacksConMatriz = feedbacks.filter(f => 
        f.agentId === agentId && f.additionalSteps === 'matriz_disciplinaria'
    );
    
    // Determinar nivel de incidencia (1-4)
    currentIncidenciaLevel = feedbacksConMatriz.length + 1;
    if (currentIncidenciaLevel > 4) {
        currentIncidenciaLevel = 4; // Máximo 4 incidencias
    }
    
    mostrarIncidenciaCorrespondiente(currentIncidenciaLevel);
}

// Mostrar solo el campo de incidencia correspondiente
function mostrarIncidenciaCorrespondiente(nivel) {
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
    
    // Mostrar la incidencia correspondiente
    switch(nivel) {
        case 1:
            incidenciaTitle.textContent = 'Primera Incidencia';
            document.getElementById('primeraIncidencia').style.display = 'block';
            document.getElementById('accionPrimeraIncidencia').required = true;
            break;
        case 2:
            incidenciaTitle.textContent = 'Segunda Incidencia';
            document.getElementById('segundaIncidencia').style.display = 'block';
            document.getElementById('accionSegundaIncidencia').required = true;
            break;
        case 3:
            incidenciaTitle.textContent = 'Tercera Incidencia';
            document.getElementById('terceraIncidencia').style.display = 'block';
            document.getElementById('accionTerceraIncidencia').required = true;
            break;
        case 4:
            incidenciaTitle.textContent = 'Cuarta Incidencia';
            document.getElementById('cuartaIncidencia').style.display = 'block';
            document.getElementById('accionCuartaIncidencia').required = true;
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
        agentesInvolucrados: document.getElementById('agentesInvolucrados').value,
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
