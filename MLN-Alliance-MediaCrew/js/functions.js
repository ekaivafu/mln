/* ==========================================================================
   MLN Alliance MediaCrew — functions.js
   Handles department selection on functions.html and renders that
   department's activities dynamically.
   ========================================================================== */

(function () {
  "use strict";

  /* ---------- Icon library (inline SVG strings, no external assets needed) ---------- */
  var ICONS = {
    video: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="6" width="13" height="12" rx="2"/><path d="M15.5 10.5l6-3.5v10l-6-3.5"/></svg>',
    camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8a2 2 0 0 1 2-2h1.5l1-1.5h9l1 1.5H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z"/><circle cx="12" cy="13" r="3.4"/></svg>',
    scissors: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><line x1="20" y1="4" x2="8.5" y2="15.5"/><line x1="8.5" y1="8.5" x2="20" y2="20"/></svg>',
    photoEdit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="14" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M3 15l5-5 4 4 4-6 5 7"/><path d="M17 21l2-2 2 2"/></svg>',
    brush: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 14.5L4 20"/><path d="M9.5 14.5c-1.2-1.2-1.2-3 0-4.2l7-7c1-1 2.6-1 3.5 0 .9.9.9 2.5 0 3.5l-7 7c-1.2 1.2-3 1.2-4.2 0z"/></svg>',
    poster: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2.5" width="16" height="19" rx="2"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="12.5" y2="15"/></svg>',
    thumb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="5" width="19" height="13" rx="2.4"/><path d="M9.5 9l5 3.2-5 3V9z"/></svg>',
    cover: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="12" height="18" rx="1.5"/><line x1="7.5" y1="7.5" x2="12.5" y2="7.5"/><line x1="7.5" y1="10.5" x2="12.5" y2="10.5"/><path d="M16 8l4-2v13l-4 2"/></svg>',
    digital: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r="1"/></svg>',
    strategy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V5M4 19h16M8 15l3-4 3 2.5L18 8"/></svg>',
    blog: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h13l3 3v13H4z"/><line x1="8" y1="9" x2="15" y2="9"/><line x1="8" y1="13" x2="15" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/></svg>'
  };

  /* ---------- Department + activity data ---------- */
  var DEPARTMENTS = {
    production: {
      label: "Production",
      subtitle: "Behind and in front of the lens — telling stories through motion and stills.",
      icon: ICONS.camera,
      tone: "tone-production",
      activities: [
        {
          icon: ICONS.video,
          name: "Videography",
          intro: "Shoot campus events, interviews and short films with proper camera craft.",
          learn: "Camera handling, shot composition, lighting basics and on-location coverage."
        },
        {
          icon: ICONS.camera,
          name: "Photography",
          intro: "Capture events, portraits and campus life through a trained creative eye.",
          learn: "Exposure control, framing, candid and portrait techniques, and event coverage."
        },
        {
          icon: ICONS.scissors,
          name: "Video Editing",
          intro: "Turn raw footage into polished, story-driven videos and reels.",
          learn: "Timeline editing, pacing, colour correction, transitions and sound syncing."
        },
        {
          icon: ICONS.photoEdit,
          name: "Photo Editing",
          intro: "Retouch and enhance photographs to a publish-ready professional standard.",
          learn: "Colour grading, retouching, composition fixes and export workflows."
        }
      ]
    },
    designing: {
      label: "Designing",
      subtitle: "Visual identity, layout and artwork for every club and campus initiative.",
      icon: ICONS.brush,
      tone: "tone-design",
      activities: [
        {
          icon: ICONS.brush,
          name: "Graphic Designing",
          intro: "Create logos, social creatives and brand assets from scratch.",
          learn: "Design software, colour theory, typography and layout principles."
        },
        {
          icon: ICONS.poster,
          name: "Poster Making",
          intro: "Design eye-catching posters for events, workshops and announcements.",
          learn: "Visual hierarchy, messaging clarity, print-ready formatting and templates."
        },
        {
          icon: ICONS.thumb,
          name: "Thumbnail Design",
          intro: "Craft scroll-stopping thumbnails for video and social content.",
          learn: "Click-worthy composition, contrast, typography for small formats and A/B testing."
        },
        {
          icon: ICONS.cover,
          name: "Cover Page Design",
          intro: "Design cover pages and title art for reports, magazines and decks.",
          learn: "Grid layouts, brand consistency, print vs digital sizing and file preparation."
        }
      ]
    },
    marketing: {
      label: "Marketing",
      subtitle: "Growing reach, engagement and brand voice across digital platforms.",
      icon: ICONS.digital,
      tone: "tone-marketing",
      activities: [
        {
          icon: ICONS.digital,
          name: "Digital Marketing",
          intro: "Plan campaigns that get club events and initiatives real visibility.",
          learn: "Campaign planning, audience targeting, analytics and platform strategy."
        },
        {
          icon: ICONS.instagram,
          name: "Instagram Page Handling",
          intro: "Manage posting schedules, stories and community replies for the club page.",
          learn: "Content calendars, captions, reels strategy and engagement tracking."
        },
        {
          icon: ICONS.strategy,
          name: "Content Strategy",
          intro: "Plan what gets published, when, and why — across every platform.",
          learn: "Audience research, content pillars, messaging frameworks and performance review."
        },
        {
          icon: ICONS.blog,
          name: "Personal Blogging",
          intro: "Write and publish blogs that build a personal or club voice online.",
          learn: "Long-form writing, SEO basics, storytelling structure and publishing tools."
        }
      ]
    }
  };

  // Expose data for register.js to reuse (kept simple, no build tooling)
  window.MLN_DEPARTMENTS = DEPARTMENTS;

  function renderDeptCounts() {
    document.querySelectorAll(".dept-select-card").forEach(function (card) {
      var key = card.getAttribute("data-dept");
      var countEl = card.querySelector(".dept-count-num");
      if (key && countEl && DEPARTMENTS[key]) {
        countEl.textContent = DEPARTMENTS[key].activities.length;
      }
    });
  }

  function renderActivities(deptKey) {
    var dept = DEPARTMENTS[deptKey];
    var detail = document.getElementById("deptDetail");
    var grid = document.getElementById("activityGrid");
    var titleEl = document.getElementById("deptDetailTitle");
    var subEl = document.getElementById("deptDetailSubtitle");
    if (!dept || !detail || !grid) return;

    titleEl.textContent = dept.label + " Activities";
    subEl.textContent = dept.subtitle;

    grid.innerHTML = "";
    dept.activities.forEach(function (activity) {
      var card = document.createElement("article");
      card.className = "card activity-card";
      var applyUrl = "register.html?dept=" + encodeURIComponent(deptKey) + "&activity=" + encodeURIComponent(activity.name);
      card.innerHTML =
        '<div class="card-icon">' + activity.icon + "</div>" +
        "<h3>" + activity.name + "</h3>" +
        "<p>" + activity.intro + "</p>" +
        '<span class="learn-label">What you will learn</span>' +
        "<p>" + activity.learn + "</p>" +
        '<a href="' + applyUrl + '" class="activity-apply-btn"><span>Apply for this Track</span><span>&rarr;</span></a>';
      grid.appendChild(card);
    });

    detail.classList.add("is-shown");
    document.getElementById("deptSelectSection").setAttribute("aria-hidden", "true");

    document.querySelectorAll(".dept-select-card").forEach(function (c) {
      c.classList.toggle("is-active", c.getAttribute("data-dept") === deptKey);
    });

    // Smooth scroll to the newly revealed detail block
    window.setTimeout(function () {
      detail.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }

  function showSelection() {
    var detail = document.getElementById("deptDetail");
    detail.classList.remove("is-shown");
    document.getElementById("deptSelectSection").removeAttribute("aria-hidden");
    document.querySelectorAll(".dept-select-card").forEach(function (c) {
      c.classList.remove("is-active");
    });
    document.getElementById("deptSelectSection").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function init() {
    renderDeptCounts();

    document.querySelectorAll(".dept-select-card").forEach(function (card) {
      card.addEventListener("click", function () {
        var key = card.getAttribute("data-dept");
        renderActivities(key);
      });
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          card.click();
        }
      });
    });

    var backBtn = document.getElementById("backToDepts");
    if (backBtn) {
      backBtn.addEventListener("click", showSelection);
    }

    // Allow direct linking, e.g. functions.html#marketing
    var hash = window.location.hash.replace("#", "");
    if (hash && DEPARTMENTS[hash]) {
      renderActivities(hash);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
