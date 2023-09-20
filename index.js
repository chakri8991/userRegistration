const express = require("express");
const mysql = require("mysql2/promise");
const ipinfo = require("ipinfo");
const twilio = require("twilio");
const bcrypt = require("bcrypt");

const app = express();
const port = process.env.PORT || 3000;

// MySQL Configuration
const dbConfig = {
  host: "localhost",
  user: "your_db_user",
  password: "your_db_password",
  database: "user_registration",
};

const twilioClient = new twilio(
  "AC5245f5d5c5b1d214fb2e16c6de95ef0b",
  "0e925a682be8539e1b451cb5b61b808a"
);
const twilioPhoneNumber = "YOUR_TWILIO_PHONE_NUMBER";

app.use(express.json());

// Generate OTP
function generateOTP() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Middleware to validate IP address
app.use(async (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const ipInfo = await ipinfo(ip);
  //   console.log(ipInfo.country);
  console.log("IP Address:", ip);
  console.log("Country:", ipInfo.country);

  // Check if IP is from an allowed country or city (customize as needed)
  if (ipInfo.country !== "INDIA" || ipInfo.city !== "HYDERABAD") {
    return res.status(403).json({ error: "IP address not allowed" });
  }

  next();
});

// Route to send OTP to the user's phone number
app.post("/send-otp", async (req, res) => {
  const { phoneNumber } = req.body;
  const otp = generateOTP();

  try {
    // Send OTP via Twilio
    await twilioClient.messages.create({
      body: `Your OTP is: ${otp}`,
      to: phoneNumber,
      from: twilioPhoneNumber,
    });

    // Save OTP in the database
    const connection = await mysql.createConnection(dbConfig);
    await connection.execute(
      "INSERT INTO users (phone_number, otp) VALUES (?, ?)",
      [phoneNumber, otp]
    );
    connection.end();

    res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error sending OTP" });
  }
});

// Route to validate OTP and register the user
app.post("/validate-otp", async (req, res) => {
  const { phoneNumber, otp } = req.body;

  try {
    // Retrieve OTP from the database
    const connection = await mysql.createConnection(dbConfig);
    const [
      rows,
    ] = await connection.execute(
      "SELECT * FROM users WHERE phone_number = ? AND otp = ?",
      [phoneNumber, otp]
    );

    if (rows.length === 0) {
      res.status(400).json({ error: "Invalid OTP" });
    } else {
      // Registration successful
      // You can hash and save user information here if needed

      res.status(200).json({ message: "User registered successfully" });
    }

    connection.end();
  } catch (error) {
    res.status(500).json({ error: "Error validating OTP" });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
