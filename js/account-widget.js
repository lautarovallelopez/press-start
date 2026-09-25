const MOBILE_CONTROLS_CLASS = 'floating-controls-clear-content';

function watchMobileControlZones() {
  const zones = [...document.querySelectorAll('#filtros, .japan-filters')];
  if (!zones.length || !('IntersectionObserver' in window)) return;

  const visibleZones = new Set();
  const update = () => {
    const isMobile = window.matchMedia('(max-width: 560px)').matches;
    document.body.classList.toggle(MOBILE_CONTROLS_CLASS, isMobile && visibleZones.size > 0);
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) visibleZones.add(entry.target);
      else visibleZones.delete(entry.target);
    });
    update();
  }, { threshold: 0.08 });

  zones.forEach((zone) => observer.observe(zone));
  window.addEventListener('resize', update, { passive: true });
}

document.addEventListener('DOMContentLoaded', () => {
  watchMobileControlZones();
});

