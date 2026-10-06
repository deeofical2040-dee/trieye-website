(function() {
  if (typeof window === "undefined") return;

  /**
   * TRIEYE STUDIO GALLERY DATA MODEL
   * Structured for pure images now, with ready extensible schema for future real video items.
   */
  var galleryItemsData = [
    {
      id: 1,
      type: "image",
      src: "assets/foam-wash.jpg",
      tag: "01 / FOAM WASH",
      title: "HIGH-DENSITY SNOW FOAM & DECON",
      alt: "Snow Foam Pre-Wash and Decon at TRIEYE Detailing Studio"
    },
    {
      id: 2,
      type: "image",
      src: "assets/rubbing-polish.jpg",
      tag: "02 / PAINT CORRECTION",
      title: "DUAL-ACTION MACHINE POLISHING",
      alt: "Dual-Action Paint Correction Rubbing Polish"
    },
    {
      id: 3,
      type: "image",
      src: "assets/interior-clean.jpg",
      tag: "03 / INTERIOR DETAILING",
      title: "DEEP STEAM EXTRACTION & LEATHER SPA",
      alt: "Interior Detailing Steam Extraction and Leather Spa"
    },
    {
      id: 4,
      type: "image",
      src: "assets/ceramic-coating.jpg",
      tag: "04 / CERAMIC COATING",
      title: "9H HYDROPHOBIC SURFACE SHIELD",
      alt: "Hydrophobic 9H Ceramic Coating Protection"
    },
    {
      id: 5,
      type: "image",
      src: "assets/ppf/ppf-installation.jpg",
      tag: "05 / PPF INSTALLATION",
      title: "PRECISION PAINT PROTECTION FILM",
      alt: "Paint Protection Film Installation at TRIEYE Studio"
    },
    {
      id: 6,
      type: "image",
      src: "assets/graphene/graphene-workmanship.jpg",
      tag: "06 / GRAPHENE MATRIX",
      title: "PRECISION APPLICATION & FINISH",
      alt: "Precision Graphene Matrix Coating Application and Inspection"
    },
    {
      id: 7,
      type: "image",
      src: "assets/bike/bike-detail-finish.jpg",
      tag: "07 / SUPERBIKE DETAILING",
      title: "FULL MOTORCYCLE RESTORATION",
      alt: "Superbike Detailing and Hand Polishing at TRIEYE Studio"
    }
  ];

  function initGalleryCarousel() {
    var container = document.getElementById("galleryCarousel");
    if (!container) return;

    var cards = Array.from(container.querySelectorAll(".gallery-card"));
    var dots = Array.from(container.querySelectorAll(".gallery-dot"));
    var prevBtn = document.getElementById("galleryPrevBtn");
    var nextBtn = document.getElementById("galleryNextBtn");

    if (cards.length === 0) return;

    var currentIndex = 0;
    var totalCards = cards.length;
    var autoPlayTimer = null;
    var autoPlayDelay = 5000;
    var isHovered = false;
    var isDragging = false;
    var startX = 0;
    var dragThreshold = 45;

    function updateCarousel() {
      cards.forEach(function(card, idx) {
        card.classList.remove("is-active", "is-prev", "is-next", "is-hidden-left", "is-hidden-right");
        
        // Calculate relative position with circular wrapping
        var diff = (idx - currentIndex + totalCards) % totalCards;
        
        if (diff === 0) {
          card.classList.add("is-active");
          card.setAttribute("aria-hidden", "false");
        } else if (diff === 1 || (currentIndex === totalCards - 1 && idx === 0)) {
          card.classList.add("is-next");
          card.setAttribute("aria-hidden", "true");
        } else if (diff === totalCards - 1 || (currentIndex === 0 && idx === totalCards - 1)) {
          card.classList.add("is-prev");
          card.setAttribute("aria-hidden", "true");
        } else if (diff > 1 && diff <= totalCards / 2) {
          card.classList.add("is-hidden-right");
          card.setAttribute("aria-hidden", "true");
        } else {
          card.classList.add("is-hidden-left");
          card.setAttribute("aria-hidden", "true");
        }
      });

      // Update dots
      dots.forEach(function(dot, idx) {
        if (idx === currentIndex) {
          dot.classList.add("active");
          dot.setAttribute("aria-current", "true");
        } else {
          dot.classList.remove("active");
          dot.removeAttribute("aria-current");
        }
      });
    }

    function nextSlide() {
      currentIndex = (currentIndex + 1) % totalCards;
      updateCarousel();
    }

    function prevSlide() {
      currentIndex = (currentIndex - 1 + totalCards) % totalCards;
      updateCarousel();
    }

    function goToSlide(idx) {
      currentIndex = (idx + totalCards) % totalCards;
      updateCarousel();
    }

    // Navigation buttons
    if (prevBtn) {
      prevBtn.addEventListener("click", function(e) {
        e.preventDefault();
        prevSlide();
        resetAutoplay();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", function(e) {
        e.preventDefault();
        nextSlide();
        resetAutoplay();
      });
    }

    // Clicking side card brings it to center
    cards.forEach(function(card, idx) {
      card.addEventListener("click", function() {
        if (card.classList.contains("is-next")) {
          nextSlide();
          resetAutoplay();
        } else if (card.classList.contains("is-prev")) {
          prevSlide();
          resetAutoplay();
        }
      });
    });

    // Dot pagination clicks
    dots.forEach(function(dot, idx) {
      dot.addEventListener("click", function(e) {
        e.preventDefault();
        goToSlide(idx);
        resetAutoplay();
      });
    });

    // Autoplay management
    function startAutoplay() {
      stopAutoplay();
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      autoPlayTimer = setInterval(function() {
        if (!isHovered && !isDragging && document.visibilityState === "visible") {
          nextSlide();
        }
      }, autoPlayDelay);
    }

    function stopAutoplay() {
      if (autoPlayTimer) {
        clearInterval(autoPlayTimer);
        autoPlayTimer = null;
      }
    }

    function resetAutoplay() {
      stopAutoplay();
      startAutoplay();
    }

    // Hover pauses autoplay
    container.addEventListener("mouseenter", function() {
      isHovered = true;
    });

    container.addEventListener("mouseleave", function() {
      isHovered = false;
    });

    // Visibility change pauses autoplay
    document.addEventListener("visibilitychange", function() {
      if (document.visibilityState === "hidden") {
        stopAutoplay();
      } else {
        startAutoplay();
      }
    });

    // TOUCH SWIPE SUPPORT (Mobile)
    var touchStartX = 0;
    var touchStartY = 0;
    var isHorizontalSwipe = false;

    container.addEventListener("touchstart", function(e) {
      if (e.touches.length !== 1) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      isHorizontalSwipe = false;
      isDragging = true;
    }, { passive: true });

    container.addEventListener("touchmove", function(e) {
      if (!isDragging || e.touches.length !== 1) return;
      var diffX = e.touches[0].clientX - touchStartX;
      var diffY = e.touches[0].clientY - touchStartY;

      if (!isHorizontalSwipe && Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
        isHorizontalSwipe = true;
      }
    }, { passive: true });

    container.addEventListener("touchend", function(e) {
      if (!isDragging) return;
      isDragging = false;
      if (e.changedTouches.length !== 1) return;
      var diffX = e.changedTouches[0].clientX - touchStartX;

      if (isHorizontalSwipe && Math.abs(diffX) > dragThreshold) {
        if (diffX < 0) {
          nextSlide();
        } else {
          prevSlide();
        }
        resetAutoplay();
      }
    }, { passive: true });

    // MOUSE DRAG SUPPORT (Desktop)
    var isMouseDown = false;

    container.addEventListener("mousedown", function(e) {
      if (e.target.closest("button") || e.target.closest("a")) return;
      isMouseDown = true;
      startX = e.clientX;
    });

    window.addEventListener("mouseup", function(e) {
      if (!isMouseDown) return;
      isMouseDown = false;
      var diffX = e.clientX - startX;
      if (Math.abs(diffX) > dragThreshold) {
        if (diffX < 0) {
          nextSlide();
        } else {
          prevSlide();
        }
        resetAutoplay();
      }
    });

    // Expose data model for future additions
    window.__TRIEYE_GALLERY_ITEMS__ = galleryItemsData;

    // Initial setup
    updateCarousel();
    startAutoplay();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initGalleryCarousel);
  } else {
    initGalleryCarousel();
  }
})();
