// routes/userRoutes.js
const express = require("express");
const { check } = require("express-validator");
const router = express.Router();

const userHandler = require("../handlers/user");
const { verifyToken } = require("../middlewares/auth");
const upload = require("../middlewares/upload");

// Guard middleware: only allow admin
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") return next();
  return res.status(403).json({ message: "Admin only" });
};

// --- Public Routes -----------------------------------------------------------

// Register new user
router.post(
  "/register",
  upload.single("image"),
  [
    check("name").notEmpty().withMessage("Name is required"),
    check("email").isEmail().withMessage("Invalid email"),
    check("password").isLength({ min: 6 }).withMessage("Password too short"),
    check("role").isIn(["client", "coach", "admin"]).withMessage("Invalid role"),
  ],
  userHandler.register
);

// Login
router.post("/login", userHandler.login);

// --- Protected Routes --------------------------------------------------------

// Get current user's profile
router.get("/me", verifyToken, userHandler.getProfile);

// Update current user's profile
router.put("/me", verifyToken, userHandler.updateMe);

// Change password
router.put("/me/password", verifyToken, userHandler.changePassword);

// Verify admin password
router.post(
  "/verify-password",
  verifyToken,
  requireAdmin,
  userHandler.verifyAdminPassword
);

module.exports = router;
