import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pkg from "pg";

import userRoutes from "./routes/userRoutes.js";
import partnerRoutes from "./routes/partnerRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";

dotenv.config();

const { Pool } = pkg;
const app = express();

// 🧩 Middleware
app.use(cors());
app.use(express.json());

// 🧩 PostgreSQL Connection (Neon Cloud)
export const pool = new Pool({
  connectionString: process.env.DB_URL, // ✅ use DATABASE_URL (universal)
  ssl: process.env.DB_URL.includes("neon.tech")
  ? { rejectUnauthorized: false}
  : false,
});

// ⚙️ Force all sessions to use `public` schema
pool.on("connect", async (client) => {
  try {
    await client.query("SET search_path TO public;");
    console.log("🔧 Connected: search_path set to 'public' - server.js:32");
  } catch (err) {
    console.error("❌ Failed to set search_path - server.js:34", err.message);
  }
});

// 🌍 Root Route
app.get("/", (req, res) => {
  res.send("🚀 Meraseat backend live & connected to Neon PostgreSQL");
});


// 🧪 TEST ROUTES (for backend verification)
app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ success: true, time: result.rows[0].now });
  } catch (err) {
    console.error("❌ DB Test Error (/testdb) - server.js:50", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/test-users", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users LIMIT 5");
    res.json({ success: true, users: result.rows });
  } catch (err) {
    console.error("❌ DB Query Error (/testusers) - server.js:60", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/test-insert-user", async (req, res) => {
  try {
    const { name, phone } = req.body;
    const result = await pool.query(
      "INSERT INTO users (name, phone) VALUES ($1, $2) RETURNING *",
      [name, phone]
    );
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error("❌ DB Insert Error (/testinsertuser) - server.js:74", err);
    res.status(500).json({ success: false, error: err.message });
  }
});


// ✅ Mount Main API Routes
app.use("/api/users", userRoutes);
app.use("/api/partners", partnerRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/bookings", bookingRoutes);


// ⚠️ Catch-all for undefined routes
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// 💥 Global Error Handler
app.use((err, req, res, next) => {
  console.error("🔥 Uncaught Server Error - server.js:94", err.stack);
  res.status(500).json({ success: false, error: "Internal Server Error" });
});

// 🚀 Start Server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT} | Connected to Neon DB - server.js:101`);
});
