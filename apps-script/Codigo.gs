/* =========================================================
   CONFIRMACIÓN DE ASISTENCIA · Nos vemos, Paloma
   ---------------------------------------------------------
   Este código va en la hoja de Google de cada evento
   (Extensiones > Apps Script). Hace tres cosas:

   1. Prepara la hoja: crea las pestañas Invitados,
      Respuestas y Panel con sus títulos y fórmulas.
   2. Genera un código largo para cada invitación
      (menú "Invitaciones > Generar códigos y enlaces").
   3. Es el "mensajero" entre la invitación web y la hoja:
      - GET  ?action=guest&code=XXXX → devuelve SOLO el
        nombre y el cupo de ese código (y su respuesta si ya
        confirmó). Nunca la lista completa.
      - POST { action:"rsvp", code, attending, people, diet,
        message } → guarda o actualiza la respuesta.

   Se publica como "Aplicación web" (ver instrucciones en
   apps-script/LEEME.md). No hace falta editar nada aquí.
   ========================================================= */

const SHEETS = {
  guests: "Invitados",
  responses: "Respuestas",
  panel: "Panel"
};

// Letras y números sin los que se confunden (0/O, 1/l/I)
const CODE_CHARS = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 12;

/* ---------- Menú dentro de la hoja ---------- */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Invitaciones")
    .addItem("1. Preparar la hoja", "setupSheet")
    .addItem("2. Generar códigos y enlaces", "generateCodes")
    .addToUi();
}

/* ---------- 1. Preparar la hoja (se corre una sola vez) ---------- */
function setupSheet() {
  const ss = SpreadsheetApp.getActive();

  // Invitados: lo llenas tú (nombre, cupo, teléfono). Código, enlace
  // y respuesta se llenan solos.
  const guests = getOrCreateSheet_(ss, SHEETS.guests);
  guests.getRange("A1:F1").setValues([[
    "Código", "Invitación (nombre que ve el invitado)", "Cupo", "Teléfono", "Enlace", "Respuesta"
  ]]);
  guests.getRange("E2").setFormula(
    '=ARRAYFORMULA(IF(A2:A="","",Panel!$B$2&IF(REGEXMATCH(Panel!$B$2,"\\?"),"&","?")&"inv="&A2:A))'
  );
  guests.getRange("F2").setFormula(
    '=ARRAYFORMULA(IF(A2:A="","",IFERROR(VLOOKUP(A2:A,{Respuestas!B2:B,Respuestas!D2:D},2,FALSE),"Pendiente")))'
  );
  styleHeader_(guests, 6);
  guests.setColumnWidths(1, 1, 130);
  guests.setColumnWidth(2, 280);
  guests.setColumnWidths(3, 2, 110);
  guests.setColumnWidth(5, 360);
  guests.setColumnWidth(6, 110);

  // Respuestas: la llena el script. No la edites a mano.
  const responses = getOrCreateSheet_(ss, SHEETS.responses);
  responses.getRange("A1:G1").setValues([[
    "Fecha", "Código", "Invitación", "¿Asiste?", "Personas", "Dieta o alergias", "Mensaje"
  ]]);
  styleHeader_(responses, 7);
  responses.setColumnWidth(1, 150);
  responses.setColumnWidth(3, 240);
  responses.setColumnWidth(6, 220);
  responses.setColumnWidth(7, 360);

  // Panel: resumen automático para la pareja.
  const panel = getOrCreateSheet_(ss, SHEETS.panel);
  panel.getRange("A1").setValue("Panel de confirmaciones").setFontSize(16).setFontWeight("bold");
  panel.getRange("A2:B2").setValues([["URL de la invitación →", "https://pega-aqui-el-enlace.pages.dev/"]]);
  panel.getRange("B2").setBackground("#fff7d6");
  panel.getRange("A4:B10").setValues([
    ["Invitaciones enviadas", "=COUNTA(Invitados!A2:A)"],
    ["Respondieron", "=COUNTA(Respuestas!B2:B)"],
    ["Faltan por responder", "=B4-B5"],
    ["Invitaciones que SÍ asisten", '=COUNTIF(Respuestas!D2:D,"Sí")'],
    ["Personas que asisten", '=SUMIF(Respuestas!D2:D,"Sí",Respuestas!E2:E)'],
    ["Invitaciones que NO asisten", '=COUNTIF(Respuestas!D2:D,"No")'],
    ["Cupos totales reservados", "=SUM(Invitados!C2:C)"]
  ]);
  panel.getRange("B8").setFontWeight("bold").setFontSize(14);
  panel.getRange("A12").setValue("Quién falta por responder").setFontWeight("bold");
  panel.getRange("A13").setFormula(
    '=IFERROR(FILTER(Invitados!B2:B,Invitados!F2:F="Pendiente"),"¡Todos respondieron!")'
  );
  panel.getRange("C12").setValue("Dietas o alergias").setFontWeight("bold");
  panel.getRange("C13").setFormula(
    '=IFERROR(FILTER(Respuestas!C2:C&": "&Respuestas!F2:F,Respuestas!F2:F<>"",Respuestas!D2:D="Sí"),"Ninguna por ahora")'
  );
  panel.setColumnWidth(1, 260);
  panel.setColumnWidth(2, 260);
  panel.setColumnWidth(3, 320);

  // Orden de pestañas: Panel, Invitados, Respuestas
  ss.setActiveSheet(panel); ss.moveActiveSheet(1);
  ss.setActiveSheet(guests); ss.moveActiveSheet(2);
  ss.setActiveSheet(responses); ss.moveActiveSheet(3);

  // Borra la "Hoja 1" vacía que trae toda hoja nueva
  ss.getSheets().forEach(sheet => {
    if (!Object.values(SHEETS).includes(sheet.getName()) && sheet.getLastRow() === 0) {
      ss.deleteSheet(sheet);
    }
  });

  SpreadsheetApp.getUi().alert(
    "Hoja lista ✓\n\n1) Pega la lista en la pestaña Invitados (columnas B, C y D).\n" +
    "2) Pega el enlace de la invitación en Panel!B2.\n" +
    "3) Usa el menú Invitaciones > Generar códigos y enlaces."
  );
}

/* ---------- 2. Generar códigos (solo a las filas que no tienen) ---------- */
function generateCodes() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEETS.guests);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    SpreadsheetApp.getUi().alert("Primero pega la lista de invitados en la pestaña Invitados.");
    return;
  }
  const range = sheet.getRange(2, 1, lastRow - 1, 2); // columnas A (código) y B (nombre)
  const values = range.getValues();
  const used = new Set(values.map(row => row[0]).filter(String));
  let created = 0;

  values.forEach(row => {
    if (!row[0] && row[1]) {
      let code;
      do { code = randomCode_(); } while (used.has(code));
      used.add(code);
      row[0] = code;
      created++;
    }
  });

  range.setValues(values);
  SpreadsheetApp.getUi().alert(`Listo: ${created} códigos nuevos. Los enlaces están en la columna E.`);
}

/* ---------- 3a. GET: datos de UN invitado ---------- */
function doGet(e) {
  const params = (e && e.parameter) || {};
  if (params.action !== "guest") return json_({ ok: false, error: "accion_invalida" });

  const code = cleanCode_(params.code);
  if (!code) return json_({ ok: false, error: "codigo_invalido" });

  const guest = findGuest_(code);
  if (!guest) return json_({ ok: false, error: "no_encontrado" });

  const previous = findResponse_(code);
  return json_({
    ok: true,
    name: guest.name,
    seats: guest.seats,
    response: previous ? {
      attending: previous.attending,
      people: previous.people,
      diet: previous.diet,
      message: previous.message
    } : null
  });
}

/* ---------- 3b. POST: guardar la confirmación ---------- */
function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: "datos_invalidos" });
  }
  if (data.action !== "rsvp") return json_({ ok: false, error: "accion_invalida" });

  const code = cleanCode_(data.code);
  const guest = code && findGuest_(code);
  if (!guest) return json_({ ok: false, error: "no_encontrado" });

  const attending = data.attending === "si" ? "Sí" : data.attending === "no" ? "No" : null;
  if (!attending) return json_({ ok: false, error: "falta_asistencia" });

  let people = 0;
  if (attending === "Sí") {
    people = Math.floor(Number(data.people));
    if (!(people >= 1 && people <= guest.seats)) {
      return json_({ ok: false, error: "personas_fuera_de_cupo", seats: guest.seats });
    }
  }

  const row = [
    new Date(),
    code,
    guest.name,
    attending,
    people,
    safeText_(data.diet, 200),
    safeText_(data.message, 500)
  ];

  // Evita que dos respuestas al mismo tiempo se pisen
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = SpreadsheetApp.getActive().getSheetByName(SHEETS.responses);
    const existingRow = findResponseRow_(sheet, code);
    if (existingRow) {
      sheet.getRange(existingRow, 1, 1, row.length).setValues([row]); // cambió su respuesta
    } else {
      sheet.appendRow(row);
    }
  } finally {
    lock.releaseLock();
  }

  return json_({ ok: true });
}

/* ---------- Ayudantes ---------- */
function findGuest_(code) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEETS.guests);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  const rows = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
  const row = rows.find(r => String(r[0]) === code);
  if (!row) return null;
  return { name: String(row[1]), seats: Math.max(1, Math.floor(Number(row[2])) || 1) };
}

function findResponseRow_(sheet, code) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  const codes = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
  const index = codes.findIndex(r => String(r[0]) === code);
  return index === -1 ? 0 : index + 2;
}

function findResponse_(code) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEETS.responses);
  const rowNumber = findResponseRow_(sheet, code);
  if (!rowNumber) return null;
  const r = sheet.getRange(rowNumber, 1, 1, 7).getValues()[0];
  return {
    attending: r[3] === "Sí" ? "si" : "no",
    people: Number(r[4]) || 0,
    diet: String(r[5] || "").replace(/^'/, ""),
    message: String(r[6] || "").replace(/^'/, "")
  };
}

function cleanCode_(value) {
  const code = String(value || "").trim();
  return /^[A-Za-z0-9]{8,32}$/.test(code) ? code : "";
}

// Recorta el texto y evita que se interprete como fórmula (=, +, -, @)
function safeText_(value, maxLength) {
  let text = String(value || "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, maxLength);
  if (/^[=+\-@]/.test(text)) text = "'" + text;
  return text;
}

function randomCode_() {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
  }
  return code;
}

function json_(object) {
  return ContentService
    .createTextOutput(JSON.stringify(object))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function styleHeader_(sheet, columns) {
  sheet.getRange(1, 1, 1, columns)
    .setFontWeight("bold")
    .setBackground("#f3e7e2");
  sheet.setFrozenRows(1);
}
