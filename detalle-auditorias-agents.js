// ===================================
// Detalle Auditorías - Tarjetas Agents (Teleperformance / Konecta)
// ===================================

document.addEventListener('DOMContentLoaded', function() {
    loadAgentsBubbles();
    var section = document.getElementById('agentsBubblesSection');
    var toggle = document.getElementById('agentsBubblesToggle');
    if (toggle && section) {
        toggle.addEventListener('click', function() {
            section.classList.toggle('collapsed');
            toggle.classList.toggle('expanded', !section.classList.contains('collapsed'));
        });
    }
});

function normalizeBPO(bpo) {
    if (!bpo) return '';
    const s = String(bpo).toLowerCase().trim();
    if (s.includes('teleperformance') || s === 'tp') return 'Teleperformance';
    if (s.includes('konecta')) return 'Konecta';
    return '';
}

function isCritical(criticality) {
    const c = (criticality || '').toLowerCase();
    return c === 'critico' || c === 'crítico';
}

function renderDots(containerId, filledCount, totalDots, isPurple) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < totalDots; i++) {
        const dot = document.createElement('span');
        dot.className = 'agents-bubble-dot ' + (i < filledCount ? 'filled' : 'empty');
        dot.setAttribute('aria-hidden', 'true');
        container.appendChild(dot);
    }
}

async function loadAgentsBubbles() {
    const audits = typeof getAudits === 'function' ? await getAudits() : [];

    const totalDots = 10;

    const tp = { agentIds: new Set(), total: 0, critical: 0 };
    const konecta = { agentIds: new Set(), total: 0, critical: 0 };

    audits.forEach(a => {
        const bpo = normalizeBPO(a.bpo);
        if (bpo === 'Teleperformance') {
            tp.agentIds.add(a.agentId);
            tp.total++;
            if (isCritical(a.criticality)) tp.critical++;
        } else if (bpo === 'Konecta') {
            konecta.agentIds.add(a.agentId);
            konecta.total++;
            if (isCritical(a.criticality)) konecta.critical++;
        }
    });

    const countTP = tp.agentIds.size;
    const countKonecta = konecta.agentIds.size;

    const pctTP = tp.total ? Math.round((tp.critical / tp.total) * 100) : 0;
    const pctKonecta = konecta.total ? Math.round((konecta.critical / konecta.total) * 100) : 0;

    const filledTP = Math.round(totalDots * (pctTP / 100));
    const filledKonecta = Math.round(totalDots * (pctKonecta / 100));

    const elTP = document.getElementById('countTeleperformance');
    const elK = document.getElementById('countKonecta');
    if (elTP) elTP.textContent = countTP;
    if (elK) elK.textContent = countKonecta;

    renderDots('dotsTeleperformance', filledTP, totalDots, false);
    renderDots('dotsKonecta', filledKonecta, totalDots, true);
}
