// Vercel Serverless Function: /api/records
// First-party records fetcher — retrieves registrations from Firestore via REST API

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || "AIzaSyBeW6A4sb5PGvg3LE9HKVd7wyRSd881vDw";
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "mln-media";

function fromFirestoreDoc(doc) {
  const obj = {};
  if (!doc.fields) return obj;
  for (const [key, val] of Object.entries(doc.fields)) {
    if ("stringValue" in val) obj[key] = val.stringValue;
    else if ("booleanValue" in val) obj[key] = val.booleanValue;
    else if ("integerValue" in val) obj[key] = parseInt(val.integerValue, 10);
    else if ("doubleValue" in val) obj[key] = parseFloat(val.doubleValue);
    else if ("nullValue" in val) obj[key] = null;
    else if ("arrayValue" in val) obj[key] = (val.arrayValue.values || []).map((v) => Object.values(v)[0]);
  }
  const parts = (doc.name || "").split("/");
  obj.id = parts[parts.length - 1];
  return obj;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed. Use GET." });
  }

  try {
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/registrations?key=${FIREBASE_API_KEY}&pageSize=300`;
    const response = await fetch(firestoreUrl);
    const data = await response.json();

    if (response.ok && data.documents) {
      const records = data.documents.map(fromFirestoreDoc);
      return res.status(200).json({ success: true, records, count: records.length });
    }

    // Return empty list if collection is empty or not enabled yet
    return res.status(200).json({
      success: true,
      records: [],
      warning: data.error?.message || "No registrations found or Firestore API disabled."
    });
  } catch (err) {
    return res.status(200).json({
      success: true,
      records: [],
      warning: err.message
    });
  }
}
