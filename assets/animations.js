/**
 * TRIEYE Detailing Studio - Animations & Scroll Reveal Controller
 * Handles reveal-on-scroll animations and interactive UI motion across all public pages.
 */
(function() {
  // Respect prefers-reduced-motion
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  // Ensure scroll reveal and dynamic motion are initialized
  if (typeof window !== "undefined") {
    document.documentElement.classList.add("js-reveal-active");
  }
})();
