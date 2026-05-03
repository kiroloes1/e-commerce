const express = require("express");
const router = express.Router();
const { MongoClient } = require("mongodb");
const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");
const cron = require("node-cron");
const authMiddleware = require(`${__dirname}/../middlewares/authMiddleware`);
const {role}=require(`${__dirname}/../middlewares/authorization`)


const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

/* =========================
   1. LOGIN GOOGLE
========================= */
router.get("/auth/google", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/drive.file"],
  });

  res.redirect(url);
});

/* =========================
   2. CALLBACK
========================= */
router.get("/oauth2callback", async (req, res) => {
  try {
    const { code } = req.query;

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    fs.writeFileSync("token.json", JSON.stringify(tokens));

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
  const client = new MongoClient(uri);

  await client.connect();

  const db = client.db();
  const collections = await db.listCollections().toArray();

  let backup = {};

  for (const col of collections) {
    backup[col.name] = await db.collection(col.name).find({}).toArray();
  }

  const fileName = `backup-${Date.now()}.json`;
  const filePath = path.join(__dirname, fileName);

  fs.writeFileSync(filePath, JSON.stringify(backup, null, 2));

  const token = JSON.parse(fs.readFileSync("token.json"));
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
   3. MANUAL BACKUP
========================= */




router.get("/backup", async (req, res) => {
  try {
    await createBackup();
    res.json({ success: true, message: "Backup done ✔" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* =========================
   4. AUTO BACKUP (DAILY)
========================= */
cron.schedule("0 2 * * *", async () => {
  console.log("⏰ Running daily backup...");

  try {
    await createBackup();
  } catch (err) {
    console.log("❌ Auto backup failed:", err.message);
  }
});

module.exports = router;