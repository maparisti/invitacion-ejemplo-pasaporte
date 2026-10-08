/* =========================================================
   CONFIGURACIÓN DE LA INVITACIÓN
   ---------------------------------------------------------
   Este es el ÚNICO archivo que se edita por cliente.
   (Por ahora: paleta, nombres, música y enlaces. Los textos
   de las secciones todavía están en index.html.)
   ========================================================= */

const CONFIG = {
  /* ----- Paleta de colores -----
     Opciones: "rosa", "salvia", "marino", "terracota"
     (están definidas en css/variables.css).
     Para mostrarle otra paleta a un cliente sin tocar nada,
     agrega ?tema=salvia al final del enlace. */
  theme: "rosa",

  /* Colores a la medida (opcional). Si un cliente quiere un
     color puntual distinto, ponlo aquí y reemplaza al de la
     paleta. Deja el objeto vacío {} si no hace falta.
     Ejemplo: { main: "#9a7b6f", accent: "#d1a77c" }
     Roles disponibles: dark, secondary, main, accent, soft, light */
  customColors: {},

  /* ----- Pareja ----- */
  names: {
    first: "Karen",
    second: "Juan"
  },

  /* ----- Música -----
     Suena cuando el invitado toca la portada.
     Usa SOLO música libre de derechos (o con licencia del
     cliente). El cliente responde por la canción que entregue.
     file:    ruta del archivo (mp3 o m4a, idealmente < 3 MB)
     startAt: segundo desde el que empieza (0 = desde el inicio)
     volume:  de 0 a 1
     Si "file" queda vacío, el botón de música no aparece. */
  music: {
    file: "audio/cancion.mp3",
    startAt: 0,
    volume: 0.7
  },

  /* ----- Confirmación de asistencia -----
     scriptUrl: la URL de la "Aplicación web" del Apps Script de la
       hoja de Google del evento (termina en /exec). Ver
       apps-script/LEEME.md.
       Si queda vacía, la invitación funciona en MODO DEMO con los
       invitados de prueba de abajo y no guarda nada.
     deadline: texto opcional con la fecha límite para confirmar. */
  rsvp: {
    scriptUrl: "https://script.google.com/macros/s/AKfycbwJodDbN5v3ZKKCXIPyL-Ngbg0JwIDBIARhmi0EbR_7Jbtm7c_1Oa-QkvJU0yUuLcOw/exec",
    deadline: "Confirma antes del 15 de noviembre"
  },

  /* ----- Enlaces ----- */
  // Álbum de fotos. El código QR se genera solo con este enlace.
  albumUrl: "https://www.instagram.com/maparisti/",

  /* ----- Invitados ----- */
  // Texto si alguien abre la invitación sin código.
  defaultPassengers: "Invitado especial"
};

/* Invitados DE PRUEBA (no son personas reales). Solo se usan
   cuando rsvp.scriptUrl está vacío (modo demo).
   Cada enlace usa un código largo: index.html?inv=ej7Hq2Lm9Xa4
   En las invitaciones REALES esto queda vacío: {}
   La lista vive en la hoja de Google, nunca en el sitio. */
const DEMO_GUESTS = {
  ej7Hq2Lm9Xa4: { name: "Ana y Carlos", seats: 2 },
  ej3Rt8Pw5Kd1: { name: "Familia Gómez", seats: 4 },
  ej9Vb4Nc6Zs2: { name: "Daniela", seats: 1 }
};


/* =========================================================
   APLICAR LA PALETA (no hace falta tocar esto)
   Este archivo se carga en el <head>, antes de pintar la
   página, para que no se vean los colores equivocados ni
   por un instante.
   ========================================================= */
(function applyTheme() {
  const validThemes = ["rosa", "salvia", "marino", "terracota"];
  const urlTheme = new URLSearchParams(window.location.search).get("tema");
  const theme = validThemes.includes(urlTheme) ? urlTheme : CONFIG.theme;

  const root = document.documentElement;
  root.dataset.theme = theme;

  // Colores a la medida: sobrescriben la variable de ese rol
  Object.entries(CONFIG.customColors || {}).forEach(([role, value]) => {
    root.style.setProperty(`--color-${role}`, value);
  });
})();
