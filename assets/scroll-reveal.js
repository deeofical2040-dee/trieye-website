(function() {
  if (typeof window === 'undefined') return;

  // Enable progressive enhancement class on HTML element
  document.documentElement.classList.add('js-reveal-active');

  function initReveal() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    // Target elements tagged with any reveal class across the 4 interaction concepts
    var targets = document.querySelectorAll('.reveal-text, .reveal-left-text, .reveal-right-text, .reveal-mask, .reveal-up, .reveal-left, .reveal-right, .reveal-card, .reveal-card-left, .reveal-card-right, .reveal-card-up, .reveal-morph, .reveal-element, .reveal-group > *, .reveal-stagger > *');
    if (!targets.length) return;

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      }, {
        rootMargin: '0px 0px -40px 0px',
        threshold: 0.05
      });

      targets.forEach(function(target) {
        observer.observe(target);
      });
    } else {
      // Fallback: reveal immediately if IntersectionObserver unsupported
      targets.forEach(function(target) {
        target.classList.add('revealed');
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initReveal);
  } else {
    initReveal();
  }
})();
