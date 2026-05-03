const express = require("express");
const router = express.Router();
const { MongoClient } = require("mongodb");
const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");
const cron = require("node-cron");

require("dotenv").config(); // مهم جدًا

/* =========================
   GOOGLE AUTH CLIENT
========================= */
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

/* =========================
   LOGIN GOOGLE
========================= */
router.get("/auth/google", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/drive.file"],
    prompt: "consent",
  });

  res.redirect(url);
});

/* =========================
   CALLBACK
========================= */
router.get("/oauth2callback", async (req, res) => {
  try {
    const { code } = req.query;

    const { tokens } = await oauth2Client.getToken(code);

    oauth2Client.setCredentials(tokens);

    fs.writeFileSync(
      path.join(__dirname, "token.json"),
      JSON.stringify(tokens)
    );

    res.send("Google Auth Success ✔");
  } catch (err) {
    res.status(500).send(err.message);
  }
});

/* =========================
   BACKUP FUNCTION
========================= */
async function createBackup() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error("MONGO_URI is not defined in .env");
  }

  const client = new MongoClient(uri);

  await client.connect();

  const db = client.db();
  const collections = await db.listCollections().toArray();

  const backup = {};

  for (const col of collections) {
    backup[col.name] = await db.collection(col.name).find({}).toArray();
  }

  const fileName = `backup-${Date.now()}.json`;
  const filePath = path.join(__dirname, fileName);

  fs.writeFileSync(filePath, JSON.stringify(backup, null, 2));

  // load token safely
  const tokenPath = path.join(__dirname, "token.json");

  if (!fs.existsSync(tokenPath)) {
    throw new Error("Google token not found. Please login first.");
  }

  const token = JSON.parse(fs.readFileSync(tokenPath));

  oauth2Client.setCredentials(token);

  const drive = google.drive({ version: "v3", auth: oauth2Client });

  await drive.files.create({
    requestBody: {
      name: fileName,
    },
    media: {
      mimeType: "application/json",
      body: fs.createReadStream(filePath),
    },
  });

  fs.unlinkSync(filePath);

  await client.close();

  console.log("✅ Backup uploaded to Google Drive");
}

/* =========================
   MANUAL BACKUP
========================= */
router.get("/backup", async (req, res) => {
  try {
    await createBackup();
    res.json({ success: true, message: "Backup done ✔" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* =========================
   AUTO BACKUP (DAILY 2AM)
========================= */
cron.schedule("0 2 * * *", async () => {
  console.log("⏰ Running daily backup...");

  try {
    await createBackup();
  } catch (err) {
    console.error("❌ Auto backup failed:", err.message);
  }
});

module.exports = router;
