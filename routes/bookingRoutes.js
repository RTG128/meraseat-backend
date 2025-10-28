// routes/bookingRoutes.js
import express from "express";
import { pool } from "../server.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

// Middleware to verify JWT
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
    console.error("❌ Invalid token - bookingRoutes.js:22", err.message);
    res.status(401).json({ success: false, message: "Invalid or expired token." });
  }
};

// 🧠 Create seat request
router.post("/request", verifyUserToken, async (req, res) => {
  try {
    const { from_station, to_station, train_name, train_number, distance_km, journey_date } = req.body;

    if (!from_station || !to_station || !journey_date)
      return res.status(400).json({ success: false, message: "Missing required fields." });

    // Allow only one active request per user
    const existing = await pool.query(
      "SELECT * FROM bookings WHERE user_id = $1 AND status = 'pending'",
      [req.user.id]
    );
    if (existing.rows.length > 0)
      return res.status(400).json({ success: false, message: "You already have an active booking request." });

    const result = await pool.query(
      `INSERT INTO bookings 
      (user_id, from_station, to_station, train_name, train_number, distance_km, journey_date, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
      RETURNING *`,
      [req.user.id, from_station, to_station, train_name, train_number, distance_km, journey_date]
    );

    res.status(201).json({
      success: true,
      message: "Seat request created successfully.",
      booking: result.rows[0],
    });
  } catch (err) {
    console.error("❌ Error in /bookings/request - bookingRoutes.js:57", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
