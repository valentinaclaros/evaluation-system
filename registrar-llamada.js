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
    
    // Limpiar selecciones previas
    document.querySelectorAll('input[name="error"]').forEach(cb => cb.checked = false);
    
    // Ocultar todas las secciones primero
    errorsCuentaAhorros.style.display = 'none';
    errorsTarjetaCredito.style.display = 'none';
    
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
        
        // Campos de multiproducto
        const multiAhorrosSelect = document.getElementById('multiproductoAhorrosReason');
        const multiCreditoSelect = document.getElementById('multiproductoCreditoReason');
        
        // Validar motivo de cancelación si es visible y requerido
        if (cancellationReasonGroup.style.display === 'block' && cancellationReasonSelect.required) {
            if (!cancellationReasonSelect.value || cancellationReasonSelect.value === '') {
                showMessage('errorMessage', 'Debes seleccionar un motivo de cancelación', 'error');
                return;
            }
        }
        
        // Validar motivos de multiproducto si están visibles
        if (callType === 'cancelacion_multiproducto') {
            if (!multiAhorrosSelect.value || multiAhorrosSelect.value === '') {
                showMessage('errorMessage', 'Debes seleccionar el motivo de Cuenta de Ahorros', 'error');
                return;
            }
            if (!multiCreditoSelect.value || multiCreditoSelect.value === '') {
                showMessage('errorMessage', 'Debes seleccionar el motivo de Tarjeta de Crédito', 'error');
                return;
            }
        }
        
        // Determinar el valor de cancellationReason según el tipo
        let cancellationReason = 'N/A';
        if (callType === 'cancelacion_multiproducto') {
            cancellationReason = `Ahorros: ${multiAhorrosSelect.value} | Crédito: ${multiCreditoSelect.value}`;
        } else {
            cancellationReason = cancellationReasonSelect.value || 'N/A';
        }
        
        // Recopilar datos del formulario
        const formData = {
            callDate: document.getElementById('callDate').value,
            customerId: document.getElementById('customerId').value.trim(),
            callType: callType,
            cancellationReason: cancellationReason,
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

// Formatear fecha para input type="date" (YYYY-MM-DD)
function formatDateForInput(dateVal) {
    if (!dateVal) return '';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
}

// Verificar si estamos en modo edición
async function checkEditMode() {
    const urlParams = new URLSearchParams(window.location.search);
    const editParam = urlParams.get('edit');
    const editingAuditId = localStorage.getItem('editingAuditId');
    
    if (editingAuditId || editParam) {
        const auditId = String(editingAuditId || editParam).trim();
        const audits = await getAudits();
        const audit = audits.find(a => String(a.id).trim() === auditId);
        
        if (audit) {
            // Cambiar título de la página
            const headerTitle = document.querySelector('.page-header h2');
            const headerSubtitle = document.querySelector('.page-header .subtitle');
            if (headerTitle) headerTitle.textContent = 'Editar Auditoría';
            if (headerSubtitle) headerSubtitle.textContent = 'Modifica la información de la auditoría';
            
            const submitBtn = document.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.textContent = 'Guardar Cambios';
            
            // Cargar datos en el formulario (fechas en YYYY-MM-DD)
            document.getElementById('callDate').value = formatDateForInput(audit.callDate);
            document.getElementById('customerId').value = audit.customerId || '';
            document.getElementById('callType').value = audit.callType || '';
            document.getElementById('auditDate').value = formatDateForInput(audit.auditDate || audit.callDate);
            document.getElementById('enlacePv').value = audit.enlacePv || '';
            document.getElementById('bpo').value = audit.bpo || '';
            document.getElementById('agentId').value = audit.agentId;
            document.getElementById('auditor').value = audit.auditor;
            document.getElementById('criticality').value = audit.criticality;
            document.getElementById('tnps').value = audit.tnps;
            document.getElementById('callNotes').value = audit.callNotes || '';
            
            // Cargar motivo de cancelación: primero actualizar opciones según razón de contacto, luego establecer valor
            updateCancellationReasons();
            if (audit.cancellationReason) {
                const applyMotivo = () => {
                    if (audit.callType === 'cancelacion_multiproducto' && audit.cancellationReason.includes('|')) {
                        const parts = audit.cancellationReason.split('|');
                        const ahorrosMotivo = (parts[0] || '').replace(/Ahorros:\s*/i, '').trim();
                        const creditoMotivo = (parts[1] || '').replace(/Crédito:\s*/i, '').trim();
                        const multiAhorros = document.getElementById('multiproductoAhorrosReason');
                        const multiCredito = document.getElementById('multiproductoCreditoReason');
                        if (multiAhorros) multiAhorros.value = ahorrosMotivo;
                        if (multiCredito) multiCredito.value = creditoMotivo;
                        if (multiAhorros && !multiAhorros.value && ahorrosMotivo) {
                            multiAhorros.appendChild(new Option(ahorrosMotivo, ahorrosMotivo));
                            multiAhorros.value = ahorrosMotivo;
                        }
                        if (multiCredito && !multiCredito.value && creditoMotivo) {
                            multiCredito.appendChild(new Option(creditoMotivo, creditoMotivo));
                            multiCredito.value = creditoMotivo;
                        }
                    } else {
                        const reasonSelect = document.getElementById('cancellationReason');
                        if (reasonSelect) {
                            reasonSelect.value = audit.cancellationReason;
                            if (!reasonSelect.value && audit.cancellationReason) {
                                reasonSelect.appendChild(new Option(audit.cancellationReason, audit.cancellationReason));
                                reasonSelect.value = audit.cancellationReason;
                            }
                        }
                    }
                };
                setTimeout(applyMotivo, 50);
                setTimeout(applyMotivo, 250);
            }
            
            // Cargar nuevos campos operativos
            document.getElementById('callDuration').value = audit.callDuration ? convertDecimalToMMSS(audit.callDuration) : '';
            document.getElementById('transferAttempt').value = audit.transferAttempt || '';
            document.getElementById('excessiveHold').value = audit.excessiveHold || '';
            if (audit.excessiveHold === 'si' && audit.holdTime) {
                document.getElementById('holdTime').value = convertDecimalToMMSS(audit.holdTime);
                toggleHoldTimeInput();
            }
            
            // Activar la sección de errores correspondiente (mostrar la correcta)
            updateErrorsSection(audit.callType, audit.criticality);
            
            // Esperar a que se rendericen los checkboxes y marcar los errores
            setTimeout(() => {
                if (audit.errors && Array.isArray(audit.errors)) {
                    audit.errors.forEach(error => {
                        const escaped = String(error).replace(/"/g, '\\"');
                        const checkbox = document.querySelector(`input[name="error"][value="${escaped}"]`);
                        if (checkbox) checkbox.checked = true;
                    });
                }
            }, 200);
            
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
    
    // Elementos para multiproducto
    const multiAhorrosGroup = document.getElementById('multiproductoAhorrosReasonGroup');
    const multiAhorrosSelect = document.getElementById('multiproductoAhorrosReason');
    const multiCreditoGroup = document.getElementById('multiproductoCreditoReasonGroup');
    const multiCreditoSelect = document.getElementById('multiproductoCreditoReason');
    
    // Limpiar opciones
    reasonSelect.innerHTML = '<option value="">Selecciona un motivo</option>';
    multiAhorrosSelect.innerHTML = '<option value="">Selecciona un motivo</option>';
    multiCreditoSelect.innerHTML = '<option value="">Selecciona un motivo</option>';
    
    // Ocultar todos los grupos primero
    reasonGroup.style.display = 'none';
    reasonSelect.required = false;
    multiAhorrosGroup.style.display = 'none';
    multiAhorrosSelect.required = false;
    multiCreditoGroup.style.display = 'none';
    multiCreditoSelect.required = false;
    
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
        // Mostrar campos separados para ahorros y crédito
        multiAhorrosGroup.style.display = 'block';
        multiAhorrosSelect.required = true;
        multiCreditoGroup.style.display = 'block';
        multiCreditoSelect.required = true;
        
        // Llenar opciones para cuenta de ahorros
        cuentaAhorrosReasons.forEach(reason => {
            const option = document.createElement('option');
            option.value = reason;
            option.textContent = reason;
            multiAhorrosSelect.appendChild(option);
        });
        
        // Llenar opciones para tarjeta de crédito
        tarjetaCreditoReasons.forEach(reason => {
            const option = document.createElement('option');
            option.value = reason;
            option.textContent = reason;
            multiCreditoSelect.appendChild(option);
        });
        
        return; // Salir temprano para no procesar el código de abajo
    }
    
    // Agregar opciones al select (solo para cancelaciones simples)
    reasons.forEach(reason => {
        const option = document.createElement('option');
        option.value = reason;
        option.textContent = reason;
        reasonSelect.appendChild(option);
    });
}

// Hacer la función global
window.updateCancellationReasons = updateCancellationReasons;