# Confirmación de asistencia: cómo montarla para cada evento

Tiempo: unos 10 minutos la primera vez, 5 después.

La invitación no guarda la lista de invitados. Le pregunta a una hoja de Google, a través de un Apps Script que hace de mensajero, y ese mensajero solo devuelve el nombre y el cupo del código que se pide.

## 1. Crear la hoja (desde la cuenta de Google del negocio)

1. Crea una hoja de cálculo nueva en Google Sheets. Nómbrala, por ejemplo, `Boda Ana y Carlos – Confirmaciones`.
2. Menú **Extensiones › Apps Script**.
3. Borra lo que trae el editor, pega todo el contenido de `apps-script/Codigo.gs` y guarda (ícono de disquete).
4. Arriba, en el selector de funciones, elige **setupSheet** y dale **Ejecutar**.
   - La primera vez Google pide permisos: **Revisar permisos › tu cuenta › Configuración avanzada › Ir a (proyecto) › Permitir**. Es tu propio script, por eso sale la advertencia.
5. Vuelve a la hoja y recárgala (F5): ya tiene las pestañas **Panel**, **Invitados** y **Respuestas**, y un menú nuevo llamado **Invitaciones**.
6. Menú **Invitaciones › Paleta de colores**: elige la paleta de la invitación del cliente.

## 2. Publicar el mensajero (Aplicación web)

1. En el editor de Apps Script: **Implementar › Nueva implementación**.
2. Tipo (ícono de engranaje): **Aplicación web**.
3. **Ejecutar como:** Yo. **Quién tiene acceso:** Cualquier persona.
4. **Implementar** y copia la **URL de la aplicación web** (termina en `/exec`).
5. Pégala en `js/config.js` del repositorio del cliente:

```js
rsvp: {
  scriptUrl: "https://script.google.com/macros/s/AKfy.../exec",
  deadline: "Confirma antes del 15 de noviembre"
},
```

6. En ese mismo `config.js`, deja `DEMO_GUESTS` vacío: `const DEMO_GUESTS = {};`

"Cualquier persona" significa que cualquiera puede *usar* el mensajero, no ver la hoja. La hoja sigue siendo privada; el mensajero solo responde por un código exacto.

## 3. Cargar los invitados

1. Pestaña **Invitados**: pega la lista en las columnas
   - **B** Invitación: el nombre que verá el invitado (`Familia Gómez`, `Ana y Carlos`)
   - **C** Cupo: cuántas personas puede llevar esa invitación
   - **D** Teléfono (opcional, para enviarle el enlace)
2. Pestaña **Panel**, celda amarilla arriba a la derecha (**H3**, "Enlace de la invitación"): pega el enlace de la invitación publicada (ej. `https://ana-carlos-7f3k.pages.dev/`).
3. Menú **Invitaciones › 2. Generar códigos y enlaces**. La columna **A** se llena con códigos y la **E** con el enlace de cada invitado.

Si después agregas invitados, vuelve a correr "Generar códigos": solo crea códigos para las filas nuevas. **Nunca cambies un código que ya enviaste.**

## 4. Probar antes de entregar

1. Abre uno de los enlaces de la columna E: debe aparecer el nombre en el pase de abordar.
2. Confirma desde la invitación y revisa que aparezca la fila en **Respuestas** y se actualice el **Panel**.
3. Vuelve a confirmar con el mismo enlace: la fila se actualiza, no se duplica.
4. Borra esa fila de prueba de **Respuestas**.
5. Pruebas de siempre: iPhone, Android, datos móviles y sin sesión iniciada.

## 5. Entregar a la pareja

- Comparte la hoja con la pareja como **Lector** (solo ver). Nunca la compartas como "cualquier persona con el enlace".
- Pásales la columna E (enlaces) para que los envíen por WhatsApp.
- El **Panel** les muestra en tiempo real quién confirmó, cuántas personas van, quién falta y las dietas o alergias.

## Diseño de la hoja

**Paleta:** menú **Invitaciones › Paleta de colores** y elige la misma de la invitación (Rosa vino, Salvia y dorado, Azul marino y arena o Terracota y arena). La hoja se repinta sola. Si no eliges ninguna, queda en Rosa vino.

"Preparar la hoja / actualizar diseño" se puede correr las veces que quieras: arma el tablero del Panel (tarjetas, quién falta, dietas y mensajes), los colores de Sí / No / Pendiente y las fuentes de la marca, **sin borrar invitados ni respuestas** y conservando el enlace ya pegado.

## Si cambias el código del script

Cada vez que edites `Codigo.gs` hay que publicar una versión nueva: **Implementar › Gestionar implementaciones › lápiz › Versión: Nueva versión › Implementar**. La URL no cambia.
