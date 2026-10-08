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

/* ---------- Paletas (las mismas de css/variables.css) ----------
   Si agregas o cambias una paleta en la invitación, cámbiala aquí
   también para que la hoja combine. */
const PALETTES = {
  rosa:      { name: "Rosa vino",          dark: "#401e1d", main: "#a98583", accent: "#c99a96", light: "#f3e7e2" },
  salvia:    { name: "Salvia y dorado",    dark: "#2e3a2c", main: "#8c9a7e", accent: "#b08d57", light: "#f3f0e7" },
  marino:    { name: "Azul marino y arena", dark: "#1d2b40", main: "#7d93ad", accent: "#b8916a", light: "#f4f0e8" },
  terracota: { name: "Terracota y arena",  dark: "#4a2318", main: "#b4735a", accent: "#c0835a", light: "#f7eee6" }
};
const DEFAULT_THEME = "rosa";

// Colores fijos de estado (iguales en todas las paletas, para que se lean igual)
const STATUS = {
  yes: { bg: "#e4eedf", text: "#2f5a2b" },
  no: { bg: "#f6dedb", text: "#8a2c22" },
  pending: { bg: "#f8eed8", text: "#7a5a12" }
};

// Estilo completo a partir de la paleta guardada en la hoja
function getStyle_() {
  const saved = PropertiesService.getDocumentProperties().getProperty("theme");
  const p = PALETTES[saved] || PALETTES[DEFAULT_THEME];
  return {
    dark: p.dark,
    main: p.main,
    accent: p.accent,
    soft: mixHex_(p.light, p.main, 0.25),     // texto suave sobre la tarjeta oscura
    light: mixHex_("#ffffff", p.light, 0.7),  // fondo de tarjetas y filas alternas
    white: "#ffffff",
    quiet: mixHex_(p.dark, p.main, 0.55),     // textos secundarios
    yes: STATUS.yes,
    no: STATUS.no,
    pending: STATUS.pending,
    titleFont: "Alegreya",
    bodyFont: "Josefin Sans"
  };
}

// Mezcla dos colores hex: amount = cuánto de "b" (0 a 1)
function mixHex_(a, b, amount) {
  const ca = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16));
  const cb = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16));
  return "#" + ca.map((v, i) => Math.round(v + (cb[i] - v) * amount)
    .toString(16).padStart(2, "0")).join("");
}

/* ---------- Cambiar paleta desde el menú ---------- */
function setTheme_(theme) {
  PropertiesService.getDocumentProperties().setProperty("theme", theme);
  setupSheet(true);
}
function themeRosa() { setTheme_("rosa"); }
function themeSalvia() { setTheme_("salvia"); }
function themeMarino() { setTheme_("marino"); }
function themeTerracota() { setTheme_("terracota"); }

const URL_RANGE_NAME = "URL_INVITACION";
const URL_PLACEHOLDER = "https://pega-aqui-el-enlace.pages.dev/";

/* ---------- Menú dentro de la hoja ---------- */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("Invitaciones")
    .addItem("1. Preparar la hoja / actualizar diseño", "setupSheet")
    .addItem("2. Generar códigos y enlaces", "generateCodes")
    .addSeparator()
    .addSubMenu(ui.createMenu("Paleta de colores")
      .addItem(PALETTES.rosa.name, "themeRosa")
      .addItem(PALETTES.salvia.name, "themeSalvia")
      .addItem(PALETTES.marino.name, "themeMarino")
      .addItem(PALETTES.terracota.name, "themeTerracota"))
    .addToUi();
}

/* ---------- 1. Preparar la hoja ----------
   Se puede correr las veces que quieras: arma o repara las
   pestañas y el diseño, sin borrar invitados ni respuestas. */
function setupSheet(quiet) {
  const STYLE = getStyle_();
  const ss = SpreadsheetApp.getActive();
  const invitationUrl = readInvitationUrl_(ss);

  const guests = getOrCreateSheet_(ss, SHEETS.guests);
  const responses = getOrCreateSheet_(ss, SHEETS.responses);
  const panel = getOrCreateSheet_(ss, SHEETS.panel);

  buildPanel_(ss, panel, invitationUrl);
  buildGuests_(guests);
  buildResponses_(responses);

  // Orden y color de pestañas: Panel, Invitados, Respuestas
  ss.setActiveSheet(panel); ss.moveActiveSheet(1);
  ss.setActiveSheet(guests); ss.moveActiveSheet(2);
  ss.setActiveSheet(responses); ss.moveActiveSheet(3);
  panel.setTabColor(STYLE.dark);
  guests.setTabColor(STYLE.main);
  responses.setTabColor(STYLE.accent);
  ss.setActiveSheet(panel);

  // Borra la "Hoja 1" vacía que trae toda hoja nueva
  ss.getSheets().forEach(sheet => {
    if (!Object.values(SHEETS).includes(sheet.getName()) && sheet.getLastRow() === 0) {
      ss.deleteSheet(sheet);
    }
  });

  if (quiet === true) {
    ss.toast("Listo ✓", "Paleta aplicada", 4);
    return;
  }
  SpreadsheetApp.getUi().alert(
    "Hoja lista ✓\n\n1) Pega la lista en la pestaña Invitados (columnas B, C y D).\n" +
    "2) Pega el enlace de la invitación en el Panel, arriba a la derecha (celda amarilla).\n" +
    "3) Usa el menú Invitaciones > Generar códigos y enlaces."
  );
}

/* Panel: tablero para la pareja */
function buildPanel_(ss, panel, invitationUrl) {
  const STYLE = getStyle_();
  panel.clear();
  panel.clearConditionalFormatRules();
  panel.getRange(1, 1, panel.getMaxRows(), panel.getMaxColumns()).breakApart();
  panel.setHiddenGridlines(true);
  panel.setFrozenRows(0);

  const all = panel.getRange(1, 1, panel.getMaxRows(), panel.getMaxColumns());
  all.setFontFamily(STYLE.bodyFont).setFontColor(STYLE.dark).setBackground(STYLE.white)
     .setVerticalAlignment("middle");

  // Columnas: margen | tarjeta | espacio | tarjeta | espacio | tarjeta | espacio | tarjeta
  [24, 220, 20, 220, 20, 220, 20, 240].forEach((width, i) => panel.setColumnWidth(i + 1, width));
  panel.setRowHeight(1, 16);

  // Título
  panel.getRange("B2:F2").merge().setValue("Panel de confirmaciones")
    .setFontFamily(STYLE.titleFont).setFontSize(24).setFontWeight("bold");
  panel.setRowHeight(2, 44);
  panel.getRange("B3:F3").merge()
    .setValue("Se actualiza solo cada vez que un invitado confirma desde la invitación.")
    .setFontSize(10).setFontColor(STYLE.quiet);

  // Ajuste: enlace de la invitación (arriba a la derecha)
  panel.getRange("H2").setValue("ENLACE DE LA INVITACIÓN")
    .setFontSize(8).setFontWeight("bold").setFontColor(STYLE.quiet).setVerticalAlignment("bottom");
  const urlCell = panel.getRange("H3");
  urlCell.setValue(invitationUrl).setFontSize(9).setBackground("#fff6d9")
    .setWrap(false).setHorizontalAlignment("left");
  if (ss.getRangeByName(URL_RANGE_NAME)) ss.removeNamedRange(URL_RANGE_NAME);
  ss.setNamedRange(URL_RANGE_NAME, urlCell);

  panel.setRowHeight(4, 18);

  // Tarjetas: etiqueta / número / detalle
  const cards = [
    { col: "B", label: "PERSONAS QUE ASISTEN", value: '=SUMIF(Respuestas!D2:D,"Sí",Respuestas!E2:E)',
      detail: '="de "&SUM(Invitados!C2:C)&" lugares reservados"', highlight: true },
    { col: "D", label: "RESPONDIERON", value: "=COUNTA(Respuestas!B2:B)",
      detail: '="de "&COUNTA(Invitados!A2:A)&" invitaciones"' },
    { col: "F", label: "FALTAN POR RESPONDER", value: "=COUNTA(Invitados!A2:A)-COUNTA(Respuestas!B2:B)",
      detail: '="invitaciones sin respuesta"' },
    { col: "H", label: "NO ASISTEN", value: '=COUNTIF(Respuestas!D2:D,"No")',
      detail: '="invitaciones"' }
  ];
  cards.forEach(card => {
    const bg = card.highlight ? STYLE.dark : STYLE.light;
    const fg = card.highlight ? STYLE.white : STYLE.dark;
    const sub = card.highlight ? STYLE.soft : STYLE.quiet;
    panel.getRange(`${card.col}5`).setValue(card.label)
      .setFontSize(8).setFontWeight("bold").setFontColor(sub).setBackground(bg)
      .setVerticalAlignment("bottom");
    panel.getRange(`${card.col}6`).setFormula(card.value)
      .setFontFamily(STYLE.titleFont).setFontSize(30).setFontWeight("bold")
      .setFontColor(fg).setBackground(bg).setHorizontalAlignment("left");
    panel.getRange(`${card.col}7`).setFormula(card.detail)
      .setFontSize(9).setFontColor(sub).setBackground(bg).setVerticalAlignment("top");
  });
  panel.setRowHeight(5, 28);
  panel.setRowHeight(6, 52);
  panel.setRowHeight(7, 28);
  panel.setRowHeight(8, 28);

  // Listas
  const lists = [
    { col: "B", title: "Quién falta por responder",
      formula: '=IFERROR(SORT(FILTER(Invitados!B2:B,Invitados!F2:F="Pendiente")),"¡Todos respondieron!")' },
    { col: "D", title: "Dietas o alergias",
      formula: '=IFERROR(FILTER(Respuestas!C2:C&": "&Respuestas!F2:F,Respuestas!F2:F<>"",Respuestas!D2:D="Sí"),"Ninguna por ahora")' },
    { col: "F", title: "Mensajes para ustedes",
      formula: '=IFERROR(FILTER(Respuestas!C2:C&": "&Respuestas!G2:G,Respuestas!G2:G<>""),"Aún no hay mensajes")' }
  ];
  lists.forEach(list => {
    panel.getRange(`${list.col}9`).setValue(list.title)
      .setFontFamily(STYLE.titleFont).setFontSize(13).setFontWeight("bold")
      .setBorder(null, null, true, null, null, null, STYLE.accent, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
    panel.getRange(`${list.col}10`).setFormula(list.formula);
    panel.getRange(`${list.col}10:${list.col}300`).setFontSize(10).setVerticalAlignment("top");
  });
  panel.setRowHeight(9, 34);
  // Los mensajes pueden ser largos: que bajen de línea
  panel.getRange("F10:F300").setWrap(true);
}

/* Invitados: lo llenas tú (nombre, cupo, teléfono). Código, enlace y
   respuesta se llenan solos. */
function buildGuests_(guests) {
  const STYLE = getStyle_();
  guests.getRange("A1:F1").setValues([[
    "Código", "Invitación (nombre que ve el invitado)", "Cupo", "Teléfono", "Enlace", "Respuesta"
  ]]);
  guests.getRange("E2").setFormula(
    `=ARRAYFORMULA(IF(A2:A="","",${URL_RANGE_NAME}&"?inv="&A2:A))`
  );
  guests.getRange("F2").setFormula(
    '=ARRAYFORMULA(IF(A2:A="","",IFERROR(VLOOKUP(A2:A,{Respuestas!B2:B,Respuestas!D2:D},2,FALSE),"Pendiente")))'
  );

  styleTable_(guests, 6);
  [130, 300, 70, 140, 420, 110].forEach((width, i) => guests.setColumnWidth(i + 1, width));
  guests.getRange("A2:A").setFontColor(STYLE.quiet).setFontSize(9);
  guests.getRange("C2:C").setHorizontalAlignment("center");
  guests.getRange("E2:E").setFontColor(STYLE.quiet).setFontSize(9);
  guests.getRange("F2:F").setHorizontalAlignment("center").setFontWeight("bold");

  // El cupo solo acepta números del 1 al 30
  guests.getRange("C2:C").setDataValidation(
    SpreadsheetApp.newDataValidation().requireNumberBetween(1, 30)
      .setHelpText("Cupo: cuántas personas puede llevar esta invitación (1 a 30).")
      .setAllowInvalid(false).build()
  );

  guests.setConditionalFormatRules(statusRules_(guests.getRange("F2:F"), ["Sí", "No", "Pendiente"]));
}

/* Respuestas: la llena el script. No la edites a mano. */
function buildResponses_(responses) {
  const STYLE = getStyle_();
  responses.getRange("A1:G1").setValues([[
    "Fecha", "Código", "Invitación", "¿Asiste?", "Personas", "Dieta o alergias", "Mensaje"
  ]]);
  styleTable_(responses, 7);
  [150, 120, 240, 90, 90, 220, 380].forEach((width, i) => responses.setColumnWidth(i + 1, width));
  responses.getRange("A2:A").setNumberFormat("d mmm yyyy, h:mm").setFontColor(STYLE.quiet);
  responses.getRange("B2:B").setFontColor(STYLE.quiet).setFontSize(9);
  responses.getRange("D2:E").setHorizontalAlignment("center");
  responses.getRange("D2:D").setFontWeight("bold");
  responses.getRange("F2:G").setWrap(true);
  responses.getRange("A2:G").setVerticalAlignment("top");

  responses.setConditionalFormatRules(statusRules_(responses.getRange("D2:D"), ["Sí", "No"]));
}

/* Encabezado oscuro, filas alternadas y fuente de la marca */
function styleTable_(sheet, columns) {
  const STYLE = getStyle_();
  sheet.getBandings().forEach(banding => banding.remove());
  sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns())
    .setFontFamily(STYLE.bodyFont).setFontColor(STYLE.dark);

  const header = sheet.getRange(1, 1, 1, columns);
  header.setFontWeight("bold").setFontColor(STYLE.white).setBackground(STYLE.dark)
    .setVerticalAlignment("middle");
  sheet.setRowHeight(1, 36);
  sheet.setFrozenRows(1);

  const banding = sheet.getRange(1, 1, sheet.getMaxRows(), columns)
    .applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, true, false);
  banding.setHeaderRowColor(STYLE.dark)
    .setFirstRowColor(STYLE.white)
    .setSecondRowColor(STYLE.light);
}

/* Colores para Sí / No / Pendiente */
function statusRules_(range, values) {
  const STYLE = getStyle_();
  const colors = { "Sí": STYLE.yes, "No": STYLE.no, "Pendiente": STYLE.pending };
  return values.map(value => SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo(value)
    .setBackground(colors[value].bg)
    .setFontColor(colors[value].text)
    .setRanges([range])
    .build());
}

/* Conserva el enlace ya pegado al volver a correr "Preparar la hoja"
   (también lo rescata de la versión anterior, que lo tenía en Panel!B2) */
function readInvitationUrl_(ss) {
  const named = ss.getRangeByName(URL_RANGE_NAME);
  const candidates = [];
  if (named) candidates.push(named.getValue());
  const panel = ss.getSheetByName(SHEETS.panel);
  if (panel) candidates.push(panel.getRange("B2").getValue());
  const found = candidates.map(String).find(v => /^(https?|file):\/\//.test(v) && v !== URL_PLACEHOLDER);
  return found || URL_PLACEHOLDER;
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
