import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString:
    "postgresql://neondb_owner:npg_ERmLyYSF8NO1@ep-frosty-union-a1dilhh8-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  ssl: { rejectUnauthorized: false },
});

try {
  const result = await pool.query("SELECT NOW()");
  console.log("✅ Connected successfully! Current time: - test-neon.mjs:12", result.rows[0].now);
} catch (err) {
  console.error("❌ Connection failed: - test-neon.mjs:14", err.message);
} finally {
  await pool.end();
}
