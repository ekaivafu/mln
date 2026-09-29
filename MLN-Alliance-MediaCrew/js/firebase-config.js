/*
 * Firebase integration boundary.
 * Replace these placeholder values with the Firebase web app config from
 * Firebase Console > Project settings > Your apps.
 */
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

  window.MLN_FIREBASE = {
    isConfigured: isConfigured,
    config: firebaseConfig,
    db: null,
    auth: null
  };

  if (!isConfigured) return;

  firebase.initializeApp(firebaseConfig);
  window.MLN_FIREBASE.db = typeof firebase.firestore === "function"
    ? firebase.firestore()
    : null;
  window.MLN_FIREBASE.auth = typeof firebase.auth === "function"
    ? firebase.auth()
    : null;
})();
