const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { query, run } = require("./db");
const nodemailer = require("nodemailer");

const JWT_SECRET =
  process.env.JWT_SECRET || "medscribe-secret-key-change-in-production";

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET must be set in production");
}

if (!process.env.JWT_SECRET) {
  console.warn(
    "WARNING: JWT_SECRET is not set. Using development fallback secret.",
  );
}

const loginAttempts = new Map();
const resetAttempts = new Map();

function checkRateLimit(bucket, key, maxAttempts, windowMs) {
  const now = Date.now();
  const entry = bucket.get(key) || { count: 0, firstAttempt: now };

  if (now - entry.firstAttempt > windowMs) {
    bucket.set(key, { count: 1, firstAttempt: now });
    return true;
  }

  entry.count += 1;
  bucket.set(key, entry);
  return entry.count <= maxAttempts;
}

// Register
router.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email and password required" });

    const existing = query("SELECT id FROM doctors WHERE email = ?", [email]);
    if (existing.length > 0)
      return res.status(409).json({ error: "Email already registered" });

    const hash = await bcrypt.hash(password, 12);
    const result = run(
      "INSERT INTO doctors (email, password_hash, name) VALUES (?, ?, ?)",
      [email, hash, name || ""],
    );

    const token = jwt.sign({ id: result.lastInsertRowid, email }, JWT_SECRET, {
      expiresIn: "7d",
    });
    res.json({ token, doctorId: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const key = `${req.ip || "unknown"}:${email || "unknown"}`;
    if (!checkRateLimit(loginAttempts, key, 10, 15 * 60 * 1000)) {
      return res
        .status(429)
        .json({ error: "Too many login attempts. Please try again later." });
    }

    const docs = query("SELECT * FROM doctors WHERE email = ?", [email]);
    if (!docs.length)
      return res.status(401).json({ error: "Invalid credentials" });

    const doctor = docs[0];
    const valid = await bcrypt.compare(password, doctor.password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: doctor.id, email: doctor.email }, JWT_SECRET, {
      expiresIn: "7d",
    });
    res.json({ token, doctorId: doctor.id, name: doctor.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Forgot password
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const key = `${req.ip || "unknown"}:${email || "unknown"}`;
    if (!checkRateLimit(resetAttempts, key, 5, 60 * 60 * 1000)) {
      return res
        .status(429)
        .json({ error: "Too many reset requests. Please try again later." });
    }

    const docs = query("SELECT id, email FROM doctors WHERE email = ?", [
      email,
    ]);
    if (!docs.length)
      return res.json({
        message: "If this email exists, a reset link has been sent.",
      });

    const token = uuidv4();
    const expires = new Date(Date.now() + 3600000).toISOString(); // 1 hour
    run(
      "INSERT INTO password_reset_tokens (doctor_id, token, expires_at) VALUES (?, ?, ?)",
      [docs[0].id, token, expires],
    );

    // Send email (configure SMTP in .env)
    const resetUrl = `http://localhost:${process.env.PORT || 3000}/reset-password.html?token=${token}`;

    const smtpConfig = {
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      auth: {
        user: process.env.SMTP_USER || "",
        pass: process.env.SMTP_PASS || "",
      },
    };

    if (process.env.SMTP_USER) {
      const transporter = nodemailer.createTransport(smtpConfig);
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: email,
        subject: "MedScribe - Password Reset Request",
        html: `
          <h2>Password Reset</h2>
          <p>You requested a password reset for your MedScribe account.</p>
          <p>Click the link below to reset your password (valid for 1 hour):</p>
          <a href="${resetUrl}">${resetUrl}</a>
          <p>If you did not request this, please ignore this email.</p>
        `,
      });
    } else {
      // Development: log to console
      console.log(`[DEV] Password reset link for ${email}: ${resetUrl}`);
    }

    res.json({
      message: "If this email exists, a reset link has been sent.",
      devLink: process.env.NODE_ENV !== "production" ? resetUrl : undefined,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reset password
router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;
    const tokens = query(
      "SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0 AND expires_at > ?",
      [token, new Date().toISOString()],
    );
    if (!tokens.length)
      return res.status(400).json({ error: "Invalid or expired token" });

    const hash = await bcrypt.hash(password, 12);
    run("UPDATE doctors SET password_hash = ? WHERE id = ?", [
      hash,
      tokens[0].doctor_id,
    ]);
    run("UPDATE password_reset_tokens SET used = 1 WHERE id = ?", [
      tokens[0].id,
    ]);

    res.json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Middleware
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "No token" });
  const token = header.split(" ")[1];
  try {
    req.doctor = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

module.exports = { router, authMiddleware };
