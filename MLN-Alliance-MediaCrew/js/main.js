/* ==========================================================================
   MLN Alliance MediaCrew — main.js
   Core dynamic features:
   - Smooth page-to-page transitions
   - Scroll progress bar
   - Header scroll elevation
   - Accurate navbar scrollspy (fixes multiple active markings)
   - Mobile nav toggle
   - Scroll reveal animations
   - Hero camera-rig parallax & interactive aperture snap
   - Specular card glow
   - Discreet admin shortcut
   ========================================================================== */

(function () {
  "use strict";

  /* ---------- Smooth Page Transitions ---------- */
  function initPageTransitions() {
    var beam = document.createElement("div");
    beam.className = "page-transition-beam";
    document.body.appendChild(beam);

    document.querySelectorAll("a[href]").forEach(function (link) {
      link.addEventListener("click", function (e) {
        var href = link.getAttribute("href");
        if (!href) return;

        // Skip in-page anchors, tel, mailto, target="_blank", or modifier keys
        if (
          href.startsWith("#") ||
          href.startsWith("mailto:") ||
          href.startsWith("tel:") ||
          link.getAttribute("target") === "_blank" ||
          e.ctrlKey || e.metaKey || e.shiftKey || e.altKey
        ) {
          return;
        }

        // Skip if anchor link on the current page (e.g. index.html#about when already on index.html)
        var currentFile = (window.location.pathname.split("/").pop() || "index.html").split("#")[0];
        if (href.indexOf("#") !== -1) {
          var targetFile = href.split("#")[0];
          if (targetFile === "" || targetFile === currentFile) {
            return;
          }
        }

        e.preventDefault();
        beam.classList.add("active");
        document.body.classList.add("page-leaving");
        setTimeout(function () {
          window.location.href = href;
        }, 260);
      });
    });
  }

  /* ---------- Unified 120fps Scroll Engine (Zero Reflows / Zero Jitter) ---------- */
  function initScrollEngine() {
    var progressBar = document.createElement("div");
    progressBar.className = "scroll-progress-bar";
    document.body.appendChild(progressBar);

    var header = document.querySelector(".site-header");
    var rig = document.querySelector(".lens-rig");
    var aboutSection = document.getElementById("about");
    var contactSection = document.getElementById("contact");
    var homeLink = document.querySelector('.main-nav a[href="index.html"]');
    var aboutLink = document.querySelector('.main-nav a[href*="#about"]');
    var contactLink = document.querySelector('.main-nav a[href*="#contact"]');
    var navLinks = document.querySelectorAll(".main-nav a:not(.nav-cta)");

    var docH = 1000;
    var winH = window.innerHeight;
    var aboutTop = aboutSection ? aboutSection.offsetTop : 0;
    var contactTop = contactSection ? contactSection.offsetTop : 0;

    function refreshMetrics() {
      winH = window.innerHeight;
      docH = document.documentElement.scrollHeight - winH;
      if (aboutSection) aboutTop = aboutSection.offsetTop;
      if (contactSection) contactTop = contactSection.offsetTop;
    }

    window.addEventListener("resize", refreshMetrics, { passive: true });
    setTimeout(refreshMetrics, 300);

    var ticking = false;

    function onFrame() {
      var scrollY = window.scrollY || window.pageYOffset || 0;

      // 1. Progress Bar
      var progress = docH > 0 ? (scrollY / docH) * 100 : 0;
      progressBar.style.width = Math.min(progress, 100) + "%";

      // 2. Header State
      if (header) {
        header.classList.toggle("is-scrolled", scrollY > 24);
      }

      // 3. Spy Navigation
      if (navLinks.length && (window.location.pathname.indexOf("functions.html") === -1 && window.location.pathname.indexOf("register.html") === -1)) {
        navLinks.forEach(function (l) { l.classList.remove("active"); });
        if (contactTop && scrollY + winH >= docH + winH - 120 && contactLink) {
          contactLink.classList.add("active");
        } else if (aboutTop && scrollY >= aboutTop - 190 && (!contactTop || scrollY < contactTop - 220)) {
          if (aboutLink) aboutLink.classList.add("active");
        } else {
          if (homeLink) homeLink.classList.add("active");
        }
      }

      // 4. Parallax Camera Lens Rig (GPU Only)
      if (rig) {
        var rotate = scrollY * 0.045;
        var translateY = scrollY * 0.16;
        var scale = 1 + Math.min(scrollY / 5000, 0.06);
        rig.style.transform = "translate3d(-50%, calc(-50% + " + translateY + "px), 0) rotate(" + rotate + "deg) scale(" + scale + ")";
      }

      ticking = false;
    }

    window.addEventListener("scroll", function () {
      if (!ticking) {
        window.requestAnimationFrame(onFrame);
        ticking = true;
      }
    }, { passive: true });

    onFrame();
  }

  /* ---------- Dynamic Number Counters (Animated on Scroll) ---------- */
  function initStatCounters() {
    var statItems = document.querySelectorAll(".stat-num[data-count]");
    if (!statItems.length) return;

    function animateCount(el) {
      var target = parseInt(el.getAttribute("data-count"), 10) || 0;
      var suffix = el.getAttribute("data-suffix") || "";
      var duration = 1200; // ms
      var startTime = null;

      function step(timestamp) {
        if (!startTime) startTime = timestamp;
        var progress = Math.min((timestamp - startTime) / duration, 1);
        // Ease-out cubic: 1 - pow(1 - progress, 3)
        var ease = 1 - Math.pow(1 - progress, 3);
        var current = Math.floor(ease * target);
        el.textContent = current + suffix;
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          el.textContent = target + suffix;
        }
      }
      requestAnimationFrame(step);
    }

    if (!("IntersectionObserver" in window)) {
      statItems.forEach(function (el) { animateCount(el); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });

    statItems.forEach(function (el) { observer.observe(el); });
  }

  /* ---------- Mobile Nav Toggle ---------- */
  function initNavToggle() {
    var toggle = document.querySelector(".nav-toggle");
    var nav = document.querySelector(".main-nav");
    if (!toggle || !nav) return;

    toggle.addEventListener("click", function () {
      var isOpen = nav.classList.toggle("is-open");
      toggle.classList.toggle("is-open", isOpen);
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("is-open");
        toggle.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------- Scroll Reveal Animations ---------- */
  function initScrollReveal() {
    var targets = document.querySelectorAll(".reveal, .reveal-stagger");
    if (!targets.length) return;

    if (!("IntersectionObserver" in window)) {
      targets.forEach(function (t) { t.classList.add("is-visible"); });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.06, rootMargin: "0px 0px -20px 0px" }
    );

    targets.forEach(function (t) { observer.observe(t); });
  }

  /* ---------- Interactive Camera Shutter Flash ---------- */
  function initApertureFlash() {
    var aperture = document.querySelector(".aperture");
    if (!aperture) return;

    aperture.addEventListener("click", function () {
      var flash = document.createElement("div");
      flash.style.position = "fixed";
      flash.style.inset = "0";
      flash.style.background = "#fff";
      flash.style.opacity = "0.75";
      flash.style.zIndex = "99999";
      flash.style.pointerEvents = "none";
      flash.style.transition = "opacity 320ms cubic-bezier(0.16, 1, 0.3, 1)";
      document.body.appendChild(flash);

      requestAnimationFrame(function () {
        flash.style.opacity = "0";
        setTimeout(function () {
          if (flash.parentNode) flash.parentNode.removeChild(flash);
        }, 340);
      });
    });
  }

  /* ---------- Scroll Focus Engine (Dynamic Phone & Desktop Active Response) ---------- */
  function initScrollFocusEngine() {
    var focalElements = document.querySelectorAll(".card, .dept-card, .pipeline-step, .cta-glass-banner, .about-visual, .form-step-card, .pass-card, .id-download-card");
    if (!focalElements.length || !("IntersectionObserver" in window)) return;

    var focusObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-focused");
            if (!entry.target.classList.contains("light-swept")) {
              entry.target.classList.add("light-swept");
            }
          } else {
            entry.target.classList.remove("is-focused");
          }
        });
      },
      {
        threshold: 0.05,
        rootMargin: "-10% 0px -10% 0px"
      }
    );

    focalElements.forEach(function (el) {
      focusObserver.observe(el);
    });
  }

  /* ---------- Mobile Tactile Touch Feedback (Haptic Visual Spring) ---------- */
  function initMobileTouchFeedback() {
    var touchElements = document.querySelectorAll(".card, .dept-card, .pipeline-step, .btn, .hero-actions a, .pick-card, .form-step-card, .tab-btn, .portrait-dropzone, .btn-qr-color, .toggle-opt");
    touchElements.forEach(function (el) {
      el.addEventListener("touchstart", function (e) {
        if (!e.touches || !e.touches[0]) return;
        var rect = el.getBoundingClientRect();
        var touchX = e.touches[0].clientX - rect.left;
        var touchY = e.touches[0].clientY - rect.top;
        el.style.setProperty("--mouse-x", touchX + "px");
        el.style.setProperty("--mouse-y", touchY + "px");
        el.classList.add("touch-active");
      }, { passive: true });

      el.addEventListener("touchmove", function (e) {
        if (!e.touches || !e.touches[0]) return;
        var rect = el.getBoundingClientRect();
        var touchX = e.touches[0].clientX - rect.left;
        var touchY = e.touches[0].clientY - rect.top;
        el.style.setProperty("--mouse-x", touchX + "px");
        el.style.setProperty("--mouse-y", touchY + "px");
      }, { passive: true });

      el.addEventListener("touchend", function () {
        el.classList.remove("touch-active");
      }, { passive: true });

      el.addEventListener("touchcancel", function () {
        el.classList.remove("touch-active");
      }, { passive: true });
    });
  }

  /* ---------- Liquid Glass Card Cursor Spotlight (Throttled rAF) ---------- */
  function initCardGlow() {
    var cards = document.querySelectorAll(".card, .dept-card, .bento-card, .cta-glass-banner, .pass-card, .form-step-card, .id-download-card");
    cards.forEach(function (card) {
      var rafId = null;
      card.addEventListener("mousemove", function (e) {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(function () {
          var rect = card.getBoundingClientRect();
          var pxX = e.clientX - rect.left;
          var pxY = e.clientY - rect.top;
          card.style.setProperty("--mouse-x", pxX + "px");
          card.style.setProperty("--mouse-y", pxY + "px");
        });
      }, { passive: true });
    });
  }

  /* ---------- Footer Year & Admin Shortcut ---------- */
  function initFooter() {
    var els = document.querySelectorAll("[data-year]");
    var year = new Date().getFullYear();
    els.forEach(function (el) {
      el.textContent = year;
    });

    window.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "A" || e.key === "a")) {
        e.preventDefault();
        window.location.href = "../records-dashboard/records.html";
      }
    });

    var copyNotice = document.querySelector(".footer-bottom span");
    if (copyNotice) {
      copyNotice.style.cursor = "default";
      copyNotice.addEventListener("dblclick", function () {
        window.location.href = "../records-dashboard/records.html";
      });
    }
  }

  /* ---------- Liquid Glass UI Toast Notification & Popup System ---------- */
  function getOrCreateToastContainer() {
    var c = document.getElementById("uiToastContainer");
    if (!c) {
      c = document.createElement("div");
      c.id = "uiToastContainer";
      c.className = "ui-toast-container";
      c.setAttribute("aria-live", "polite");
      (document.documentElement || document.body).appendChild(c);
    }
    return c;
  }

  window.showUiToast = function (type, title, message, duration) {
    if (!message && title) {
      message = title;
      title = type === "error" ? "Action Required" : (type === "success" ? "Success" : "Notice");
    }
    type = type || "info";
    duration = duration || 4200;

    var container = getOrCreateToastContainer();
    while (container.children.length >= 2) {
      container.removeChild(container.firstChild);
    }
    var toast = document.createElement("div");
    toast.className = "ui-toast ui-toast-" + type;

    var iconSvg = "";
    if (type === "error") {
      iconSvg = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
    } else if (type === "success") {
      iconSvg = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="8 12 11 15 16 9"/></svg>';
    } else if (type === "warning") {
      iconSvg = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
    } else {
      iconSvg = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
    }

    toast.innerHTML =
      '<div class="ui-toast-icon-wrap ' + type + '">' + iconSvg + '</div>' +
      '<div class="ui-toast-body">' +
        '<div class="ui-toast-title">' + (title || "Notice") + '</div>' +
        '<div class="ui-toast-msg">' + message + '</div>' +
      '</div>' +
      '<button type="button" class="ui-toast-close" aria-label="Dismiss">&times;</button>' +
      '<div class="ui-toast-progress"><div class="ui-toast-progress-bar" style="animation-duration:' + duration + 'ms;"></div></div>';

    var closeBtn = toast.querySelector(".ui-toast-close");
    var isDismissed = false;

    function dismissToast() {
      if (isDismissed) return;
      isDismissed = true;
      toast.classList.add("is-hiding");
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }

    closeBtn.addEventListener("click", dismissToast);
    toast.addEventListener("click", function (e) {
      if (e.target !== closeBtn) dismissToast();
    });

    container.appendChild(toast);
    setTimeout(dismissToast, duration);
    return toast;
  };

  // Completely override window.alert across entire site to prevent raw browser popups
  window.alert = function (message) {
    window.showUiToast("error", "Notice", message);
  };

  /* ---------- Boot ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    initPageTransitions();
    initScrollEngine();
    initStatCounters();
    initNavToggle();
    initScrollReveal();
    initScrollFocusEngine();
    initMobileTouchFeedback();
    initApertureFlash();
    initCardGlow();
    initFooter();
  });
})();
