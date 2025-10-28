import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { pool } from "../server.js";

dotenv.config();
const router = express.Router();

// 🧠 User Signup (Register)
router.post("/signup", async (req, res) => {
  const { name, phone, email, password } = req.body;

  if (!name || !phone || !password)
    return res.status(400).json({ success: false, message: "Name, phone, and password are required." });

  try {
    // Check duplicate phone
    const existing = await pool.query("SELECT * FROM users WHERE phone = $1", [phone]);
    if (existing.rows.length > 0)
      return res.status(400).json({ success: false, message: "User already exists with this phone." });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const result = await pool.query(
      `INSERT INTO users (name, phone, email, password)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, phone, email, created_at`,
      [name, phone, email, hashedPassword]
    );

    // Generate JWT
    const token = jwt.sign(
      { userId: result.rows[0].id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      success: true,
      message: "User registered successfully.",
      user: result.rows[0],
      token,
    });
  } catch (err) {
    console.error("❌ Error in /signup - userRoutes.js:48", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 🧠 User Login
router.post("/login", async (req, res) => {
  const { phone, password } = req.body;

  if (!phone || !password)
    return res.status(400).json({ success: false, message: "Phone and password required." });

  try {
    const result = await pool.query("SELECT * FROM users WHERE phone = $1", [phone]);
    if (result.rows.length === 0)
      return res.status(400).json({ success: false, message: "User not found." });

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ success: false, message: "Invalid password." });

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      message: "Login successful.",
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("❌ Error in /login - userRoutes.js:88", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 🔒 Auth Middleware
const verifyUserToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer "))
      return res.status(401).json({ success: false, message: "Access denied. No token provided." });

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.userId };
    next();
  } catch (err) {
    console.error("❌ Invalid token - userRoutes.js:105", err.message);
    res.status(401).json({ success: false, message: "Invalid or expired token." });
  }
};

// 👤 Get user profile (JWT protected)
router.get("/profile", verifyUserToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, phone, email, created_at FROM users WHERE id = $1",
      [req.user.id]
    );
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error("❌ Error fetching profile - userRoutes.js:119", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
