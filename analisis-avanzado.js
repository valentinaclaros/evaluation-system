// ===================================
// Análisis Avanzado - Lógica Completa Reestructurada
// ===================================

let charts = {}; // Almacenar instancias de gráficos

document.addEventListener('DOMContentLoaded', async function() {
    await loadAllAnalysis();
});

// Cambiar entre tabs de análisis
function switchAnalysisTab(tabName) {
    // Ocultar todas las secciones
    document.querySelectorAll('.analysis-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Desactivar todos los tabs
    document.querySelectorAll('.analysis-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Activar la sección y tab seleccionado
    document.getElementById(`section-${tabName}`).classList.add('active');
    event.target.classList.add('active');
}

// Cargar todos los análisis
async function loadAllAnalysis() {
    await loadExecutiveOverview();
    await loadCoachingEnablement();
    await loadMetricasKPIs();
    await loadInsightsPorAgente();
    await loadMejorasAnalysis();
}

// Filtrar datos desde el 1 de enero de 2026
function filterDataFrom2026(data, dateField = 'callDate') {
    const startDate = new Date('2026-01-01');
    return data.filter(item => {
        const itemDate = new Date(item[dateField]);
        return itemDate >= startDate;
    });
}

// ===================================
// SECCIÓN 1: EXECUTIVE OVERVIEW
// ===================================
async function loadExecutiveOverview() {
    const allAudits = await getAudits();
    const audits = filterDataFrom2026(allAudits, 'callDate');
    
    if (audits.length === 0) {
        document.getElementById('executiveInsight').textContent = 
            'No hay datos disponibles desde el 1 de enero de 2026.';
        return;
    }
    
    // Calcular scorecard global
    const globalMetrics = calculateGlobalScorecard(audits);
    
    // Actualizar KPIs globales
    document.getElementById('globalQAScore').textContent = globalMetrics.qaScore;
    document.getElementById('globalPassRate').textContent = globalMetrics.passRate + '%';
    document.getElementById('globalCriticalRate').textContent = globalMetrics.criticalRate + '%';
    document.getElementById('globalDefectDensity').textContent = globalMetrics.defectDensity;
    
    // Scorecard por BPO
    const tpMetrics = calculateBPOScorecard(audits, 'teleperformance');
    const konectaMetrics = calculateBPOScorecard(audits, 'konecta');
    
    document.getElementById('tpQAScore').textContent = tpMetrics.qaScore;
    document.getElementById('tpPassRate').textContent = tpMetrics.passRate + '%';
    document.getElementById('konectaQAScore').textContent = konectaMetrics.qaScore;
    document.getElementById('konectaPassRate').textContent = konectaMetrics.passRate + '%';
    
    // Insight
    document.getElementById('executiveInsight').textContent = 
        `En el mes actual se han auditado ${audits.length} llamadas con un QA Score global de ${globalMetrics.qaScore}/100. ` +
        `La tasa de errores críticos es del ${globalMetrics.criticalRate}% y el Quality Pass Rate es del ${globalMetrics.passRate}%.`;
    
    // Gráficos
    createCriticalityDistributionChart(audits);
    createWeeklyTrendsChart(audits);
    createControlChartCritical(audits);
    createGapAnalysisChart(audits);
    await createPerformanceHeatmap(audits);
}

// Calcular scorecard global
function calculateGlobalScorecard(audits) {
    const total = audits.length;
    const perfectCount = audits.filter(a => a.criticality === 'perfecto').length;
    const criticalCount = audits.filter(a => a.criticality === 'critico').length;
    const highCount = audits.filter(a => a.criticality === 'alto').length;
    
    // QA Score: 100 si perfecto, 70 si medio, 50 si alto, 0 si crítico
    let qaScore = audits.reduce((sum, a) => {
        if (a.criticality === 'perfecto') return sum + 100;
        if (a.criticality === 'medio') return sum + 70;
        if (a.criticality === 'alto') return sum + 50;
        return sum + 0;
    }, 0) / total;
    
    // Quality Pass Rate: % sin críticos
    const passRate = ((total - criticalCount) / total * 100).toFixed(1);
    
    // Critical Error Rate: críticos por 100 llamadas
    const criticalRate = ((criticalCount / total) * 100).toFixed(1);
    
    // Defect Density: defectos por llamada
    const totalErrors = audits.reduce((sum, a) => {
        return sum + (a.errors && Array.isArray(a.errors) ? a.errors.length : 0);
    }, 0);
    const defectDensity = (totalErrors / total).toFixed(2);
    
    return {
        qaScore: qaScore.toFixed(0),
        passRate,
        criticalRate,
        defectDensity
    };
}

// Calcular scorecard por BPO
function calculateBPOScorecard(audits, bpo) {
    const bpoAudits = audits.filter(a => a.bpo === bpo);
    
    if (bpoAudits.length === 0) {
        return { qaScore: '0', passRate: '0' };
    }
    
    return calculateGlobalScorecard(bpoAudits);
}

// Gráfico de distribución de criticidad
function createCriticalityDistributionChart(audits) {
    const canvas = document.getElementById('criticalityDistributionChart');
    const ctx = canvas.getContext('2d');
    
    if (charts.criticalityDistribution) {
        charts.criticalityDistribution.destroy();
    }
    
    const criticalityData = {
        'Perfecto': audits.filter(a => a.criticality === 'perfecto').length,
        'Medio': audits.filter(a => a.criticality === 'medio').length,
        'Alto': audits.filter(a => a.criticality === 'alto').length,
        'Crítico': audits.filter(a => a.criticality === 'critico').length
    };
    
    charts.criticalityDistribution = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(criticalityData),
            datasets: [{
                label: 'Cantidad de Llamadas',
                data: Object.values(criticalityData),
                backgroundColor: [
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(234, 88, 12, 0.8)',
                    'rgba(239, 68, 68, 0.8)'
                ],
                borderColor: [
                    'rgb(16, 185, 129)',
                    'rgb(245, 158, 11)',
                    'rgb(234, 88, 12)',
                    'rgb(239, 68, 68)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Gráfico de tendencias semanales
function createWeeklyTrendsChart(audits) {
    const canvas = document.getElementById('weeklyTrendsChart');
    const ctx = canvas.getContext('2d');
    
    if (charts.weeklyTrends) {
        charts.weeklyTrends.destroy();
    }
    
    // Agrupar por semana
    const weeklyData = {};
    audits.forEach(audit => {
        const date = new Date(audit.callDate);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];
        
        if (!weeklyData[weekKey]) {
            weeklyData[weekKey] = { total: 0, perfect: 0, errors: 0 };
        }
        weeklyData[weekKey].total++;
        if (audit.criticality === 'perfecto') {
            weeklyData[weekKey].perfect++;
        }
        if (audit.criticality === 'critico' || audit.criticality === 'alto') {
            weeklyData[weekKey].errors++;
        }
    });
    
    const weeks = Object.keys(weeklyData).sort().slice(-8);
    
    charts.weeklyTrends = new Chart(ctx, {
        type: 'line',
        data: {
            labels: weeks.map((w, i) => `Sem ${i + 1}`),
            datasets: [{
                label: 'Perfectos',
                data: weeks.map(w => weeklyData[w].perfect),
                borderColor: 'rgb(16, 185, 129)',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.4,
                fill: true
            }, {
                label: 'Con Errores',
                data: weeks.map(w => weeklyData[w].errors),
                borderColor: 'rgb(239, 68, 68)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Control Chart para errores críticos
function createControlChartCritical(audits) {
    const canvas = document.getElementById('controlChartCritical');
    const ctx = canvas.getContext('2d');
    
    if (charts.controlChart) {
        charts.controlChart.destroy();
    }
    
    // Agrupar por día
    const dailyData = {};
    audits.forEach(audit => {
        const day = audit.callDate;
        if (!dailyData[day]) {
            dailyData[day] = { total: 0, critical: 0 };
        }
        dailyData[day].total++;
        if (audit.criticality === 'critico') {
            dailyData[day].critical++;
        }
    });
    
    const days = Object.keys(dailyData).sort().slice(-30);
    const criticalRates = days.map(d => {
        return dailyData[d].total > 0 ? (dailyData[d].critical / dailyData[d].total * 100).toFixed(1) : 0;
    });
    
    // Calcular límites de control
    const mean = criticalRates.reduce((a, b) => parseFloat(a) + parseFloat(b), 0) / criticalRates.length;
    const upperLimit = mean * 1.5; // Límite superior simplificado
    const lowerLimit = 0; // No puede ser negativo
    
    charts.controlChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: days.map((d, i) => `Día ${i + 1}`),
            datasets: [{
                label: '% Críticos',
                data: criticalRates,
                borderColor: 'rgb(99, 102, 241)',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                tension: 0.3,
                pointRadius: 4,
                pointHoverRadius: 6
            }, {
                label: 'Límite Superior',
                data: new Array(days.length).fill(upperLimit),
                borderColor: 'rgb(239, 68, 68)',
                borderDash: [5, 5],
                pointRadius: 0,
                fill: false
            }, {
                label: 'Media',
                data: new Array(days.length).fill(mean),
                borderColor: 'rgb(156, 163, 175)',
                borderDash: [3, 3],
                pointRadius: 0,
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '% Errores Críticos'
                    }
                }
            }
        }
    });
}

// Gap Analysis por BPO
function createGapAnalysisChart(audits) {
    const canvas = document.getElementById('gapAnalysisChart');
    const ctx = canvas.getContext('2d');
    
    if (charts.gapAnalysis) {
        charts.gapAnalysis.destroy();
    }
    
    const tpMetrics = calculateBPOScorecard(audits, 'teleperformance');
    const konectaMetrics = calculateBPOScorecard(audits, 'konecta');
    const benchmark = 85; // Benchmark objetivo
    
    const tpGap = benchmark - parseFloat(tpMetrics.passRate);
    const konectaGap = benchmark - parseFloat(konectaMetrics.passRate);
    
    charts.gapAnalysis = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Teleperformance', 'Konecta', 'Benchmark'],
            datasets: [{
                label: 'Quality Pass Rate %',
                data: [
                    parseFloat(tpMetrics.passRate),
                    parseFloat(konectaMetrics.passRate),
                    benchmark
                ],
                backgroundColor: [
                    tpGap > 10 ? 'rgba(239, 68, 68, 0.8)' : 'rgba(245, 158, 11, 0.8)',
                    konectaGap > 10 ? 'rgba(239, 68, 68, 0.8)' : 'rgba(245, 158, 11, 0.8)',
                    'rgba(16, 185, 129, 0.8)'
                ],
                borderColor: [
                    tpGap > 10 ? 'rgb(239, 68, 68)' : 'rgb(245, 158, 11)',
                    konectaGap > 10 ? 'rgb(239, 68, 68)' : 'rgb(245, 158, 11)',
                    'rgb(16, 185, 129)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Quality Pass Rate %'
                    }
                }
            }
        }
    });
}

// Heatmap de desempeño por agente
async function createPerformanceHeatmap(audits) {
    const agents = await getAgents();
    const container = document.getElementById('performanceHeatmap');
    
    const agentPerformance = agents.map(agent => {
        const agentAudits = audits.filter(a => a.agentId === agent.id);
        if (agentAudits.length === 0) return null;
        
        const perfect = agentAudits.filter(a => a.criticality === 'perfecto').length;
        const rate = (perfect / agentAudits.length * 100).toFixed(0);
        
        return {
            name: agent.name,
            rate: parseInt(rate),
            total: agentAudits.length
        };
    }).filter(a => a !== null).sort((a, b) => b.rate - a.rate);
    
    if (agentPerformance.length === 0) {
        container.innerHTML = '<p class="no-data">No hay datos de agentes</p>';
        return;
    }
    
    container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem;">
            ${agentPerformance.map(agent => {
                let bgColor = 'rgba(239, 68, 68, 0.8)'; // Rojo por defecto
                if (agent.rate >= 80) bgColor = 'rgba(16, 185, 129, 0.8)'; // Verde
                else if (agent.rate >= 60) bgColor = 'rgba(245, 158, 11, 0.8)'; // Amarillo
                
                return `
                <div style="padding: 1rem; background: ${bgColor}; color: white; border-radius: 8px; text-align: center;">
                    <div style="font-weight: 700; margin-bottom: 0.5rem;">${agent.name}</div>
                    <div style="font-size: 2rem; font-weight: 700;">${agent.rate}%</div>
                    <div style="font-size: 0.85rem; opacity: 0.9;">${agent.total} auditorías</div>
                </div>
                `;
            }).join('')}
        </div>
    `;
}

// ===================================
// SECCIÓN 2: COACHING & ENABLEMENT  
// ===================================
async function loadCoachingEnablement() {
    const allAudits = await getAudits();
    const allFeedbacks = await getFeedbacks();
    
    const audits = filterDataFrom2026(allAudits, 'callDate');
    const feedbacks = filterDataFrom2026(allFeedbacks, 'feedbackDate');
    
    if (feedbacks.length === 0) {
        document.getElementById('coachingInsight').textContent = 
            'No hay feedbacks registrados desde el 1 de enero de 2026.';
        return;
    }
    
    // KPIs de coaching
    const totalFeedbacksMonth = feedbacks.length;
    const pendingFeedbacks = 0; // TODO: implementar lógica de pendientes
    const avgClosureTime = calculateAvgClosureTime(feedbacks, audits);
    
    document.getElementById('totalFeedbacksMonth').textContent = totalFeedbacksMonth;
    document.getElementById('pendingFeedbacks').textContent = pendingFeedbacks;
    document.getElementById('avgClosureTime').textContent = avgClosureTime + ' días';
    
    // Insight
    document.getElementById('coachingInsight').textContent = 
        `Se han entregado ${totalFeedbacksMonth} feedbacks en el período analizado. ` +
        `El tiempo promedio de mejora es de ${avgClosureTime} días después del feedback.`;
    
    // Gráficos
    createFeedbackEffectivenessPeriodsChart(feedbacks, audits);
    await createReincidenceByAgentTable(feedbacks, audits);
    createCoachingAdoptionChart(feedbacks);
    createClosureTimeByTypeChart(feedbacks, audits);
}

// Calcular tiempo promedio de cierre/mejora
function calculateAvgClosureTime(feedbacks, audits) {
    let totalDays = 0;
    let count = 0;
    
    feedbacks.forEach(feedback => {
        const feedbackDate = new Date(feedback.feedbackDate);
        const agentId = feedback.agentId;
        
        const afterAudits = audits.filter(a => {
            const auditDate = new Date(a.callDate);
            const daysDiff = (auditDate - feedbackDate) / (1000 * 60 * 60 * 24);
            return a.agentId === agentId && daysDiff > 0 && daysDiff <= 30 && a.criticality === 'perfecto';
        });
        
        if (afterAudits.length > 0) {
            const firstPerfect = afterAudits.sort((a, b) => new Date(a.callDate) - new Date(b.callDate))[0];
            const days = (new Date(firstPerfect.callDate) - feedbackDate) / (1000 * 60 * 60 * 24);
            totalDays += days;
            count++;
        }
    });
    
    return count > 0 ? Math.round(totalDays / count) : 0;
}

// Gráfico de efectividad por períodos (7/14/30 días)
function createFeedbackEffectivenessPeriodsChart(feedbacks, audits) {
    const canvas = document.getElementById('feedbackEffectivenessPeriodsChart');
    const ctx = canvas.getContext('2d');
    
    if (charts.feedbackPeriods) {
        charts.feedbackPeriods.destroy();
    }
    
    const periods = [7, 14, 30];
    const effectivenessData = periods.map(days => {
        let improved = 0;
        let total = 0;
        
        feedbacks.forEach(feedback => {
            const feedbackDate = new Date(feedback.feedbackDate);
            const agentId = feedback.agentId;
            
            const beforeAudits = audits.filter(a => {
                const auditDate = new Date(a.callDate);
                const daysDiff = (feedbackDate - auditDate) / (1000 * 60 * 60 * 24);
                return a.agentId === agentId && daysDiff > 0 && daysDiff <= 30;
            });
            
            const afterAudits = audits.filter(a => {
                const auditDate = new Date(a.callDate);
                const daysDiff = (auditDate - feedbackDate) / (1000 * 60 * 60 * 24);
                return a.agentId === agentId && daysDiff > 0 && daysDiff <= days;
            });
            
            if (beforeAudits.length > 0 && afterAudits.length > 0) {
                total++;
                const beforeErrors = beforeAudits.filter(a => a.criticality === 'critico' || a.criticality === 'alto').length / beforeAudits.length;
                const afterErrors = afterAudits.filter(a => a.criticality === 'critico' || a.criticality === 'alto').length / afterAudits.length;
                
                if (afterErrors < beforeErrors) {
                    improved++;
                }
            }
        });
        
        return total > 0 ? ((improved / total) * 100).toFixed(1) : 0;
    });
    
    charts.feedbackPeriods = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['7 días', '14 días', '30 días'],
            datasets: [{
                label: '% Efectividad',
                data: effectivenessData,
                backgroundColor: [
                    'rgba(99, 102, 241, 0.8)',
                    'rgba(139, 92, 246, 0.8)',
                    'rgba(236, 72, 153, 0.8)'
                ],
                borderColor: [
                    'rgb(99, 102, 241)',
                    'rgb(139, 92, 246)',
                    'rgb(236, 72, 153)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: '% de Mejora'
                    }
                }
            }
        }
    });
}

// Tabla de reincidencia por agente
async function createReincidenceByAgentTable(feedbacks, audits) {
    const agents = await getAgents();
    const container = document.getElementById('reincidenceByAgentTable');
    
    const agentData = [];
    
    agents.forEach(agent => {
        const agentFeedbacks = feedbacks.filter(f => f.agentId === agent.id);
        if (agentFeedbacks.length === 0) return;
        
        let reincidence7 = 0, total7 = 0;
        let reincidence14 = 0, total14 = 0;
        let reincidence30 = 0, total30 = 0;
        
        agentFeedbacks.forEach(feedback => {
            const feedbackDate = new Date(feedback.feedbackDate);
            
            const beforeAudits = audits.filter(a => {
                const auditDate = new Date(a.callDate);
                const daysDiff = (feedbackDate - auditDate) / (1000 * 60 * 60 * 24);
                return a.agentId === agent.id && daysDiff > 0 && daysDiff <= 30;
            });
            
            const beforeErrors = new Set();
            beforeAudits.forEach(audit => {
                if (audit.errors && Array.isArray(audit.errors)) {
                    audit.errors.forEach(e => beforeErrors.add(e));
                }
            });
            
            // 7 días
            const after7 = audits.filter(a => {
                const auditDate = new Date(a.callDate);
                const daysDiff = (auditDate - feedbackDate) / (1000 * 60 * 60 * 24);
                return a.agentId === agent.id && daysDiff > 0 && daysDiff <= 7;
            });
            
            if (after7.length > 0) {
                total7++;
                let hasReincidence = false;
                after7.forEach(audit => {
                    if (audit.errors && Array.isArray(audit.errors)) {
                        audit.errors.forEach(error => {
                            if (beforeErrors.has(error)) {
                                hasReincidence = true;
                            }
                        });
                    }
                });
                if (hasReincidence) reincidence7++;
            }
            
            // 14 días
            const after14 = audits.filter(a => {
                const auditDate = new Date(a.callDate);
                const daysDiff = (auditDate - feedbackDate) / (1000 * 60 * 60 * 24);
                return a.agentId === agent.id && daysDiff > 0 && daysDiff <= 14;
            });
            
            if (after14.length > 0) {
                total14++;
                let hasReincidence = false;
                after14.forEach(audit => {
                    if (audit.errors && Array.isArray(audit.errors)) {
                        audit.errors.forEach(error => {
                            if (beforeErrors.has(error)) {
                                hasReincidence = true;
                            }
                        });
                    }
                });
                if (hasReincidence) reincidence14++;
            }
            
            // 30 días
            const after30 = audits.filter(a => {
                const auditDate = new Date(a.callDate);
                const daysDiff = (auditDate - feedbackDate) / (1000 * 60 * 60 * 24);
                return a.agentId === agent.id && daysDiff > 0 && daysDiff <= 30;
            });
            
            if (after30.length > 0) {
                total30++;
                let hasReincidence = false;
                after30.forEach(audit => {
                    if (audit.errors && Array.isArray(audit.errors)) {
                        audit.errors.forEach(error => {
                            if (beforeErrors.has(error)) {
                                hasReincidence = true;
                            }
                        });
                    }
                });
                if (hasReincidence) reincidence30++;
            }
        });
        
        agentData.push({
            name: agent.name,
            rate7: total7 > 0 ? ((reincidence7 / total7) * 100).toFixed(1) : 'N/A',
            rate14: total14 > 0 ? ((reincidence14 / total14) * 100).toFixed(1) : 'N/A',
            rate30: total30 > 0 ? ((reincidence30 / total30) * 100).toFixed(1) : 'N/A'
        });
    });
    
    if (agentData.length === 0) {
        container.innerHTML = '<p class="no-data">No hay datos de reincidencia</p>';
        return;
    }
    
    container.innerHTML = `
        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th style="text-align: left;">Agente</th>
                        <th>Reincidencia 7 días</th>
                        <th>Reincidencia 14 días</th>
                        <th>Reincidencia 30 días</th>
                    </tr>
                </thead>
                <tbody>
                    ${agentData.map(agent => `
                    <tr>
                        <td style="text-align: left;"><strong>${agent.name}</strong></td>
                        <td style="text-align: center;">${agent.rate7}${agent.rate7 !== 'N/A' ? '%' : ''}</td>
                        <td style="text-align: center;">${agent.rate14}${agent.rate14 !== 'N/A' ? '%' : ''}</td>
                        <td style="text-align: center;">${agent.rate30}${agent.rate30 !== 'N/A' ? '%' : ''}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Gráfico de adopción de coaching
function createCoachingAdoptionChart(feedbacks) {
    const canvas = document.getElementById('coachingAdoptionChart');
    const ctx = canvas.getContext('2d');
    
    if (charts.coachingAdoption) {
        charts.coachingAdoption.destroy();
    }
    
    const tipos = {
        'correctivo': feedbacks.filter(f => f.feedbackType === 'correctivo').length,
        'constructivo': feedbacks.filter(f => f.feedbackType === 'constructivo').length,
        'positivo': feedbacks.filter(f => f.feedbackType === 'positivo').length
    };
    
    charts.coachingAdoption = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Correctivo', 'Constructivo', 'Positivo'],
            datasets: [{
                data: Object.values(tipos),
                backgroundColor: [
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(16, 185, 129, 0.8)'
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Gráfico de tiempo de cierre por tipo
function createClosureTimeByTypeChart(feedbacks, audits) {
    const canvas = document.getElementById('closureTimeByTypeChart');
    const ctx = canvas.getContext('2d');
    
    if (charts.closureTime) {
        charts.closureTime.destroy();
    }
    
    const tipos = ['correctivo', 'constructivo', 'positivo'];
    const avgTimes = tipos.map(tipo => {
        const typeFeedbacks = feedbacks.filter(f => f.feedbackType === tipo);
        let totalDays = 0;
        let count = 0;
        
        typeFeedbacks.forEach(feedback => {
            const feedbackDate = new Date(feedback.feedbackDate);
            const agentId = feedback.agentId;
            
            const afterAudits = audits.filter(a => {
                const auditDate = new Date(a.callDate);
                const daysDiff = (auditDate - feedbackDate) / (1000 * 60 * 60 * 24);
                return a.agentId === agentId && daysDiff > 0 && daysDiff <= 30 && a.criticality === 'perfecto';
            });
            
            if (afterAudits.length > 0) {
                const firstPerfect = afterAudits.sort((a, b) => new Date(a.callDate) - new Date(b.callDate))[0];
                const days = (new Date(firstPerfect.callDate) - feedbackDate) / (1000 * 60 * 60 * 24);
                totalDays += days;
                count++;
            }
        });
        
        return count > 0 ? (totalDays / count).toFixed(1) : 0;
    });
    
    charts.closureTime = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Correctivo', 'Constructivo', 'Positivo'],
            datasets: [{
                label: 'Días hasta mejora',
                data: avgTimes,
                backgroundColor: [
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(16, 185, 129, 0.8)'
                ],
                borderColor: [
                    'rgb(239, 68, 68)',
                    'rgb(245, 158, 11)',
                    'rgb(16, 185, 129)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Días'
                    }
                }
            }
        }
    });
}

// ===================================
// SECCIÓN 3: MÉTRICAS Y KPIs
// ===================================
async function loadMetricasKPIs() {
    const allAudits = await getAudits();
    const audits = filterDataFrom2026(allAudits, 'callDate');
    
    if (audits.length === 0) {
        document.getElementById('metricasInsight').textContent = 
            'No hay datos disponibles desde el 1 de enero de 2026.';
        return;
    }
    
    // KPIs de Calidad Core
    const globalMetrics = calculateGlobalScorecard(audits);
    document.getElementById('qaScoreAvg').textContent = globalMetrics.qaScore;
    document.getElementById('qualityPassRate').textContent = globalMetrics.passRate + '%';
    document.getElementById('criticalErrorRate').textContent = globalMetrics.criticalRate;
    document.getElementById('defectDensityAvg').textContent = globalMetrics.defectDensity;
    
    // Reincidencia 30 días
    const reincidenceRate = await calculateReincidenceRate30(audits);
    document.getElementById('reincidenceRate30').textContent = reincidenceRate + '%';
    
    // KPIs de CX
    const fcrRate = calculateFCRRate(audits);
    const recontactRate = (100 - parseFloat(fcrRate)).toFixed(1);
    document.getElementById('fcrRate').textContent = fcrRate + '%';
    document.getElementById('recontactRate').textContent = recontactRate + '%';
    
    // Transfer y Hold Rates
    const transferRate = calculateTransferRate(audits);
    const excessiveHoldRate = calculateExcessiveHoldRate(audits);
    document.getElementById('transferRateMetric').textContent = transferRate + '%';
    document.getElementById('excessiveHoldRate').textContent = excessiveHoldRate + '%';
    
    // Cancel Completion Rate (solo perfectos)
    const cancelCompletionRate = (parseFloat(globalMetrics.passRate)).toFixed(1);
    document.getElementById('cancelCompletionRate').textContent = cancelCompletionRate + '%';
    
    // Llamadas promedio por motivo
    const avgByMotivo = (audits.length / 5).toFixed(0); // 5 tipos de llamada
    document.getElementById('avgCallsByMotivo').textContent = avgByMotivo;
    
    // Insight
    document.getElementById('metricasInsight').textContent = 
        `El QA Score promedio es ${globalMetrics.qaScore}/100 con un Quality Pass Rate de ${globalMetrics.passRate}%. ` +
        `La tasa de FCR es del ${fcrRate}% y el recontact rate del ${recontactRate}%.`;
    
    // Gráficos
    await createAHTVsQualityChart(audits);
    createHoldVsErrorsChart(audits);
    createCancelMotivesChart(audits);
    createMotivoVsErrorsChart(audits);
}

// Calcular FCR Rate (sin recontact)
function calculateFCRRate(audits) {
    const customerIds = {};
    audits.forEach(audit => {
        const customerId = audit.customerId;
        if (!customerIds[customerId]) {
            customerIds[customerId] = 0;
        }
        customerIds[customerId]++;
    });
    
    const singleContact = Object.values(customerIds).filter(count => count === 1).length;
    const total = Object.keys(customerIds).length;
    
    return total > 0 ? ((singleContact / total) * 100).toFixed(1) : '0';
}

// Calcular Transfer Rate
function calculateTransferRate(audits) {
    const withTransfer = audits.filter(a => a.transferAttempt === 'si').length;
    return audits.length > 0 ? ((withTransfer / audits.length) * 100).toFixed(1) : '0';
}

// Calcular Excessive Hold Rate
function calculateExcessiveHoldRate(audits) {
    const withExcessiveHold = audits.filter(a => a.excessiveHold === 'si').length;
    return audits.length > 0 ? ((withExcessiveHold / audits.length) * 100).toFixed(1) : '0';
}

// Calcular tasa de reincidencia a 30 días
async function calculateReincidenceRate30(audits) {
    const allFeedbacks = await getFeedbacks();
    const feedbacks = filterDataFrom2026(allFeedbacks, 'feedbackDate');
    
    let totalErrorsAfter = 0;
    let reincidentErrors = 0;
    
    feedbacks.forEach(feedback => {
        const feedbackDate = new Date(feedback.feedbackDate);
        const agentId = feedback.agentId;
        
        const beforeAudits = audits.filter(a => {
            const auditDate = new Date(a.callDate);
            const daysDiff = (feedbackDate - auditDate) / (1000 * 60 * 60 * 24);
            return a.agentId === agentId && daysDiff > 0 && daysDiff <= 30;
        });
        
        const afterAudits = audits.filter(a => {
            const auditDate = new Date(a.callDate);
            const daysDiff = (auditDate - feedbackDate) / (1000 * 60 * 60 * 24);
            return a.agentId === agentId && daysDiff > 0 && daysDiff <= 30;
        });
        
        const beforeErrors = new Set();
        beforeAudits.forEach(audit => {
            if (audit.errors && Array.isArray(audit.errors)) {
                audit.errors.forEach(e => beforeErrors.add(e));
            }
        });
        
        afterAudits.forEach(audit => {
            if (audit.errors && Array.isArray(audit.errors)) {
                totalErrorsAfter += audit.errors.length;
                audit.errors.forEach(error => {
                    if (beforeErrors.has(error)) {
                        reincidentErrors++;
                    }
                });
            }
        });
    });
    
    return totalErrorsAfter > 0 ? ((reincidentErrors / totalErrorsAfter) * 100).toFixed(1) : '0';
}

// Gráfico AHT vs Calidad
async function createAHTVsQualityChart(audits) {
    const canvas = document.getElementById('ahtVsQualityChart');
    const ctx = canvas.getContext('2d');
    
    if (charts.ahtVsQuality) {
        charts.ahtVsQuality.destroy();
    }
    
    // Agrupar por agente
    const agents = await getAgents();
    const data = agents.map(agent => {
        const agentAudits = audits.filter(a => a.agentId === agent.id && a.callDuration);
        if (agentAudits.length === 0) return null;
        
        const avgAHT = agentAudits.reduce((sum, a) => sum + (a.callDuration || 0), 0) / agentAudits.length;
        const perfect = agentAudits.filter(a => a.criticality === 'perfecto').length;
        const qualityRate = (perfect / agentAudits.length * 100).toFixed(1);
        
        return {
            x: avgAHT.toFixed(1),
            y: qualityRate,
            label: agent.name
        };
    }).filter(d => d !== null);
    
    charts.ahtVsQuality = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Agentes',
                data: data,
                backgroundColor: 'rgba(99, 102, 241, 0.6)',
                borderColor: 'rgb(99, 102, 241)',
                borderWidth: 2,
                pointRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const point = context.raw;
                            return `${point.label}: AHT ${point.x} min, Calidad ${point.y}%`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'AHT Promedio (minutos)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Quality Rate %'
                    },
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

// Gráfico Hold Time vs Errores
function createHoldVsErrorsChart(audits) {
    const canvas = document.getElementById('holdVsErrorsChart');
    const ctx = canvas.getContext('2d');
    
    if (charts.holdVsErrors) {
        charts.holdVsErrors.destroy();
    }
    
    const withHold = audits.filter(a => a.excessiveHold === 'si');
    const withoutHold = audits.filter(a => a.excessiveHold === 'no');
    
    const holdErrorRate = withHold.length > 0 ? 
        ((withHold.filter(a => a.criticality === 'critico' || a.criticality === 'alto').length / withHold.length) * 100).toFixed(1) : 0;
    
    const noHoldErrorRate = withoutHold.length > 0 ? 
        ((withoutHold.filter(a => a.criticality === 'critico' || a.criticality === 'alto').length / withoutHold.length) * 100).toFixed(1) : 0;
    
    charts.holdVsErrors = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Con Hold > 2 min', 'Sin Hold excesivo'],
            datasets: [{
                label: '% de Errores',
                data: [holdErrorRate, noHoldErrorRate],
                backgroundColor: [
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(16, 185, 129, 0.8)'
                ],
                borderColor: [
                    'rgb(239, 68, 68)',
                    'rgb(16, 185, 129)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: '% Errores Críticos/Altos'
                    }
                }
            }
        }
    });
}

// Gráfico de motivos de cancelación
async function createCancelMotivesChart(audits) {
    const canvas = document.getElementById('cancelMotivesChart');
    const ctx = canvas.getContext('2d');
    
    if (charts.cancelMotives) {
        charts.cancelMotives.destroy();
    }
    
    // Obtener strikes desde Supabase
    const { data: strikes, error } = await supabase
        .from('strikes')
        .select('tipo_cancelacion');
    
    if (error) {
        console.error('Error al obtener strikes:', error);
        return;
    }
    
    // Contar por tipo de cancelación
    const motives = {
        'Cuenta de Ahorros': 0,
        'Tarjeta de Crédito': 0,
        'Multiproducto': 0
    };
    
    strikes.forEach(strike => {
        if (strike.tipo_cancelacion && motives.hasOwnProperty(strike.tipo_cancelacion)) {
            motives[strike.tipo_cancelacion]++;
        }
    });
    
    charts.cancelMotives = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(motives),
            datasets: [{
                data: Object.values(motives),
                backgroundColor: [
                    'rgba(99, 102, 241, 0.8)',
                    'rgba(139, 92, 246, 0.8)',
                    'rgba(236, 72, 153, 0.8)'
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Gráfico motivo vs errores
async function createMotivoVsErrorsChart(audits) {
    const canvas = document.getElementById('motivoVsErrorsChart');
    const ctx = canvas.getContext('2d');
    
    if (charts.motivoVsErrors) {
        charts.motivoVsErrors.destroy();
    }
    
    // Obtener strikes desde Supabase
    const { data: strikes, error } = await supabase
        .from('strikes')
        .select('tipo_cancelacion, aplica_matriz');
    
    if (error) {
        console.error('Error al obtener strikes:', error);
        return;
    }
    
    const motives = {
        'Cuenta de Ahorros': 'CA',
        'Tarjeta de Crédito': 'TC',
        'Multiproducto': 'Multi'
    };
    
    // Calcular % de errores por tipo
    const errorRates = Object.keys(motives).map(key => {
        const typeStrikes = strikes.filter(s => s.tipo_cancelacion === key);
        const withErrors = typeStrikes.filter(s => s.aplica_matriz === 'Si').length;
        return typeStrikes.length > 0 ? ((withErrors / typeStrikes.length) * 100).toFixed(1) : 0;
    });
    
    charts.motivoVsErrors = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: Object.values(motives),
            datasets: [{
                label: '% Errores',
                data: errorRates,
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                borderColor: 'rgb(239, 68, 68)',
                borderWidth: 2,
                pointBackgroundColor: 'rgb(239, 68, 68)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgb(239, 68, 68)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            }
        }
    });
}

// ===================================
// SECCIÓN 4: INSIGHTS POR AGENTE
// ===================================
async function loadInsightsPorAgente() {
    const allAgents = await getAgents();
    const allAudits = await getAudits();
    const allFeedbacks = await getFeedbacks();
    
    const agents = allAgents;
    const audits = filterDataFrom2026(allAudits, 'callDate');
    const feedbacks = filterDataFrom2026(allFeedbacks, 'feedbackDate');
    
    if (audits.length === 0) {
        document.getElementById('insightsInsight').textContent = 
            'No hay datos disponibles desde el 1 de enero de 2026.';
        return;
    }
    
    // Calcular agentes en riesgo
    const riskAgents = calculateRiskAgents(agents, audits, feedbacks);
    
    document.getElementById('insightsInsight').textContent = 
        `${riskAgents.length} agentes han sido identificados con niveles de riesgo que requieren atención.`;
    
    // Mostrar alertas y análisis
    displayAgentAlerts(riskAgents);
    displayRiskAgentsDetail(riskAgents);
    displayRecommendationsPerAgent(riskAgents, feedbacks);
    createAgentRiskMatrixChart(agents, audits);
}

// Calcular agentes en riesgo
function calculateRiskAgents(agents, audits, feedbacks) {
    const riskAgents = [];
    
    agents.forEach(agent => {
        const agentAudits = audits.filter(a => a.agentId === agent.id);
        const recentAudits = agentAudits
            .sort((a, b) => new Date(b.callDate) - new Date(a.callDate))
            .slice(0, 10);
        
        if (recentAudits.length >= 3) {
            const criticalErrors = recentAudits.filter(a => a.criticality === 'critico' || a.criticality === 'alto').length;
            const errorRate = (criticalErrors / recentAudits.length) * 100;
            
            // Calcular tendencia
            const recent5 = recentAudits.slice(0, 5);
            const previous5 = recentAudits.slice(5, 10);
            
            let trend = 'stable';
            if (previous5.length >= 3) {
                const recentErrors = recent5.filter(a => a.criticality === 'critico' || a.criticality === 'alto').length;
                const previousErrors = previous5.filter(a => a.criticality === 'critico' || a.criticality === 'alto').length;
                trend = recentErrors > previousErrors ? 'declining' : recentErrors < previousErrors ? 'improving' : 'stable';
            }
            
            // Calcular score de riesgo
            let riskLevel = 'low';
            let riskScore = errorRate;
            
            if (errorRate >= 70 && trend === 'declining') {
                riskLevel = 'critical';
                riskScore = 90 + errorRate / 10;
            } else if (errorRate >= 50) {
                riskLevel = 'high';
                riskScore = 70 + errorRate / 5;
            } else if (errorRate >= 30 || trend === 'declining') {
                riskLevel = 'medium';
                riskScore = 50 + errorRate / 3;
            }
            
            if (riskLevel !== 'low') {
                riskAgents.push({
                    agent,
                    riskLevel,
                    riskScore: Math.min(100, riskScore).toFixed(0),
                    errorRate: errorRate.toFixed(1),
                    trend,
                    recentErrors: criticalErrors,
                    totalAudits: agentAudits.length
                });
            }
        }
    });
    
    return riskAgents.sort((a, b) => b.riskScore - a.riskScore);
}

// Mostrar alertas de agentes
function displayAgentAlerts(riskAgents) {
    const container = document.getElementById('alertasAgenteContainer');
    
    const criticalAgents = riskAgents.filter(a => a.riskLevel === 'critical');
    const highRiskAgents = riskAgents.filter(a => a.riskLevel === 'high');
    
    let html = '';
    
    if (criticalAgents.length > 0) {
        html += `
        <div class="alert-box critical">
            <div class="alert-icon">🚨</div>
            <div class="alert-content">
                <div class="alert-title">Alerta Crítica</div>
                <div class="alert-message">
                    ${criticalAgents.length} agente(s) requieren atención inmediata: ${criticalAgents.map(a => a.agent.name).join(', ')}
                </div>
            </div>
        </div>
        `;
    }
    
    if (highRiskAgents.length > 0) {
        html += `
        <div class="alert-box warning">
            <div class="alert-icon">⚠️</div>
            <div class="alert-content">
                <div class="alert-title">Alerta de Riesgo Alto</div>
                <div class="alert-message">
                    ${highRiskAgents.length} agente(s) con alto nivel de errores: ${highRiskAgents.map(a => a.agent.name).join(', ')}
                </div>
            </div>
        </div>
        `;
    }
    
    if (html === '') {
        html = `
        <div class="alert-box info">
            <div class="alert-icon">✅</div>
            <div class="alert-content">
                <div class="alert-title">Todo bajo control</div>
                <div class="alert-message">No hay agentes en riesgo crítico en este momento</div>
            </div>
        </div>
        `;
    }
    
    container.innerHTML = html;
}

// Mostrar detalle de agentes en riesgo
function displayRiskAgentsDetail(riskAgents) {
    const container = document.getElementById('riskAgentsDetailList');
    
    if (riskAgents.length === 0) {
        container.innerHTML = '<p class="no-data">No hay agentes en riesgo actualmente</p>';
        return;
    }
    
    container.innerHTML = `
        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Agente</th>
                        <th>Score de Riesgo</th>
                        <th>Tasa de Error</th>
                        <th>Tendencia</th>
                        <th>Total Auditorías</th>
                        <th>Nivel</th>
                    </tr>
                </thead>
                <tbody>
                    ${riskAgents.map(risk => `
                    <tr>
                        <td><strong>${risk.agent.name}</strong></td>
                        <td><span style="font-size: 1.2rem; font-weight: 700; color: ${risk.riskLevel === 'critical' ? 'var(--error-color)' : 'var(--warning-color)'};">${risk.riskScore}</span></td>
                        <td>${risk.errorRate}%</td>
                        <td>${risk.trend === 'declining' ? '📉 Descendente' : risk.trend === 'improving' ? '📈 Mejorando' : '➡️ Estable'}</td>
                        <td>${risk.totalAudits}</td>
                        <td>${risk.riskLevel === 'critical' ? '<span class="badge badge-critico">Crítico</span>' : 
                              risk.riskLevel === 'high' ? '<span class="badge badge-alto">Alto</span>' : 
                              '<span class="badge badge-medio">Medio</span>'}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Mostrar recomendaciones por agente
function displayRecommendationsPerAgent(riskAgents, feedbacks) {
    const container = document.getElementById('recommendationsPerAgent');
    
    if (riskAgents.length === 0) {
        container.innerHTML = '<p class="no-data">No hay recomendaciones en este momento</p>';
        return;
    }
    
    const recommendations = riskAgents.map(risk => {
        let recommendation = '';
        const agentFeedbacks = feedbacks.filter(f => f.agentId === risk.agent.id);
        
        if (risk.riskLevel === 'critical') {
            recommendation = `Requiere intervención inmediata. ${risk.recentErrors} errores críticos/altos en las últimas 10 auditorías. Programar sesión 1:1 urgente.`;
        } else if (risk.trend === 'declining') {
            recommendation = `Tendencia descendente detectada. Considerar feedback preventivo o re-training en áreas específicas.`;
        } else {
            recommendation = `Monitorear de cerca. ${agentFeedbacks.length} feedback(s) entregado(s) en el período. Verificar implementación.`;
        }
        
        return {
            agent: risk.agent.name,
            priority: risk.riskLevel === 'critical' ? 'alta' : 'media',
            recommendation
        };
    });
    
    container.innerHTML = recommendations.map(rec => `
        <div class="alert-box ${rec.priority === 'alta' ? 'critical' : 'warning'}" style="margin-bottom: 1rem;">
            <div class="alert-icon">${rec.priority === 'alta' ? '🚨' : '💡'}</div>
            <div class="alert-content">
                <div class="alert-title">${rec.agent}</div>
                <div class="alert-message">${rec.recommendation}</div>
            </div>
        </div>
    `).join('');
}

// Matriz de riesgo por agente
function createAgentRiskMatrixChart(agents, audits) {
    const canvas = document.getElementById('agentRiskMatrixChart');
    const ctx = canvas.getContext('2d');
    
    if (charts.agentRiskMatrix) {
        charts.agentRiskMatrix.destroy();
    }
    
    const data = agents.map(agent => {
        const agentAudits = audits.filter(a => a.agentId === agent.id);
        const errors = agentAudits.filter(a => a.criticality === 'critico' || a.criticality === 'alto').length;
        const errorRate = agentAudits.length > 0 ? (errors / agentAudits.length) * 100 : 0;
        
        return {
            x: agentAudits.length,
            y: errorRate,
            r: Math.max(5, errors * 3),
            label: agent.name
        };
    }).filter(d => d.x > 0);
    
    charts.agentRiskMatrix = new Chart(ctx, {
        type: 'bubble',
        data: {
            datasets: [{
                label: 'Agentes',
                data: data,
                backgroundColor: 'rgba(239, 68, 68, 0.6)',
                borderColor: 'rgb(239, 68, 68)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const point = context.raw;
                            return `${point.label}: ${point.y.toFixed(1)}% errores, ${point.x} auditorías`;
                        }
                    }
                },
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Total de Auditorías'
                    },
                    beginAtZero: true
                },
                y: {
                    title: {
                        display: true,
                        text: 'Tasa de Error (%)'
                    },
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

// ===================================
// SECCIÓN 5: ANÁLISIS DE MEJORAS (Migrado)
// ===================================
async function loadMejorasAnalysis() {
    await loadMejorasAgentsDropdown();
    setupMejorasAgentChangeListener();
}

// Cargar agentes en dropdown de mejoras
async function loadMejorasAgentsDropdown() {
    const agents = await getAgents();
    const select = document.getElementById('mejorasAgentId');
    
    select.innerHTML = '<option value="">Selecciona un agente para analizar</option>';
    
    if (agents.length === 0) {
        select.innerHTML += '<option value="" disabled>No hay agentes registrados</option>';
    } else {
        agents.forEach(agent => {
            const option = document.createElement('option');
            option.value = agent.id;
            option.textContent = agent.name;
            select.appendChild(option);
        });
    }
}

// Setup listener para cambio de agente
function setupMejorasAgentChangeListener() {
    const agentSelect = document.getElementById('mejorasAgentId');
    agentSelect.addEventListener('change', async function() {
        const agentId = this.value;
        if (agentId) {
            await loadMejorasFeedbacksDropdown(agentId);
        } else {
            document.getElementById('mejorasFeedbackId').innerHTML = 
                '<option value="">Primero selecciona un agente</option>';
        }
    });
}

// Cargar feedbacks del agente en mejoras
async function loadMejorasFeedbacksDropdown(agentId) {
    const allFeedbacks = (await getFeedbacks()).filter(f => f.agentId === agentId);
    const startDate2026 = new Date('2026-01-01');
    const feedbacks = allFeedbacks.filter(f => new Date(f.feedbackDate) >= startDate2026);
    
    const select = document.getElementById('mejorasFeedbackId');
    
    select.innerHTML = '<option value="">Selecciona un feedback</option>';
    
    if (feedbacks.length === 0) {
        select.innerHTML += '<option value="" disabled>No hay feedbacks para este agente desde 2026</option>';
    } else {
        feedbacks.sort((a, b) => new Date(b.feedbackDate) - new Date(a.feedbackDate));
        
        feedbacks.forEach(feedback => {
            const option = document.createElement('option');
            option.value = feedback.id;
            option.textContent = `${formatDate(feedback.feedbackDate)} - ${feedback.feedbackType} (${feedback.priority})`;
            select.appendChild(option);
        });
    }
}

// Realizar análisis de mejoras
async function performMejorasAnalysis() {
    const agentId = document.getElementById('mejorasAgentId').value;
    const feedbackId = document.getElementById('mejorasFeedbackId').value;
    
    if (!agentId || !feedbackId) {
        alert('Por favor selecciona un agente y un feedback');
        return;
    }
    
    const feedback = (await getFeedbacks()).find(f => f.id === feedbackId);
    if (!feedback) {
        alert('Feedback no encontrado');
        return;
    }
    
    const feedbackDate = new Date(feedback.feedbackDate);
    const startDate2026 = new Date('2026-01-01');
    
    if (feedbackDate < startDate2026) {
        alert('Solo se pueden analizar feedbacks desde el 1 de enero de 2026 en adelante');
        return;
    }
    
    const beforeStart = new Date(feedbackDate);
    beforeStart.setDate(beforeStart.getDate() - 30);
    const beforeEnd = new Date(feedbackDate);
    beforeEnd.setDate(beforeEnd.getDate() - 1);
    
    const afterStart = new Date(feedbackDate);
    afterStart.setDate(afterStart.getDate() + 1);
    const afterEnd = new Date(feedbackDate);
    afterEnd.setDate(afterEnd.getDate() + 30);
    
    if (beforeStart < startDate2026) {
        beforeStart.setTime(startDate2026.getTime());
    }
    
    const beforeMetrics = calculateAgentMetrics(agentId, 
        beforeStart.toISOString().split('T')[0], 
        beforeEnd.toISOString().split('T')[0]);
    
    const afterMetrics = calculateAgentMetrics(agentId, 
        afterStart.toISOString().split('T')[0], 
        afterEnd.toISOString().split('T')[0]);
    
    displayMejorasResults(feedback, beforeMetrics, afterMetrics, beforeStart, beforeEnd, afterStart, afterEnd);
}

// Mostrar resultados del análisis de mejoras
function displayMejorasResults(feedback, beforeMetrics, afterMetrics, beforeStart, beforeEnd, afterStart, afterEnd) {
    document.getElementById('mejorasNoData').style.display = 'none';
    document.getElementById('mejorasResults').style.display = 'block';
    
    const errorChange = afterMetrics.errorRate - beforeMetrics.errorRate;
    const improvement = errorChange < 0;
    
    const html = `
        <div class="card">
            <div class="card-header">
                <h3>Información del Feedback</h3>
            </div>
            <div class="card-body">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                    <div><strong>Fecha:</strong> ${formatDate(feedback.feedbackDate)}</div>
                    <div><strong>Dado por:</strong> ${feedback.feedbackGivenBy}</div>
                    <div><strong>Tipo:</strong> <span class="badge badge-${feedback.feedbackType === 'correctivo' ? 'critico' : feedback.feedbackType === 'constructivo' ? 'medio' : 'perfecto'}">${feedback.feedbackType}</span></div>
                    <div><strong>Prioridad:</strong> <span class="badge badge-${feedback.priority === 'alta' ? 'critico' : feedback.priority === 'media' ? 'alto' : 'medio'}">${feedback.priority}</span></div>
                </div>
                <div style="margin-top: 1rem;"><strong>Mensaje:</strong> ${feedback.feedbackMessage}</div>
            </div>
        </div>
        
        <div class="section-grid">
            <div class="card">
                <div class="card-header">
                    <h3>📊 ANTES del Feedback</h3>
                    <span class="subtitle">${formatDate(beforeStart.toISOString())} - ${formatDate(beforeEnd.toISOString())}</span>
                </div>
                <div class="card-body">
                    <div class="kpi-grid">
                        <div class="kpi-card">
                            <div class="kpi-value">${beforeMetrics.totalCalls}</div>
                            <div class="kpi-label">Llamadas</div>
                        </div>
                        <div class="kpi-card error">
                            <div class="kpi-value">${beforeMetrics.errorsCount}</div>
                            <div class="kpi-label">Errores</div>
                        </div>
                        <div class="kpi-card error">
                            <div class="kpi-value">${beforeMetrics.errorRate}%</div>
                            <div class="kpi-label">Tasa de Error</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h3>📈 DESPUÉS del Feedback</h3>
                    <span class="subtitle">${formatDate(afterStart.toISOString())} - ${formatDate(afterEnd.toISOString())}</span>
                </div>
                <div class="card-body">
                    <div class="kpi-grid">
                        <div class="kpi-card">
                            <div class="kpi-value">${afterMetrics.totalCalls}</div>
                            <div class="kpi-label">Llamadas</div>
                        </div>
                        <div class="kpi-card ${improvement ? 'success' : 'error'}">
                            <div class="kpi-value">${afterMetrics.errorsCount}</div>
                            <div class="kpi-label">Errores</div>
                        </div>
                        <div class="kpi-card ${improvement ? 'success' : 'error'}">
                            <div class="kpi-value">${afterMetrics.errorRate}%</div>
                            <div class="kpi-label">Tasa de Error</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="card">
            <div class="card-header">
                <h3>${improvement ? '✅' : '⚠️'} Resultado del Análisis</h3>
            </div>
            <div class="card-body">
                <div class="alert-box ${improvement ? 'info' : 'warning'}">
                    <div class="alert-icon">${improvement ? '📈' : '📉'}</div>
                    <div class="alert-content">
                        <div class="alert-title">${improvement ? 'Mejora Detectada' : 'Sin Mejora Significativa'}</div>
                        <div class="alert-message">
                            La tasa de error ${improvement ? 'disminuyó' : 'aumentó'} en ${Math.abs(errorChange).toFixed(1)}% después del feedback.
                            ${improvement ? 'El feedback ha sido efectivo.' : 'Se recomienda seguimiento adicional.'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('mejorasResults').innerHTML = html;
}
