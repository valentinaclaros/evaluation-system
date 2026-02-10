// ===================================
// Importar Auditorías - Excel/CSV/PDF
// ===================================

let parsedRows = []; // { raw: {...}, mapped: {...} }[]

function initPdfWorker() {
    if (typeof pdfjsLib !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
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
    const reader = new FileReader();
    reader.onload = async function(ev) {
        try {
            const result = ev.target.result;
            if (isCsv && typeof result === 'string') {
                parseCSV(result);
            } else if (result instanceof ArrayBuffer) {
                const header = String.fromCharCode.apply(null, new Uint8Array(result.slice(0, 5)));
                if (header.startsWith('%PDF')) {
                    await parsePDF(result);
                } else {
                    parseExcel(result);
                }
            } else {
                parseCSV(result);
            }
            if (parsedRows.length > 0) {
                renderPreview();
                document.getElementById('previewSection').style.display = 'block';
            } else {
                showError('No se encontraron filas con datos. Usa CSV, Excel (.xlsx, .xls) o PDF (.pdf) con la estructura indicada.');
            }
        } catch (err) {
            showError('Error al leer el archivo: ' + err.message);
        }
    };
    if (isCsv) reader.readAsText(file, 'UTF-8');
    else reader.readAsArrayBuffer(file);
}

function loadPdfLibrary() {
    return new Promise(function(resolve, reject) {
        if (typeof pdfjsLib !== 'undefined') {
            initPdfWorker();
            return resolve();
        }
        var s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        s.onload = function() {
            initPdfWorker();
            if (typeof pdfjsLib !== 'undefined') resolve();
            else reject(new Error('PDF.js no se cargó. Prueba en otra red o sube el archivo en formato Excel/CSV.'));
        };
        s.onerror = function() { reject(new Error('No se pudo cargar la librería PDF. Usa Excel o CSV, o abre la página desde tu PC.')); };
        document.head.appendChild(s);
    });
}

async function parsePDF(arrayBuffer) {
    await loadPdfLibrary();
    if (typeof pdfjsLib === 'undefined') {
        throw new Error('Librería PDF no disponible. Sube el archivo en Excel o CSV.');
    }
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsLib.GlobalWorkerOptions.workerSrc || 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = doc.numPages;
    const allLines = [];
    for (let p = 1; p <= numPages; p++) {
        const page = await doc.getPage(p);
        const content = await page.getTextContent();
        const byY = {};
        content.items.forEach(item => {
            var y = item.transform[5] || 0;
            var yKey = Math.round(y / 2) * 2;
            if (!byY[yKey]) byY[yKey] = [];
            byY[yKey].push({ str: item.str || '', x: item.transform[4] || 0 });
        });
        const sortedY = Object.keys(byY).map(Number).sort((a, b) => b - a);
        sortedY.forEach(y => {
            byY[y].sort((a, b) => a.x - b.x);
            const line = byY[y].map(i => i.str).join('\t');
            if (line.length > 2) allLines.push(line);
        });
    }
    if (allLines.length < 1) return;
    var firstLine = allLines[0];
    var headers = firstLine.split(/\t+/).map(h => h.trim()).filter(Boolean);
    if (headers.length < 2) headers = firstLine.split(/\s{2,}/).map(h => h.trim()).filter(Boolean);
    if (headers.length < 2) headers = firstLine.split(/\s+/).filter(Boolean);
    for (var i = 1; i < allLines.length; i++) {
        var rowLine = allLines[i];
        var values = rowLine.split(/\t+/).map(v => v.trim());
        if (values.length < 2) values = rowLine.split(/\s{2,}/).map(v => v.trim());
        if (values.length < 2) values = rowLine.split(/\s+/);
        if (values.every(function(v) { return !v; })) continue;
        var raw = {};
        headers.forEach(function(h, j) { raw[h] = values[j] != null ? String(values[j]).trim() : ''; });
        var mapped = mapRowToAudit(raw);
        if (mapped) parsedRows.push({ raw: raw, mapped: mapped });
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

function rowLooksLikeHeader(row) {
    if (!row || !row.length) return false;
    var line = (row.map(function(c) { return String(c || '').toLowerCase(); })).join(' ');
    return line.indexOf('fecha') >= 0 || line.indexOf('date') >= 0 || line.indexOf('criticidad') >= 0
        || line.indexOf('product') >= 0 || line.indexOf('agent') >= 0 || line.indexOf('analiz') >= 0
        || line.indexOf('customer') >= 0 || line.indexOf('tnps') >= 0 || line.indexOf('person view') >= 0
        || line.indexOf('xtronaut') >= 0 || line.indexOf('actor_affiliation') >= 0;
}

function parseExcel(arrayBuffer) {
    const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
    var data = null;
    var sheetNames = wb.SheetNames || [];
    for (var s = 0; s < sheetNames.length; s++) {
        var sheet = wb.Sheets[sheetNames[s]];
        var sheetData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
        if (!sheetData || sheetData.length < 2) continue;
        for (var r = 0; r < Math.min(15, sheetData.length); r++) {
            if (rowLooksLikeHeader(sheetData[r])) {
                data = sheetData;
                break;
            }
        }
        if (!data && sheetData.length >= 2) data = sheetData;
        if (data) break;
    }
    if (!data || data.length < 2) return;
    var headerRowIndex = 0;
    for (var r = 0; r < Math.min(10, data.length); r++) {
        if (rowLooksLikeHeader(data[r])) {
            headerRowIndex = r;
            break;
        }
    }
    const headers = (data[headerRowIndex] || []).map(function(h) { return String(h).trim(); });
    var startData = headerRowIndex + 1;
    for (var i = startData; i < data.length; i++) {
        const row = data[i] || [];
        const raw = {};
        headers.forEach(function(h, j) {
            var val = row[j];
            if (val != null && typeof val === 'object' && val.getMonth) val = val.toISOString ? val.toISOString().split('T')[0] : String(val);
            raw[h] = val != null ? String(val).trim() : '';
        });
        if (Object.keys(raw).every(function(k) { return !raw[k]; })) continue;
        const mapped = mapRowToAudit(raw);
        if (mapped) parsedRows.push({ raw: raw, mapped: mapped });
    }
    // Si no se leyó nada, intentar con la primera fila como cabecera (por si las columnas tienen otros nombres)
    if (parsedRows.length === 0 && data.length >= 2) {
        var h0 = (data[0] || []).map(function(h) { return String(h).trim(); });
        for (var i = 1; i < data.length; i++) {
            var row = data[i] || [];
            var raw = {};
            h0.forEach(function(h, j) {
                var val = row[j];
                if (val != null && typeof val === 'object' && val.getMonth) val = val.toISOString ? val.toISOString().split('T')[0] : String(val);
                raw[h] = val != null ? String(val).trim() : '';
            });
            if (Object.keys(raw).every(function(k) { return !raw[k]; })) continue;
            var mapped = mapRowToAudit(raw);
            if (mapped) parsedRows.push({ raw: raw, mapped: mapped });
        }
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

// Auditor Excel (Col C) → nombre completo según registrar auditoría
var AUDITOR_MAP = {
    'andrés g': 'Andrés Gayón', 'andres g': 'Andrés Gayón',
    'daniel a': 'Daniel Aristizabal',
    'daniel r': 'Daniel Rodríguez', 'daniel rodriguez': 'Daniel Rodríguez',
    'nicolás g': 'Nicolás González', 'nicolas g': 'Nicolás González',
    'paula m': 'Paula Morales',
    'valentina c': 'Valentina Claros'
};
function normalizeAuditor(val) {
    if (!val || !String(val).trim()) return 'Sin asignar';
    var k = String(val).trim().toLowerCase();
    return AUDITOR_MAP[k] || val.trim();
}

// tNPS Excel (Col G): Null→Sin respuesta, Promoter/Neutral/Detractor → igual
function normalizeTnps(val) {
    if (!val || String(val).trim() === '') return 'null';
    var v = String(val).trim().toLowerCase();
    if (v === 'null') return 'null';
    if (v === 'promoter' || v === 'promotor') return 'promoter';
    if (v === 'neutral') return 'neutral';
    if (v === 'detractor') return 'detractor';
    var n = parseInt(val, 10);
    if (!isNaN(n)) {
        if (n >= 9) return 'promoter';
        if (n >= 7) return 'neutral';
        return 'detractor';
    }
    return 'null';
}

// Motivos de cancelación del formulario (registrar-llamada) para mapear "Motivo: XXX" del Excel
var MOTIVOS_AHORROS = ['No la usa/No la necesita', 'Tiene más cuentas', 'Deseaba Tarjeta de Crédito', 'Inconformidad por cobro 4x1000', 'Falta de beneficios', 'Cobro de comisiones (retiros o compras internacionales)', 'Mala experiencia', 'No sabe usar la App', 'Recontacto', 'Otro'];
var MOTIVOS_CREDITO = ['No la usa/No la necesita', 'Tiene más tarjetas', 'Inconforme con cupo aprobado', 'Inconforme con tasa de interés', 'Inconforme con interés cobrado', 'Liberar capacidad de endeudamiento', 'No hay beneficios', 'Cobro de comisiones (avances o tasa de cambio)', 'Funcionalidades no disponibles', 'Mala experiencia', 'Cobro de cuota de manejo', 'Tarjeta sin cupo (Abre Caminos)', 'No sabe usar la App', 'Recontacto', 'Otro'];
function matchMotivoToChecklist(motivoRaw, callType) {
    if (!motivoRaw || !motivoRaw.trim()) return null;
    var m = motivoRaw.trim().toLowerCase();
    var list = callType === 'cancelacion_tarjeta_credito' ? MOTIVOS_CREDITO : MOTIVOS_AHORROS;
    for (var i = 0; i < list.length; i++) {
        if (m.indexOf(list[i].toLowerCase()) >= 0) return list[i];
        if (list[i].toLowerCase().indexOf(m) >= 0) return list[i];
    }
    return motivoRaw.substring(0, 300);
}

// Mapeo de frases del Excel (Xtronaut error) → valor de la checklist. Intuitivo: errores a checklist, no a notas.
var EXCEL_ERROR_TO_CHECKLIST = [
    { pattern: /tiempos de cancelación no se mencionan|tiempos de cancelación incorrectos|no se dan tiempos de cancelación/i, ahorros: 'Se dan tiempos de cancelación incorrectos', credito: 'TC: Se dan tiempos de cancelación incorrectos' },
    { pattern: /no se validaron tags/i, ahorros: 'No se validaron Tags', credito: 'TC: No se validaron Tags' },
    { pattern: /no se revisó el estado del producto en la herramienta/i, ahorros: 'No se revisó el estado del producto en la herramienta', credito: 'TC: No se revisó el estado del producto en la herramienta' },
    { pattern: /no se realizó hf/i, ahorros: 'No se realizó HF', credito: 'TC: No se realizó HF' },
    { pattern: /no se indagó en el motivo de cancelación/i, ahorros: 'No se indagó en el motivo de cancelación', credito: 'TC: No se indagó en el motivo de cancelación' },
    { pattern: /no se leyeron beneficios/i, ahorros: 'No se leyeron beneficios', credito: 'TC: No se leyeron beneficios' },
    { pattern: /no se validó si el cliente tiene cdt activo/i, ahorros: 'No se validó si el cliente tiene CDT activo', credito: null },
    { pattern: /no se hizo retención/i, ahorros: 'No se hizo retención', credito: 'TC: No se hizo retención' },
    { pattern: /no se validó el producto \(saldo|no se validó el producto \(deuda/i, ahorros: 'No se validó el producto (saldo en cajita, saldos mayores a $0,99, préstamo activo, etc.)', credito: 'TC: No se validó el producto (deuda activa, saldo a favor, compras en proceso, complaints activos, etc.)' },
    { pattern: /no se solicitó aproximación de saldo/i, ahorros: 'No se solicitó aproximación de saldo', credito: null },
    { pattern: /no se leyeron condiciones de cancelación/i, ahorros: 'No se leyeron condiciones de cancelación', credito: 'TC: No se leyeron condiciones de cancelación' },
    { pattern: /no se cancelaron las tarjetas|no se cancela(n)?\s*(las?\s*)?tarjetas?(\s*virtual(es)?)?/i, ahorros: 'No se cancelaron las tarjetas (físicas/virtuales)', credito: 'TC: No se cancelaron las tarjetas (físicas/virtuales)' },
    { pattern: /no se escaló secondary job|no se escaló secundary job/i, ahorros: 'No se escaló Secundary Job', credito: 'TC: No se escaló Secundary Job' },
    { pattern: /no se confirmó la gestión realizada/i, ahorros: 'No se confirmó la gestión realizada', credito: 'TC: No se confirmó la gestión realizada' },
    { pattern: /no se promueve case management/i, ahorros: 'No se promueve case management', credito: 'TC: No se promueve case management' },
    { pattern: /no se promueve encuesta/i, ahorros: 'No se promueve encuesta', credito: 'TC: No se promueve encuesta' },
    { pattern: /no se validó el tipo de tarjeta de crédito/i, ahorros: null, credito: 'TC: No se validó el tipo de tarjeta de crédito que tenía el cliente' }
];
function mapExcelErrorsToChecklist(restText, callType) {
    var errors = [];
    var notesParts = [];
    var isTarjeta = callType === 'cancelacion_tarjeta_credito';
    var isAhorros = callType === 'cancelacion_cuenta_ahorros';
    var isMulti = callType === 'cancelacion_multiproducto';
    // Quitar duración de llamada y tiempos de espera que no deben ir a notas
    var cleaned = String(restText || '')
        .replace(/\d{1,2}:\d{2}\s*llamada\.?\s*/gi, '')
        .replace(/llamada\s+\d{1,2}:\d{2}\s*/gi, '')
        .replace(/\d{1,2}\s*min(?:utos)?\s*(?:de\s*)?espera/gi, '')
        .replace(/espera\s*(?:de\s*)?\d{1,2}\s*min(?:utos)?/gi, '')
        .replace(/se dej[oó]\s*esperando[^.]*\.?\s*/gi, '')
        .replace(/tiempos?\s*injustificados?\.?\s*/gi, '')
        .trim();
    var lines = cleaned.split(/\n|\.\s+|\?\s+/).map(function(s) { return s.trim(); }).filter(Boolean);
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        // No meter en notas líneas que solo son duración
        if (/^\s*llamada\s*\d{1,2}:\d{2}\s*$/i.test(line) || /^\s*\d{1,2}:\d{2}\s*llamada\s*$/i.test(line)) continue;
        var isQuestion = /^\s*¿?por qué|^\s*¿?porque|^\s*¿/i.test(line) || (line.indexOf('?') >= 0 && line.length < 120);
        if (isQuestion || line.length > 200) {
            notesParts.push(line);
            continue;
        }
        var matched = false;
        // Una misma línea puede contener varios errores (ej. "No se cancela tarjeta virtual No se dan tiempos de cancelación")
        for (var j = 0; j < EXCEL_ERROR_TO_CHECKLIST.length; j++) {
            var rule = EXCEL_ERROR_TO_CHECKLIST[j];
            if (rule.pattern.test(line)) {
                if (isTarjeta && rule.credito && errors.indexOf(rule.credito) === -1) errors.push(rule.credito);
                if ((isAhorros || isMulti) && rule.ahorros && errors.indexOf(rule.ahorros) === -1) errors.push(rule.ahorros);
                if ((isTarjeta || isMulti) && rule.credito && errors.indexOf(rule.credito) === -1) errors.push(rule.credito);
                matched = true;
            }
        }
        if (!matched && line.length > 0) notesParts.push(line);
    }
    // Si había texto en Xtronaut pero ningún error coincidió con la checklist, marcar "Otro" para no dejar el campo vacío
    if (errors.length === 0 && cleaned.length > 0) {
        if (isTarjeta) errors.push('TC: Otro');
        else if (isAhorros || isMulti) errors.push('Otro');
    }
    return { errors: errors, callNotes: notesParts.join(' ').trim() };
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
    // Col A = Fecha de la llamada
    var fecha = parseDate(getCell(raw, 'Fecha', 'Date', 'fecha'));
    if (!fecha && raw && typeof raw === 'object') {
        var keys = Object.keys(raw);
        for (var k = 0; k < keys.length; k++) {
            fecha = parseDate(raw[keys[k]]);
            if (fecha) break;
        }
    }
    if (!fecha) fecha = new Date().toISOString().split('T')[0];

    var criticidad = getCell(raw, 'Criticidad', 'criticality', 'criticidad');
    var auditorRaw = getCell(raw, '¿Quién analizó el caso?', 'Quién analizó el caso', 'Auditor', 'auditor');
    var product = getCell(raw, 'Product', 'product', 'Producto');
    var errorDesc = getCell(raw, 'Xtronaut error', 'Xtronaut error', 'error', 'Error');
    var tnpsVal = getCell(raw, 'tNPS', 'tnps', 'TNPS');
    var bpoVal = getCell(raw, 'actor_affiliation', 'actor_affiliation', 'BPO', 'bpo');
    var customerId = getCell(raw, 'Customer_ID', 'Customer_ID', 'customer_id', 'Customer ID');
    var personView = getCell(raw, 'Person View', 'Person View', 'person view', 'enlace', 'Enlace PV');

    // Razón de contacto: Col D Product → Credit Card / Savings / Multiproduct
    var callType = 'cancelacion_cuenta_ahorros';
    var p = (product || '').toLowerCase();
    if (p.includes('credit') || p.includes('tarjeta') || p === 'credit card') callType = 'cancelacion_tarjeta_credito';
    else if (p.includes('multi') || p === 'multiproduct') callType = 'cancelacion_multiproducto';
    else if (p.includes('saving') || p.includes('ahorro') || p === 'savings') callType = 'cancelacion_cuenta_ahorros';

    // Nivel de Criticidad: Col B → Crítico/Alto/Medio; N/A = Perfecto
    var criticality = 'medio';
    var c = (criticidad || '').toLowerCase().trim();
    if (c.includes('crítico') || c.includes('critico')) criticality = 'critico';
    else if (c.includes('alto')) criticality = 'alto';
    else if (c.includes('medio')) criticality = 'medio';
    else if (c === 'n/a' || c.includes('perfecto')) criticality = 'perfecto';

    var bpo = (bpoVal || '').toLowerCase().includes('konecta') ? 'konecta' : 'teleperformance';
    if (bpoVal && bpoVal.trim()) bpo = bpoVal.trim().toLowerCase();

    // Calificación TNPS: Col G — Null: Sin respuesta; Promoter/Neutral/Detractor
    var tnps = normalizeTnps(tnpsVal);

    // Fecha de auditoría = un día después de la fecha de la llamada (Col A)
    var callDateObj = new Date(fecha);
    callDateObj.setDate(callDateObj.getDate() + 1);
    var auditDate = callDateObj.toISOString().split('T')[0];

    // Col F Xtronaut error: Motivo, Llamada MM:SS, tiempos de espera > 2 min, errores (checklist), notas
    var callDuration = 0;
    var cancellationReason = null;
    var errors = [];
    var callNotes = '';
    var errorDescription = '';
    var excessiveHold = '';
    var holdTime = 0;
    var transferAttempt = 'no';
    if (errorDesc && errorDesc.trim()) {
        var parsed = parseXtronautError(errorDesc);
        callDuration = parsed.durationMinutes;
        cancellationReason = matchMotivoToChecklist(parsed.cancellationReason, callType);
        excessiveHold = parsed.excessiveHold || '';
        holdTime = parsed.holdTimeMinutes || 0;
        transferAttempt = parsed.transferAttempt || 'no';
        var mapped = mapExcelErrorsToChecklist(parsed.restText || '', callType);
        errors = mapped.errors;
        callNotes = mapped.callNotes || '';
        errorDescription = errors.length > 0 ? errors.join('; ') : (parsed.restText || '');
    }

    // Auditor: Col C → nombre completo (Andrés G → Andrés Gayón, etc.)
    var auditor = normalizeAuditor(auditorRaw);

    return {
        callDate: fecha,
        auditDate: auditDate,
        customerId: customerId || 'Sin ID',
        callType: callType,
        cancellationReason: cancellationReason,
        enlacePv: personView || null,
        bpo: bpo,
        agentId: null,
        auditor: auditor,
        criticality: criticality,
        tnps: tnps,
        errorDescription: errorDescription,
        errors: errors,
        callNotes: callNotes,
        callDuration: callDuration,
        transferAttempt: transferAttempt,
        excessiveHold: excessiveHold,
        holdTime: holdTime
    };
}

// Extrae de Xtronaut error (Col F): Motivo, Llamada MM:SS, tiempos de espera > 2 min, resto = errores/notas
function parseXtronautError(text) {
    var t = String(text || '').trim();
    var durationMinutes = 0;
    var cancellationReason = null;
    var excessiveHold = 'no';
    var holdTimeMinutes = 0;
    var transferAttempt = 'no';

    // 0) ¿Agente intentó transferir? "Agente intentó transferir", "intentó transferir", etc. → Sí; si no dice nada → No
    if (/agente\s+intent[oó]\s+transferir|intent[oó]\s+transferir\s*(la\s*llamada)?|intento\s+de\s+transferir/i.test(t)) {
        transferAttempt = 'si';
    }

    // 1) Motivo: "Motivo: No la usa." o "Motivo: Quería crédito."
    var motivoMatch = t.match(/Motivo:\s*([^.\n]*\.?)/i);
    if (motivoMatch && motivoMatch[1].trim()) {
        cancellationReason = motivoMatch[1].trim().replace(/\.$/, '').substring(0, 300) || null;
    }

    // 2) Duración de la llamada: "Llamada: 3:16", "Llamada 3:16", "3:16 llamada", etc.
    var timeMatch = t.match(/Llamada\s*:\s*(\d{1,2}):(\d{2})/i)
        || t.match(/Llamada\s+(\d{1,2}):(\d{2})/i)
        || t.match(/(\d{1,2}):(\d{2})\s*llamada\.?\s*/i);
    if (timeMatch) {
        var minutes = parseInt(timeMatch[1], 10) || 0;
        var seconds = parseInt(timeMatch[2], 10) || 0;
        durationMinutes = minutes + seconds / 60;
    }

    // 3) Tiempos de espera > 2 min: "3 min de espera", "Se dejó esperando al cliente", "tiempos injustificados"
    var holdMatch = t.match(/(\d{1,2})\s*min(?:utos)?\s*(?:de\s*)?espera/i)
        || t.match(/espera\s*(?:de\s*)?(\d{1,2})\s*min(?:utos)?/i)
        || t.match(/(\d{1,2}):(\d{2})\s*(?:min\s*)?(?:de\s*)?espera/i)
        || t.match(/(\d{1,2})\s*min(?:utos)?\s+espera/i);
    if (holdMatch) {
        excessiveHold = 'si';
        if (holdMatch[2] !== undefined) {
            holdTimeMinutes = (parseInt(holdMatch[1], 10) || 0) + (parseInt(holdMatch[2], 10) || 0) / 60;
        } else {
            holdTimeMinutes = parseInt(holdMatch[1], 10) || 3;
        }
    }
    if (excessiveHold === 'no' && (/se dej[oó]\s*esperando|tiempos?\s*injustificados?|dejaron esperando/i.test(t))) {
        excessiveHold = 'si';
        var minInText = t.match(/(\d{1,2})\s*min(?:utos)?/i);
        holdTimeMinutes = minInText ? parseInt(minInText[1], 10) : 3;
    }

    // 4) Resto: quitar Motivo, duración de llamada y frases de tiempo de espera para que no lleguen a notas
    var rest = t
        .replace(/Motivo:\s*[^.\n]*\.?\s*/gi, '')
        .replace(/Llamada\s*:\s*\d{1,2}:\d{2}\s*/gi, '')
        .replace(/Llamada\s+\d{1,2}:\d{2}\s*/gi, '')
        .replace(/\d{1,2}:\d{2}\s*llamada\.?\s*/gi, '')
        .replace(/\d{1,2}:\d{2}\s*llamada\s*/gi, '')
        .replace(/llamada\s+\d{1,2}:\d{2}\s*/gi, '')
        .replace(/\d{1,2}\s*min(?:utos)?\s*(?:de\s*)?espera/gi, '')
        .replace(/espera\s*(?:de\s*)?\d{1,2}\s*min(?:utos)?/gi, '')
        .replace(/\d{1,2}:\d{2}\s*(?:min\s*)?(?:de\s*)?espera/gi, '')
        .replace(/\d{1,2}\s*min(?:utos)?\s+espera/gi, '')
        .replace(/se dej[oó]\s*esperando\s*(?:al cliente)?\.?\s*/gi, '')
        .replace(/tiempos?\s*injustificados?\.?\s*/gi, '')
        .replace(/dejaron esperando[^.]*\.?\s*/gi, '')
        .replace(/agente\s+intent[oó]\s+transferir[^.]*\.?\s*/gi, '')
        .replace(/intent[oó]\s+transferir\s*(la\s*llamada)?[^.]*\.?\s*/gi, '')
        .replace(/intento\s+de\s+transferir[^.]*\.?\s*/gi, '')
        .trim();
    return { durationMinutes, cancellationReason, excessiveHold, holdTimeMinutes, transferAttempt, restText: rest };
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
