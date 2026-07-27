const fs = require("fs");
const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const dataFile = path.join(__dirname, "patient_data.json");

// Ensure JSON file exists
if (!fs.existsSync(dataFile)) {
  fs.writeFileSync(
    dataFile,
    JSON.stringify({
      users: [{ username: "abinandhini", password: "abi" }],
      records: [],
      profile: { name: "Default", email: "doctor@example.com" }
    }, null, 2)
  );
}

// ---------- LOGIN ----------
app.post("/login", (req, res) => {
  const data = JSON.parse(fs.readFileSync(dataFile));
  const users = data.users || [];
  const user = users.find(
    u => u.username === req.body.username && u.password === req.body.password
  );
  if (user) res.json({ success: true });
  else res.status(401).json({ success: false, message: "Invalid credentials" });
});

// ---------- ADD & ANALYZE ----------
app.post("/add", (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(dataFile));
    const { systolic, diastolic, pulse } = req.body;

    let result = "Normal";
    if (systolic > 130 || diastolic > 85) result = "High";
    else if (systolic < 90 || diastolic < 60) result = "Low";

    const entry = {
      date: new Date().toLocaleString(),
      systolic,
      diastolic,
      pulse,
      result
    };

    data.records.push(entry);
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));

    if (result !== "Normal") sendAbnormalEmail(entry, data.profile);

    res.json({ success: true, entry });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error while adding entry.");
  }
});

// ---------- GET HISTORY ----------
app.get("/data", (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(dataFile));
    res.json(data.records);
  } catch (err) {
    res.status(500).send("Failed to load history");
  }
});

// ---------- PROFILE ----------
app.post("/profile", (req, res) => {
  const data = JSON.parse(fs.readFileSync(dataFile));
  data.profile = req.body;
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
  res.json({ success: true, message: "Profile updated" });
});

// ---------- SHARE ----------
app.post("/share", (req, res) => {
  const data = JSON.parse(fs.readFileSync(dataFile));
  sendAbnormalEmail({ shared: true }, data.profile);
  res.json({ success: true, message: "Report shared" });
});

// ---------- EMAIL ----------
function sendAbnormalEmail(entry, profile) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "your_email@gmail.com",
      pass: "your_app_password"
    }
  });

  const textMsg = entry.shared
    ? `Manual share triggered.\n\nLatest readings:\n${JSON.stringify(entry)}`
    : `⚠️ Alert: Abnormal BP detected!\nDate: ${entry.date}\nSystolic: ${entry.systolic}\nDiastolic: ${entry.diastolic}\nPulse: ${entry.pulse}\nResult: ${entry.result}`;

  transporter.sendMail({
    from: "SmartCare BP <your_email@gmail.com>",
    to: profile.email || "doctor@example.com",
    subject: "SmartCare BP Report",
    text: textMsg
  }, err => {
    if (err) console.error("Email failed:", err);
    else console.log("Email sent successfully");
  });
}

app.listen(3000, () =>
  console.log("✅ SmartCare BP server running on http://localhost:3000")
);
