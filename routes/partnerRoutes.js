// routes/partnerRoutes.js
import express from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { pool } from "../server.js";

dotenv.config();
const router = express.Router();

/* ----------------------------- AUTH MIDDLEWARE ----------------------------- */
const verifyPartnerToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer "))
      return res
        .status(401)
        .json({ success: false, message: "Access denied. No token provided." });

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.partner = { id: decoded.partnerId };
    next();
  } catch (err) {
    console.error("❌ Invalid token - partnerRoutes.js:24", err.message);
    res.status(401).json({ success: false, message: "Invalid or expired token." });
  }
};

/* ------------------------------ GET PENDING REQUESTS ------------------------------ */
// Partners see all pending bookings
router.get("/pending-requests", verifyPartnerToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*, u.name AS user_name, u.phone AS user_phone
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       WHERE b.status = 'pending'
       ORDER BY b.created_at DESC`
    );

    res.json({
      success: true,
      total: result.rows.length,
      requests: result.rows,
    });
  } catch (err) {
    console.error("❌ Error fetching pending requests - partnerRoutes.js:47", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ------------------------------ ACCEPT A REQUEST ------------------------------ */
// Partner accepts a booking
router.post("/accept/:bookingId", verifyPartnerToken, async (req, res) => {
  const { bookingId } = req.params;

  try {
    // Check if booking exists and still pending
    const check = await pool.query("SELECT * FROM bookings WHERE id = $1", [
      bookingId,
    ]);
    if (check.rows.length === 0)
      return res
        .status(404)
        .json({ success: false, message: "Booking not found." });

    const booking = check.rows[0];
    if (booking.status !== "pending")
      return res.status(400).json({
        success: false,
        message: `Booking already ${booking.status}.`,
      });

    // Accept it
    const result = await pool.query(
      `UPDATE bookings
       SET status = 'accepted', partner_id = $1
       WHERE id = $2
       RETURNING *`,
      [req.partner.id, bookingId]
    );

    res.json({
      success: true,
      message: "Booking accepted successfully.",
      booking: result.rows[0],
    });
  } catch (err) {
    console.error("❌ Error accepting booking - partnerRoutes.js:89", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
