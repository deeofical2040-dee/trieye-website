/**
 * TRIEYE Detailing Studio - Animations & Scroll Reveal Controller
 * Handles reveal-on-scroll animations and interactive UI motion across all public pages.
 */
(function() {
  function updateCopyrightYear() {
    function setYear() {
      var currentYear = new Date().getFullYear();
      var yearEls = document.querySelectorAll(".current-year, .footer-year");
      yearEls.forEach(function(el) {
        el.textContent = currentYear;
      });
      document.querySelectorAll(".footer-copy").forEach(function(el) {
        if (!el.querySelector(".current-year, .footer-year")) {
          el.innerHTML = el.innerHTML.replace(/(©|&copy;)\s*\d{4}/, "$1 " + currentYear);
        }
      });
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", setYear);
    } else {
      setYear();
    }
  }

  // Always update dynamic copyright year
  updateCopyrightYear();

  // Respect prefers-reduced-motion
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  // Ensure scroll reveal and dynamic motion are initialized
  if (typeof window !== "undefined") {
    document.documentElement.classList.add("js-reveal-active");
  }
})();

