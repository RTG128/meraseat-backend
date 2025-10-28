import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { pool } from "../server.js";

dotenv.config();
const router = express.Router();

// ------------------------------
// Admin Login
// ------------------------------
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res
      .status(400)
      .json({ success: false, message: "Username and password required." });

  try {
    const result = await pool.query("SELECT * FROM admins WHERE username = $1", [username]);
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: "Admin not found." });

    const admin = result.rows[0];
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch)
      return res.status(401).json({ success: false, message: "Invalid password." });

    const token = jwt.sign({ adminId: admin.id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      success: true,
      message: "Admin login successful.",
      token,
      admin: { id: admin.id, username: admin.username },
    });
  } catch (err) {
    console.error("Admin login error: - adminRoutes.js:41", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ------------------------------
// Middleware: Verify Admin Token
// ------------------------------
const verifyAdmin = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer "))
      return res.status(401).json({ success: false, message: "Unauthorized." });

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded?.adminId)
      return res.status(401).json({ success: false, message: "Invalid token." });

    req.admin = { id: decoded.adminId };
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired token." });
  }
};

// ------------------------------
// Get All Users
// ------------------------------
router.get("/users", verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, phone, email, created_at FROM users ORDER BY id DESC"
    );
    res.json({ success: true, total: result.rows.length, users: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ------------------------------
// Get All Partners
// ------------------------------
router.get("/partners", verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, phone, email, verified, created_at FROM partners ORDER BY id DESC"
    );
    res.json({ success: true, total: result.rows.length, partners: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ------------------------------
// Get All Bookings
// ------------------------------
router.get("/bookings", verifyAdmin, async (req, res) => {
  try {
    const query = `
      SELECT b.*, 
             u.name AS user_name, u.phone AS user_phone,
             p.name AS partner_name, p.phone AS partner_phone
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.id
      LEFT JOIN partners p ON b.partner_id = p.id
      ORDER BY b.id DESC;
    `;
    const result = await pool.query(query);
    res.json({ success: true, total: result.rows.length, bookings: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ------------------------------
// Update Booking Status
// ------------------------------
router.put("/update-booking/:id", verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const allowed = ["pending", "accepted", "completed", "cancelled"];
  if (!allowed.includes(status))
    return res.status(400).json({ success: false, message: "Invalid status." });

  try {
    const result = await pool.query(
      "UPDATE bookings SET status = $1 WHERE id = $2 RETURNING *",
      [status, id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: "Booking not found." });

    res.json({
      success: true,
      message: "Booking status updated successfully.",
      booking: result.rows[0],
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ------------------------------
// Delete Booking
// ------------------------------
router.delete("/delete-booking/:id", verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM bookings WHERE id = $1 RETURNING id",
      [req.params.id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: "Booking not found." });

    res.json({ success: true, message: "Booking deleted successfully." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
