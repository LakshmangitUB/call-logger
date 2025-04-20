const express = require("express");
const { google } = require("googleapis");
const bodyParser = require("body-parser");
const fs = require("fs");
const cors = require("cors");

const app = express();
app.use(bodyParser.json());
app.use(cors()); // Enables cross-origin requests

const PORT = 3000; // Port for the server
const spreadsheetId = "1h4SZCx6zz2YQLUXl3JR8Zweg-PrPaaCS2Cv6irkAxcQ"; // Your Google Sheet ID

// Google Sheets API authentication using environment variables
const auth = new google.auth.GoogleAuth({
  credentials: {
    type: "service_account",
    project_id: process.env.GOOGLE_PROJECT_ID,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"), // Ensure proper key formatting
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

app.post("/logAnswers", async (req, res) => {
  try {
    const { answers, isNewClient } = req.body;

    // Stop logging if the client is not new
    if (!isNewClient) {
      return res.status(200).send("No log created, as the client is an existing client.");
    }

    // Get the current date and time
    const currentDate = new Date();
    const date = currentDate.toISOString().split("T")[0]; // Format: YYYY-MM-DD
    const time = currentDate.toTimeString().split(" ")[0]; // Format: HH:MM:SS

    const sheets = google.sheets({ version: "v4", auth });

    // Append the data to the Google Sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Sheet1", // Ensure this matches the name of your sheet
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[date, time, ...answers]], // Add date, time, and answers
      },
    });

    console.log("Data successfully logged to Google Sheets:", answers);
    res.status(200).send("Answers successfully logged into Google Sheets!");
  } catch (error) {
    console.error("Error while logging to Google Sheets:", error.message);
    res.status(500).send("Failed to log answers into Google Sheets: " + error.message);
  }
});

// Confirm the authentication works during server startup
auth.getClient()
  .then(() => {
    console.log("Google Sheets API authentication successful!");
  })
  .catch((err) => {
    console.error("Authentication error:", err.message);
  });

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});