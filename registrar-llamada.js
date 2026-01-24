// ===================================
// Registrar Llamada - Lógica del formulario
// ===================================

// Convertir formato MM:SS a minutos decimales
function convertMMSSToDecimal(timeString) {
    if (!timeString || timeString.trim() === '') return 0;
    
    const parts = timeString.split(':');
    if (parts.length !== 2) return 0;
    
    const minutes = parseInt(parts[0]) || 0;
    const seconds = parseInt(parts[1]) || 0;
    
    return minutes + (seconds / 60);
}

// Convertir minutos decimales a formato MM:SS
function convertDecimalToMMSS(decimalMinutes) {
    if (!decimalMinutes || decimalMinutes === 0) return '0:00';
    
    const minutes = Math.floor(decimalMinutes);
    const seconds = Math.round((decimalMinutes - minutes) * 60);
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

document.addEventListener('DOMContentLoaded', async function() {
    // Limpiar editingAuditId si no hay parámetro de edición en la URL
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.has('edit')) {
        localStorage.removeItem('editingAuditId');
    }
    
    await loadAgentsDropdown();
    setupForm();
    setDefaultDates();
    setupCallTypeListener();
    await checkEditMode();
});

// Cargar agentes en el dropdown
async function loadAgentsDropdown() {
    const agents = await getAgents();
    const select = document.getElementById('agentId');
    
    // Limpiar opciones existentes (excepto la primera)
    select.innerHTML = '<option value="">Selecciona un agente</option>';
    
    // Agregar agentes activos
    const activeAgents = agents.filter(a => a.status === 'activo');
    
    if (activeAgents.length === 0) {
        select.innerHTML += '<option value="" disabled>No hay agentes activos registrados</option>';
    } else {
        activeAgents.forEach(agent => {
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

// Establecer fechas por defecto
function setDefaultDates() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('callDate').value = today;
    document.getElementById('auditDate').value = today;
}

// Configurar listener para tipo de cancelación
function setupCallTypeListener() {
    const callTypeSelect = document.getElementById('callType');
    const criticalitySelect = document.getElementById('criticality');
    
    callTypeSelect.addEventListener('change', function() {
        const callType = this.value;
        const criticality = criticalitySelect.value;
        updateErrorsSection(callType, criticality);
    });
    
    // Agregar listener para criticidad
    criticalitySelect.addEventListener('change', function() {
        const callType = callTypeSelect.value;
        const criticality = this.value;
        updateErrorsSection(callType, criticality);
    });
}

// Actualizar sección de errores según tipo de cancelación y criticidad
function updateErrorsSection(callType, criticality) {
    const errorsContainer = document.getElementById('errorsContainer');
    const errorHint = document.getElementById('errorHint');
    const errorsCuentaAhorros = document.getElementById('errorsCuentaAhorros');
    const errorsTarjetaCredito = document.getElementById('errorsTarjetaCredito');
    const errorsNuPlus = document.getElementById('errorsNuPlus');
    const errorsCertificados = document.getElementById('errorsCertificados');
    
    // Limpiar selecciones previas
    document.querySelectorAll('input[name="error"]').forEach(cb => cb.checked = false);
    
    // Ocultar todas las secciones primero
    errorsCuentaAhorros.style.display = 'none';
    errorsTarjetaCredito.style.display = 'none';
    errorsNuPlus.style.display = 'none';
    errorsCertificados.style.display = 'none';
    
    // Si la criticidad es "perfecto", ocultar toda la sección de errores
    if (criticality === 'perfecto') {
        errorHint.innerHTML = 'No es necesario seleccionar errores cuando la criticidad es "Perfecto"';
        errorHint.style.display = 'block';
        errorsContainer.style.display = 'none';
        return;
    }
    
    // Mostrar errores según el motivo (solo si criticidad no es perfecto)
    if (callType === 'cancelacion_cuenta_ahorros') {
        // Mostrar solo errores de Cuenta de Ahorros
        errorHint.style.display = 'none';
        errorsContainer.style.display = 'block';
        errorsCuentaAhorros.style.display = 'block';
        
    } else if (callType === 'cancelacion_tarjeta_credito') {
        // Mostrar solo errores de Tarjeta de Crédito
        errorHint.style.display = 'none';
        errorsContainer.style.display = 'block';
        errorsTarjetaCredito.style.display = 'block';
        
    } else if (callType === 'cancelacion_multiproducto') {
        // Mostrar ambas secciones de cancelación
        errorHint.style.display = 'none';
        errorsContainer.style.display = 'block';
        errorsCuentaAhorros.style.display = 'block';
        errorsTarjetaCredito.style.display = 'block';
        
    } else if (callType === 'nu_plus') {
        // Mostrar errores de Nu Plus
        errorHint.style.display = 'none';
        errorsContainer.style.display = 'block';
        errorsNuPlus.style.display = 'block';
        
    } else if (callType === 'certificados') {
        // Mostrar errores de Certificados
        errorHint.style.display = 'none';
        errorsContainer.style.display = 'block';
        errorsCertificados.style.display = 'block';
        
    } else {
        // No hay motivo seleccionado
        errorHint.innerHTML = 'Primero selecciona un motivo para ver las opciones de errores';
        errorHint.style.display = 'block';
        errorsContainer.style.display = 'none';
    }
}

// Configurar el formulario
function setupForm() {
    const form = document.getElementById('auditForm');
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Validar que haya agentes
        const agents = await getAgents();
        if (agents.length === 0) {
            showMessage('errorMessage', 'Primero debes agregar agentes en la sección de Gestión de Agentes', 'error');
            return;
        }
        
        // Recopilar errores seleccionados
        const selectedErrors = [];
        document.querySelectorAll('input[name="error"]:checked').forEach(checkbox => {
            selectedErrors.push(checkbox.value);
        });
        
        const callType = document.getElementById('callType').value;
        const cancellationReasonGroup = document.getElementById('cancellationReasonGroup');
        const cancellationReasonSelect = document.getElementById('cancellationReason');
        
        // Validar motivo de cancelación si es visible y requerido
        if (cancellationReasonGroup.style.display === 'block' && cancellationReasonSelect.required) {
            if (!cancellationReasonSelect.value || cancellationReasonSelect.value === '') {
                showMessage('errorMessage', 'Debes seleccionar un motivo de cancelación', 'error');
                return;
            }
        }
        
        // Recopilar datos del formulario
        const formData = {
            callDate: document.getElementById('callDate').value,
            customerId: document.getElementById('customerId').value.trim(),
            callType: callType,
            cancellationReason: cancellationReasonSelect.value || 'N/A',
            auditDate: document.getElementById('auditDate').value,
            enlacePv: document.getElementById('enlacePv').value.trim(),
            bpo: document.getElementById('bpo').value,
            agentId: document.getElementById('agentId').value,
            auditor: document.getElementById('auditor').value.trim(),
            criticality: document.getElementById('criticality').value,
            tnps: document.getElementById('tnps').value,
            errorDescription: selectedErrors.length > 0 ? selectedErrors.join('; ') : 'N/A',
            errors: selectedErrors,
            callNotes: document.getElementById('callNotes').value.trim(),
            // Nuevos campos operativos - Convertir MM:SS a decimal
            callDuration: convertMMSSToDecimal(document.getElementById('callDuration').value),
            transferAttempt: document.getElementById('transferAttempt').value,
            excessiveHold: document.getElementById('excessiveHold').value,
            holdTime: document.getElementById('excessiveHold').value === 'si' ? 
                convertMMSSToDecimal(document.getElementById('holdTime').value) : 0
        };
        
        // Validaciones adicionales
        if (!formData.agentId) {
            showMessage('errorMessage', 'Debes seleccionar un agente', 'error');
            return;
        }
        
        // Solo requerir errores si la criticidad NO es perfecto
        if (formData.criticality !== 'perfecto' && selectedErrors.length === 0) {
            showMessage('errorMessage', 'Debes seleccionar al menos un error del agente', 'error');
            return;
        }
        
        if (new Date(formData.callDate) > new Date(formData.auditDate)) {
            showMessage('errorMessage', 'La fecha de auditoría no puede ser anterior a la fecha de la llamada', 'error');
            return;
        }
        
        console.log('Todas las validaciones pasaron. FormData:', formData);
        
        // Guardar auditoría
        try {
            // Verificar si estamos editando
            const editingAuditId = localStorage.getItem('editingAuditId');
            
            if (editingAuditId) {
                // Modo edición: actualizar auditoría existente
                await updateAudit(editingAuditId, formData);
                
                localStorage.removeItem('editingAuditId');
                showMessage('successMessage', '');
                
                setTimeout(() => {
                    window.location.href = 'detalle-auditorias.html?agentId=' + formData.agentId;
                }, 2000);
            } else {
                // Modo creación: agregar nueva auditoría
                await addAudit(formData);
                showMessage('successMessage', '');
                
                // Limpiar formulario
                form.reset();
                setDefaultDates();
                
                // Redirigir al dashboard después de 2 segundos
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
            }
            
        } catch (error) {
            showMessage('errorMessage', 'Error al guardar la auditoría. Por favor intenta nuevamente.', 'error');
            console.error('Error completo:', error);
            console.error('Stack:', error.stack);
            console.error('FormData:', formData);
        }
    });
}

// Verificar si estamos en modo edición
async function checkEditMode() {
    const urlParams = new URLSearchParams(window.location.search);
    const editParam = urlParams.get('edit');
    const editingAuditId = localStorage.getItem('editingAuditId');
    
    if (editingAuditId || editParam) {
        const auditId = editingAuditId || editParam;
        const audits = await getAudits();
        const audit = audits.find(a => a.id === auditId);
        
        if (audit) {
            // Cambiar título de la página
            document.querySelector('.page-header h2').textContent = 'Editar Auditoría';
            document.querySelector('.page-header .subtitle').textContent = 'Modifica la información de la auditoría';
            
            // Cambiar texto del botón
            document.querySelector('button[type="submit"]').textContent = 'Guardar Cambios';
            
            // Cargar datos en el formulario
            document.getElementById('callDate').value = audit.callDate;
            document.getElementById('customerId').value = audit.customerId;
            document.getElementById('callType').value = audit.callType;
            document.getElementById('auditDate').value = audit.auditDate || audit.callDate;
            document.getElementById('enlacePv').value = audit.enlacePv || '';
            document.getElementById('bpo').value = audit.bpo || '';
            document.getElementById('agentId').value = audit.agentId;
            document.getElementById('auditor').value = audit.auditor;
            document.getElementById('criticality').value = audit.criticality;
            document.getElementById('tnps').value = audit.tnps;
            document.getElementById('callNotes').value = audit.callNotes || '';
            
            // Cargar motivo de cancelación si existe
            if (audit.cancellationReason) {
                // Primero actualizar la razón de contacto para cargar las opciones
                updateCancellationReasons();
                // Luego establecer el valor
                setTimeout(() => {
                    document.getElementById('cancellationReason').value = audit.cancellationReason;
                }, 100);
            }
            
            // Cargar nuevos campos operativos
            document.getElementById('callDuration').value = audit.callDuration ? convertDecimalToMMSS(audit.callDuration) : '';
            document.getElementById('transferAttempt').value = audit.transferAttempt || '';
            document.getElementById('excessiveHold').value = audit.excessiveHold || '';
            if (audit.excessiveHold === 'si' && audit.holdTime) {
                document.getElementById('holdTime').value = convertDecimalToMMSS(audit.holdTime);
                toggleHoldTimeInput();
            }
            
            // Activar la sección de errores correspondiente
            updateErrorsSection(audit.callType);
            
            // Esperar un momento y luego marcar los errores
            setTimeout(() => {
                if (audit.errors && Array.isArray(audit.errors)) {
                    audit.errors.forEach(error => {
                        const checkbox = document.querySelector(`input[name="error"][value="${error}"]`);
                        if (checkbox) {
                            checkbox.checked = true;
                        }
                    });
                }
            }, 100);
            
            // Guardar el ID en localStorage por si no estaba
            localStorage.setItem('editingAuditId', auditId);
        }
    }
}

// Toggle para mostrar/ocultar el campo de tiempo de espera
function toggleHoldTimeInput() {
    const excessiveHold = document.getElementById('excessiveHold');
    const holdTimeGroup = document.getElementById('holdTimeGroup');
    const holdTimeInput = document.getElementById('holdTime');
    
    if (!excessiveHold || !holdTimeGroup || !holdTimeInput) {
        console.error('Elementos no encontrados');
        return;
    }
    
    if (excessiveHold.value === 'si') {
        holdTimeGroup.style.display = 'block';
        holdTimeInput.required = true;
    } else {
        holdTimeGroup.style.display = 'none';
        holdTimeInput.required = false;
        holdTimeInput.value = '';
    }
}

// Hacer la función global
window.toggleHoldTimeInput = toggleHoldTimeInput;

// Actualizar motivos de cancelación según la razón de contacto
function updateCancellationReasons() {
    const callType = document.getElementById('callType').value;
    const reasonGroup = document.getElementById('cancellationReasonGroup');
    const reasonSelect = document.getElementById('cancellationReason');
    
    // Limpiar opciones
    reasonSelect.innerHTML = '<option value="">Selecciona un motivo</option>';
    
    // Motivos para Cuenta de Ahorros
    const cuentaAhorrosReasons = [
        'No la usa/No la necesita',
        'Tiene más cuentas',
        'Deseaba Tarjeta de Crédito',
        'Inconformidad por cobro 4x1000',
        'Falta de beneficios',
        'Cobro de comisiones (retiros o compras internacionales)',
        'Mala experiencia',
        'No sabe usar la App',
        'Recontacto',
        'Otro'
    ];
    
    // Motivos para Tarjeta de Crédito
    const tarjetaCreditoReasons = [
        'No la usa/No la necesita',
        'Tiene más tarjetas',
        'Inconforme con cupo aprobado',
        'Inconforme con tasa de interés',
        'Inconforme con interés cobrado',
        'Liberar capacidad de endeudamiento',
        'No hay beneficios',
        'Cobro de comisiones (avances o tasa de cambio)',
        'Funcionalidades no disponibles',
        'Mala experiencia',
        'Cobro de cuota de manejo',
        'Tarjeta sin cupo (Abre Caminos)',
        'No sabe usar la App',
        'Recontacto',
        'Otro'
    ];
    
    let reasons = [];
    
    if (callType === 'cancelacion_cuenta_ahorros') {
        reasons = cuentaAhorrosReasons;
        reasonGroup.style.display = 'block';
        reasonSelect.required = true;
    } else if (callType === 'cancelacion_tarjeta_credito') {
        reasons = tarjetaCreditoReasons;
        reasonGroup.style.display = 'block';
        reasonSelect.required = true;
    } else if (callType === 'cancelacion_multiproducto') {
        // Unir ambas listas sin repetir
        const combined = [...new Set([...cuentaAhorrosReasons, ...tarjetaCreditoReasons])];
        reasons = combined.sort();
        reasonGroup.style.display = 'block';
        reasonSelect.required = true;
    } else {
        // Nu Plus y Certificados no requieren motivo
        reasonGroup.style.display = 'none';
        reasonSelect.required = false;
        reasonSelect.value = ''; // Limpiar el valor cuando se oculta
    }
    
    // Agregar opciones al select
    reasons.forEach(reason => {
        const option = document.createElement('option');
        option.value = reason;
        option.textContent = reason;
        reasonSelect.appendChild(option);
    });
}

// Hacer la función global
window.updateCancellationReasons = updateCancellationReasons;