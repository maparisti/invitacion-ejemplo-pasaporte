/* =========================================================
   LÓGICA DE LA INVITACIÓN
   Los datos del cliente (CONFIG y DEMO_GUESTS) están en
   js/config.js. Este archivo no se toca por cliente.
   ========================================================= */

/* Lee un color de la paleta activa, ej: getThemeColor("main") */
function getThemeColor(role) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(`--color-${role}`)
    .trim();
}

document.addEventListener("DOMContentLoaded", () => {
  const pageLoader = document.getElementById("pageLoader");

  /* ===== PORTADA / ABRIR INVITACIÓN ===== */
  document.body.classList.add("invitation-locked");
  document.body.classList.remove("invitation-open");

  const openInvitationButton = document.getElementById("openInvitation");
  const invitationContent = document.getElementById("invitationContent");
  const passportCover = document.querySelector(".passport-cover");

  /* ===== CONTADOR (etiqueta de equipaje) =====
     Cuenta regresiva hasta CONFIG.eventDate. El día del evento
     muestra un mensaje, y después otro de agradecimiento. */
  const countdown = document.getElementById("countdown");
  const eventTime = Date.parse(CONFIG.eventDate || "");

  if (countdown && Number.isNaN(eventTime)) {
    countdown.hidden = true; // sin fecha válida, no se muestra
  } else if (countdown) {
    const board = document.getElementById("countdownBoard");
    const label = document.getElementById("countdownLabel");
    const message = document.getElementById("countdownMessage");
    const numbers = {};
    board.querySelectorAll("[data-unit]").forEach(el => { numbers[el.dataset.unit] = el; });

    // Código y fecha de la etiqueta. La fecha se toma tal cual está
    // escrita en eventDate (día y mes del lugar del evento).
    const months = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
    const [, month, day] = CONFIG.eventDate.slice(0, 10).split("-").map(Number);
    document.getElementById("countdownCode").textContent = CONFIG.airportCode || "";
    document.getElementById("countdownDate").textContent = `${day} ${months[month - 1]}`;

    const pad = n => String(n).padStart(2, "0");
    let timerId = null;

    function showMessage(labelText, text) {
      board.hidden = true;
      label.textContent = labelText;
      message.textContent = text;
      message.hidden = false;
      clearInterval(timerId);
    }

    function tick() {
      const diff = eventTime - Date.now();

      if (diff <= 0) {
        // Hasta 24 h después del inicio: es "hoy"
        if (diff > -24 * 60 * 60 * 1000) {
          showMessage("HOY DESPEGAMOS", "¡Es el gran día!");
        } else {
          showMessage("VUELO COMPLETADO", "Gracias por viajar con nosotros");
        }
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);
      numbers.days.textContent = Math.floor(totalSeconds / 86400);
      numbers.hours.textContent = pad(Math.floor(totalSeconds / 3600) % 24);
      numbers.minutes.textContent = pad(Math.floor(totalSeconds / 60) % 60);
      numbers.seconds.textContent = pad(totalSeconds % 60);
    }

    tick();
    timerId = setInterval(tick, 1000);
  }

  /* ===== MÚSICA =====
     La canción empieza a sonar cuando el invitado toca
     "Toca aquí para continuar". Los navegadores solo dejan
     reproducir audio después de un toque del usuario, y ese
     toque cuenta. El botón ♪ sirve para pausar o reanudar. */
  const bgMusic = document.getElementById("bgMusic");
  const musicToggle = document.getElementById("musicToggle");
  const music = CONFIG.music || {};
  let musicStartedOnce = false;
  let pausedByUser = false;

  function updateMusicButton(isPlaying) {
    if (!musicToggle) return;
    musicToggle.classList.toggle("is-playing", isPlaying);
    musicToggle.setAttribute("aria-label", isPlaying ? "Pausar música" : "Reproducir música");
    musicToggle.setAttribute("aria-pressed", String(isPlaying));
    musicToggle.textContent = isPlaying ? "♫" : "♪";
  }

  async function playMusic() {
    if (!bgMusic) return;
    try {
      if (!musicStartedOnce && music.startAt) {
        bgMusic.currentTime = music.startAt; // segundo desde el que arranca
      }
      bgMusic.volume = typeof music.volume === "number" ? music.volume : 0.7;
      await bgMusic.play();
      musicStartedOnce = true;
      updateMusicButton(true);
    } catch (error) {
      // Si el navegador bloquea el audio, el botón queda listo para darle play
      console.warn("No se pudo iniciar la música:", error);
      updateMusicButton(false);
    }
  }

  if (bgMusic && music.file) {
    bgMusic.src = music.file;

    if (musicToggle) {
      musicToggle.addEventListener("click", () => {
        if (bgMusic.paused) {
          pausedByUser = false;
          playMusic();
        } else {
          pausedByUser = true;
          bgMusic.pause();
          updateMusicButton(false);
        }
      });
    }

    // Si el invitado cambia de app o de pestaña, la música se pausa
    // y vuelve a sonar cuando regresa (salvo que la haya pausado él).
    document.addEventListener("visibilitychange", () => {
      if (!musicStartedOnce) return;
      if (document.hidden) {
        bgMusic.pause();
        updateMusicButton(false);
      } else if (!pausedByUser) {
        playMusic();
      }
    });
  } else {
    // Sin canción configurada: no se muestra el botón
    musicToggle?.remove();
    bgMusic?.remove();
  }

  if (openInvitationButton && invitationContent && passportCover) {
    openInvitationButton.addEventListener("click", () => {
      invitationContent.classList.add("invitation-content--visible");
      document.body.classList.remove("invitation-locked");
      document.body.classList.add("invitation-open");

      passportCover.remove();

      window.scrollTo({ top: 0, behavior: "auto" });

      if (musicToggle && bgMusic && music.file) {
        musicToggle.classList.add("is-visible");
        if (!musicStartedOnce) playMusic(); // suena con el primer toque
      }
    });
  }

  /* ===== FAVICON =====
     Círculo con las iniciales, en los colores de la paleta. */
  const favicon = document.getElementById("favicon");
  if (favicon && CONFIG.names) {
    const initials = `${CONFIG.names.first[0]}${CONFIG.names.second[0]}`.toUpperCase();
    const faviconSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r="31" fill="${getThemeColor("main")}"/>
        <circle cx="32" cy="32" r="26" fill="none" stroke="${getThemeColor("light")}" stroke-width="1.5"/>
        <text x="32" y="41" text-anchor="middle" font-family="Georgia, serif" font-size="24"
              font-style="italic" fill="${getThemeColor("light")}">${initials}</text>
      </svg>`;
    favicon.href = `data:image/svg+xml,${encodeURIComponent(faviconSvg)}`;
  }

  /* ===== TARJETA FINAL: LÍNEAS TIPO PASAPORTE =====
     >>>>>>>KAREN>>>>>>>>>  y  <<<<<<<<<<<<JUAN<<< */
  const mrzLine1 = document.getElementById("mrzLine1");
  const mrzLine2 = document.getElementById("mrzLine2");
  if (mrzLine1 && mrzLine2 && CONFIG.names) {
    mrzLine1.textContent = ">".repeat(7) + CONFIG.names.first.toUpperCase() + ">".repeat(40);
    mrzLine2.textContent = "<".repeat(40) + CONFIG.names.second.toUpperCase() + "<".repeat(3);
  }

  /* ===== ÁLBUM: ENLACE Y CÓDIGO QR =====
     El QR se dibuja como SVG con la librería qrcode.min.js.
     Los cuadritos usan "currentColor", así toman el color
     de la paleta (ver .album-section__qr en global.css). */
  const albumLink = document.getElementById("albumLink");
  const albumQr = document.getElementById("albumQr");
  if (albumLink && albumQr && CONFIG.albumUrl) {
    albumLink.href = CONFIG.albumUrl;

    if (typeof qrcode === "function") {
      // 0 = tamaño automático. "H" = corrección alta: el QR sigue
      // funcionando aunque el corazón del centro tape una parte.
      const qr = qrcode(0, "H");
      qr.addData(CONFIG.albumUrl);
      qr.make();

      const size = qr.getModuleCount();
      let squares = "";
      for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
          if (qr.isDark(row, col)) squares += `M${col} ${row}h1v1h-1z`;
        }
      }
      // Corazón en el centro (ocupa ~20% del QR)
      const badge = Math.round(size * 0.2);
      const start = (size - badge) / 2;
      const heartScale = badge / 24;

      albumQr.innerHTML = `
        <svg viewBox="-1 -1 ${size + 2} ${size + 2}" aria-hidden="true">
          <path d="${squares}" fill="currentColor" shape-rendering="crispEdges"/>
          <rect x="${start - 0.5}" y="${start - 0.5}" width="${badge + 1}" height="${badge + 1}"
                rx="${badge * 0.25}" fill="var(--color-light)"/>
          <path transform="translate(${start} ${start}) scale(${heartScale})"
                fill="var(--color-accent)"
                d="M12 21.6 10.6 20.3C5.4 15.6 2 12.5 2 8.6 2 5.5 4.4 3 7.5 3c1.7 0 3.4.8 4.5 2.1C13.1 3.8 14.8 3 16.5 3 19.6 3 22 5.5 22 8.6c0 3.9-3.4 7-8.6 11.7L12 21.6Z"/>
        </svg>`;
    }
  } else if (albumLink) {
    albumLink.closest(".album-section__qr-link")?.remove();
  }

  /* ===== INVITADO + CONFIRMACIÓN DE ASISTENCIA =====
     1. Lee el código del enlace (?inv=XXXX).
     2. Le pregunta a la hoja de Google (Apps Script) el nombre y
        el cupo de ESE código. La lista completa nunca llega aquí.
     3. El formulario guarda la respuesta en la hoja.
     Sin CONFIG.rsvp.scriptUrl funciona en modo demo con
     DEMO_GUESTS (config.js) y no guarda nada. */
  const rsvpConfig = CONFIG.rsvp || {};
  const isDemo = !rsvpConfig.scriptUrl;
  const rawCode = new URLSearchParams(window.location.search).get("inv") || "";
  const guestCode = /^[A-Za-z0-9]{8,32}$/.test(rawCode) ? rawCode : "";

  const passengersElement = document.getElementById("passengers");
  const rsvpOpen = document.getElementById("rsvpOpen");
  const rsvpHint = document.getElementById("rsvpHint");
  const rsvpDialog = document.getElementById("rsvpDialog");
  const rsvpForm = document.getElementById("rsvpForm");
  const rsvpDone = document.getElementById("rsvpDone");
  const rsvpNoCode = document.getElementById("rsvpNoCode");
  const rsvpError = document.getElementById("rsvpError");
  const rsvpSubmit = document.getElementById("rsvpSubmit");
  const attendingFields = document.getElementById("rsvpAttendingFields");
  const peopleOutput = document.getElementById("rsvpPeople");
  const lessButton = document.getElementById("rsvpLess");
  const moreButton = document.getElementById("rsvpMore");
  const demoNotice = document.getElementById("demoNotice");

  let guest = null;   // { name, seats, response }
  let people = 1;

  if (passengersElement) passengersElement.textContent = CONFIG.defaultPassengers;

  // Pide los datos con un límite de tiempo, para no quedarse esperando
  async function fetchJson(url, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  }

  async function loadGuest() {
    if (!guestCode) return null;

    if (isDemo) {
      const demo = DEMO_GUESTS[guestCode];
      return demo ? { name: demo.name, seats: demo.seats, response: null } : null;
    }

    const url = `${rsvpConfig.scriptUrl}?action=guest&code=${encodeURIComponent(guestCode)}`;
    const data = await fetchJson(url);
    return data.ok ? { name: data.name, seats: data.seats, response: data.response } : null;
  }

  function seatsText(count) {
    return `${count} ${count === 1 ? "lugar reservado" : "lugares reservados"}`;
  }

  function updateHint() {
    if (!rsvpHint) return;
    rsvpHint.textContent = guest && guest.response
      ? "¡Ya confirmaste! ✓ (toca los tickets para cambiar)"
      : "(Haz click en los tickets)";
  }

  // El nombre llega en menos de un segundo; mientras tanto se ve el texto por defecto
  const guestReady = loadGuest()
    .then(found => {
      guest = found;
      if (guest && passengersElement) passengersElement.textContent = guest.name;
      updateHint();
    })
    .catch(error => console.warn("No se pudo cargar el invitado:", error));

  function setPeople(value) {
    const max = guest ? guest.seats : 1;
    people = Math.min(Math.max(value, 1), max);
    peopleOutput.textContent = people;
    lessButton.disabled = people <= 1;
    moreButton.disabled = people >= max;
  }

  function showView(view) {
    rsvpForm.hidden = view !== "form";
    rsvpDone.hidden = view !== "done";
    rsvpNoCode.hidden = view !== "nocode";
  }

  function showError(message) {
    rsvpError.textContent = message;
    rsvpError.hidden = !message;
  }

  function fillForm() {
    document.getElementById("rsvpGuest").textContent = `${guest.name} · ${seatsText(guest.seats)}`;
    document.getElementById("rsvpSeatsHelp").textContent =
      `Tu invitación tiene ${seatsText(guest.seats)}.`;

    const deadline = document.getElementById("rsvpDeadline");
    deadline.textContent = rsvpConfig.deadline || "";
    deadline.hidden = !rsvpConfig.deadline;

    const previous = guest.response;
    rsvpForm.reset();
    if (previous) {
      rsvpForm.querySelector(`input[name="attending"][value="${previous.attending}"]`).checked = true;
      rsvpForm.elements.diet.value = previous.diet || "";
      rsvpForm.elements.message.value = previous.message || "";
    }
    setPeople(previous && previous.people ? previous.people : guest.seats);
    attendingFields.hidden = !(previous && previous.attending === "si");
    showError("");
  }

  function showDone() {
    const answer = guest.response;
    document.getElementById("rsvpDoneTitle").textContent =
      answer.attending === "si" ? "¡Nos vemos!" : "Gracias por avisarnos";
    document.getElementById("rsvpDoneText").textContent = answer.attending === "si"
      ? `Guardamos ${answer.people === 1 ? "1 lugar" : answer.people + " lugares"} a nombre de ${guest.name}. ¡Te esperamos!`
      : "Te vamos a extrañar. Gracias por responder.";
    showView("done");
  }

  function openDialog() {
    if (typeof rsvpDialog.showModal === "function") rsvpDialog.showModal();
    else rsvpDialog.setAttribute("open", "");
  }

  function closeDialog() {
    if (typeof rsvpDialog.close === "function") rsvpDialog.close();
    else rsvpDialog.removeAttribute("open");
  }

  if (rsvpOpen && rsvpDialog) {
    rsvpOpen.addEventListener("click", async () => {
      await guestReady;
      let connectionFailed = false;
      if (!guest && guestCode) {
        // Reintento por si falló la conexión al abrir la página
        try { guest = await loadGuest(); } catch (error) { guest = null; connectionFailed = true; }
        if (guest && passengersElement) passengersElement.textContent = guest.name;
      }

      if (!guest) {
        const [title, text] = connectionFailed
          ? ["Sin conexión", "No pudimos cargar tu invitación. Revisa tu internet y vuelve a tocar los tickets."]
          : ["Usa tu enlace personal", "Para confirmar, abre la invitación desde el enlace que te enviaron. Ese enlace trae tu nombre y tus lugares reservados."];
        rsvpNoCode.querySelector(".rsvp__title").textContent = title;
        rsvpNoCode.querySelector(".rsvp__done-text").textContent = text;
        showView("nocode");
      } else if (guest.response) {
        showDone();
      } else {
        fillForm();
        showView("form");
      }
      openDialog();
    });

    document.getElementById("rsvpClose").addEventListener("click", closeDialog);

    // Tocar fuera de la ventana también la cierra
    rsvpDialog.addEventListener("click", event => {
      if (event.target === rsvpDialog) closeDialog();
    });

    document.getElementById("rsvpEdit").addEventListener("click", () => {
      fillForm();
      showView("form");
    });

    rsvpForm.addEventListener("change", event => {
      if (event.target.name === "attending") {
        attendingFields.hidden = event.target.value !== "si";
        showError("");
      }
    });

    lessButton.addEventListener("click", () => setPeople(people - 1));
    moreButton.addEventListener("click", () => setPeople(people + 1));

    rsvpForm.addEventListener("submit", async event => {
      event.preventDefault();
      const attending = rsvpForm.elements.attending.value;
      if (!attending) {
        showError("Cuéntanos si vas a asistir.");
        return;
      }

      const answer = {
        action: "rsvp",
        code: guestCode,
        attending,
        people: attending === "si" ? people : 0,
        diet: attending === "si" ? rsvpForm.elements.diet.value.trim() : "",
        message: rsvpForm.elements.message.value.trim()
      };

      showError("");
      rsvpSubmit.disabled = true;
      rsvpSubmit.textContent = "Enviando…";

      try {
        if (isDemo) {
          await new Promise(resolve => setTimeout(resolve, 600));
          if (demoNotice) {
            demoNotice.classList.add("is-visible");
            clearTimeout(demoNotice._timer);
            demoNotice._timer = setTimeout(() => demoNotice.classList.remove("is-visible"), 3500);
          }
        } else {
          // "text/plain" evita un paso extra del navegador que Apps Script no acepta
          const result = await fetchJson(rsvpConfig.scriptUrl, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(answer)
          });
          if (!result.ok) {
            const messages = {
              personas_fuera_de_cupo: `Tu invitación tiene ${seatsText(result.seats || guest.seats)}.`,
              no_encontrado: "No encontramos tu invitación. Abre de nuevo el enlace que te enviaron."
            };
            throw new Error(messages[result.error] || "No pudimos guardar tu respuesta.");
          }
        }

        guest.response = {
          attending: answer.attending,
          people: answer.people,
          diet: answer.diet,
          message: answer.message
        };
        updateHint();
        showDone();
      } catch (error) {
        showError(error.name === "AbortError" || error instanceof TypeError || error instanceof SyntaxError
          ? "No pudimos conectarnos. Revisa tu internet e intenta de nuevo."
          : error.message);
      } finally {
        rsvpSubmit.disabled = false;
        rsvpSubmit.textContent = "Enviar confirmación";
      }
    });
  }

  /* ===== CARRUSEL DE RECUERDOS ===== */
  const memoriesCarousel = document.getElementById("memoriesCarousel");
  const memoriesDotsContainer = document.getElementById("memoriesDots");

  if (memoriesCarousel && memoriesDotsContainer) {
    const memoriesSlides = Array.from(
      memoriesCarousel.querySelectorAll(".memories-carousel__slide")
    );

    const memoriesDots = Array.from(
      memoriesDotsContainer.querySelectorAll(".memories-carousel__dot")
    );

    if (memoriesSlides.length && memoriesDots.length) {
      const prevButton = document.getElementById("memoriesPrev");
      const nextButton = document.getElementById("memoriesNext");
      let currentIndex = 0;

      function setActiveDot(index) {
        currentIndex = index;
        memoriesDots.forEach((dot, i) => {
          dot.classList.toggle("is-active", i === index);
        });
        // Desactiva la flecha cuando no hay más fotos hacia ese lado
        if (prevButton) prevButton.disabled = index === 0;
        if (nextButton) nextButton.disabled = index === memoriesSlides.length - 1;
      }

      function goToSlide(index) {
        const safeIndex = Math.max(0, Math.min(index, memoriesSlides.length - 1));
        memoriesCarousel.scrollTo({
          left: memoriesSlides[safeIndex].offsetLeft - memoriesSlides[0].offsetLeft,
          behavior: "smooth"
        });
        setActiveDot(safeIndex);
      }

      if (prevButton) prevButton.addEventListener("click", () => goToSlide(currentIndex - 1));
      if (nextButton) nextButton.addEventListener("click", () => goToSlide(currentIndex + 1));

      function getClosestSlideIndex() {
        const carouselRect = memoriesCarousel.getBoundingClientRect();
        const carouselCenter = carouselRect.left + carouselRect.width / 2;

        let closestIndex = 0;
        let closestDistance = Infinity;

        memoriesSlides.forEach((slide, index) => {
          const slideRect = slide.getBoundingClientRect();
          const slideCenter = slideRect.left + slideRect.width / 2;
          const distance = Math.abs(carouselCenter - slideCenter);

          if (distance < closestDistance) {
            closestDistance = distance;
            closestIndex = index;
          }
        });

        return closestIndex;
      }

      let scrollTimeout;

      memoriesCarousel.addEventListener("scroll", () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          const maxScroll = memoriesCarousel.scrollWidth - memoriesCarousel.clientWidth;
          // Si llegó al final, la activa es la última foto
          if (memoriesCarousel.scrollLeft >= maxScroll - 4) {
            setActiveDot(memoriesSlides.length - 1);
          } else {
            setActiveDot(getClosestSlideIndex());
          }
        }, 80);
      });

      memoriesDots.forEach((dot, index) => {
        dot.addEventListener("click", () => goToSlide(index));
      });

      setActiveDot(0);
    }
  }

  /* ===== LOADER =====
     Se oculta cuando carga la portada, sin esperar
     las fotos de más abajo (que cargan con lazy loading). */
  function hideLoader() {
    if (pageLoader) pageLoader.classList.add("is-hidden");
  }

  if (document.readyState === "complete") {
    hideLoader();
  } else {
    window.addEventListener("load", hideLoader);
  }
});
