# Firebase setup

## 1. Create the Firebase project

1. Create a Firebase project at https://console.firebase.google.com.
2. Create a Web app and copy its config object.
3. Enable **Firestore Database**.
4. Enable **Authentication > Email/Password**.
5. Create an admin user in Firebase Authentication.
6. Replace the placeholder values in `js/firebase-config.js`.

Keep `js/firebase-config.js` in the project. Firebase web config values identify the project but are not secret credentials; access is controlled by Authentication and Firestore rules.

## 2. Deploy the rules

This repository now includes `firebase.json` and `.firebaserc` already linked to the configured project. Deploy `firestore.rules` with the Firebase CLI:

```bash
firebase login
firebase deploy --only firestore:rules
```

The deploy command must be run by a Firebase account that has access to the `mln-alliance-mediacrew-1205e` project. Until this deployment succeeds, registration will return a Firestore `permission-denied` error.

The public registration page can create documents in `registrations`. The portable `records-dashboard` folder reads the collection directly without login, so anyone who can open that folder can view the records. Update and delete operations remain restricted to authenticated users with the custom token claim `admin: true`.

## 3. Give the records user admin access

Set the custom claim from a trusted server or Firebase Admin SDK. Do not put an Admin SDK service account key in this website.

Example Node.js Admin SDK script:

```js
const admin = require("firebase-admin");
admin.initializeApp();
admin.auth().setCustomUserClaims("AUTH_USER_UID", { admin: true });
```

After setting the claim, sign out and sign back in at `records.html` so the ID token refreshes.

## 4. Use the records dashboard

Move the complete `records-dashboard` folder outside this project if desired, then open its `records.html` file. It loads records directly and provides:

- Department, experience, and text filters
- `Export Excel` to download the currently filtered rows as `.xlsx`

The registration collection is named `registrations`. Each record includes the selected department/activity, student details, experience, and an ISO `registeredAt` timestamp.

## Production note

The current browser form intentionally does not query existing registrations because public reads would expose applicant data. If duplicate-by-email or duplicate-by-roll enforcement is required, add it in a trusted Cloud Function or another server-side endpoint before the Firestore write.
