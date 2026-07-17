/* ============================================================
   ZEN SKIN STUDIO — script.js
   1. Menú móvil (hamburguesa)
   2. Slider de testimonios (autoplay + controles + dots)
   3. Reveal al hacer scroll (IntersectionObserver)
   4. Formulario → abre WhatsApp con el mensaje prellenado
   5. Carrusel de fotos del servicio (flechas + dots + swipe)
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
      note.textContent = 'Por favor completa tu nombre y WhatsApp.';
      return;
    }

    const text = encodeURIComponent(
      `Hola, soy ${name}. Me interesa: ${service}.` +
      (message ? ` ${message}` : '') +
      ` Mi número: ${phone}.`
    );

    note.textContent = 'Abriendo WhatsApp…';
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, '_blank');
    form.reset();
  });

  /* ---------- 5. Carrusel de fotos del servicio ---------- */
  const gallerySlides = document.getElementById('facialSlides');
  if (gallerySlides) {
    const gImgs = gallerySlides.children;
    const gDotsWrap = document.getElementById('facialDots');
    let gIndex = 0;

    Array.from(gImgs).forEach((_, i) => {
      const dot = document.createElement('button');
      dot.setAttribute('aria-label', `Ir a la foto ${i + 1}`);
      dot.addEventListener('click', () => gGoTo(i));
      gDotsWrap.appendChild(dot);
    });
    const gDots = gDotsWrap.children;

    function gGoTo(i) {
      gIndex = (i + gImgs.length) % gImgs.length;
      gallerySlides.style.transform = `translateX(-${gIndex * 100}%)`;
      Array.from(gDots).forEach((d, j) => d.classList.toggle('active', j === gIndex));
    }

    document.getElementById('facialPrev').addEventListener('click', () => gGoTo(gIndex - 1));
    document.getElementById('facialNext').addEventListener('click', () => gGoTo(gIndex + 1));

    // Swipe táctil
    let gStartX = 0;
    gallerySlides.addEventListener('touchstart', e => { gStartX = e.touches[0].clientX; }, { passive: true });
    gallerySlides.addEventListener('touchend', e => {
      const delta = e.changedTouches[0].clientX - gStartX;
      if (Math.abs(delta) > 40) gGoTo(gIndex + (delta < 0 ? 1 : -1));
    }, { passive: true });

    gGoTo(0);
  }

  /* ---------- 6. Año dinámico ---------- */
  document.getElementById('year').textContent = new Date().getFullYear();
});
