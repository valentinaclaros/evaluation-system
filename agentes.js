// ===================================
// Gestión de Agentes - CRUD completo
// ===================================

let agentToDelete = null;

document.addEventListener('DOMContentLoaded', async function() {
    await loadAgentsList();
    setupAgentForm();
});

// Cargar lista de agentes
async function loadAgentsList() {
    const agents = await getAgents();
    const tbody = document.getElementById('agentsListTable');
    
    if (agents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="no-data">No hay agentes registrados. Agrega el primero.</td></tr>';
        return;
    }
    
    tbody.innerHTML = agents.map(agent => `
        <tr>
            <td><strong>${agent.id.substring(0, 8)}</strong></td>
            <td>${agent.name}</td>
            <td>${agent.email}</td>
            <td>${getDepartmentLabel(agent.department)}</td>
            <td>${getStatusBadge(agent.status)}</td>
            <td>
                <button onclick="editAgent('${agent.id}')" class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; margin-right: 0.5rem;">
                    Editar
                </button>
                <button onclick="confirmDelete('${agent.id}')" class="btn btn-danger" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;">
                    Eliminar
                </button>
            </td>
        </tr>
    `).join('');
}

// Filtrar agentes por búsqueda
async function filterAgents() {
    const searchTerm = document.getElementById('searchAgent').value.toLowerCase();
    const agents = await getAgents();
    
    const filtered = agents.filter(agent => 
        agent.name.toLowerCase().includes(searchTerm) ||
        agent.email.toLowerCase().includes(searchTerm) ||
        agent.department.toLowerCase().includes(searchTerm)
    );
    
    const tbody = document.getElementById('agentsListTable');
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="no-data">No se encontraron agentes con ese criterio</td></tr>';
        return;
    }
    
    tbody.innerHTML = filtered.map(agent => `
        <tr>
            <td><strong>${agent.id.substring(0, 8)}</strong></td>
            <td>${agent.name}</td>
            <td>${agent.email}</td>
            <td>${getDepartmentLabel(agent.department)}</td>
            <td>${getStatusBadge(agent.status)}</td>
            <td>
                <button onclick="editAgent('${agent.id}')" class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; margin-right: 0.5rem;">
                    Editar
                </button>
                <button onclick="confirmDelete('${agent.id}')" class="btn btn-danger" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;">
                    Eliminar
                </button>
            </td>
        </tr>
    `).join('');
}

// Abrir modal para agregar agente
function openAddAgentModal() {
    document.getElementById('modalTitle').textContent = 'Agregar Nuevo Agente';
    document.getElementById('agentForm').reset();
    document.getElementById('editAgentId').value = '';
    document.getElementById('agentModal').classList.add('active');
}

// Editar agente
async function editAgent(agentId) {
    const agents = await getAgents();
    const agent = agents.find(a => a.id === agentId);
    
    if (!agent) return;
    
    document.getElementById('modalTitle').textContent = 'Editar Agente';
    document.getElementById('editAgentId').value = agent.id;
    document.getElementById('agentName').value = agent.name;
    document.getElementById('agentEmail').value = agent.email;
    document.getElementById('agentDepartment').value = agent.department;
    document.getElementById('agentStatus').value = agent.status;
    document.getElementById('agentNotes').value = agent.notes || '';
    
    document.getElementById('agentModal').classList.add('active');
}

// Cerrar modal de agente
function closeAgentModal() {
    document.getElementById('agentModal').classList.remove('active');
}

// Configurar formulario de agente
function setupAgentForm() {
    const form = document.getElementById('agentForm');
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const editId = document.getElementById('editAgentId').value;
        
        const agentData = {
            name: document.getElementById('agentName').value.trim(),
            email: document.getElementById('agentEmail').value.trim(),
            department: document.getElementById('agentDepartment').value,
            status: document.getElementById('agentStatus').value,
            notes: document.getElementById('agentNotes').value.trim()
        };
        
        // Validar email
        if (!isValidEmail(agentData.email)) {
            alert('Por favor ingresa un email válido');
            return;
        }
        
        try {
            if (editId) {
                // Actualizar agente existente
                await updateAgent(editId, agentData);
            } else {
                // Crear nuevo agente
                await addAgent(agentData);
            }
            
            closeAgentModal();
            await loadAgentsList();
            
        } catch (error) {
            alert('Error al guardar el agente. Por favor intenta nuevamente.');
            console.error('Error:', error);
        }
    });
}

// Confirmar eliminación
function confirmDelete(agentId) {
    agentToDelete = agentId;
    document.getElementById('deleteModal').classList.add('active');
}

// Cerrar modal de eliminación
function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('active');
    agentToDelete = null;
}

// Eliminar agente confirmado
async function confirmDeleteAgent() {
    if (agentToDelete) {
        await deleteAgent(agentToDelete);
        closeDeleteModal();
        await loadAgentsList();
    }
}

// Helpers
function getDepartmentLabel(department) {
    const labels = {
        'phone': 'Phone',
        'chat': 'Chat',
        'email': 'Email',
        // Backward compatibility
        'cancelaciones': 'Cancelaciones',
        'servicio_cliente': 'Servicio al Cliente',
        'retenciones': 'Retenciones',
        'ventas': 'Ventas'
    };
    return labels[department] || department;
}

function getStatusBadge(status) {
    const badges = {
        'activo': '<span class="badge badge-promoter">Activo</span>',
        'inactivo': '<span class="badge badge-null">Inactivo</span>',
        'vacaciones': '<span class="badge badge-neutral">Vacaciones</span>'
    };
    return badges[status] || status;
}

function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Cerrar modales al hacer clic fuera
window.onclick = function(event) {
    const agentModal = document.getElementById('agentModal');
    const deleteModal = document.getElementById('deleteModal');
    
    if (event.target === agentModal) {
        closeAgentModal();
    }
    if (event.target === deleteModal) {
        closeDeleteModal();
    }
}

