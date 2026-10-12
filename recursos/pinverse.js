/* =========================================================
   PINVERSE · Comportamiento compartido por todas las páginas
   ========================================================= */
(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Cierra el menú del celular al tocar un enlace */
  const menuToggle = document.getElementById('menu-toggle');
  document.querySelectorAll('.mobile-drawer-nav a').forEach(link => {
    link.addEventListener('click', () => { if (menuToggle) menuToggle.checked = false; });
  });

  /* Aparición suave de los elementos marcados con data-reveal */
  const items = document.querySelectorAll('[data-reveal]');
  if (!('IntersectionObserver' in window) || reduceMotion) {
    items.forEach(item => item.classList.add('is-visible'));
  } else {
    items.forEach(item => item.classList.add('soft-reveal'));
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: .12, rootMargin: '0px 0px -28px 0px' });
    items.forEach(item => observer.observe(item));
  }

  /* En preguntas: al abrir una, se cierran las demás del mismo grupo */
  document.querySelectorAll('.faq').forEach(faq => {
    const all = faq.querySelectorAll('details');
    all.forEach(item => item.addEventListener('toggle', () => {
      if (item.open) all.forEach(other => { if (other !== item) other.open = false; });
    }));
  });
})();
