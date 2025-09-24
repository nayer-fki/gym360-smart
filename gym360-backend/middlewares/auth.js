// middlewares/auth.js
const jwt = require("jsonwebtoken");

/**
 * Extract JWT from:
 *  - Authorization: Bearer <token>
 *  - x-auth-token: <token>
 */
function extractToken(req) {
  // header name can vary in case (node normalizes to lowercase usually)
  const authHeader =
    req.header("Authorization") ||
    req.header("authorization") ||
    req.headers["authorization"];

  if (authHeader) {
    // tolerate extra spaces / mixed case
    const parts = authHeader.trim().split(/\s+/);
    if (parts.length === 2 && /^bearer$/i.test(parts[0])) {
      return parts[1];
    }
  }

  const xAuth = req.headers["x-auth-token"];
  if (xAuth) return String(xAuth).trim();

  return null;
}

/**
 * Verify JWT and attach payload to req.user
 * Expected payload to contain: { _id || userId, role, iat, exp }
 */
const verifyToken = (req, res, next) => {
  try {
    if (!process.env.JWT_SECRET) {
      return res
        .status(500)
        .json({ message: "Server misconfigured: JWT_SECRET is missing." });
    }

    const token = extractToken(req);
    if (!token) {
      return res
        .status(401)
        .json({ message: "Access denied. No token provided." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Normalize a couple fields for downstream code:
    // prefer _id but keep userId for backward-compat
    if (decoded.userId && !decoded._id) decoded._id = decoded.userId;
    // normalize role to lowercase string
    if (decoded.role) decoded.role = String(decoded.role).toLowerCase();

    req.user = decoded;
    return next();
  } catch (err) {
    // Distinguish expiration vs invalid
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired." });
    }
    return res.status(401).json({ message: "Invalid token." });
  }
};

/**
 * Generic role guard. Accepts one or more roles (strings, case-insensitive).
 * Always runs verifyToken first so it can be used standalone.
 */
function requireRole(...allowed) {
  const allowedNorm = allowed.map((r) => String(r).toLowerCase());
  return (req, res, next) => {
    verifyToken(req, res, () => {
      const role = String(req.user?.role || "").toLowerCase();
      if (allowedNorm.includes(role)) return next();
      return res.status(403).json({ message: "Access forbidden." });
    });
  };
}

// Convenience guards
const verifyAdmin = requireRole("admin");
const verifyCoach = requireRole("coach", "admin");
const verifyClient = requireRole("client", "admin");

module.exports = { verifyToken, verifyAdmin, verifyCoach, verifyClient, requireRole };
