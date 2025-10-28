import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export const verifyPartnerToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.partner = { id: decoded.partnerId };
    next();
  } catch (err) {
    console.error("❌ Invalid token - authPartner.js:24", err.message);
    res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
};
