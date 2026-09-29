# Portable records dashboard

This folder is independent of the main website. Move the entire `records-dashboard` folder wherever you need it and open `records.html`.

Before use:

1. Confirm the Firebase config in `firebase-config.js`.
2. Deploy the repository `firestore.rules` file so the `registrations` collection allows public reads.
3. Use the filters or export the current table view to Excel.

This dashboard intentionally has no login. Anyone who can open the page can read the registration records, so do not use this setup for sensitive student data without adding authentication.
