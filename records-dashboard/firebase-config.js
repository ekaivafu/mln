/* Copy this folder anywhere and replace these values with your Firebase web app config. */
(function () {
  "use strict";

  var firebaseConfig = {
    apiKey: "AIzaSyBeW6A4sb5PGvg3LE9HKVd7wyRSd881vDw",
    authDomain: "mln-media.firebaseapp.com",
    projectId: "mln-media",
    storageBucket: "mln-media.firebasestorage.app",
    messagingSenderId: "287056956500",
    appId: "1:287056956500:web:a218271469848660ebf1c1",
    measurementId: "G-8SLS6C5FKY"
  };

  var isConfigured = Object.keys(firebaseConfig).every(function (key) {
    return firebaseConfig[key] && firebaseConfig[key].indexOf("YOUR_") === -1;
  });

  window.MLN_FIREBASE = { isConfigured: isConfigured, db: null };
  if (!isConfigured) return;

  firebase.initializeApp(firebaseConfig);
  window.MLN_FIREBASE.db = firebase.firestore();
})();
