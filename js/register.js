/* ==========================================================================
   MLN Alliance MediaCrew — register.js
   Handles the registration form:
   - Dynamic activity list
   - Query parameter deep-linking (dept & activity preselection)
   - Indian mobile & roll number formatting
   - Draft autosave and restore via localStorage
   - Form validation & Firestore persistence with document ID generation
   - Seamless pass data redirect to thankyou.html
   ========================================================================== */

(function () {
  "use strict";

  /* ---------- Activity data per department ---------- */
  var ACTIVITIES = {
    production: ["Videography", "Photography", "Video Editing", "Photo Editing"],
    designing: ["Graphic Designing", "Poster Making", "Thumbnail Design", "Cover Page Design"],
    marketing: ["Digital Marketing", "Instagram Page Handling", "Content Strategy", "Personal Blogging"]
  };

  function computeDeterministicPermanentId(email, roll) {
    var cleanRoll = (roll || "").trim().replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    if (cleanRoll) {
      return "MLN-" + cleanRoll;
    }
    var cleanEmail = (email || "").trim().toLowerCase();
    if (cleanEmail) {
      var h = 2166136261;
      for (var i = 0; i < cleanEmail.length; i++) {
        h ^= cleanEmail.charCodeAt(i);
        h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
      }
      var num = (Math.abs(h) % 900000) + 100000;
      return "MLN-" + num;
    }
    return "MLN-" + Math.floor(100000 + Math.random() * 900000);
  }

  function getPermanentMemberId(email, roll) {
    if (existingRecordData && existingRecordData.id) {
      return existingRecordData.id;
    }
    var cleanEmail = (email || "").trim().toLowerCase();
    var cleanRoll = (roll || "").trim().replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    try {
      var rawStore = localStorage.getItem("mln_local_registrations");
      if (rawStore) {
        var list = JSON.parse(rawStore);
        var match = list.find(function(it) {
          return (cleanEmail && it.email && it.email.trim().toLowerCase() === cleanEmail) ||
                 (cleanRoll && it.rollNumber && it.rollNumber.trim().toUpperCase() === cleanRoll);
        });
        if (match && match.id) return match.id;
      }
    } catch (e) {}
    try {
      var lastPass = localStorage.getItem("mln_last_pass");
      if (lastPass) {
        var lp = JSON.parse(lastPass);
        if ((cleanEmail && lp.email && lp.email.trim().toLowerCase() === cleanEmail) ||
            (cleanRoll && lp.rollNumber && lp.rollNumber.trim().toUpperCase() === cleanRoll)) {
          if (lp.id) return lp.id;
        }
      }
    } catch (e) {}
    return computeDeterministicPermanentId(email, roll);
  }

  /* ==========================================================================
     RegistrationStore — Firestore persistence boundary
     ========================================================================== */
  var RegistrationStore = {
    getDatabase: function () {
      if (!window.MLN_FIREBASE || !window.MLN_FIREBASE.isConfigured || !window.MLN_FIREBASE.db) {
        return Promise.reject(new Error("Firebase is not configured."));
      }
      return Promise.resolve(window.MLN_FIREBASE.db);
    },

    save: function (registration, existingDocId) {
      return this.getDatabase().then(function (db) {
        var cleanEmail = (registration.email || "").trim().toLowerCase();
        var targetDocId = existingDocId || registration.id || getPermanentMemberId(cleanEmail, registration.rollNumber);
        registration.id = targetDocId;

        return db.collection("registrations").doc(targetDocId).get()
          .then(function (snap) {
            if (snap.exists) {
              return snap.ref.set(registration, { merge: true }).then(function () { return { id: targetDocId }; });
            }
            if (cleanEmail) {
              return db.collection("registrations").where("email", "==", cleanEmail).limit(1).get()
                .then(function (qSnap) {
                  if (!qSnap.empty) {
                    var oldDoc = qSnap.docs[0];
                    var oldId = oldDoc.id;
                    registration.id = oldId;
                    return oldDoc.ref.set(registration, { merge: true }).then(function () { return { id: oldId }; });
                  }
                  return db.collection("registrations").doc(targetDocId).set(registration).then(function () { return { id: targetDocId }; });
                });
            }
            return db.collection("registrations").doc(targetDocId).set(registration).then(function () { return { id: targetDocId }; });
          });
      });
    },

    findByRoll: function (rollNumber) {
      var cleanRoll = (rollNumber || "").trim().toUpperCase();
      if (!cleanRoll) return Promise.resolve(null);

      // Check localStorage first for instant response
      try {
        var local = localStorage.getItem("mln_last_pass");
        if (local) {
          var parsed = JSON.parse(local);
          if (parsed && (parsed.rollNumber || "").trim().toUpperCase() === cleanRoll) {
            return Promise.resolve(parsed);
          }
        }
      } catch (e) {}

      return this.getDatabase()
        .then(function (db) {
          return db.collection("registrations").where("rollNumber", "==", cleanRoll).get();
        })
        .then(function (snapshot) {
          if (!snapshot.empty) {
            var doc = snapshot.docs[0];
            var data = doc.data();
            data.id = doc.id;
            return data;
          }
          // Also try with original case in case old records were stored mixed case
          var origRoll = (rollNumber || "").trim();
          if (origRoll !== cleanRoll) {
            return window.MLN_FIREBASE.db.collection("registrations").where("rollNumber", "==", origRoll).get()
              .then(function (snap2) {
                if (!snap2.empty) {
                  var doc2 = snap2.docs[0];
                  var data2 = doc2.data();
                  data2.id = doc2.id;
                  return data2;
                }
                return null;
              });
          }
          return null;
        });
    }
  };

  /* ---------- Element refs ---------- */
  var form,
    interestInputs,
    activityGrid,
    experienceInputs,
    experienceDurationGroup,
    experienceDurationInput,
    submitBtn,
    formAlert,
    stepFill;

  function cacheElements() {
    form = document.getElementById("registerForm");
    interestInputs = document.querySelectorAll('input[name="interest"]');
    activityGrid = document.getElementById("activityPickGrid");
    experienceInputs = document.querySelectorAll('input[name="experience"]');
    experienceDurationGroup = document.getElementById("experienceDurationGroup");
    experienceDurationInput = document.getElementById("experienceDuration");
    submitBtn = document.getElementById("submitBtn");
    formAlert = document.getElementById("formAlert");
    stepFill = document.getElementById("stepFill");
  }

  /* ---------- Dynamic activity rendering based on chosen interest ---------- */
  function renderActivityOptions(deptKey, preselectedActivity) {
    if (!activityGrid) return;
    activityGrid.innerHTML = "";

    if (!deptKey || !ACTIVITIES[deptKey]) {
      var placeholder = document.createElement("p");
      placeholder.className = "activity-placeholder";
      placeholder.textContent = "Select an area of interest above to see its activities.";
      activityGrid.appendChild(placeholder);
      return;
    }

    ACTIVITIES[deptKey].forEach(function (activityName, index) {
      var id = "activity_" + deptKey + "_" + index;

      var wrapper = document.createElement("label");
      wrapper.className = "pick-card";
      wrapper.setAttribute("for", id);

      var input = document.createElement("input");
      input.type = "radio";
      input.name = "activity";
      input.id = id;
      input.value = activityName;
      input.required = true;

      if (preselectedActivity && activityName.toLowerCase() === preselectedActivity.toLowerCase()) {
        input.checked = true;
      }

      input.addEventListener("change", function () {
        clearFieldError(document.getElementById("activityGroupWrap"));
        updateProgress();
      });

      var body = document.createElement("span");
      body.className = "pick-card-body";
      body.innerHTML = "<span>" + activityName + "</span>";

      wrapper.appendChild(input);
      wrapper.appendChild(body);
      activityGrid.appendChild(wrapper);
    });
  }

  function handleInterestChange(e) {
    var deptKey = e.target.value;
    renderActivityOptions(deptKey, null);
    clearFieldError(document.getElementById("interestGroup"));
    updateProgress();
  }

  /* ---------- Experience duration show/hide ---------- */
  function handleExperienceChange(e) {
    var isExperienced = e.target.value === "experienced";
    if (isExperienced) {
      experienceDurationGroup.classList.add("is-shown");
      experienceDurationInput.setAttribute("required", "required");
    } else {
      experienceDurationGroup.classList.remove("is-shown");
      experienceDurationInput.removeAttribute("required");
      experienceDurationInput.value = "";
      clearFieldError(experienceDurationGroup);
    }
    clearFieldError(document.getElementById("experienceGroup"));
    updateProgress();
  }

  /* ---------- Validation helpers ---------- */
  function setFieldError(fieldGroup, message) {
    if (!fieldGroup) return;
    fieldGroup.classList.add("has-error");
    var msg = fieldGroup.querySelector(".error-msg");
    if (msg) msg.textContent = message;
  }

  function clearFieldError(fieldGroup) {
    if (!fieldGroup) return;
    fieldGroup.classList.remove("has-error");
  }

  function clearAllErrors() {
    document.querySelectorAll(".field-group").forEach(function (fg) {
      clearFieldError(fg);
    });
    hideAlert();
  }

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var MOBILE_RE = /^[6-9]\d{9}$/; // 10-digit Indian mobile number

  /* ==========================================================================
     Email OTP Verification Engine & Edit Mode
     ========================================================================== */
  var isEmailVerified = false;
  var verifiedEmailAddress = "";
  var currentGeneratedOtp = null;
  var otpExpiryTimeout = null;
  var resendCountdownInterval = null;
  var isEditMode = false;
  var existingRecordData = null;

  function initEmailOtpAuth() {
    var authEmailInput = document.getElementById("authEmail");
    var btnSendOtp = document.getElementById("btnSendOtp");
    var otpBox = document.getElementById("otpBox");
    var otpEmailTarget = document.getElementById("otpEmailTarget");
    var otpDigits = document.querySelectorAll(".otp-digit");
    var btnVerifyOtp = document.getElementById("btnVerifyOtp");
    var btnResendOtp = document.getElementById("btnResendOtp");
    var otpTimerText = document.getElementById("otpTimerText");
    var otpDemoHint = document.getElementById("otpDemoHint");
    var verifiedBanner = document.getElementById("verifiedBanner");
    var verifiedEmailText = document.getElementById("verifiedEmailText");
    var verifiedEmailHidden = document.getElementById("verifiedEmailHidden");
    var formGatedContent = document.getElementById("formGatedContent");
    var btnChangeEmail = document.getElementById("btnChangeEmail");
    var authEmailInputRow = document.getElementById("authEmailInputRow");

    if (!btnSendOtp || !authEmailInput) return;

    // Check URL parameters for edit mode or prefilled roll/email
    var urlParams = new URLSearchParams(window.location.search);
    var prefillEmail = urlParams.get("email");
    var prefillRoll = urlParams.get("roll");

    if (prefillEmail) {
      authEmailInput.value = prefillEmail;
    } else if (prefillRoll) {
      // Look up email by roll in localStorage
      try {
        var rawStore = localStorage.getItem("mln_local_registrations");
        if (rawStore) {
          var list = JSON.parse(rawStore);
          var found = list.find(function (it) {
            return it.rollNumber && it.rollNumber.trim().toUpperCase() === prefillRoll.trim().toUpperCase();
          });
          if (found && found.email) {
            authEmailInput.value = found.email;
          }
        }
      } catch (e) {}
    }

    // Digits input navigation (auto-focus next, backspace previous, paste)
    otpDigits.forEach(function (input, idx) {
      input.addEventListener("input", function () {
        var val = input.value.replace(/\D/g, "");
        input.value = val ? val.charAt(val.length - 1) : "";
        if (input.value && idx < otpDigits.length - 1) {
          otpDigits[idx + 1].focus();
        }
      });

      input.addEventListener("keydown", function (e) {
        if (e.key === "Backspace" && !input.value && idx > 0) {
          otpDigits[idx - 1].focus();
        }
      });

      input.addEventListener("paste", function (e) {
        e.preventDefault();
        var paste = (e.clipboardData || window.clipboardData).getData("text").replace(/\D/g, "");
        if (paste.length) {
          for (var i = 0; i < otpDigits.length; i++) {
            otpDigits[i].value = paste.charAt(i) || "";
          }
          if (paste.length >= otpDigits.length) {
            otpDigits[otpDigits.length - 1].focus();
          } else {
            otpDigits[paste.length].focus();
          }
        }
      });
    });

    var lastReceivedHashToken = null;

    // Send OTP function
    function sendOtp(email) {
      btnSendOtp.disabled = true;
      btnSendOtp.innerHTML = '<span>Sending code...</span>';

      fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email })
      })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        handleOtpSentResponse(data, email);
      })
      .catch(function () {
        // Pure client-side fallback if serverless API is completely unavailable
        var fallbackOtp = Math.floor(100000 + Math.random() * 900000).toString();
        handleOtpSentResponse({ success: true, otp: fallbackOtp, mode: 'demo' }, email);
      });
    }

    function handleOtpSentResponse(data, email) {
      btnSendOtp.disabled = false;
      btnSendOtp.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg><span>Send Verification OTP</span>';

      if (data && data.success) {
        lastReceivedHashToken = data.hashToken || null;
        currentGeneratedOtp = data.otp ? String(data.otp) : null;
        otpEmailTarget.textContent = email;
        otpBox.hidden = false;
        otpBox.style.setProperty("display", "block", "important");
        clearFieldError(document.getElementById("authEmailGroup"));

        var deliveryNotice = document.getElementById("otpDeliveryNotice");
        var noticeEmail = document.getElementById("otpNoticeEmail");

        // If real email was sent via SMTP
        if (data.mode === 'email_sent') {
          if (deliveryNotice) {
            if (noticeEmail) noticeEmail.textContent = email;
            deliveryNotice.style.display = "flex";
          }
          if (otpDemoHint) otpDemoHint.style.display = "none";
        } else {
          // Fallback / Demo Mode when SMTP is not configured
          if (deliveryNotice) deliveryNotice.style.display = "none";
          if (otpDemoHint && data.otp) {
            var noticeMsg = data.message || "Configure SMTP credentials (GMAIL_USER & GMAIL_APP_PASSWORD) in Vercel or .env to dispatch real emails directly to inboxes.";
            otpDemoHint.innerHTML = "<div style='color:var(--text-mid); font-size:0.8rem; margin-bottom:6px;'>ℹ️ " + noticeMsg + "</div><div>Test Code: <b style='color:#00f2a1; font-size:1.2rem; letter-spacing:4px; font-family:monospace;'>" + data.otp + "</b></div>";
            otpDemoHint.style.display = "block";
          }
        }

        // Start 60s cooldown for resend
        startResendCountdown();
        // Start 5-minute expiry timer
        startExpiryTimer();

        if (window.showUiToast) {
          window.showUiToast("success", "OTP Dispatched", "6-digit code sent to " + email);
        }

        // Clear and focus first OTP digit
        otpDigits.forEach(function (d) { d.value = ""; });
        otpDigits[0].focus();
      } else {
        setFieldError(document.getElementById("authEmailGroup"), (data && data.error) || "Could not send OTP. Please try again.");
        if (window.showUiToast) {
          window.showUiToast("error", "Dispatch Failed", (data && data.error) || "Could not send verification code.");
        }
      }
    }

    function startResendCountdown() {
      if (resendCountdownInterval) clearInterval(resendCountdownInterval);
      btnResendOtp.disabled = true;
      var remaining = 60;
      btnResendOtp.textContent = "Resend Code (" + remaining + "s)";
      resendCountdownInterval = setInterval(function () {
        remaining--;
        if (remaining <= 0) {
          clearInterval(resendCountdownInterval);
          btnResendOtp.disabled = false;
          btnResendOtp.textContent = "Resend Code";
        } else {
          btnResendOtp.textContent = "Resend Code (" + remaining + "s)";
        }
      }, 1000);
    }

    function startExpiryTimer() {
      if (otpExpiryTimeout) clearInterval(otpExpiryTimeout);
      var totalSec = 300; // 5 minutes
      updateTimerDisplay(totalSec);
      otpExpiryTimeout = setInterval(function () {
        totalSec--;
        if (totalSec <= 0) {
          clearInterval(otpExpiryTimeout);
          currentGeneratedOtp = null;
          lastReceivedHashToken = null;
          if (otpTimerText) otpTimerText.textContent = "Code Expired";
          btnVerifyOtp.disabled = true;
        } else {
          updateTimerDisplay(totalSec);
        }
      }, 1000);
    }

    function updateTimerDisplay(sec) {
      if (!otpTimerText) return;
      var m = Math.floor(sec / 60);
      var s = sec % 60;
      otpTimerText.textContent = "Expires in " + (m < 10 ? "0" + m : m) + ":" + (s < 10 ? "0" + s : s);
    }

    btnSendOtp.addEventListener("click", function () {
      var email = authEmailInput.value.trim().toLowerCase();
      if (!email || !EMAIL_RE.test(email)) {
        setFieldError(document.getElementById("authEmailGroup"), "Please enter a valid email address.");
        authEmailInput.focus();
        return;
      }
      sendOtp(email);
    });

    btnResendOtp.addEventListener("click", function () {
      var email = authEmailInput.value.trim().toLowerCase();
      if (email && EMAIL_RE.test(email)) sendOtp(email);
    });

    function onVerificationSuccess() {
      isEmailVerified = true;
      verifiedEmailAddress = authEmailInput.value.trim().toLowerCase();
      if (verifiedEmailHidden) verifiedEmailHidden.value = verifiedEmailAddress;

      // Update UI
      if (verifiedEmailText) verifiedEmailText.textContent = verifiedEmailAddress;
      if (verifiedBanner) {
        verifiedBanner.hidden = false;
        verifiedBanner.style.setProperty("display", "flex", "important");
        verifiedBanner.classList.add("is-active");
      }
      if (authEmailInputRow) authEmailInputRow.style.setProperty("display", "none", "important");
      if (otpBox) {
        otpBox.hidden = true;
        otpBox.style.setProperty("display", "none", "important");
      }
      if (otpExpiryTimeout) clearInterval(otpExpiryTimeout);
      if (resendCountdownInterval) clearInterval(resendCountdownInterval);

      // Unlock Form
      if (formGatedContent) formGatedContent.classList.remove("is-locked");

      if (window.showUiToast) {
        window.showUiToast("success", "Email Verified", "Identity confirmed! Form unlocked.");
      }

      // Check if this verified email or roll already exists for editing
      checkExistingMemberRecord(verifiedEmailAddress);
    }

    function onVerificationFail(msg) {
      var container = document.getElementById("otpDigitsContainer");
      if (container) {
        container.style.animation = "shake 0.4s ease";
        setTimeout(function () { container.style.animation = ""; }, 400);
      }
      if (window.showUiToast) {
        window.showUiToast("error", "Verification Failed", msg || "Incorrect verification code. Please check and try again.");
      } else {
        alert(msg || "Incorrect verification code. Please check and try again.");
      }
    }

    btnVerifyOtp.addEventListener("click", function () {
      var enteredCode = Array.from(otpDigits).map(function (d) { return d.value; }).join("");
      if (enteredCode.length !== 6) {
        if (window.showUiToast) {
          window.showUiToast("warning", "Code Incomplete", "Please enter all 6 digits of the verification code.");
        } else {
          alert("Please enter all 6 digits of the verification code.");
        }
        return;
      }

      btnVerifyOtp.disabled = true;
      btnVerifyOtp.textContent = "Verifying...";

      fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: authEmailInput.value.trim().toLowerCase(),
          otp: enteredCode,
          hashToken: lastReceivedHashToken
        })
      })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        btnVerifyOtp.disabled = false;
        btnVerifyOtp.textContent = "Verify & Unlock Form";
        if (data && data.success && data.verified) {
          onVerificationSuccess();
        } else {
          onVerificationFail((data && data.error) || "Incorrect verification code. Please check your inbox and try again.");
        }
      })
      .catch(function () {
        btnVerifyOtp.disabled = false;
        btnVerifyOtp.textContent = "Verify & Unlock Form";
        // Local offline match fallback
        if (currentGeneratedOtp && enteredCode === currentGeneratedOtp) {
          onVerificationSuccess();
        } else {
          onVerificationFail("Incorrect verification code. Please try again.");
        }
      });
    });

    if (btnChangeEmail) {
      btnChangeEmail.addEventListener("click", function () {
        if (confirm("Changing your email will lock the form and require re-verification. Continue?")) {
          isEmailVerified = false;
          verifiedEmailAddress = "";
          if (verifiedEmailHidden) verifiedEmailHidden.value = "";
          if (verifiedBanner) {
            verifiedBanner.hidden = true;
            verifiedBanner.style.setProperty("display", "none", "important");
            verifiedBanner.classList.remove("is-active");
          }
          if (authEmailInputRow) authEmailInputRow.style.setProperty("display", "flex", "important");
          if (otpBox) {
            otpBox.hidden = true;
            otpBox.style.setProperty("display", "none", "important");
          }
          if (formGatedContent) formGatedContent.classList.add("is-locked");
          authEmailInput.focus();
        }
      });
    }
  }

  /* Check existing record to enable "Edit Portfolio Mode" */
  function checkExistingMemberRecord(email) {
    var cleanEmail = (email || "").trim().toLowerCase();
    var foundRecord = null;

    // Check localStorage
    try {
      var raw = localStorage.getItem("mln_local_registrations");
      if (raw) {
        var list = JSON.parse(raw);
        foundRecord = list.find(function (it) {
          return it.email && it.email.trim().toLowerCase() === cleanEmail;
        });
      }
      if (!foundRecord) {
        var last = localStorage.getItem("mln_last_pass");
        if (last) {
          var p = JSON.parse(last);
          if (p.email && p.email.trim().toLowerCase() === cleanEmail) {
            foundRecord = p;
          }
        }
      }
    } catch (e) {}

    if (foundRecord) {
      applyExistingRecordToForm(foundRecord);
    } else if (window.MLN_FIREBASE && window.MLN_FIREBASE.isConfigured && window.MLN_FIREBASE.db) {
      window.MLN_FIREBASE.db.collection("registrations").where("email", "==", cleanEmail).get()
        .then(function (snap) {
          if (!snap.empty) {
            var doc = snap.docs[0];
            var d = doc.data();
            d.id = doc.id;
            applyExistingRecordToForm(d);
          }
        }).catch(function () {});
    }
  }

  function applyExistingRecordToForm(rec) {
    isEditMode = true;
    existingRecordData = rec;

    var badge = document.getElementById("verifiedRoleBadge");
    if (badge) {
      badge.textContent = "✓ Member Record Found (Edit Mode)";
      badge.style.color = "var(--blue-400)";
    }
    var desc = document.getElementById("verifiedModeDesc");
    if (desc) {
      desc.textContent = "You can update your portfolio links, portrait photo, and details.";
    }

    var submitBtn = document.getElementById("submitBtn");
    if (submitBtn) {
      submitBtn.textContent = "Save & Update Portfolio Details";
    }

    var previewModeBadge = document.getElementById("previewPassModeBadge");
    if (previewModeBadge) previewModeBadge.textContent = "Editing Profile";

    // Populate Fields
    if (rec.name && document.getElementById("name")) document.getElementById("name").value = rec.name;
    if (rec.className && document.getElementById("className")) document.getElementById("className").value = rec.className;
    if (rec.rollNumber && document.getElementById("rollNumber")) document.getElementById("rollNumber").value = rec.rollNumber;
    if (rec.mobile && document.getElementById("mobile")) document.getElementById("mobile").value = rec.mobile;
    if (rec.instagram && document.getElementById("portfolioInstagram")) document.getElementById("portfolioInstagram").value = rec.instagram;
    if (rec.linkedin && document.getElementById("portfolioLinkedin")) document.getElementById("portfolioLinkedin").value = rec.linkedin;
    if (rec.whatsapp && document.getElementById("portfolioWhatsapp")) document.getElementById("portfolioWhatsapp").value = rec.whatsapp;
    if (rec.portfolioUrl && document.getElementById("portfolioUrl")) document.getElementById("portfolioUrl").value = rec.portfolioUrl;

    // Preselect interest & activity
    if (rec.interest) {
      var radio = document.querySelector('input[name="interest"][value="' + rec.interest + '"]');
      if (radio) {
        radio.checked = true;
        renderActivityOptions(rec.interest, rec.activity);
      }
    }

    // Restore Prior Experience Level & Duration
    if (rec.experience) {
      var expRadio = document.querySelector('input[name="experience"][value="' + rec.experience + '"]');
      if (expRadio) {
        expRadio.checked = true;
        var expGroup = document.getElementById("experienceDurationGroup");
        var expDuration = document.getElementById("experienceDuration");
        if (rec.experience === "experienced") {
          if (expGroup) expGroup.classList.add("is-shown");
          if (expDuration) {
            expDuration.setAttribute("required", "required");
            if (rec.experienceDuration) expDuration.value = rec.experienceDuration;
          }
        } else {
          if (expGroup) expGroup.classList.remove("is-shown");
          if (expDuration) {
            expDuration.removeAttribute("required");
            expDuration.value = "";
          }
        }
        clearFieldError(document.getElementById("experienceGroup"));
      }
    }

    // Pre-load existing photo if any
    var existingPhoto = rec.photo;
    if (!existingPhoto && rec.rollNumber) {
      try { existingPhoto = localStorage.getItem("mln_photo_" + rec.rollNumber.trim().toUpperCase()); } catch (e) {}
    }
    if (existingPhoto) {
      setPortraitPhotoPreview(existingPhoto, "current_portfolio_photo.jpg");
    }

    updateProgress();
    showAlert("info", "Welcome back, " + (rec.name || "Member") + "! You can now update your portfolio links and portrait photo.");
  }

  /* ==========================================================================
     Portrait Photo Upload & Canvas Optimization System
     ========================================================================== */
  var currentUploadedPhotoBase64 = "";

  function setPortraitPhotoPreview(base64Data, fileName) {
    currentUploadedPhotoBase64 = base64Data;
    var photoBase64Hidden = document.getElementById("photoBase64Hidden");
    if (photoBase64Hidden) photoBase64Hidden.value = base64Data;

    var thumbnail = document.getElementById("portraitThumbnail");
    if (thumbnail) thumbnail.src = base64Data;

    var nameEl = document.getElementById("portraitFileName");
    if (nameEl) nameEl.textContent = fileName || "portrait.jpg";

    var dropEmpty = document.getElementById("dropzoneEmpty");
    var dropPreview = document.getElementById("dropzonePreview");
    if (dropEmpty) dropEmpty.hidden = true;
    if (dropPreview) dropPreview.hidden = false;

    var previewPassPhoto = document.getElementById("previewPassPhoto");
    if (previewPassPhoto) previewPassPhoto.src = base64Data;
  }

  function clearPortraitPhotoPreview() {
    currentUploadedPhotoBase64 = "";
    var photoBase64Hidden = document.getElementById("photoBase64Hidden");
    if (photoBase64Hidden) photoBase64Hidden.value = "";

    var fileInput = document.getElementById("portraitFileInput");
    if (fileInput) fileInput.value = "";

    var dropEmpty = document.getElementById("dropzoneEmpty");
    var dropPreview = document.getElementById("dropzonePreview");
    if (dropEmpty) dropEmpty.hidden = false;
    if (dropPreview) dropPreview.hidden = true;

    var previewPassPhoto = document.getElementById("previewPassPhoto");
    if (previewPassPhoto) previewPassPhoto.src = "assets/images/member-male-cutout.png";
  }

  function processImageFile(file) {
    if (!file || !file.type.match(/image.*/)) {
      if (window.showUiToast) {
        window.showUiToast("error", "Invalid Image", "Please select a valid image file (PNG, JPG, or WEBP).");
      } else {
        alert("Please select a valid image file (PNG, JPG, or WEBP).");
      }
      return;
    }
    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        // Optimize and compress client-side via canvas
        var canvas = document.createElement("canvas");
        var maxDim = 800;
        var scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);

        var ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        var optimizedDataUrl = canvas.toDataURL("image/jpeg", 0.85);
        setPortraitPhotoPreview(optimizedDataUrl, file.name);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function initPortraitPhotoUpload() {
    var dropzone = document.getElementById("portraitDropzone");
    var fileInput = document.getElementById("portraitFileInput");
    var btnRemove = document.getElementById("btnRemovePortrait");

    if (!dropzone || !fileInput) return;

    dropzone.addEventListener("click", function (e) {
      if (btnRemove && (e.target === btnRemove || btnRemove.contains(e.target))) {
        return;
      }
      fileInput.click();
    });

    fileInput.addEventListener("change", function () {
      if (fileInput.files && fileInput.files[0]) {
        processImageFile(fileInput.files[0]);
      }
    });

    // Drag and drop handlers
    dropzone.addEventListener("dragover", function (e) {
      e.preventDefault();
      dropzone.classList.add("dragover");
    });
    dropzone.addEventListener("dragleave", function () {
      dropzone.classList.remove("dragover");
    });
    dropzone.addEventListener("drop", function (e) {
      e.preventDefault();
      dropzone.classList.remove("dragover");
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        processImageFile(e.dataTransfer.files[0]);
      }
    });

    if (btnRemove) {
      btnRemove.addEventListener("click", function (e) {
        e.stopPropagation();
        clearPortraitPhotoPreview();
      });
    }
  }

  function validateForm(data) {
    var isValid = true;

    if (!isEmailVerified) {
      showAlert("error", "Please verify your email address via OTP before submitting.");
      var gate = document.getElementById("authGateSection");
      if (gate) gate.scrollIntoView({ behavior: "smooth", block: "center" });
      return false;
    }

    if (!data.interest) {
      setFieldError(document.getElementById("interestGroup"), "Please select an area of interest.");
      isValid = false;
    }

    if (!data.activity) {
      setFieldError(document.getElementById("activityGroupWrap"), "Please select an activity.");
      isValid = false;
    }

    if (!data.name || data.name.trim().length < 3) {
      setFieldError(document.getElementById("nameGroup"), "Please enter your full name (min. 3 characters).");
      isValid = false;
    }

    if (!data.className || data.className.trim().length < 2) {
      setFieldError(document.getElementById("classGroup"), "Please enter your degree program and year.");
      isValid = false;
    }

    if (!data.mobile || !MOBILE_RE.test(data.mobile.trim())) {
      setFieldError(document.getElementById("mobileGroup"), "Please enter a valid 10-digit mobile number starting 6-9.");
      isValid = false;
    }

    if (!data.rollNumber || data.rollNumber.trim().length < 2) {
      setFieldError(document.getElementById("rollGroup"), "Please enter your roll number.");
      isValid = false;
    }

    if (!data.experience) {
      setFieldError(document.getElementById("experienceGroup"), "Please select fresher or experienced.");
      isValid = false;
    }

    if (data.experience === "experienced" && (!data.experienceDuration || !data.experienceDuration.trim())) {
      setFieldError(experienceDurationGroup, "Please mention your experience duration.");
      isValid = false;
    }

    return isValid;
  }

  function showAlert(type, message) {
    if (formAlert) {
      formAlert.textContent = message;
      formAlert.className = "form-alert is-shown " + type;
    }
    if (window.showUiToast) {
      var toastTitle = type === "error" ? "Action Required" : (type === "success" ? "Success" : "Notice");
      window.showUiToast(type, toastTitle, message);
    }
  }

  function hideAlert() {
    if (!formAlert) return;
    formAlert.className = "form-alert";
    formAlert.textContent = "";
  }

  /* ---------- Live Member Pass Preview ---------- */
  function updateLivePassPreview() {
    var nameEl = document.getElementById("name");
    var rollEl = document.getElementById("rollNumber");
    var deptEl = document.querySelector('input[name="interest"]:checked');
    var activityEl = document.querySelector('input[name="activity"]:checked');

    var pName = document.getElementById("previewPassName");
    var pDept = document.getElementById("previewPassDept");
    var pActivity = document.getElementById("previewPassActivity");
    var pRoll = document.getElementById("previewPassRoll");
    var pRole = document.getElementById("previewPassRole");

    if (pName) {
      var n = nameEl ? nameEl.value.trim() : "";
      pName.textContent = n || "Your Name";
    }
    if (pDept) {
      var d = deptEl ? deptEl.value : "production";
      pDept.textContent = d ? (d.charAt(0).toUpperCase() + d.slice(1)) : "Production";
    }
    if (pActivity) {
      var a = activityEl ? activityEl.value : "";
      pActivity.textContent = a || "Select track...";
    }
    if (pRoll) {
      var r = rollEl ? rollEl.value.trim() : "";
      pRoll.textContent = r || "XXXXXX";
    }
    if (pRole && deptEl) {
      var roleText = deptEl.value === "production" ? "MEDIA LEAD" : (deptEl.value === "designing" ? "DESIGN LEAD" : "MARKETING HEAD");
      pRole.textContent = "BBA • " + roleText;
    }
  }

  /* ---------- Progress bar & Dynamic Stepper Pills ---------- */
  function updateProgress() {
    var pill1 = document.getElementById("stepPill1");
    var pill2 = document.getElementById("stepPill2");
    var pill3 = document.getElementById("stepPill3");
    var pill4 = document.getElementById("stepPill4");

    var step1Done = !!isEmailVerified;
    var hasInterest = !!document.querySelector('input[name="interest"]:checked');
    var hasActivity = !!document.querySelector('input[name="activity"]:checked');
    var step2Done = hasInterest && hasActivity;

    var nameVal = document.getElementById("name") ? document.getElementById("name").value.trim() : "";
    var rollVal = document.getElementById("rollNumber") ? document.getElementById("rollNumber").value.trim() : "";
    var classVal = document.getElementById("className") ? document.getElementById("className").value.trim() : "";
    var mobileVal = document.getElementById("mobile") ? document.getElementById("mobile").value.trim() : "";
    var step3Done = nameVal.length >= 3 && rollVal.length >= 2 && classVal.length >= 2 && mobileVal.length === 10;

    var instagramVal = document.getElementById("portfolioInstagram") ? document.getElementById("portfolioInstagram").value.trim() : "";
    var linkedinVal = document.getElementById("portfolioLinkedin") ? document.getElementById("portfolioLinkedin").value.trim() : "";
    var portVal = document.getElementById("portfolioUrl") ? document.getElementById("portfolioUrl").value.trim() : "";
    var step4Done = !!(instagramVal || linkedinVal || portVal);

    if (pill1) {
      pill1.classList.toggle("is-completed", step1Done);
      pill1.classList.toggle("is-current", !step1Done);
    }
    if (pill2) {
      pill2.classList.toggle("is-completed", step2Done);
      pill2.classList.toggle("is-current", step1Done && !step2Done);
    }
    if (pill3) {
      pill3.classList.toggle("is-completed", step3Done);
      pill3.classList.toggle("is-current", step1Done && step2Done && !step3Done);
    }
    if (pill4) {
      pill4.classList.toggle("is-completed", step4Done);
      pill4.classList.toggle("is-current", step1Done && step2Done && step3Done);
    }

    if (stepFill) {
      var total = 4;
      var done = 0;
      if (step1Done) done++;
      if (step2Done) done++;
      if (step3Done) done++;
      if (step4Done) done++;
      stepFill.style.width = Math.max(15, (done / total) * 100) + "%";
    }
    updateLivePassPreview();
  }

  /* ---------- Autosave & Restore Draft ---------- */
  function saveDraft() {
    var selectedExp = document.querySelector('input[name="experience"]:checked');
    var draft = {
      name: document.getElementById("name") ? document.getElementById("name").value : "",
      className: document.getElementById("className") ? document.getElementById("className").value : "",
      rollNumber: document.getElementById("rollNumber") ? document.getElementById("rollNumber").value : "",
      mobile: document.getElementById("mobile") ? document.getElementById("mobile").value : "",
      instagram: document.getElementById("portfolioInstagram") ? document.getElementById("portfolioInstagram").value : "",
      linkedin: document.getElementById("portfolioLinkedin") ? document.getElementById("portfolioLinkedin").value : "",
      whatsapp: document.getElementById("portfolioWhatsapp") ? document.getElementById("portfolioWhatsapp").value : "",
      portfolioUrl: document.getElementById("portfolioUrl") ? document.getElementById("portfolioUrl").value : "",
      experience: selectedExp ? selectedExp.value : "",
      experienceDuration: document.getElementById("experienceDuration") ? document.getElementById("experienceDuration").value : ""
    };
    try {
      localStorage.setItem("mln_reg_draft", JSON.stringify(draft));
    } catch (e) {}
  }

  function restoreDraft() {
    try {
      var raw = localStorage.getItem("mln_reg_draft");
      if (!raw) return;
      var draft = JSON.parse(raw);
      if (draft.name && document.getElementById("name")) document.getElementById("name").value = draft.name;
      if (draft.className && document.getElementById("className")) document.getElementById("className").value = draft.className;
      if (draft.rollNumber && document.getElementById("rollNumber")) document.getElementById("rollNumber").value = draft.rollNumber;
      if (draft.mobile && document.getElementById("mobile")) document.getElementById("mobile").value = draft.mobile;
      if (draft.instagram && document.getElementById("portfolioInstagram")) document.getElementById("portfolioInstagram").value = draft.instagram;
      if (draft.linkedin && document.getElementById("portfolioLinkedin")) document.getElementById("portfolioLinkedin").value = draft.linkedin;
      if (draft.whatsapp && document.getElementById("portfolioWhatsapp")) document.getElementById("portfolioWhatsapp").value = draft.whatsapp;
      if (draft.portfolioUrl && document.getElementById("portfolioUrl")) document.getElementById("portfolioUrl").value = draft.portfolioUrl;

      if (draft.experience) {
        var expRadio = document.querySelector('input[name="experience"][value="' + draft.experience + '"]');
        if (expRadio) {
          expRadio.checked = true;
          if (draft.experience === "experienced") {
            if (experienceDurationGroup) experienceDurationGroup.classList.add("is-shown");
            if (experienceDurationInput) {
              experienceDurationInput.setAttribute("required", "required");
              if (draft.experienceDuration) experienceDurationInput.value = draft.experienceDuration;
            }
          }
        }
      }
    } catch (e) {}
  }

  /* ---------- Form submission ---------- */
  function handleSubmit(e) {
    e.preventDefault();

    if (submitBtn.disabled) return;

    clearAllErrors();

    var formData = new FormData(form);
    var data = {
      interest: formData.get("interest"),
      activity: formData.get("activity"),
      name: (formData.get("name") || "").trim(),
      className: (formData.get("className") || "").trim(),
      email: verifiedEmailAddress || (formData.get("email") || "").trim().toLowerCase(),
      mobile: (formData.get("mobile") || "").trim(),
      rollNumber: (formData.get("rollNumber") || "").trim().toUpperCase(),
      instagram: (formData.get("instagram") || "").trim(),
      linkedin: (formData.get("linkedin") || "").trim(),
      whatsapp: (formData.get("whatsapp") || "").trim(),
      portfolioUrl: (formData.get("portfolioUrl") || "").trim(),
      photo: currentUploadedPhotoBase64 || (document.getElementById("photoBase64Hidden") ? document.getElementById("photoBase64Hidden").value : ""),
      experience: formData.get("experience"),
      experienceDuration: (formData.get("experienceDuration") || "").trim()
    };

    if (!validateForm(data)) {
      showAlert("error", "Please fix the highlighted fields before submitting.");
      var firstError = form.querySelector(".has-error");
      if (firstError) firstError.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    submitBtn.disabled = true;
    submitBtn.classList.add("is-processing");
    submitBtn.textContent = isEditMode ? "Updating your digital portfolio..." : "Securing your spot & generating pass...";
    document.body.classList.add("is-processing");

    data.registeredAt = new Date().toISOString();
    data.attended = false;
    data.attendedAt = null;

    var permanentId = getPermanentMemberId(data.email, data.rollNumber);
    data.id = permanentId;

    // Persist photo to localStorage keyed by rollNumber
    if (data.photo && data.rollNumber) {
      try {
        localStorage.setItem("mln_photo_" + data.rollNumber, data.photo);
      } catch (e) {}
    }

    var passData = {
      id: permanentId,
      name: data.name,
      rollNumber: data.rollNumber,
      className: data.className,
      interest: data.interest,
      activity: data.activity,
      email: data.email,
      mobile: data.mobile,
      instagram: data.instagram,
      linkedin: data.linkedin,
      whatsapp: data.whatsapp,
      portfolioUrl: data.portfolioUrl,
      photo: data.photo,
      experience: data.experience,
      experienceDuration: data.experienceDuration,
      registeredAt: data.registeredAt
    };

    // 1. Instantly persist to localStorage so data is NEVER lost even if connection drops
    try {
      var rawStore = localStorage.getItem("mln_local_registrations");
      var list = rawStore ? JSON.parse(rawStore) : [];
      var existingIdx = list.findIndex(function (it) {
        return (it.rollNumber && it.rollNumber.trim().toUpperCase() === data.rollNumber) ||
               (it.email && it.email.trim().toLowerCase() === data.email);
      });
      if (existingIdx >= 0) {
        list[existingIdx] = Object.assign(list[existingIdx], passData);
      } else {
        list.push(passData);
      }
      localStorage.setItem("mln_local_registrations", JSON.stringify(list));
      localStorage.setItem("mln_last_pass", JSON.stringify(passData));
      localStorage.removeItem("mln_reg_draft");
    } catch (err) {}

    // 2. Dispatch non-blocking background sync to first-party API (immune to ad-blockers)
    try {
      fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passData),
        keepalive: true
      }).catch(function () {});
    } catch (e) {}

    var hasCompleted = false;
    function completeRegistrationSuccess(regId) {
      if (hasCompleted) return;
      hasCompleted = true;

      showAlert("success", isEditMode ? "Portfolio updated successfully! Loading your digital pass..." : "Registration confirmed! Generating your official member pass...");
      window.setTimeout(function () {
        var queryParams = new URLSearchParams({
          id: regId || permanentId,
          name: data.name,
          dept: data.interest,
          activity: data.activity,
          roll: data.rollNumber
        });
        window.location.href = "thankyou.html?" + queryParams.toString();
      }, 650);
    }

    // 3. Strict 1200ms timeout race: never wait forever if Firestore is blocked by Brave/uBlock
    var timeoutPromise = new Promise(function (resolve) {
      window.setTimeout(function () {
        resolve({ id: permanentId, timedOut: true });
      }, 1200);
    });

    // Attempt client Firebase save with automatic offline fallback
    Promise.race([
      RegistrationStore.save(data, permanentId),
      timeoutPromise
    ])
      .then(function (result) {
        var regId = (result && result.id) ? result.id : permanentId;
        completeRegistrationSuccess(regId);
      })
      .catch(function (err) {
        console.warn("Client Firestore offline/blocked by ad-blocker. Local storage and server sync active:", err);
        completeRegistrationSuccess(permanentId);
      });
  }

  function init() {
    cacheElements();
    if (!form) return;

    restoreDraft();

    // Initialize OTP Auth & Portrait Photo Upload
    initEmailOtpAuth();
    initPortraitPhotoUpload();

    // Check for deep-linked query parameters
    var urlParams = new URLSearchParams(window.location.search);
    var deptQuery = urlParams.get("dept");
    var actQuery = urlParams.get("activity");

    if (deptQuery && ACTIVITIES[deptQuery]) {
      var deptRadio = document.querySelector('input[name="interest"][value="' + deptQuery + '"]');
      if (deptRadio) {
        deptRadio.checked = true;
        renderActivityOptions(deptQuery, actQuery);
      }
    } else {
      renderActivityOptions(null, null);
    }

    interestInputs.forEach(function (input) {
      input.addEventListener("change", handleInterestChange);
    });

    experienceInputs.forEach(function (input) {
      input.addEventListener("change", handleExperienceChange);
    });

    // Mobile input formatting (digits only, max 10)
    var mobileInput = document.getElementById("mobile");
    if (mobileInput) {
      mobileInput.addEventListener("input", function () {
        mobileInput.value = mobileInput.value.replace(/\D/g, "").slice(0, 10);
        if (MOBILE_RE.test(mobileInput.value)) {
          clearFieldError(document.getElementById("mobileGroup"));
        }
      });
    }

    // Roll number auto-uppercase
    var rollInput = document.getElementById("rollNumber");
    if (rollInput) {
      rollInput.addEventListener("input", function () {
        rollInput.value = rollInput.value.toUpperCase();
        if (rollInput.value.trim().length >= 2) {
          clearFieldError(document.getElementById("rollGroup"));
        }
      });
    }

    // Live error clearing
    var nameInput = document.getElementById("name");
    if (nameInput) {
      nameInput.addEventListener("input", function () {
        if (nameInput.value.trim().length >= 3) clearFieldError(document.getElementById("nameGroup"));
      });
    }

    var classInput = document.getElementById("className");
    if (classInput) {
      classInput.addEventListener("input", function () {
        if (classInput.value.trim().length >= 2) clearFieldError(document.getElementById("classGroup"));
      });
    }

    form.addEventListener("input", function () {
      updateProgress();
      saveDraft();
    });
    form.addEventListener("change", function () {
      updateProgress();
      saveDraft();
    });
    form.addEventListener("submit", handleSubmit);

    updateProgress();

    // ID Search & Download System Initialization
    initModeSwitcher();

    var idSearchForm = document.getElementById("idSearchForm");
    if (idSearchForm) {
      idSearchForm.addEventListener("submit", handleIdSearch);
    }

    var searchRollInput = document.getElementById("searchRollNumber");
    if (searchRollInput) {
      searchRollInput.addEventListener("input", function () {
        searchRollInput.value = searchRollInput.value.toUpperCase();
      });
    }

    var downloadPngBtn = document.getElementById("downloadPngBtn");
    if (downloadPngBtn) {
      downloadPngBtn.addEventListener("click", function () {
        downloadIdCardAsPng(currentRetrievedData);
      });
    }

    var printRetrievedPassBtn = document.getElementById("printRetrievedPassBtn");
    if (printRetrievedPassBtn) {
      printRetrievedPassBtn.addEventListener("click", function () {
        window.print();
      });
    }

    var shareRetrievedPassBtn = document.getElementById("shareRetrievedPassBtn");
    if (shareRetrievedPassBtn) {
      shareRetrievedPassBtn.addEventListener("click", function () {
        if (!currentRetrievedData) return;
        var d = currentRetrievedData;
        var text = "🪪 Here is my official MLN Alliance MediaCrew ID Card (#" + (d.id || "PASS") + ") for " + (d.activity || "Crew Track") + "! Access member portal: " + window.location.origin + "/MLN-Alliance-MediaCrew/register.html#download";
        window.open("https://api.whatsapp.com/send?text=" + encodeURIComponent(text), "_blank");
      });
    }
  }

  /* ==========================================================================
     ID Card Download & Mode Switcher System
     ========================================================================== */
  var currentRetrievedData = null;

  function setMode(mode) {
    var tabNewReg = document.getElementById("tabNewReg");
    var tabDownloadId = document.getElementById("tabDownloadId");
    var newRegisterView = document.getElementById("newRegisterView");
    var idDownloadView = document.getElementById("idDownloadView");
    var searchRollInput = document.getElementById("searchRollNumber");

    if (mode === "download") {
      if (tabDownloadId) {
        tabDownloadId.classList.add("active");
        tabDownloadId.setAttribute("aria-selected", "true");
      }
      if (tabNewReg) {
        tabNewReg.classList.remove("active");
        tabNewReg.setAttribute("aria-selected", "false");
      }
      if (newRegisterView) newRegisterView.hidden = true;
      if (idDownloadView) idDownloadView.hidden = false;
      var title = document.getElementById("pageTitle");
      var eyebrow = document.getElementById("pageEyebrow");
      var sub = document.getElementById("pageSubtitle");
      if (title) title.textContent = "Download Member ID";
      if (eyebrow) eyebrow.textContent = "ID Retrieval Portal";
      if (sub) sub.textContent = "Enter your college roll number to access and download your official member pass.";
      if (searchRollInput) searchRollInput.focus();
    } else {
      if (tabNewReg) {
        tabNewReg.classList.add("active");
        tabNewReg.setAttribute("aria-selected", "true");
      }
      if (tabDownloadId) {
        tabDownloadId.classList.remove("active");
        tabDownloadId.setAttribute("aria-selected", "false");
      }
      if (newRegisterView) newRegisterView.hidden = false;
      if (idDownloadView) idDownloadView.hidden = true;
      var title = document.getElementById("pageTitle");
      var eyebrow = document.getElementById("pageEyebrow");
      var sub = document.getElementById("pageSubtitle");
      if (title) title.textContent = "Register / Member ID";
      if (eyebrow) eyebrow.textContent = "Official Member Portal";
      if (sub) sub.textContent = "Join MLN Alliance MediaCrew as a new member or retrieve your official verified ID pass.";
    }
  }

  function initModeSwitcher() {
    var tabNewReg = document.getElementById("tabNewReg");
    var tabDownloadId = document.getElementById("tabDownloadId");

    if (tabNewReg) {
      tabNewReg.addEventListener("click", function () {
        setMode("register");
        if (history.replaceState) history.replaceState(null, "", "register.html");
      });
    }

    if (tabDownloadId) {
      tabDownloadId.addEventListener("click", function () {
        setMode("download");
        if (history.replaceState) history.replaceState(null, "", "register.html#download");
      });
    }

    // Auto-select mode based on URL hash or query param
    var params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "download" || window.location.hash === "#download" || window.location.hash === "#id") {
      setMode("download");
      var prefill = params.get("roll");
      var searchRollInput = document.getElementById("searchRollNumber");
      if (prefill && searchRollInput) {
        searchRollInput.value = prefill;
        handleIdSearch();
      }
    }
  }

  function showSearchFeedback(msg, isError, isLoading) {
    var searchFeedback = document.getElementById("searchFeedback");
    if (!searchFeedback) return;
    if (!msg) {
      searchFeedback.textContent = "";
      searchFeedback.className = "search-feedback";
      searchFeedback.hidden = true;
      return;
    }
    searchFeedback.hidden = false;
    searchFeedback.textContent = msg;
    searchFeedback.className = "search-feedback" + (isError ? " error" : (isLoading ? " loading" : ""));
  }

  function handleIdSearch(e) {
    if (e) e.preventDefault();
    var searchRollInput = document.getElementById("searchRollNumber");
    var searchIdBtn = document.getElementById("searchIdBtn");
    var foundCardContainer = document.getElementById("foundCardContainer");

    if (!searchRollInput) return;
    var roll = searchRollInput.value.trim().toUpperCase();
    if (!roll) {
      showSearchFeedback("Please enter your college roll number.", true);
      return;
    }

    showSearchFeedback("Searching for member record...", false, true);
    if (searchIdBtn) searchIdBtn.disabled = true;
    if (foundCardContainer) foundCardContainer.hidden = true;

    RegistrationStore.findByRoll(roll)
      .then(function (member) {
        if (searchIdBtn) searchIdBtn.disabled = false;
        if (!member) {
          showSearchFeedback("No registration found for roll number '" + roll + "'. Please check your roll number or submit a new registration.", true);
          return;
        }

        currentRetrievedData = member;
        showSearchFeedback("", false);
        displayFoundCard(member);
      })
      .catch(function (err) {
        if (searchIdBtn) searchIdBtn.disabled = false;
        console.error(err);
        showSearchFeedback("Could not complete search. Check connection and try again.", true);
      });
  }

  function displayFoundCard(data) {
    var foundCardContainer = document.getElementById("foundCardContainer");
    var retrievedQrContainer = document.getElementById("retrievedQrCode");

    var nameElem = document.getElementById("retrievedName");
    var deptElem = document.getElementById("retrievedDept");
    var actElem = document.getElementById("retrievedActivity");
    var rollElem = document.getElementById("retrievedRoll");
    var classElem = document.getElementById("retrievedClass");
    var passIdElem = document.getElementById("retrievedPassId");

    if (nameElem) nameElem.textContent = data.name || "Crew Member";
    var deptText = data.interest ? (data.interest.charAt(0).toUpperCase() + data.interest.slice(1)) : "Production";
    if (deptElem) deptElem.textContent = deptText;
    if (actElem) actElem.textContent = data.activity || "General Track";
    if (rollElem) rollElem.textContent = data.rollNumber || "—";
    if (classElem) classElem.textContent = data.className || "—";
    if (passIdElem) passIdElem.textContent = "#" + (data.id || "MLN-PASS");

    // Canonical dual-purpose digital ID URL (TINY & PERMANENT)
    var pathDir = window.location.pathname.substring(0, window.location.pathname.lastIndexOf("/"));
    var baseUrl = window.location.origin + (pathDir ? pathDir : "") + "/id.html";
    var memberId = data.id || data.rollNumber || "MLN-PASS";
    var qrCodeUrl = baseUrl + "?id=" + encodeURIComponent(memberId);

    var viewRetrievedLink = document.getElementById("viewRetrievedDigitalIdLink");
    if (viewRetrievedLink) {
      viewRetrievedLink.href = qrCodeUrl;
    }

    if (retrievedQrContainer) {
      retrievedQrContainer.innerHTML = "";
      if (typeof QRCode !== "undefined") {
        new QRCode(retrievedQrContainer, {
          text: qrCodeUrl,
          width: 170,
          height: 170,
          colorDark: "#12100d",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.M
        });
      } else {
        retrievedQrContainer.innerHTML = "<div style='padding:20px; font-family:monospace;'>PASS ID<br><strong>" + (data.id || data.rollNumber) + "</strong></div>";
      }
    }

    if (foundCardContainer) {
      foundCardContainer.hidden = false;
      foundCardContainer.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    currentFoundData = data;
  }

  var currentFoundData = null;

  /* ---------- Transparent QR-Only Exporter (Zero Background, Pure Alpha) ---------- */
  function downloadQrOnly(color, roll) {
    var qrCanvas = document.querySelector("#retrievedQrCode canvas");
    var qrImg = document.querySelector("#retrievedQrCode img");
    var srcElem = qrCanvas || qrImg;

    if (!srcElem) {
      if (window.showUiToast) {
        window.showUiToast("info", "Generating QR", "QR code is still generating, please wait a moment.");
      } else {
        alert("QR code is still generating, please wait a moment.");
      }
      return;
    }

    var srcW = srcElem.naturalWidth || srcElem.width || 170;
    var srcH = srcElem.naturalHeight || srcElem.height || 170;

    var tempCanvas = document.createElement("canvas");
    tempCanvas.width = srcW;
    tempCanvas.height = srcH;
    var tempCtx = tempCanvas.getContext("2d");
    tempCtx.drawImage(srcElem, 0, 0, srcW, srcH);

    var imgData = tempCtx.getImageData(0, 0, srcW, srcH);
    var pixels = imgData.data;
    var isWhite = (color === "white");

    for (var i = 0; i < pixels.length; i += 4) {
      var r = pixels[i];
      var g = pixels[i + 1];
      var b = pixels[i + 2];
      var a = pixels[i + 3];
      var lum = 0.299 * r + 0.587 * g + 0.114 * b;

      if (a > 30 && lum < 140) {
        if (isWhite) {
          pixels[i] = 255;
          pixels[i + 1] = 255;
          pixels[i + 2] = 255;
          pixels[i + 3] = 255;
        } else {
          pixels[i] = 0;
          pixels[i + 1] = 0;
          pixels[i + 2] = 0;
          pixels[i + 3] = 255;
        }
      } else {
        pixels[i] = 0;
        pixels[i + 1] = 0;
        pixels[i + 2] = 0;
        pixels[i + 3] = 0; // Pure Transparent Background
      }
    }

    tempCtx.putImageData(imgData, 0, 0);

    var exportSize = 1000;
    var exportCanvas = document.createElement("canvas");
    exportCanvas.width = exportSize;
    exportCanvas.height = exportSize;
    var exportCtx = exportCanvas.getContext("2d");
    exportCtx.imageSmoothingEnabled = false;
    exportCtx.clearRect(0, 0, exportSize, exportSize);
    exportCtx.drawImage(tempCanvas, 0, 0, exportSize, exportSize);

    var cleanRoll = (roll || (currentFoundData && currentFoundData.rollNumber) || "pass").replace(/[^a-zA-Z0-9_-]/g, "");
    var link = document.createElement("a");
    link.download = "MLN-QR-" + (isWhite ? "White" : "Black") + "-Transparent-" + cleanRoll + ".png";
    link.href = exportCanvas.toDataURL("image/png");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /* ---------- Luxury Executive Member ID Card Canvas Generator (800 x 1280 px) ---------- */
  function downloadIdCardAsPng(data) {
    if (!data) return;

    var canvas = document.createElement("canvas");
    var w = 800;
    var h = 1280;
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext("2d");

    function loadImage(src) {
      return new Promise(function(resolve) {
        if (!src) return resolve(null);
        var img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = function() { resolve(img); };
        img.onerror = function() { resolve(null); };
        img.src = src;
      });
    }

    var qrElem = document.querySelector("#retrievedQrCode canvas") || document.querySelector("#retrievedQrCode img");
    var photoSrc = data.photo || "";

    Promise.all([
      loadImage("assets/images/logo_light.png"),
      loadImage(photoSrc),
      qrElem ? (qrElem.tagName === "CANVAS" ? Promise.resolve(qrElem) : loadImage(qrElem.src)) : Promise.resolve(null)
    ]).then(function(images) {
      var logoImg = images[0];
      var memberPhotoImg = images[1];
      var qrImg = images[2];

      // 1. Deep Obsidian Card Fill
      var bgGradient = ctx.createLinearGradient(0, 0, w, h);
      bgGradient.addColorStop(0, "#140e0c");
      bgGradient.addColorStop(0.4, "#1d1410");
      bgGradient.addColorStop(1, "#0a0706");
      ctx.fillStyle = bgGradient;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(0, 0, w, h, 36);
      else ctx.rect(0, 0, w, h);
      ctx.fill();

      // Ambient Orbs
      var radialTop = ctx.createRadialGradient(160, 160, 20, 160, 160, 340);
      radialTop.addColorStop(0, "rgba(239, 118, 87, 0.22)");
      radialTop.addColorStop(1, "rgba(239, 118, 87, 0)");
      ctx.fillStyle = radialTop;
      ctx.fillRect(0, 0, w, h);

      var radialBottom = ctx.createRadialGradient(w - 140, h - 260, 20, w - 140, h - 260, 380);
      radialBottom.addColorStop(0, "rgba(0, 242, 161, 0.16)");
      radialBottom.addColorStop(1, "rgba(0, 242, 161, 0)");
      ctx.fillStyle = radialBottom;
      ctx.fillRect(0, 0, w, h);

      // Outer Border
      var borderGrad = ctx.createLinearGradient(0, 0, w, h);
      borderGrad.addColorStop(0, "rgba(255, 224, 201, 0.55)");
      borderGrad.addColorStop(0.35, "rgba(239, 118, 87, 0.5)");
      borderGrad.addColorStop(0.7, "rgba(0, 242, 161, 0.45)");
      borderGrad.addColorStop(1, "rgba(255, 176, 137, 0.35)");
      ctx.strokeStyle = borderGrad;
      ctx.lineWidth = 3.5;
      ctx.stroke();

      // 2. Lanyard Clip Slot
      var slotW = 130;
      var slotH = 14;
      var slotX = (w - slotW) / 2;
      var slotY = 24;
      ctx.fillStyle = "#070504";
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(slotX, slotY, slotW, slotH, 7);
      else ctx.rect(slotX, slotY, slotW, slotH);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 224, 201, 0.3)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 3. Top Accent Bar
      var barGrad = ctx.createLinearGradient(40, 0, w - 40, 0);
      barGrad.addColorStop(0, "#ef7657");
      barGrad.addColorStop(0.4, "#ff9a70");
      barGrad.addColorStop(0.7, "#00f2a1");
      barGrad.addColorStop(1, "#f5b276");
      ctx.fillStyle = barGrad;
      ctx.fillRect(40, 56, w - 80, 4);

      // 4. Header Bar
      var headerY = 78;
      if (logoImg) {
        ctx.fillStyle = "rgba(239, 118, 87, 0.15)";
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(44, headerY, 46, 46, 12);
        else ctx.rect(44, headerY, 46, 46);
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 224, 201, 0.4)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.drawImage(logoImg, 49, headerY + 5, 36, 36);
      }

      ctx.textAlign = "left";
      ctx.fillStyle = "#fff8f2";
      ctx.font = "bold 21px 'Space Grotesk', -apple-system, sans-serif";
      ctx.fillText("MLN ALLIANCE MEDIACREW", logoImg ? 104 : 44, headerY + 24);

      ctx.fillStyle = "#ff9a70";
      ctx.font = "600 12px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText("OFFICIAL EXECUTIVE MEMBER CREDENTIAL • 2026-2027", logoImg ? 104 : 44, headerY + 42);

      // Verified Badge Pill
      var badgeW = 126;
      var badgeH = 34;
      var badgeX = w - 44 - badgeW;
      var badgeY = headerY + 6;
      ctx.fillStyle = "rgba(0, 242, 161, 0.14)";
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 17);
      else ctx.rect(badgeX, badgeY, badgeW, badgeH);
      ctx.fill();
      ctx.strokeStyle = "#00f2a1";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = "#00f2a1";
      ctx.font = "bold 12px 'Plus Jakarta Sans', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("● VERIFIED", badgeX + badgeW / 2, badgeY + 22);

      // Divider
      ctx.strokeStyle = "rgba(255, 224, 201, 0.12)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(44, 142);
      ctx.lineTo(w - 44, 142);
      ctx.stroke();

      // 5. Member Portrait Stage
      var photoCenterX = w / 2;
      var photoCenterY = 240;
      var photoRadius = 78;

      ctx.save();
      ctx.beginPath();
      ctx.arc(photoCenterX, photoCenterY, photoRadius + 6, 0, Math.PI * 2);
      var haloGrad = ctx.createLinearGradient(photoCenterX - photoRadius, photoCenterY - photoRadius, photoCenterX + photoRadius, photoCenterY + photoRadius);
      haloGrad.addColorStop(0, "#ef7657");
      haloGrad.addColorStop(0.5, "#ff9a70");
      haloGrad.addColorStop(1, "#00f2a1");
      ctx.strokeStyle = haloGrad;
      ctx.lineWidth = 4;
      ctx.shadowColor = "rgba(239, 118, 87, 0.6)";
      ctx.shadowBlur = 18;
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.arc(photoCenterX, photoCenterY, photoRadius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      if (memberPhotoImg && memberPhotoImg.width > 0) {
        var pW = memberPhotoImg.width;
        var pH = memberPhotoImg.height;
        var aspect = pW / pH;
        var drawW, drawH, drawX, drawY;
        if (aspect > 1) {
          drawH = photoRadius * 2;
          drawW = drawH * aspect;
          drawX = photoCenterX - drawW / 2;
          drawY = photoCenterY - photoRadius;
        } else {
          drawW = photoRadius * 2;
          drawH = drawW / aspect;
          drawX = photoCenterX - photoRadius;
          drawY = photoCenterY - drawH / 2;
        }
        ctx.drawImage(memberPhotoImg, drawX, drawY, drawW, drawH);
      } else {
        var avatarBg = ctx.createLinearGradient(photoCenterX - photoRadius, photoCenterY - photoRadius, photoCenterX + photoRadius, photoCenterY + photoRadius);
        avatarBg.addColorStop(0, "#2c1c17");
        avatarBg.addColorStop(1, "#18110e");
        ctx.fillStyle = avatarBg;
        ctx.fillRect(photoCenterX - photoRadius, photoCenterY - photoRadius, photoRadius * 2, photoRadius * 2);

        var initials = ((data.name || "Crew").split(" ").map(function(s) { return s[0]; }).slice(0, 2).join("")).toUpperCase();
        ctx.fillStyle = "#ff9a70";
        ctx.font = "bold 52px 'Space Grotesk', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(initials, photoCenterX, photoCenterY);
      }
      ctx.restore();

      // 6. Member Name & Hierarchy
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 34px 'Space Grotesk', -apple-system, sans-serif";
      ctx.fillText((data.name || "Crew Member").toUpperCase(), photoCenterX, 360);

      // Track Tag Pill
      var deptName = data.interest ? (data.interest.charAt(0).toUpperCase() + data.interest.slice(1)) : (data.dept || "Production");
      var trackText = ((data.activity || "GENERAL TRACK") + " • " + deptName.toUpperCase());
      ctx.font = "bold 13px 'Plus Jakarta Sans', sans-serif";
      var trackW = ctx.measureText(trackText).width + 36;
      var trackH = 32;
      var trackX = (w - trackW) / 2;
      var trackY = 378;

      ctx.fillStyle = "rgba(239, 118, 87, 0.16)";
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(trackX, trackY, trackW, trackH, 16);
      else ctx.rect(trackX, trackY, trackW, trackH);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 154, 112, 0.45)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = "#ff9a70";
      ctx.fillText(trackText, photoCenterX, trackY + 21);

      // Degree Tag
      var degreeText = (data.className || "BACHELOR OF BUSINESS ADMINISTRATION (BBA)").toUpperCase();
      ctx.fillStyle = "#a89c93";
      ctx.font = "600 12px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText(degreeText + " • MLN ALLIANCE COLLEGE", photoCenterX, 432);

      // 7. Bento Metadata Matrix
      var matrixY = 456;
      var bentoW = (w - 88 - 16) / 2;
      var bentoH = 78;

      function drawBentoCard(label, val, x, y, valColor) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.035)";
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, bentoW, bentoH, 14);
        else ctx.rect(x, y, bentoW, bentoH);
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 224, 201, 0.15)";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.textAlign = "left";
        ctx.fillStyle = "#8a7e75";
        ctx.font = "600 11px 'Plus Jakarta Sans', sans-serif";
        ctx.fillText(label.toUpperCase(), x + 16, y + 26);

        ctx.fillStyle = valColor || "#fff8f2";
        ctx.font = "bold 18px 'Space Grotesk', sans-serif";
        ctx.fillText(val || "—", x + 16, y + 54);
      }

      var col1X = 44;
      var col2X = 44 + bentoW + 16;
      var row1Y = matrixY;
      var row2Y = matrixY + bentoH + 12;

      drawBentoCard("Department", deptName, col1X, row1Y, "#fff8f2");
      drawBentoCard("Roll Number", data.rollNumber || data.roll || "—", col2X, row1Y, "#ff9a70");
      drawBentoCard("Class & Year", data.className || "BBA 2nd Year", col1X, row2Y, "#cfc4bb");
      drawBentoCard("Official Pass ID", "#" + (data.id || "MLN-PASS"), col2X, row2Y, "#00f2a1");

      // 8. Scannable QR Code Stage (White Card)
      var qrPlateW = 280;
      var qrPlateH = 280;
      var qrPlateX = (w - qrPlateW) / 2;
      var qrPlateY = 648;

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(qrPlateX, qrPlateY, qrPlateW, qrPlateH, 22);
      else ctx.rect(qrPlateX, qrPlateY, qrPlateW, qrPlateH);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 224, 201, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if (qrImg) {
        ctx.drawImage(qrImg, qrPlateX + 25, qrPlateY + 25, 230, 230);
      }

      // QR Instructions
      ctx.textAlign = "center";
      ctx.fillStyle = "#00f2a1";
      ctx.font = "bold 13px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText("DUAL-PURPOSE ATTENDANCE & DIGITAL ID PASS", photoCenterX, 958);

      ctx.fillStyle = "#a89c93";
      ctx.font = "500 12px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText("Scan with Google Lens to view live portfolio, or tap at campus events", photoCenterX, 980);

      // 9. Bottom Security Banner
      var bannerY = 1010;
      var bannerW = w - 88;
      var bannerH = 68;
      var bannerX = 44;

      ctx.fillStyle = "rgba(22, 16, 14, 0.85)";
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 14);
      else ctx.rect(bannerX, bannerY, bannerW, bannerH);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 224, 201, 0.22)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = "#ff9a70";
      ctx.font = "bold 12px 'Space Grotesk', sans-serif";
      ctx.fillText("SECURE DIGITALLY SIGNED CREDENTIAL • MLN ALLIANCE COLLEGE", photoCenterX, bannerY + 28);

      ctx.fillStyle = "#6d6259";
      ctx.font = "11px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText("Official MediaCrew Property • Non-Transferable • ID: #" + (data.id || "MLN-PASS"), photoCenterX, bannerY + 48);

      // 10. Bottom Micro-Bar
      ctx.fillStyle = barGrad;
      ctx.fillRect(44, h - 34, w - 88, 3);

      // Trigger high-res PNG download
      var cleanRoll = (data.rollNumber || data.roll || "Member").replace(/[^a-zA-Z0-9_-]/g, "");
      var link = document.createElement("a");
      link.download = "MLN-ID-" + cleanRoll + ".png";
      link.href = canvas.toDataURL("image/png");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }).catch(function(err) {
      console.error("ID Generation Error:", err);
    });
  }

  // Hook up Found Card Actions
  var downloadFoundPngBtn = document.getElementById("downloadPngBtn");
  if (downloadFoundPngBtn) {
    downloadFoundPngBtn.addEventListener("click", function() {
      if (currentFoundData) {
        downloadIdCardAsPng(currentFoundData);
      } else {
        if (window.showUiToast) {
          window.showUiToast("warning", "Search Required", "Please search and locate your pass first.");
        } else {
          alert("Please search and locate your pass first.");
        }
      }
    });
  }

  var btnRetrievedQrBlack = document.getElementById("btnDownloadRetrievedQrBlack");
  if (btnRetrievedQrBlack) {
    btnRetrievedQrBlack.addEventListener("click", function() {
      downloadQrOnly("black", currentFoundData ? currentFoundData.rollNumber : "");
    });
  }

  var btnRetrievedQrWhite = document.getElementById("btnDownloadRetrievedQrWhite");
  if (btnRetrievedQrWhite) {
    btnRetrievedQrWhite.addEventListener("click", function() {
      downloadQrOnly("white", currentFoundData ? currentFoundData.rollNumber : "");
    });
  }

  var printRetrievedPassBtn = document.getElementById("printRetrievedPassBtn");
  if (printRetrievedPassBtn) {
    printRetrievedPassBtn.addEventListener("click", function() {
      window.print();
    });
  }

  var shareRetrievedPassBtn = document.getElementById("shareRetrievedPassBtn");
  if (shareRetrievedPassBtn) {
    shareRetrievedPassBtn.addEventListener("click", function() {
      if (!currentFoundData) return;
      var shareText = "🎉 Here is my official MLN Alliance MediaCrew Member Pass (#" + (currentFoundData.id || "") + ") for " + (currentFoundData.activity || "") + "! Check out the crew: " + window.location.origin + "/MLN-Alliance-MediaCrew/index.html";
      window.open("https://api.whatsapp.com/send?text=" + encodeURIComponent(shareText), "_blank");
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
