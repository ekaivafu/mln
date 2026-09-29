/* ==========================================================================
   MLN Alliance MediaCrew — records.js
   Full administrative records management & event attendance console:
   - Mock Event Management (Create Event, Switch Active Event)
   - Event-Scoped Attendance Tracking (In-memory + localStorage cache)
   - Dual-Purpose QR Code Parser (Google Lens URLs & plain passes)
   - Live camera QR code scanner (html5-qrcode) with camera switching
   - Multi-field filtering (Search, Dept, Experience, Event Attendance)
   - Animated executive metric counters
   - Audio feedback for check-in verification via Web Audio API
   - SheetJS Excel export scoped to active event session
   - Strictly NO database writes for events/attendance (Mock mode per user request)
   ========================================================================== */

(function () {
  "use strict";

  /* ---------- Default Mock Events ---------- */
  var DEFAULT_EVENTS = [
    {
      id: "evt_induction_2026",
      title: "MediaCrew Annual Induction & Auditions 2026",
      category: "All Departments",
      venue: "Auditorium Hall B",
      date: "2026-09-24T10:00",
      notes: "Mandatory attendance check-in for all fresh applicant auditions"
    },
    {
      id: "evt_cinematography",
      title: "Cinematography & Lighting Masterclass",
      category: "Production",
      venue: "Studio 3, Media Block",
      date: "2026-09-26T14:00",
      notes: "Hands-on studio lighting techniques and multi-cam workflows"
    },
    {
      id: "evt_design_sprint",
      title: "Visual Brand Identity & UI Design Sprint",
      category: "Designing",
      venue: "Mac Lab 2",
      date: "2026-09-28T11:30",
      notes: "Brand design, typography systems, and UI prototype showcase"
    },
    {
      id: "evt_fest_coverage",
      title: "Annual Cultural Fest 2026 — Live Broadcast Coverage",
      category: "Campus Fest",
      venue: "Main Open Amphitheatre",
      date: "2026-10-02T09:00",
      notes: "Live event broadcast, backstage coverage, and social media reels"
    }
  ];

  /* ---------- Default Mock Member Registrations (BBA College) ---------- */
  var DEFAULT_RECORDS = [
    {
      id: "MLN-24BBA1042",
      name: "Rohan Sharma",
      rollNumber: "24BBA1042",
      className: "BBA - 2nd Year (Semester 3)",
      email: "rohan.sharma@mlncollege.edu",
      mobile: "9876543210",
      interest: "production",
      activity: "Cinematography & Lighting",
      experience: "experienced",
      experienceDuration: "1.5 Years",
      registeredAt: "2026-09-20T10:14:00.000Z"
    },
    {
      id: "MLN-24BBA2018",
      name: "Priya Patel",
      rollNumber: "24BBA2018",
      className: "BBA - 1st Year (Semester 1)",
      email: "priya.patel@mlncollege.edu",
      mobile: "9812345678",
      interest: "designing",
      activity: "UI/UX & Digital Graphics",
      experience: "fresher",
      experienceDuration: "",
      registeredAt: "2026-09-20T11:30:00.000Z"
    },
    {
      id: "MLN-23BBA3011",
      name: "Aarav Mehta",
      rollNumber: "23BBA3011",
      className: "BBA - 3rd Year (Marketing)",
      email: "aarav.mehta@mlncollege.edu",
      mobile: "9765432109",
      interest: "marketing",
      activity: "Social Media Strategy",
      experience: "experienced",
      experienceDuration: "2 Years",
      registeredAt: "2026-09-21T09:00:00.000Z"
    },
    {
      id: "MLN-24BBA1089",
      name: "Sneha Verma",
      rollNumber: "24BBA1089",
      className: "BBA - 1st Year (Semester 2)",
      email: "sneha.verma@mlncollege.edu",
      mobile: "9988776655",
      interest: "production",
      activity: "Video Editing & Post",
      experience: "fresher",
      experienceDuration: "",
      registeredAt: "2026-09-21T14:22:00.000Z"
    },
    {
      id: "MLN-24BBA2045",
      name: "Kabir Kapoor",
      rollNumber: "24BBA2045",
      className: "BBA - 2nd Year (Event Mgt)",
      email: "kabir.kapoor@mlncollege.edu",
      mobile: "9823456781",
      interest: "production",
      activity: "Photography & Framing",
      experience: "experienced",
      experienceDuration: "1 Year",
      registeredAt: "2026-09-21T16:45:00.000Z"
    },
    {
      id: "MLN-24BBA1012",
      name: "Ananya Gupta",
      rollNumber: "24BBA1012",
      className: "BBA - 2nd Year (Branding)",
      email: "ananya.gupta@mlncollege.edu",
      mobile: "9711223344",
      interest: "designing",
      activity: "Visual Identity & Branding",
      experience: "experienced",
      experienceDuration: "8 Months",
      registeredAt: "2026-09-22T08:15:00.000Z"
    },
    {
      id: "MLN-23BBA4090",
      name: "Aditya Singh",
      rollNumber: "23BBA4090",
      className: "BBA - 3rd Year (PR & Comms)",
      email: "aditya.singh@mlncollege.edu",
      mobile: "9655443322",
      interest: "marketing",
      activity: "PR & Campus Outreach",
      experience: "experienced",
      experienceDuration: "2.5 Years",
      registeredAt: "2026-09-22T12:00:00.000Z"
    },
    {
      id: "MLN-24BBA2055",
      name: "Tanvi Malhotra",
      rollNumber: "24BBA2055",
      className: "BBA - 1st Year (Semester 1)",
      email: "tanvi.m@mlncollege.edu",
      mobile: "9544332211",
      interest: "designing",
      activity: "Motion Graphics & Reels",
      experience: "fresher",
      experienceDuration: "",
      registeredAt: "2026-09-22T17:40:00.000Z"
    },
    {
      id: "MLN-24BBA1023",
      name: "Harsh Vardhan",
      rollNumber: "24BBA1023",
      className: "BBA - 2nd Year (Media Studies)",
      email: "harsh.v@mlncollege.edu",
      mobile: "9433221100",
      interest: "production",
      activity: "Sound & Audio Engineering",
      experience: "fresher",
      experienceDuration: "",
      registeredAt: "2026-09-23T09:30:00.000Z"
    },
    {
      id: "MLN-23BBA3078",
      name: "Ishita Roy",
      rollNumber: "23BBA3078",
      className: "BBA - 3rd Year (Strategy)",
      email: "ishita.roy@mlncollege.edu",
      mobile: "9322110099",
      interest: "marketing",
      activity: "Event Strategy & Sponsorship",
      experience: "experienced",
      experienceDuration: "1 Year",
      registeredAt: "2026-09-23T13:10:00.000Z"
    },
    {
      id: "MLN-24BBA1102",
      name: "Devansh Joshi",
      rollNumber: "24BBA1102",
      className: "BBA - 1st Year (Semester 2)",
      email: "devansh.j@mlncollege.edu",
      mobile: "9211009988",
      interest: "production",
      activity: "Direction & Storyboarding",
      experience: "fresher",
      experienceDuration: "",
      registeredAt: "2026-09-23T15:50:00.000Z"
    },
    {
      id: "MLN-24BBA2019",
      name: "Riya Chawla",
      rollNumber: "24BBA2019",
      className: "BBA - 2nd Year (Creative Mgt)",
      email: "riya.chawla@mlncollege.edu",
      mobile: "9100998877",
      interest: "designing",
      activity: "3D Set Design & VFX",
      experience: "experienced",
      experienceDuration: "1.5 Years",
      registeredAt: "2026-09-23T18:05:00.000Z"
    }
  ];

  /* ---------- Seed Mock Attendance per Event ---------- */
  var DEFAULT_ATTENDANCE = {
    "evt_induction_2026": {
      "MLN-24BBA1042": { attendedAt: "2026-09-24T10:05:00.000Z", source: "qr" },
      "MLN-24BBA2018": { attendedAt: "2026-09-24T10:08:00.000Z", source: "qr" },
      "MLN-23BBA3011": { attendedAt: "2026-09-24T10:12:00.000Z", source: "manual" },
      "MLN-24BBA1089": { attendedAt: "2026-09-24T10:15:00.000Z", source: "qr" },
      "MLN-24BBA2045": { attendedAt: "2026-09-24T10:20:00.000Z", source: "manual" }
    },
    "evt_cinematography": {
      "MLN-24BBA1042": { attendedAt: "2026-09-26T14:02:00.000Z", source: "qr" },
      "MLN-24BBA2045": { attendedAt: "2026-09-26T14:06:00.000Z", source: "qr" },
      "MLN-24BBA1023": { attendedAt: "2026-09-26T14:10:00.000Z", source: "manual" }
    },
    "evt_design_sprint": {
      "MLN-24BBA2018": { attendedAt: "2026-09-28T11:35:00.000Z", source: "qr" },
      "MLN-24BBA1012": { attendedAt: "2026-09-28T11:40:00.000Z", source: "manual" }
    },
    "evt_fest_coverage": {}
  };

  /* ---------- State Variables ---------- */
  var records = [];
  var events = [];
  var activeEventId = "";
  var eventAttendance = {}; // maps eventId -> { [recordId]: { attendedAt, source } }

  // DOM Elements
  var tableBody = document.getElementById("recordsTableBody");
  var status = document.getElementById("recordsStatus");
  var empty = document.getElementById("recordsEmpty");
  var count = document.getElementById("recordsCount");
  var attendanceCount = document.getElementById("attendanceCount");
  var search = document.getElementById("filterSearch");
  var interest = document.getElementById("filterInterest");
  var experience = document.getElementById("filterExperience");
  var filterAttendance = document.getElementById("filterAttendance");

  // Executive Metric elements
  var metricTotal = document.getElementById("metricTotal");
  var metricPresent = document.getElementById("metricPresent");
  var metricRate = document.getElementById("metricRate");
  var metricTopTrack = document.getElementById("metricTopTrack");

  // Event Session Elements
  var eventSelect = document.getElementById("eventSelect");
  var openCreateEventBtn = document.getElementById("openCreateEventBtn");
  var createEventModal = document.getElementById("createEventModal");
  var closeCreateEventBtn = document.getElementById("closeCreateEventBtn");
  var cancelCreateEventBtn = document.getElementById("cancelCreateEventBtn");
  var createEventBackdrop = document.getElementById("createEventBackdrop");
  var createEventForm = document.getElementById("createEventForm");

  var activeEventTitle = document.getElementById("activeEventTitle");
  var activeEventDate = document.getElementById("activeEventDate");
  var activeEventVenue = document.getElementById("activeEventVenue");
  var activeEventCategory = document.getElementById("activeEventCategory");
  var scannerActiveEventName = document.getElementById("scannerActiveEventName");

  // Scanner elements
  var scannerModal = document.getElementById("scannerModal");
  var scannerFeedback = document.getElementById("scannerFeedback");
  var scanResultCard = document.getElementById("scanResultCard");
  var scanCountInfo = document.getElementById("scanCountInfo");
  var html5QrScanner = null;
  var currentCameraFacing = "environment";
  var lastScannedCode = "";
  var lastScannedTime = 0;

  /* ---------- Audio Feedback via Web Audio API ---------- */
  var audioCtx = null;
  function getAudioCtx() {
    if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
  }

  function playSuccessTone() {
    try {
      var ctx = getAudioCtx();
      if (!ctx) return;
      var now = ctx.currentTime;
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.08); // A5

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } catch (e) {}
  }

  function playAlertTone(type) {
    try {
      var ctx = getAudioCtx();
      if (!ctx) return;
      var now = ctx.currentTime;
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();

      osc.type = type === "warning" ? "triangle" : "sawtooth";
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.setValueAtTime(260, now + 0.12);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {}
  }

  /* ---------- Helpers ---------- */
  function setStatus(message, isError) {
    status.textContent = message || "";
    status.className = "status" + (isError ? " error" : "");
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatDate(value) {
    if (!value) return "-";
    var date = value.toDate ? value.toDate() : new Date(value);
    return isNaN(date.getTime()) ? "-" : date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function formatDateTimeLocal(isoString) {
    if (!isoString) return "-";
    var d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) +
      " • " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  /* ---------- Mock Events & Attendance Storage ---------- */
  function loadEvents() {
    try {
      var saved = localStorage.getItem("mln_mock_events");
      if (saved) {
        var parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          events = parsed;
          return;
        }
      }
    } catch (e) {}
    events = DEFAULT_EVENTS.slice();
    saveEvents();
  }

  function saveEvents() {
    try {
      localStorage.setItem("mln_mock_events", JSON.stringify(events));
    } catch (e) {}
  }

  function loadAttendance() {
    try {
      var saved = localStorage.getItem("mln_mock_event_attendance");
      if (saved) {
        eventAttendance = JSON.parse(saved);
        return;
      }
    } catch (e) {}
    eventAttendance = JSON.parse(JSON.stringify(DEFAULT_ATTENDANCE));
    saveAttendance();
  }

  function saveAttendance() {
    try {
      localStorage.setItem("mln_mock_event_attendance", JSON.stringify(eventAttendance));
    } catch (e) {}
  }

  function getActiveEvent() {
    return events.find(function (ev) { return ev.id === activeEventId; }) || events[0] || null;
  }

  function isStudentPresentInActiveEvent(recordId) {
    if (!activeEventId || !eventAttendance[activeEventId]) return false;
    return Boolean(eventAttendance[activeEventId][recordId]);
  }

  function getStudentAttendanceMeta(recordId) {
    if (!activeEventId || !eventAttendance[activeEventId]) return null;
    return eventAttendance[activeEventId][recordId] || null;
  }

  /* ---------- Animated Number Counter ---------- */
  var prevTotal = 0;
  var prevPresent = 0;
  var prevRate = 0;

  function animateValue(elem, start, end, duration, suffix) {
    if (!elem) return;
    suffix = suffix || "";
    if (isNaN(end)) {
      elem.textContent = end + suffix;
      return;
    }
    var startTime = null;
    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      var progress = Math.min((timestamp - startTime) / duration, 1);
      var ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      var current = Math.round(start + (end - start) * ease);
      elem.textContent = current + suffix;
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        elem.textContent = end + suffix;
      }
    }
    window.requestAnimationFrame(step);
  }

  /* ---------- Executive Metrics Update ---------- */
  function updateMetrics() {
    var total = records.length;
    var presentCount = records.filter(function (r) {
      return isStudentPresentInActiveEvent(r.id);
    }).length;
    var rate = total > 0 ? Math.round((presentCount / total) * 100) : 0;

    if (metricTotal) {
      animateValue(metricTotal, prevTotal, total, 600, "");
      prevTotal = total;
    }
    if (metricPresent) {
      animateValue(metricPresent, prevPresent, presentCount, 600, "");
      prevPresent = presentCount;
    }
    if (metricRate) {
      animateValue(metricRate, prevRate, rate, 600, "%");
      prevRate = rate;
    }

    if (metricTopTrack) {
      if (!presentCount) {
        metricTopTrack.textContent = "—";
      } else {
        var counts = {};
        records.forEach(function (r) {
          if (isStudentPresentInActiveEvent(r.id)) {
            var d = r.interest || "General";
            counts[d] = (counts[d] || 0) + 1;
          }
        });
        var top = Object.keys(counts).reduce(function (a, b) {
          return counts[a] > counts[b] ? a : b;
        }, "—");
        metricTopTrack.textContent = top ? (top.charAt(0).toUpperCase() + top.slice(1)) : "—";
      }
    }
  }

  /* ---------- Event Selector & Ribbon Rendering ---------- */
  function renderEventsDropdown() {
    if (!eventSelect) return;
    eventSelect.innerHTML = events.map(function (ev) {
      var isSelected = ev.id === activeEventId ? " selected" : "";
      return '<option value="' + escapeHtml(ev.id) + '"' + isSelected + '>' +
        escapeHtml(ev.title) + ' (' + escapeHtml(ev.category) + ')' +
        '</option>';
    }).join("");

    updateEventMetaBanner();
  }

  function updateEventMetaBanner() {
    var ev = getActiveEvent();
    if (!ev) return;

    if (activeEventTitle) activeEventTitle.textContent = ev.title;
    if (activeEventDate) activeEventDate.textContent = formatDateTimeLocal(ev.date);
    if (activeEventVenue) activeEventVenue.textContent = ev.venue;
    if (activeEventCategory) activeEventCategory.textContent = ev.category;
    if (scannerActiveEventName) scannerActiveEventName.textContent = ev.title;
  }

  /* ---------- Smooth Page Transitions ---------- */
  function initTransitions() {
    var beam = document.createElement("div");
    beam.className = "page-transition-beam";
    document.body.appendChild(beam);

    document.querySelectorAll("a[href]").forEach(function (link) {
      link.addEventListener("click", function (e) {
        var href = link.getAttribute("href");
        if (!href || href.startsWith("#") || link.getAttribute("target") === "_blank" || e.ctrlKey || e.metaKey) return;
        e.preventDefault();
        beam.classList.add("active");
        document.body.classList.add("page-leaving");
        setTimeout(function () {
          window.location.href = href;
        }, 260);
      });
    });
  }

  /* ---------- Render Table ---------- */
  function render() {
    updateMetrics();

    var query = search.value.trim().toLowerCase();
    var attFilter = filterAttendance.value;

    var filtered = records.filter(function (record) {
      var text = [record.name, record.email, record.rollNumber, record.activity].join(" ").toLowerCase();
      var matchSearch = !query || text.indexOf(query) !== -1;
      var matchInterest = !interest.value || record.interest === interest.value;
      var matchExperience = !experience.value || record.experience === experience.value;

      var isAttended = isStudentPresentInActiveEvent(record.id);
      var matchAttendance = true;
      if (attFilter === "present") matchAttendance = isAttended === true;
      if (attFilter === "unmarked") matchAttendance = !isAttended;

      return matchSearch && matchInterest && matchExperience && matchAttendance;
    });

    var totalPresent = records.filter(function (r) {
      return isStudentPresentInActiveEvent(r.id);
    }).length;
    attendanceCount.textContent = totalPresent + " present in session";

    tableBody.innerHTML = filtered.map(function (record) {
      var attMeta = getStudentAttendanceMeta(record.id);
      var isAttended = Boolean(attMeta);

      var attendanceCell = isAttended
        ? '<span class="badge-present" title="Checked in for current event session">✓ Present <small>' + escapeHtml(formatDate(attMeta.attendedAt)) + ' (' + (attMeta.source === "qr" ? "QR" : "Manual") + ')</small></span>'
        : '<button type="button" class="button small ghost mark-attendance-btn" data-id="' + escapeHtml(record.id) + '">Mark Present</button>';

      return "<tr>" +
        "<td><strong>" + escapeHtml(record.name) + "</strong><small>" + escapeHtml(record.email) + "</small></td>" +
        "<td>" + escapeHtml(record.interest) + "<small>" + escapeHtml(record.activity) + "</small></td>" +
        "<td>" + escapeHtml(record.className) + "<small>" + escapeHtml(record.rollNumber) + "</small></td>" +
        "<td>" + escapeHtml(record.mobile) + "<small>" + escapeHtml(record.experience) + (record.experienceDuration ? " - " + escapeHtml(record.experienceDuration) : "") + "</small></td>" +
        "<td>" + escapeHtml(formatDate(record.registeredAt)) + "</td>" +
        "<td>" + attendanceCell + "</td>" +
        "</tr>";
    }).join("");

    count.textContent = filtered.length + " of " + records.length + " records";
    empty.hidden = filtered.length !== 0;

    // Attach click listeners to manual check-in buttons
    tableBody.querySelectorAll(".mark-attendance-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-id");
        markAttendanceForActiveEvent(id, false);
      });
    });

    return filtered;
  }

  /* ---------- Mark Attendance (Mock Data Mode — No DB writes) ---------- */
  function markAttendanceForActiveEvent(recordId, fromScanner) {
    var record = records.find(function (r) { return r.id === recordId; });
    if (!record) return;

    if (!activeEventId) {
      var currentEv = getActiveEvent();
      if (currentEv) activeEventId = currentEv.id;
      else return;
    }

    eventAttendance[activeEventId] = eventAttendance[activeEventId] || {};
    var nowIso = new Date().toISOString();
    eventAttendance[activeEventId][recordId] = {
      attendedAt: nowIso,
      source: fromScanner ? "qr" : "manual"
    };

    saveAttendance();
    render();

    if (fromScanner) {
      playSuccessTone();
    }
  }

  /* ---------- Excel Export (Scoped to Active Event) ---------- */
  function exportExcel() {
    var filtered = render();
    if (!filtered.length) {
      setStatus("There are no records matching the current filters.", true);
      return;
    }

    var activeEv = getActiveEvent();
    var evTitle = activeEv ? activeEv.title : "Event Session";

    var rows = filtered.map(function (record) {
      var attMeta = getStudentAttendanceMeta(record.id);
      return {
        Name: record.name || "",
        RollNumber: record.rollNumber || "",
        Class: record.className || "",
        Department: record.interest || "",
        Activity: record.activity || "",
        Email: record.email || "",
        Mobile: record.mobile || "",
        Experience: record.experience || "",
        ExperienceDuration: record.experienceDuration || "",
        EventSession: evTitle,
        Attendance: attMeta ? "Present" : "Unmarked",
        AttendedAt: attMeta ? formatDate(attMeta.attendedAt) : "-",
        CheckInMethod: attMeta ? (attMeta.source === "qr" ? "Live QR Scan" : "Admin Manual") : "-",
        RegisteredAt: formatDate(record.registeredAt)
      };
    });

    var sheet = XLSX.utils.json_to_sheet(rows);
    var workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Attendance");
    var cleanSlug = evTitle.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 30);
    XLSX.writeFile(workbook, "MLN-MediaCrew-" + cleanSlug + "-Attendance.xlsx");
  }

  /* ---------- Dual-Purpose QR Code Parser ---------- */
  // Handles Google Lens / phone camera URLs:
  // e.g. http://localhost:8085/MLN-Alliance-MediaCrew/id.html?id=MLN-24BBA1042&roll=24BBA1042&name=...
  // or plain codes like "MLN-24BBA1042", "#MLN-24BBA1042", "24BBA1042"
  function parseMemberIdentifier(decodedText) {
    if (!decodedText) return { id: "", roll: "", isUrl: false };
    var raw = String(decodedText).trim();

    // Check if decoded text is a URL
    if (raw.indexOf("http://") === 0 || raw.indexOf("https://") === 0 || raw.indexOf("id.html") !== -1) {
      try {
        var parsedUrl = new URL(raw, window.location.origin);
        var urlId = (parsedUrl.searchParams.get("id") || "").replace(/^#/, "").trim();
        var urlRoll = (parsedUrl.searchParams.get("roll") || "").trim();
        return { id: urlId, roll: urlRoll, isUrl: true };
      } catch (e) {
        var idMatch = raw.match(/[?&]id=([^&#]+)/);
        var rollMatch = raw.match(/[?&]roll=([^&#]+)/);
        return {
          id: idMatch ? decodeURIComponent(idMatch[1]).replace(/^#/, "").trim() : "",
          roll: rollMatch ? decodeURIComponent(rollMatch[1]).trim() : "",
          isUrl: true
        };
      }
    }

    // Plain identifier string
    var clean = raw.replace(/^#/, "").trim();
    return { id: clean, roll: clean, isUrl: false };
  }

  /* ---------- Live Camera QR Scanner ---------- */
  function showScannerFeedback(type, message) {
    scannerFeedback.className = "scanner-feedback " + type;
    scannerFeedback.textContent = message;
    scannerFeedback.hidden = false;
  }

  function handleQrScan(decodedText) {
    var now = Date.now();
    var codeKey = String(decodedText || "").trim();

    // Debounce duplicate scans within 2 seconds
    if (codeKey === lastScannedCode && (now - lastScannedTime) < 2000) {
      return;
    }
    lastScannedCode = codeKey;
    lastScannedTime = now;

    var activeEv = getActiveEvent();
    var evTitle = activeEv ? activeEv.title : "Active Event";

    // Parse the QR Code payload (dual-purpose URL or raw pass ID)
    var parsed = parseMemberIdentifier(decodedText);

    // Search record in active database
    var match = records.find(function (r) {
      var rId = (r.id || "").toLowerCase();
      var rRoll = (r.rollNumber || "").toLowerCase();
      var pId = (parsed.id || "").toLowerCase();
      var pRoll = (parsed.roll || "").toLowerCase();

      if (pId && rId === pId) return true;
      if (pRoll && rRoll === pRoll) return true;
      if (pId && rRoll === pId) return true;
      if (pRoll && rId === pRoll) return true;
      if (pId && ("mln-" + rRoll) === pId) return true;
      if (pId && rId.replace(/^mln-/, "") === pId.replace(/^mln-/, "")) return true;
      if (pId && rRoll.replace(/^mln-/, "") === pId.replace(/^mln-/, "")) return true;
      return false;
    });

    if (match) {
      var existingAtt = getStudentAttendanceMeta(match.id);

      if (existingAtt) {
        showScannerFeedback("warning", "⚠️ Already Checked In: " + match.name + " (" + match.rollNumber + ") for " + evTitle + " at " + formatDate(existingAtt.attendedAt));
        playAlertTone("warning");
      } else {
        markAttendanceForActiveEvent(match.id, true);
        showScannerFeedback("success", "✅ Check-in Confirmed for " + evTitle + "! " + match.name + " (" + match.rollNumber + ")");
      }

      // Display student details card
      scanResultCard.innerHTML =
        "<strong>" + escapeHtml(match.name) + " &bull; " + escapeHtml(match.rollNumber) + "</strong>" +
        "<span>" + escapeHtml(match.interest) + " &mdash; " + escapeHtml(match.activity) + " (" + escapeHtml(match.className) + ")</span>";
      scanResultCard.hidden = false;

      var presentTotal = records.filter(function (r) {
        return isStudentPresentInActiveEvent(r.id);
      }).length;
      scanCountInfo.textContent = presentTotal + " students marked present for " + evTitle;
    } else {
      showScannerFeedback("error", "❌ Unrecognized QR Pass Code. Member not found in registrations: " + (parsed.roll || parsed.id || decodedText));
      playAlertTone("error");
    }
  }

  function startScanner() {
    scannerModal.hidden = false;
    var activeEv = getActiveEvent();
    showScannerFeedback("success", "Camera active. Hold member pass inside frame to record attendance for: " + (activeEv ? activeEv.title : "Session"));

    if (typeof Html5Qrcode === "undefined") {
      showScannerFeedback("error", "QR Scanner library failed to load. Please check your internet connection.");
      return;
    }

    if (!html5QrScanner) {
      html5QrScanner = new Html5Qrcode("qrReader");
    }

    var config = {
      fps: 12,
      qrbox: { width: 240, height: 240 },
      aspectRatio: 1.0
    };

    html5QrScanner.start(
      { facingMode: currentCameraFacing },
      config,
      handleQrScan,
      function () {} // silent ignore frame misses
    ).catch(function (err) {
      console.warn("Camera start failed with facingMode:", currentCameraFacing, err);
      html5QrScanner.start({ facingMode: "user" }, config, handleQrScan, function () {})
        .catch(function (e2) {
          showScannerFeedback("error", "Could not access camera. Please allow camera permissions in your browser.");
        });
    });
  }

  function stopScanner() {
    if (html5QrScanner) {
      html5QrScanner.stop().then(function () {
        html5QrScanner.clear();
      }).catch(function (err) {
        console.warn("Error stopping scanner:", err);
      });
    }
    scannerModal.hidden = true;
    scannerFeedback.hidden = true;
    scanResultCard.hidden = true;
  }

  function switchCamera() {
    if (!html5QrScanner) return;
    currentCameraFacing = currentCameraFacing === "environment" ? "user" : "environment";
    html5QrScanner.stop().then(function () {
      startScanner();
    }).catch(function () {
      startScanner();
    });
  }

  /* ---------- Create Event Modal Handlers ---------- */
  function openCreateEventModal() {
    createEventModal.hidden = false;
    var dateInput = document.getElementById("newEventDate");
    if (dateInput && !dateInput.value) {
      var d = new Date();
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      dateInput.value = d.toISOString().slice(0, 16);
    }
  }

  function closeCreateEventModal() {
    createEventModal.hidden = true;
    createEventForm.reset();
  }

  function handleCreateEventSubmit(e) {
    e.preventDefault();

    var title = document.getElementById("newEventTitle").value.trim();
    var category = document.getElementById("newEventCategory").value;
    var venue = document.getElementById("newEventVenue").value.trim();
    var date = document.getElementById("newEventDate").value;
    var notes = document.getElementById("newEventNotes").value.trim();

    if (!title || !venue || !date) {
      alert("Please fill in the required event fields.");
      return;
    }

    var newId = "evt_" + Date.now();
    var newEvent = {
      id: newId,
      title: title,
      category: category,
      venue: venue,
      date: date,
      notes: notes
    };

    events.unshift(newEvent);
    activeEventId = newId;
    saveEvents();

    // Initialize attendance set for new event
    eventAttendance[newId] = {};
    saveAttendance();

    renderEventsDropdown();
    render();
    closeCreateEventModal();
    setStatus("Event session created: '" + title + "'. Ready for live QR check-in!", false);
  }

  /* ---------- Fetch Data from Firestore & Mock Merge ---------- */
  function load() {
    loadEvents();
    activeEventId = events[0] ? events[0].id : "evt_induction_2026";
    loadAttendance();
    renderEventsDropdown();

    // Load any locally registered candidates from student portal
    var localStore = [];
    try {
      var rawLocal = localStorage.getItem("mln_local_registrations");
      if (rawLocal) localStore = JSON.parse(rawLocal);
    } catch (e) {}

    // Initial base records: merge default mock students with any local registrations
    var baseMap = {};
    DEFAULT_RECORDS.forEach(function (r) { baseMap[r.id] = r; });
    if (Array.isArray(localStore)) {
      localStore.forEach(function (r) {
        if (r && r.id) baseMap[r.id] = r;
      });
    }

    records = Object.values(baseMap);
    render(); // Immediate instant render so admin UI is never blank

    // 1. Fetch from first-party API (immune to client-side ad-blockers)
    fetch("/api/records")
      .then(function (res) { return res.json(); })
      .then(function (resData) {
        if (resData && resData.success && Array.isArray(resData.records) && resData.records.length > 0) {
          resData.records.forEach(function (r) {
            if (r && r.id) baseMap[r.id] = r;
          });
          records = Object.values(baseMap);
          records.sort(function (a, b) {
            return new Date(b.registeredAt || 0) - new Date(a.registeredAt || 0);
          });
          render();
        }
      })
      .catch(function () {});

    // 2. If client Firestore is available, attempt real-time sync with strict timeout
    if (window.MLN_FIREBASE && window.MLN_FIREBASE.isConfigured && window.MLN_FIREBASE.db) {
      var firestoreGet = window.MLN_FIREBASE.db.collection("registrations").get();
      var timeout = new Promise(function (_, reject) {
        setTimeout(function () { reject(new Error("Timeout")); }, 1600);
      });

      Promise.race([firestoreGet, timeout])
        .then(function (snapshot) {
          if (snapshot && !snapshot.empty) {
            snapshot.docs.forEach(function (doc) {
              var data = doc.data();
              data.id = doc.id;
              baseMap[doc.id] = data;
            });
            records = Object.values(baseMap);
          }

          records.sort(function (a, b) {
            return new Date(b.registeredAt || 0) - new Date(a.registeredAt || 0);
          });

          setStatus("");
          render();
        })
        .catch(function (error) {
          setStatus("");
          render();
        });
    } else {
      setStatus("");
      render();
    }
  }

  /* ---------- Event Listeners ---------- */
  [search, interest, experience, filterAttendance].forEach(function (element) {
    element.addEventListener("input", render);
    element.addEventListener("change", render);
  });

  if (eventSelect) {
    eventSelect.addEventListener("change", function (e) {
      activeEventId = e.target.value;
      updateEventMetaBanner();
      render();
    });
  }

  if (openCreateEventBtn) openCreateEventBtn.addEventListener("click", openCreateEventModal);
  if (closeCreateEventBtn) closeCreateEventBtn.addEventListener("click", closeCreateEventModal);
  if (cancelCreateEventBtn) cancelCreateEventBtn.addEventListener("click", closeCreateEventModal);
  if (createEventBackdrop) createEventBackdrop.addEventListener("click", closeCreateEventModal);
  if (createEventForm) createEventForm.addEventListener("submit", handleCreateEventSubmit);

  document.getElementById("exportRecords").addEventListener("click", exportExcel);
  document.getElementById("openScannerBtn").addEventListener("click", startScanner);
  document.getElementById("closeScannerBtn").addEventListener("click", stopScanner);
  document.getElementById("stopScannerBtn").addEventListener("click", stopScanner);
  document.getElementById("switchCameraBtn").addEventListener("click", switchCamera);
  document.getElementById("scannerBackdrop").addEventListener("click", stopScanner);

  initTransitions();
  load();
})();
