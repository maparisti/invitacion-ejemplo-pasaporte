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

  /* ===== PASAJEROS ===== */
  const params = new URLSearchParams(window.location.search);
  const guestCode = params.get("inv");
  const passengersElement = document.getElementById("passengers");

  if (passengersElement) {
    const hasGuest = guestCode && Object.prototype.hasOwnProperty.call(DEMO_GUESTS, guestCode);
    passengersElement.textContent = hasGuest ? DEMO_GUESTS[guestCode] : CONFIG.defaultPassengers;
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

  /* ===== CONFIRMAR ASISTENCIA ===== */
  const rsvpLink = document.getElementById("rsvpLink");
  const demoNotice = document.getElementById("demoNotice");

  if (rsvpLink) {
    if (CONFIG.rsvpUrl) {
      rsvpLink.href = CONFIG.rsvpUrl;
    } else {
      rsvpLink.addEventListener("click", (event) => {
        event.preventDefault();
        if (!demoNotice) return;
        demoNotice.classList.add("is-visible");
        clearTimeout(demoNotice._timer);
        demoNotice._timer = setTimeout(() => demoNotice.classList.remove("is-visible"), 3500);
      });
    }
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
