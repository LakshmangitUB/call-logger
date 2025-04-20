const express = require("express");
const { google } = require("googleapis");
const bodyParser = require("body-parser");
const fs = require("fs");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

const spreadsheetId = "1h4SZCx6zz2YQLUXl3JR8Zweg-PrPaaCS2Cv6irkAxcQ";
const credentialsPath = path.join(__dirname, "call-logger-app-457216-8a65ff0d1251.json");

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(fs.readFileSync(credentialsPath, "utf-8")),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

app.post("/logAnswers", async (req, res) => {
  try {
    const { answers, isNewClient } = req.body;

    if (!Array.isArray(answers) || answers.length === 0) {
      console.warn("⚠️ No answers received.");
      return res.status(400).send("No answers to log.");
    }

    if (!isNewClient) {
      console.log("ℹ️ Existing client. Logging skipped.");
      return res.status(200).send("No log created. Existing client.");
    }

    const currentDate = new Date();
    const date = currentDate.toISOString().split("T")[0];
    const time = currentDate.toTimeString().split(" ")[0];

    const sheets = google.sheets({ version: "v4", auth });
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Sheet1",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[date, time, ...answers]],
      },
    });

    console.log("✅ Logged to Google Sheets at", date, time);
    console.log("📝 Answers:", answers);
    res.status(200).send("✅ Answers successfully logged.");
  } catch (err) {
    console.error("❌ Logging error:", err.message);
    res.status(500).send("Server error: " + err.message);
  }
});

auth.getClient()
  .then(() => console.log("✅ Google API Auth successful. Server ready."))
  .catch((err) => console.error("❌ Auth error:", err.message));

app.listen(PORT, () => {
  console.log(`🚀 Call Logger Server running → http://localhost:${PORT}`);
});
