/**
 * ═══════════════════════════════════════════════════════
 *  AVIANCA SAL · WHEELCHAIR SERVICE MONITOR
 *  apps-script.gs · Google Apps Script Backend
 *
 *  INSTRUCCIONES DE DESPLIEGUE:
 *  1. Abre Google Sheets → Extensiones → Apps Script
 *  2. Pega este código y guarda
 *  3. Despliega → Nueva implementación → Aplicación web
 *  4. Acceso: Cualquier persona
 *  5. Copia la URL generada y pégala en app.js → APPS_SCRIPT_URL
 * ═══════════════════════════════════════════════════════
 */

const SHEET_NAME = 'Servicios SAL';
const FEEDBACK_SHEET = 'Feedback Pasajeros';

// ── COLUMN HEADERS ─────────────────────────────────────
const HEADERS = [
  'Número de Reporte',
  'Usuario',
  'Rol',
  'Número de Vuelo',
  'Tipo de Servicio',
  'Pasajero',
  'Estado',
  'Fecha Creación',
  'Hora Creación',
  'Fecha Asignación',
  'Hora Asignación',
  'Min. desde Creación',
  'Fecha Inicio Servicio',
  'Hora Inicio Servicio',
  'Min. hasta Inicio',
  'Fecha Fin Servicio',
  'Hora Fin Servicio',
  'Min. de Servicio',
  'Descripción Incidente',
  'Tiene Foto',
  'Fecha Reporte Incidente',
  'Hora Reporte Incidente',
  'Fecha Retorno',
  'Hora Retorno',
  'Min. hasta Retorno',
  'Duración Total (min)',
  'Tiempo Ciclo Completo (min)',
  'Estatus',
  'Última Actualización'
];

// ── GET: Handle OPTIONS preflight ─────────────────────
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', service: 'Avianca SAL WC Monitor' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── POST: Receive service data ─────────────────────────
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    if (data.type === 'feedback') {
      saveFeedback(data);
    } else {
      saveService(data);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── SAVE SERVICE ──────────────────────────────────────
function saveService(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  // Create sheet if doesn't exist
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    setupServiceSheet(sheet);
  }

  const reportNum = data.reportNum;
  const now = new Date();
  const nowDate = formatDate(now);
  const nowTime = formatTime(now);

  // Check if row already exists (update) or insert new
  const existingRow = findRowByReportNum(sheet, reportNum);

  const rowData = [
    reportNum,
    data.user || '',
    data.role || '',
    data.flight || '',
    data.type || '',
    data.passenger || '',
    data.status || 'En Proceso',
    data.createdDate || '',
    data.createdTime || '',
    data.assignedDate || '',
    data.assignedTime || '',
    data.minFromCreation || '',
    data.startDate || '',
    data.startTime || '',
    data.minToStart || '',
    data.endDate || '',
    data.endTime || '',
    data.minService || '',
    data.incidentDesc || '',
    data.hasPhoto || 'NO',
    data.incidentDate || '',
    data.incidentTime || '',
    data.returnDate || '',
    data.returnTime || '',
    data.minToReturn || '',
    data.totalDuration || '',
    data.fullCycle || '',
    data.estatus || 'En Proceso',
    nowDate + ' ' + nowTime
  ];

  if (existingRow > 0) {
    // Update existing row
    sheet.getRange(existingRow, 1, 1, rowData.length).setValues([rowData]);
    formatRow(sheet, existingRow, data.estatus);
  } else {
    // Append new row
    sheet.appendRow(rowData);
    const lastRow = sheet.getLastRow();
    formatRow(sheet, lastRow, data.estatus);
  }
}

// ── SAVE FEEDBACK ─────────────────────────────────────
function saveFeedback(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(FEEDBACK_SHEET);

  if (!sheet) {
    sheet = ss.insertSheet(FEEDBACK_SHEET);
    sheet.getRange(1, 1, 1, 8).setValues([[
      'ID Servicio', 'Calificación General', 'Tiempo Espera',
      'Amabilidad Agente', 'Comentarios', 'Idioma', 'Fecha', 'Hora'
    ]]);
    sheet.getRange(1, 1, 1, 8).setBackground('#E8001D').setFontColor('white').setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  const now = new Date();
  sheet.appendRow([
    data.serviceId || '',
    data.overall || '',
    data.time || '',
    data.kind || '',
    data.comments || '',
    data.lang || 'es',
    formatDate(now),
    formatTime(now)
  ]);
}

// ── HELPERS ───────────────────────────────────────────
function setupServiceSheet(sheet) {
  // Headers
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);

  // Style header row
  const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
  headerRange.setBackground('#020818');
  headerRange.setFontColor('#FF6600');
  headerRange.setFontWeight('bold');
  headerRange.setFontFamily('Courier New');
  headerRange.setFontSize(9);

  // Freeze header
  sheet.setFrozenRows(1);

  // Column widths
  sheet.setColumnWidth(1, 180);  // Report Num
  sheet.setColumnWidth(2, 120);  // User
  sheet.setColumnWidth(3, 100);  // Role
  sheet.setColumnWidth(4, 100);  // Flight
  sheet.setColumnWidth(5, 160);  // Type
  sheet.setColumnWidth(6, 160);  // Passenger
  sheet.setColumnWidth(7, 100);  // Status

  // Auto-resize others
  for (let i = 8; i <= HEADERS.length; i++) {
    sheet.setColumnWidth(i, 110);
  }
}

function findRowByReportNum(sheet, reportNum) {
  if (!reportNum) return -1;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === reportNum) return i + 1;
  }
  return -1;
}

function formatRow(sheet, row, status) {
  const range = sheet.getRange(row, 1, 1, HEADERS.length);

  if (status === 'Completado') {
    range.setBackground('#E8F5E9');
    sheet.getRange(row, 7).setBackground('#00C853').setFontColor('white').setFontWeight('bold');
  } else {
    if (row % 2 === 0) range.setBackground('#FFF9F0');
    sheet.getRange(row, 7).setBackground('#FF8F00').setFontColor('white').setFontWeight('bold');
  }
}

function formatDate(date) {
  return Utilities.formatDate(date, 'America/El_Salvador', 'dd/MM/yyyy');
}

function formatTime(date) {
  return Utilities.formatDate(date, 'America/El_Salvador', 'HH:mm:ss');
}

// ── DAILY REPORT (optional trigger) ──────────────────
function sendDailyReport() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return;

  const today = formatDate(new Date());
  const data = sheet.getDataRange().getValues();
  const todayRows = data.slice(1).filter(row => row[7] === today);

  const total = todayRows.length;
  const completed = todayRows.filter(row => row[27] === 'Completado').length;
  const inProcess = total - completed;

  const avgDuration = todayRows
    .filter(row => row[17] !== '')
    .reduce((sum, row) => sum + (parseFloat(row[17]) || 0), 0) / (completed || 1);

  const subject = `Reporte Diario SAL · Servicios de Silla de Ruedas · ${today}`;
  const body = `
=== REPORTE DIARIO DE SERVICIOS DE SILLA DE RUEDAS ===
Aeropuerto Internacional Monseñor Óscar Arnulfo Romero (SAL)

Fecha: ${today}
─────────────────────────────────────
Total de servicios:     ${total}
Completados:            ${completed}
En proceso:             ${inProcess}
Duración promedio:      ${avgDuration.toFixed(1)} min
─────────────────────────────────────

Ver reporte completo en Google Sheets:
${ss.getUrl()}

— Sistema de Monitoreo Avianca SAL
  `;

  // Send email to sheet owner
  MailApp.sendEmail({
    to: Session.getActiveUser().getEmail(),
    subject: subject,
    body: body
  });
}

// ── SET UP DAILY TRIGGER ──────────────────────────────
function createDailyTrigger() {
  // Delete existing triggers
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));

  // Create daily trigger at 11:55 PM (El Salvador time = UTC-6)
  ScriptApp.newTrigger('sendDailyReport')
    .timeBased()
    .atHour(23)
    .nearMinute(55)
    .everyDays(1)
    .create();
}

// ── MANUAL TEST ───────────────────────────────────────
function testInsert() {
  saveService({
    reportNum: 'SAL-20240101-001',
    user: 'demo',
    role: 'Agente SAL',
    flight: 'AV123',
    type: 'sala',
    passenger: 'Juan Pérez',
    status: 'En Proceso',
    createdDate: '01/01/2024',
    createdTime: '08:30:00',
    estatus: 'En Proceso'
  });
  Logger.log('Test insert completed');
}
