# Invitación web de ejemplo · Pasaporte

Invitación de boda interactiva de muestra, diseñada por [@maparisti](https://www.instagram.com/maparisti/).
Los nombres, invitados y enlaces son ficticios.

## Cómo probarla

- Sin código: `index.html` → muestra "Invitado especial".
- Con invitado de prueba: `index.html?inv=ej7Hq2Lm9Xa4` (también `ej3Rt8Pw5Kd1` y `ej9Vb4Nc6Zs2`). En modo demo puedes confirmar, pero no se guarda.

## Qué se cambia por cliente

Todo está en **`js/config.js`** (el único archivo que se edita por cliente):

- `theme`: paleta de colores → `"rosa"`, `"salvia"`, `"marino"` o `"terracota"`.
- `customColors`: colores puntuales a la medida (opcional).
- `names`: nombres de la pareja (tarjeta final y favicon).
- `music`: canción de fondo (archivo en `audio/`, segundo de inicio y volumen). Suena al tocar la portada. Solo música libre de derechos.
- `rsvp.scriptUrl`: URL del Apps Script de la hoja de Google del evento (vacía = modo demo). `rsvp.deadline`: fecha límite para confirmar.
- `albumUrl`: enlace del álbum; el código QR se genera solo.
- `defaultPassengers`: texto cuando no hay código de invitado.

Para mostrar otra paleta sin tocar nada: agrega `?tema=salvia` (o `marino`, `terracota`) al enlace.

En las invitaciones reales, la lista de invitados no va en el sitio: se consulta a una hoja de Google mediante Apps Script, y la confirmación se guarda ahí. Paso a paso en `apps-script/LEEME.md`.

## Cómo funcionan los colores

- `css/variables.css`: las paletas. Cada una tiene 6 colores con un rol fijo (dark, secondary, main, accent, soft, light).
- `js/dibujos.js`: todos los dibujos SVG (olas, íconos, mapa, monumentos...). Están dentro de la página para poder pintarlos con la paleta.
- Texturas (`assets/*-texture-gray.webp`): están en gris y se tiñen con `background-blend-mode: multiply`.
- `diseno-fuente/`: los SVG originales, solo como referencia (la página no los usa).

Por cliente siguen siendo archivos propios: las fotos y el sello de la portada (`assets/sellokj.svg`).

## Estructura

```
index.html
css/  reset.css · variables.css (paletas) · global.css
js/   config.js (cliente) · dibujos.js · main.js · qrcode.min.js
assets/  fotos, texturas y sello
audio/   canción de fondo
diseno-fuente/  SVG originales (referencia)
apps-script/    código de la hoja de Google (confirmación) + instrucciones
```

## Créditos de fotos

Fotos de [Unsplash](https://unsplash.com) bajo la [Licencia Unsplash](https://unsplash.com/license) (uso gratuito, sin atribución obligatoria):

| Archivo | Autor/a | Foto |
|---|---|---|
| couple-photo.webp | Jonathan Borba | [aC5_EFhq7Fs](https://unsplash.com/photos/aC5_EFhq7Fs) |
| dance-1.webp | Alvin Mahmudov | [NSVJAAXOYHs](https://unsplash.com/photos/NSVJAAXOYHs) |
| dance-2.webp | Luwadlin Bosman | [P_HRPYpFTNA](https://unsplash.com/photos/P_HRPYpFTNA) |
| memory-1.webp | Eugenia Pan'kiv | [1Bs2sZ9fD2Q](https://unsplash.com/photos/1Bs2sZ9fD2Q) |
| memory-2.webp | Foto Pettine | [IfjHaIoAoqE](https://unsplash.com/photos/IfjHaIoAoqE) |
| memory-3.webp | Katelyn MacMillan | [MtwNya-3mac](https://unsplash.com/photos/MtwNya-3mac) |
| memory-4.webp | Nguyễn Tân | [6yIJ8PY9rzs](https://unsplash.com/photos/6yIJ8PY9rzs) |
| memory-5.webp | Timo Stern | [EvcUtLF12XQ](https://unsplash.com/photos/EvcUtLF12XQ) |
| memory-6.webp | Vidar Nordli-Mathisen | [loTTPqOed7c](https://unsplash.com/photos/loTTPqOed7c) |
| final-card-photo.webp | Joe Yates | [wNOymf_yTUA](https://unsplash.com/photos/wNOymf_yTUA) |

## Música

`audio/cancion.mp3`: "Wedding Romantic Love Music" de andriig, en [Pixabay](https://pixabay.com/music/wedding-wedding-romantic-love-music-471301/) bajo la [Licencia de contenido de Pixabay](https://pixabay.com/service/license-summary/) (uso gratuito, sin atribución obligatoria). Comprimida a 96 kbps (~1,5 MB).

## Librerías

- [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) de Kazuhiko Arase (licencia MIT), en `js/qrcode.min.js`.
