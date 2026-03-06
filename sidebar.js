// ===================================
// Sidebar: activar enlace según página y cargar totales
// ===================================

document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    // Activar enlace según la página actual
    const path = (window.location.pathname || '').split('/').pop() || 'index.html';
    const linkMap = {
        'index.html': 'nav-dashboard',
        'detalle-auditorias.html': 'nav-auditorias',
        'detalle-feedbacks.html': 'nav-feedbacks',
        'calendario-mensual.html': 'nav-schedule',
        'analisis-avanzado.html': 'nav-metrics',
        'analisis.html': 'nav-reports',
        'top-offenders.html': 'nav-team',
        'agentes.html': 'nav-settings'
    };
    const activeId = linkMap[path];
    if (activeId) {
        document.querySelectorAll('.sidebar-link').forEach(a => {
            a.classList.toggle('active', a.id === activeId);
        });
    }

    // Botón colapsar
    const toggle = document.getElementById('sidebarToggle');
    if (toggle) {
        toggle.addEventListener('click', function() {
            sidebar.classList.toggle('collapsed');
        });
    }

    // Cargar total de auditorías para el badge
    loadAuditsCount();
});

async function loadAuditsCount() {
    const badge = document.getElementById('sidebar-auditorias-badge');
    if (!badge || typeof getAudits !== 'function') return;
    try {
        const audits = await getAudits();
        badge.textContent = audits.length;
    } catch (e) {
        badge.textContent = '0';
    }
}
