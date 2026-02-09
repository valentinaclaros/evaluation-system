// ===================================
// Importar Auditorías - Excel/CSV/PDF
// ===================================

let parsedRows = []; // { raw: {...}, mapped: {...} }[]

function initPdfWorker() {
    if (typeof pdfjsLib !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/legacy/build/pdf.worker.min.js';
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    initPdfWorker();
    await loadAgentsDropdown();
    document.getElementById('fileInput').addEventListener('change', handleFileSelect);
    document.getElementById('btnImport').addEventListener('click', doImport);
});

async function loadAgentsDropdown() {
    const agents = await getAgents();
    const select = document.getElementById('agentId');
    select.innerHTML = '<option value="">Seleccionar agente...</option>';
    (agents || []).filter(a => a.status === 'activo').forEach(agent => {
        const opt = document.createElement('option');
        opt.value = agent.id;
        opt.textContent = agent.name;
        select.appendChild(opt);
    });
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    parsedRows = [];
    hideMessages();
    const ext = (file.name || '').toLowerCase();
    const mime = (file.type || '').toLowerCase();
    const isCsv = ext.endsWith('.csv') || mime === 'text/csv';
    const isExcel = ext.endsWith('.xlsx') || ext.endsWith('.xls') || mime.includes('spreadsheet') || mime.includes('excel');
    const isPdf = ext.endsWith('.pdf') || mime === 'application/pdf';
    if (!isCsv && !isExcel && !isPdf) {
        showError('Formato no soportado. Usa .csv, .xlsx, .xls o .pdf');
        return;
    }
    const reader = new FileReader();
    reader.onload = async function(ev) {
        try {
            if (isCsv) {
                parseCSV(ev.target.result);
            } else if (isExcel) {
                parseExcel(ev.target.result);
            } else if (isPdf) {
                await parsePDF(ev.target.result);
            }
            if (parsedRows.length > 0) {
                renderPreview();
                document.getElementById('previewSection').style.display = 'block';
            } else {
                showError('No se encontraron filas con datos en el archivo.');
            }
        } catch (err) {
            showError('Error al leer el archivo: ' + err.message);
        }
    };
    if (isExcel || isPdf) reader.readAsArrayBuffer(file);
    else reader.readAsText(file, 'UTF-8');
}

async function parsePDF(arrayBuffer) {
    initPdfWorker();
    if (typeof pdfjsLib === 'undefined') {
        throw new Error('Librería PDF no cargada. Recarga la página.');
    }
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsLib.GlobalWorkerOptions.workerSrc || 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/legacy/build/pdf.worker.min.js';
    const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = doc.numPages;
    const allLines = [];
    for (let p = 1; p <= numPages; p++) {
        const page = await doc.getPage(p);
        const content = await page.getTextContent();
        const byY = {};
        content.items.forEach(item => {
            const y = Math.round((item.transform[5] || 0) * 10) / 10;
            if (!byY[y]) byY[y] = [];
            byY[y].push({ str: item.str || '', x: item.transform[4] || 0 });
        });
        const sortedY = Object.keys(byY).map(Number).sort((a, b) => b - a);
        sortedY.forEach(y => {
            byY[y].sort((a, b) => a.x - b.x);
            const line = byY[y].map(i => i.str).join('\t');
            if (line.trim()) allLines.push(line);
        });
    }
    if (allLines.length < 2) return;
    let headers = allLines[0].split(/\t+/).map(h => h.trim()).filter(Boolean);
    if (headers.length < 2) headers = allLines[0].split(/\s{2,}/).map(h => h.trim()).filter(Boolean);
    if (headers.length < 2) return;
    for (let i = 1; i < allLines.length; i++) {
        let values = allLines[i].split(/\t+/).map(v => v.trim());
        if (values.length < 2) values = allLines[i].split(/\s{2,}/).map(v => v.trim());
        if (values.every(v => !v)) continue;
        const raw = {};
        headers.forEach((h, j) => { raw[h] = values[j] != null ? String(values[j]).trim() : ''; });
        const mapped = mapRowToAudit(raw);
        if (mapped) parsedRows.push({ raw, mapped });
    }
}

function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return;
    const headers = parseCSVLine(lines[0]);
    const headerMap = normalizeHeaders(headers);
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.every(v => !v || !String(v).trim())) continue;
        const raw = {};
        headers.forEach((h, j) => { raw[h] = values[j] != null ? String(values[j]).trim() : ''; });
        const mapped = mapRowToAudit(raw);
        if (mapped) parsedRows.push({ raw, mapped });
    }
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
            inQuotes = !inQuotes;
        } else if ((c === ',' && !inQuotes) || c === '\t') {
            result.push(current);
            current = '';
        } else {
            current += c;
        }
    }
    result.push(current);
    return result;
}

function parseExcel(arrayBuffer) {
    const wb = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheet = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });
    if (!data || data.length < 2) return;
    const headers = (data[0] || []).map(h => String(h).trim());
    const headerMap = normalizeHeaders(headers);
    for (let i = 1; i < data.length; i++) {
        const row = data[i] || [];
        const raw = {};
        headers.forEach((h, j) => { raw[h] = row[j] != null ? String(row[j]).trim() : ''; });
        if (Object.values(raw).every(v => !v)) continue;
        const mapped = mapRowToAudit(raw);
        if (mapped) parsedRows.push({ raw, mapped });
    }
}

function normalizeHeaders(headers) {
    const map = {};
    headers.forEach((h, i) => {
        const key = String(h || '').trim().toLowerCase()
            .replace(/\s+/g, ' ')
            .replace(/[¿?]/g, '');
        map[key] = i;
    });
    return map;
}

function getCell(raw, ...possibleKeys) {
    const keys = Object.keys(raw || {});
    for (const tryKey of possibleKeys) {
        const lower = String(tryKey).toLowerCase().replace(/\s+/g, ' ').replace(/[¿?]/g, '');
        const found = keys.find(k => String(k).toLowerCase().replace(/\s+/g, ' ').replace(/[¿?]/g, '') === lower);
        if (found && raw[found] != null && String(raw[found]).trim() !== '') return String(raw[found]).trim();
    }
    return '';
}

function parseDate(val) {
    if (!val) return '';
    const s = String(val).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) {
        const [, month, day, year] = m;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    return '';
}

function mapRowToAudit(raw) {
    const fecha = parseDate(getCell(raw, 'Fecha', 'Date', 'fecha'));
    const criticidad = getCell(raw, 'Criticidad', 'criticality', 'criticidad');
    const auditor = getCell(raw, '¿Quién analizó el caso?', 'Quién analizó el caso', 'Auditor', 'auditor');
    const product = getCell(raw, 'Product', 'product', 'Producto');
    const errorDesc = getCell(raw, 'Xtronaut error', 'Xtronaut error', 'error', 'Error');
    const tnpsVal = getCell(raw, 'tNPS', 'tnps', 'TNPS');
    const bpoVal = getCell(raw, 'actor_affiliation', 'actor_affiliation', 'BPO', 'bpo');
    const customerId = getCell(raw, 'Customer_ID', 'Customer_ID', 'customer_id', 'Customer ID');
    const personView = getCell(raw, 'Person View', 'Person View', 'person view', 'enlace', 'Enlace PV');

    if (!fecha) return null;

    let callType = 'cancelacion_cuenta_ahorros';
    const p = (product || '').toLowerCase();
    if (p.includes('credit') || p.includes('tarjeta') || p === 'credit card') callType = 'cancelacion_tarjeta_credito';
    else if (p.includes('multi') || p === 'multiproduct') callType = 'cancelacion_multiproducto';
    else if (p.includes('saving') || p.includes('ahorro') || p === 'savings') callType = 'cancelacion_cuenta_ahorros';

    // Criticidad: Crítico, Alto, Medio = iguales; N/A = Perfecto
    let criticality = 'medio';
    const c = (criticidad || '').toLowerCase().trim();
    if (c.includes('crítico') || c.includes('critico')) criticality = 'critico';
    else if (c.includes('alto')) criticality = 'alto';
    else if (c.includes('medio')) criticality = 'medio';
    else if (c === 'n/a' || c.includes('perfecto')) criticality = 'perfecto';

    let bpo = (bpoVal || '').toLowerCase().includes('konecta') ? 'konecta' : 'teleperformance';
    if (bpoVal && bpoVal.trim()) bpo = bpoVal.trim().toLowerCase();

    // TNPS: Null o vacío = sin respuesta (guardamos 'null')
    let tnps = null;
    if (tnpsVal && String(tnpsVal).trim() && String(tnpsVal).toLowerCase() !== 'null') {
        const n = parseInt(tnpsVal, 10);
        if (!isNaN(n)) tnps = n;
    } else {
        tnps = 'null'; // Sin respuesta
    }

    // Fecha auditoría = un día después de la fecha de la llamada
    const callDateObj = new Date(fecha);
    callDateObj.setDate(callDateObj.getDate() + 1);
    const auditDate = callDateObj.toISOString().split('T')[0];

    // Duración de llamada y motivo de cancelación están dentro de Xtronaut error
    let callDuration = 0;
    let cancellationReason = null;
    let errorDescription = errorDesc || '';
    if (errorDesc && errorDesc.trim()) {
        const parsed = parseXtronautError(errorDesc);
        callDuration = parsed.durationMinutes;
        cancellationReason = parsed.cancellationReason || null;
        if (parsed.restText) errorDescription = parsed.restText.trim() || errorDesc;
    }

    return {
        callDate: fecha,
        auditDate,
        customerId: customerId || 'Sin ID',
        callType,
        cancellationReason,
        enlacePv: personView || null,
        bpo,
        agentId: null,
        auditor: auditor || 'Sin asignar',
        criticality,
        tnps,
        errorDescription,
        errors: errorDescription ? [errorDescription] : [],
        callNotes: '',
        callDuration,
        transferAttempt: '',
        excessiveHold: '',
        holdTime: 0
    };
}

// Extrae de Xtronaut error: Motivo: ..., HH:MM llamada., y el error (resto)
function parseXtronautError(text) {
    const t = String(text || '').trim();
    let durationMinutes = 0;
    let cancellationReason = null;
    let errorDescription = t;

    // 1) Motivo: "Motivo: No la usa." o "Motivo: Quería crédito."
    const motivoMatch = t.match(/Motivo:\s*([^.]*\.?)/i);
    if (motivoMatch && motivoMatch[1].trim()) {
        cancellationReason = motivoMatch[1].trim().replace(/\.$/, '').substring(0, 300) || null;
    }

    // 2) Duración: "11:27 llamada." o "5:57 llamada."
    const timeMatch = t.match(/(\d{1,2}):(\d{2})\s*llamada\.?/i);
    if (timeMatch) {
        const minutes = parseInt(timeMatch[1], 10) || 0;
        const seconds = parseInt(timeMatch[2], 10) || 0;
        durationMinutes = minutes + seconds / 60;
    }

    // 3) Error: todo lo que sobra quitando "Motivo: X. " y "HH:MM llamada. "
    let rest = t
        .replace(/Motivo:\s*[^.]*\.?\s*/gi, '')
        .replace(/\d{1,2}:\d{2}\s*llamada\.?\s*/gi, '')
        .trim();
    if (rest) errorDescription = rest;

    return { durationMinutes, cancellationReason, restText: errorDescription };
}

function renderPreview() {
    if (parsedRows.length === 0) return;
    const first = parsedRows[0].raw;
    const headers = Object.keys(first);
    document.getElementById('previewThead').innerHTML = '<tr>' + headers.map(h => `<th>${escapeHtml(h)}</th>`).join('') + '</tr>';
    const slice = parsedRows.slice(0, 20);
    document.getElementById('previewTbody').innerHTML = slice.map(row => {
        return '<tr>' + headers.map(h => `<td>${escapeHtml(String(row.raw[h] || '').substring(0, 50))}${(String(row.raw[h] || '').length > 50 ? '...' : '')}</td>`).join('') + '</tr>';
    }).join('');
    document.getElementById('previewCount').textContent = parsedRows.length;
}

function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
}

async function doImport() {
    const agentId = document.getElementById('agentId').value;
    if (!agentId) {
        showError('Selecciona el agente al que pertenecen estas auditorías.');
        return;
    }
    if (parsedRows.length === 0) {
        showError('No hay filas para importar. Sube un archivo primero.');
        return;
    }
    hideMessages();
    const btn = document.getElementById('btnImport');
    const status = document.getElementById('importStatus');
    btn.disabled = true;
    status.textContent = 'Importando...';
    let ok = 0;
    let err = 0;
    for (let i = 0; i < parsedRows.length; i++) {
        const audit = { ...parsedRows[i].mapped, agentId };
        try {
            await addAudit(audit);
            ok++;
        } catch (e) {
            console.error('Error fila ' + (i + 1), e);
            err++;
        }
        if ((i + 1) % 5 === 0) status.textContent = `Importando... ${i + 1}/${parsedRows.length}`;
    }
    btn.disabled = false;
    status.textContent = '';
    if (err === 0) {
        showSuccess(`Se importaron ${ok} auditorías correctamente.`);
        parsedRows = [];
        document.getElementById('previewSection').style.display = 'none';
        document.getElementById('fileInput').value = '';
    } else {
        showError(`Importadas: ${ok}. Errores: ${err}. Revisa la consola.`);
    }
}

function showError(msg) {
    const el = document.getElementById('errorMessage');
    el.textContent = msg;
    el.style.display = 'block';
    document.getElementById('successMessage').style.display = 'none';
}

function showSuccess(msg) {
    const el = document.getElementById('successMessage');
    el.textContent = msg;
    el.style.display = 'block';
    document.getElementById('errorMessage').style.display = 'none';
}

function hideMessages() {
    document.getElementById('errorMessage').style.display = 'none';
    document.getElementById('successMessage').style.display = 'none';
}
