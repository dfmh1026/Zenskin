/* ============================================================
   ZEN SKIN STUDIO — script.js
   1. Menú móvil (hamburguesa)
   2. Slider de testimonios (autoplay + controles + dots)
   3. Reveal al hacer scroll (IntersectionObserver)
   4. Formulario → abre WhatsApp con el mensaje prellenado
   5. Carrusel de fotos del servicio (flechas + dots + swipe + lightbox)
   6. Año dinámico en el footer
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- 1. Menú móvil ---------- */
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');

  navToggle.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    navToggle.classList.toggle('open', open);
    navToggle.setAttribute('aria-expanded', String(open));
  });

  // Cierra el menú al tocar un enlace
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      navToggle.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });

  /* ---------- 2. Slider de testimonios ---------- */
  const track = document.getElementById('sliderTrack');
  const slides = track.children;
  const dotsWrap = document.getElementById('sliderDots');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  let index = 0;
  let autoplay;

  // Genera los dots según la cantidad de testimonios
  Array.from(slides).forEach((_, i) => {
    const dot = document.createElement('button');
    dot.setAttribute('aria-label', `Ir al testimonio ${i + 1}`);
    dot.addEventListener('click', () => goTo(i, true));
    dotsWrap.appendChild(dot);
  });
  const dots = dotsWrap.children;

  function goTo(i, userAction = false) {
    index = (i + slides.length) % slides.length;
    track.style.transform = `translateX(-${index * 100}%)`;
    Array.from(dots).forEach((d, j) => d.classList.toggle('active', j === index));
    if (userAction) restartAutoplay();
  }

  function restartAutoplay() {
    clearInterval(autoplay);
    autoplay = setInterval(() => goTo(index + 1), 6000);
  }

  prevBtn.addEventListener('click', () => goTo(index - 1, true));
  nextBtn.addEventListener('click', () => goTo(index + 1, true));

  // Swipe táctil en móvil
  let startX = 0;
  track.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', e => {
    const delta = e.changedTouches[0].clientX - startX;
    if (Math.abs(delta) > 40) goTo(index + (delta < 0 ? 1 : -1), true);
  }, { passive: true });

  goTo(0);
  restartAutoplay();

  /* ---------- 3. Reveal al hacer scroll ---------- */
  const revealTargets = document.querySelectorAll('.section__inner > *, .card, .testimonial');
  revealTargets.forEach(el => el.classList.add('reveal'));

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  revealTargets.forEach(el => observer.observe(el));

  /* ---------- 4. Formulario → WhatsApp ---------- */
  const WHATSAPP_NUMBER = '12016472372';

  const form = document.getElementById('contactForm');
  const note = document.getElementById('formNote');

  form.addEventListener('submit', e => {
    e.preventDefault();

    const name = form.name.value.trim();
    const phone = form.phone.value.trim();
    const service = form.service.value;
    const message = form.message.value.trim();

    if (!name || !phone) {
      note.className = 'form__note is-error';
      note.textContent = 'Por favor completa tu nombre y WhatsApp.';
      return;
    }

    const text = encodeURIComponent(
      `Hola, soy ${name}. Me interesa: ${service}.` +
      (message ? ` ${message}` : '') +
      ` Mi número: ${phone}.`
    );

    note.className = 'form__note is-ok';
    note.textContent = '✓ ¡Listo! Abriendo WhatsApp para enviar tu solicitud…';
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, '_blank');
    form.reset();
  });

  /* ---------- 5. Carruseles de fotos + lightbox compartido ---------- */

  // -- Lightbox compartido por todas las galerías --
  const lb = document.getElementById('lightbox');
  const lbImg = document.getElementById('lbImg');
  const lbVideo = document.getElementById('lbVideo');
  let lbPhotos = [];   // fotos de la galería que se abrió
  let lbIndex = 0;

  function showLb() {
    lbImg.src = lbPhotos[lbIndex].src;
    lbImg.alt = lbPhotos[lbIndex].alt;
  }
  function openLb(photos, i) {
    lb.classList.remove('lb--video');          // modo imagen
    if (lbVideo) { lbVideo.pause(); lbVideo.removeAttribute('src'); }
    lbPhotos = photos;
    lbIndex = (i + photos.length) % photos.length;
    showLb();
    lb.classList.add('open');
    lb.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function openLbVideo(src) {
    lbPhotos = [];                              // sin navegación
    lb.classList.add('lb--video');             // modo video
    lbVideo.src = src;
    lb.classList.add('open');
    lb.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    lbVideo.play().catch(() => {});
  }
  function closeLb() {
    lb.classList.remove('open');
    lb.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (lbVideo) lbVideo.pause();               // detiene el sonido al cerrar
  }
  function lbGo(step) {
    if (!lbPhotos.length) return;
    lbIndex = (lbIndex + step + lbPhotos.length) % lbPhotos.length;
    showLb();
  }

  if (lb) {
    document.getElementById('lbClose').addEventListener('click', closeLb);
    document.getElementById('lbPrev').addEventListener('click', () => lbGo(-1));
    document.getElementById('lbNext').addEventListener('click', () => lbGo(1));
    // cerrar al tocar el fondo (fuera de la imagen y de los botones)
    lb.addEventListener('click', e => {
      if (e.target === lb || e.target.classList.contains('lightbox__figure')) closeLb();
    });
    // teclado: Esc cierra, flechas navegan
    document.addEventListener('keydown', e => {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') closeLb();
      else if (e.key === 'ArrowRight') lbGo(1);
      else if (e.key === 'ArrowLeft') lbGo(-1);
    });
    // swipe en el lightbox (móvil)
    let lbStartX = 0;
    lb.addEventListener('touchstart', e => { lbStartX = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', e => {
      const delta = e.changedTouches[0].clientX - lbStartX;
      if (Math.abs(delta) > 40) lbGo(delta < 0 ? 1 : -1);
    }, { passive: true });
  }

  // -- Inicializa un carrusel por su prefijo de IDs (ej: 'facial', 'acne') --
  function initGallery(prefix) {
    const slides = document.getElementById(prefix + 'Slides');
    if (!slides) return;
    const imgs = slides.children;
    const photoEls = slides.querySelectorAll('img');
    const dotsWrap = document.getElementById(prefix + 'Dots');
    let index = 0;

    Array.from(imgs).forEach((_, i) => {
      const dot = document.createElement('button');
      dot.setAttribute('aria-label', `Ir a la foto ${i + 1}`);
      dot.addEventListener('click', () => goTo(i));
      dotsWrap.appendChild(dot);
    });
    const dots = dotsWrap.children;

    function goTo(i) {
      index = (i + imgs.length) % imgs.length;
      slides.style.transform = `translateX(-${index * 100}%)`;
      Array.from(dots).forEach((d, j) => d.classList.toggle('active', j === index));
    }

    document.getElementById(prefix + 'Prev').addEventListener('click', () => goTo(index - 1));
    document.getElementById(prefix + 'Next').addEventListener('click', () => goTo(index + 1));

    // swipe táctil en la tarjeta
    let startX = 0;
    slides.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
    slides.addEventListener('touchend', e => {
      const delta = e.changedTouches[0].clientX - startX;
      if (Math.abs(delta) > 40) goTo(index + (delta < 0 ? 1 : -1));
    }, { passive: true });

    goTo(0);

    // clic en la foto -> abre el lightbox con las fotos de ESTA galería
    const photos = Array.from(photoEls).map(im => ({ src: im.currentSrc || im.src, alt: im.alt }));
    photoEls.forEach((im, i) => im.addEventListener('click', () => openLb(photos, i)));

    // clic en un slide de video -> abre el lightbox del video (con sonido)
    slides.querySelectorAll('.card__slide--video').forEach(sv => {
      const vid = sv.querySelector('video');
      const open = () => openLbVideo(vid.currentSrc || vid.getAttribute('src'));
      vid.addEventListener('click', open);
      const btn = sv.querySelector('.card__expand');
      if (btn) btn.addEventListener('click', open);
    });
  }

  ['facial', 'acne', 'hilos', 'botox', 'postq', 'lifting', 'cuello'].forEach(initGallery);

  /* ---------- 6. Año dinámico ---------- */
  document.getElementById('year').textContent = new Date().getFullYear();

  /* ---------- 7. Navbar dinámico + barra de progreso ---------- */
  const navHeader = document.querySelector('.nav');
  const scrollProgress = document.getElementById('scrollProgress');

  function onScrollEffects() {
    const st = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollProgress) scrollProgress.style.width = (max > 0 ? (st / max) * 100 : 0) + '%';
    navHeader.classList.toggle('nav--scrolled', st > 40);
  }
  document.addEventListener('scroll', onScrollEffects, { passive: true });
  onScrollEffects();

  /* ---------- 8. Botones magnéticos (se acercan levemente al cursor) ---------- */
  document.querySelectorAll('.magnetic').forEach(btn => {
    btn.addEventListener('mousemove', e => {
      const r = btn.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      btn.style.transform = `translate(${x * 0.18}px, ${y * 0.35 - 3}px)`;
    });
    btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
  });

  /* ---------- 9. Brillo + inclinación 3D en las tarjetas de servicio ---------- */
  document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      card.style.setProperty('--mx', `${x}px`);
      card.style.setProperty('--my', `${y}px`);
      const rx = ((y / r.height) - 0.5) * -4;
      const ry = ((x / r.width) - 0.5) * 4;
      card.style.transform = `translateY(-8px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  });

  /* ---------- 10. Contador animado en las estadísticas de "Quiénes somos" ---------- */
  const counters = document.querySelectorAll('[data-count]');
  const counterObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      counterObserver.unobserve(entry.target);

      const el = entry.target;
      const target = parseFloat(el.dataset.count);
      const decimals = parseInt(el.dataset.decimals || '0', 10);
      const prefix = el.dataset.prefix || '';
      const suffix = el.dataset.suffix || '';
      const start = performance.now();
      const duration = 1400;

      function step(now) {
        const p = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        const val = target * eased;
        const text = decimals > 0 ? val.toFixed(decimals) : Math.round(val).toLocaleString('es-CO');
        el.textContent = prefix + text + suffix;
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }, { threshold: 0.6 });
  counters.forEach(el => counterObserver.observe(el));
});
