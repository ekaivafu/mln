// Vercel Serverless Function: /api/register
// First-party registration handler — immune to client-side ad-blockers and privacy shields.

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || "AIzaSyBeW6A4sb5PGvg3LE9HKVd7wyRSd881vDw";
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "mln-media";

function toFirestoreFields(obj) {
  const fields = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      fields[key] = { nullValue: null };
    } else if (typeof value === "boolean") {
      fields[key] = { booleanValue: value };
    } else if (typeof value === "number") {
      if (Number.isInteger(value)) {
        fields[key] = { integerValue: String(value) };
      } else {
        fields[key] = { doubleValue: value };
      }
    } else if (typeof value === "string") {
      fields[key] = { stringValue: value };
    } else if (Array.isArray(value)) {
      fields[key] = {
        arrayValue: {
          values: value.map((v) => ({ stringValue: String(v) }))
        }
      };
    } else if (typeof value === "object") {
      fields[key] = {
        mapValue: {
          fields: toFirestoreFields(value)
        }
      };
    }
  }
  return fields;
}

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const data = req.body || {};

  if (!data.name || !data.email || !data.rollNumber) {
    return res.status(400).json({
      success: false,
      error: "Missing required registration fields (name, email, rollNumber)."
    });
  }

  const cleanRoll = String(data.rollNumber).trim().toUpperCase();
  const docId = data.id || `MLN-${cleanRoll.replace(/[^A-Z0-9]/g, "")}`;
  data.id = docId;
  data.registeredAt = data.registeredAt || new Date().toISOString();

  let cloudSaved = false;
  let cloudNotice = null;

  // Attempt to persist to Firestore via REST API
  try {
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/registrations/${encodeURIComponent(docId)}?key=${FIREBASE_API_KEY}`;
    
    // Strip large inline base64 if it exceeds 800KB to stay within Firestore limits
    const payload = { ...data };
    if (payload.photo && payload.photo.length > 800000) {
      delete payload.photo; // Photo stays cached in localStorage
    }

    const firestoreRes = await fetch(firestoreUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: toFirestoreFields(payload)
      })
    });

    const firestoreData = await firestoreRes.json();

    if (firestoreRes.ok) {
      cloudSaved = true;
    } else {
      cloudNotice = firestoreData.error?.message || "Firestore API returned non-200";
      console.warn("Firestore REST sync notice:", cloudNotice);
    }
  } catch (err) {
    cloudNotice = err.message;
    console.warn("Firestore REST connection error:", err.message);
  }

  return res.status(200).json({
    success: true,
    id: docId,
    cloudSaved,
    notice: cloudNotice
  });
}
