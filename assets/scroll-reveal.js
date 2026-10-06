(function() {
  if (typeof window === "undefined") return;

  // Respect prefers-reduced-motion
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  // Progressive enhancement: add class only when JavaScript is active
  document.documentElement.classList.add("js-reveal-active");

  function initReveal() {
    var selector = [
      ".reveal-text",
      ".reveal-left-text",
      ".reveal-right-text",
      ".reveal-up",
      ".reveal-left",
      ".reveal-right",
      ".reveal-image",
      ".reveal-image-left",
      ".reveal-card",
      ".reveal-card-left",
      ".reveal-card-right",
      ".reveal-card-up",
      ".reveal-element",
      ".reveal-stagger",
      ".reveal-stagger > *",
      ".sec-head",
      ".sec-tag",
      ".sec-title",
      ".sec-subtitle",
      ".sec-desc",
      ".sec-cta",
      ".split-grid > *",
      ".two-col > *",
      ".grid-2-col > *",
      ".pillars-grid > *",
      ".pillars .pillar",
      ".process-card",
      ".explore-card",
      ".service-card",
      ".faq-item"
    ].join(", ");

    var targets = document.querySelectorAll(selector);
    if (!targets.length) return;

    if ("IntersectionObserver" in window) {
      // Trigger when ~15% of the element/section is in view
      var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            // Also reveal any nested semantic children inside observed containers
            var children = entry.target.querySelectorAll(".sec-tag, .sec-title, .sec-subtitle, .sec-desc, .sec-cta, .process-step-num, .process-step-title, .process-step-desc, .process-card-media img, .explore-card-title, .explore-card-desc, .explore-card-btn");
            children.forEach(function(child) {
              child.classList.add("revealed");
            });
            observer.unobserve(entry.target);
          }
        });
      }, {
        rootMargin: "0px 0px -10% 0px",
        threshold: 0.15
      });

      targets.forEach(function(target) {
        // Exclude navigation, mobile drawer, modals
        if (target.closest(".mobile-drawer") || target.closest(".modal") || target.closest("header") || target.closest("nav")) {
          target.classList.add("revealed");
          return;
        }
        observer.observe(target);
      });
    } else {
      // Fallback
      targets.forEach(function(target) {
        target.classList.add("revealed");
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initReveal);
  } else {
    initReveal();
  }
})();
