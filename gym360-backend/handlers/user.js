// handlers/user.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const User = require("../db/user");
const Client = require("../db/client");
const Coach = require("../db/coach");

// --- Helpers -----------------------------------------------------------------

// Normalize image value to a safe URL (/uploads/filename or absolute http)
const normalizeImage = (value) => {
  if (!value) return undefined;
  if (/^file:/i.test(value) || /^[a-zA-Z]:\\/.test(value)) return undefined; // block local paths
  if (/^https?:\/\//i.test(value)) return value; // keep absolute http(s)
  if (value.startsWith("/uploads/")) return value;
  const name = String(value).split(/[/\\]/).pop();
  return name ? `/uploads/${name}` : undefined;
};

// Remove password and __v fields before returning user
const stripUser = (u) => {
  if (!u) return u;
  u = u.toObject ? u.toObject() : u;
  delete u.password;
  delete u.__v;
  return u;
};

// --- Auth Handlers -----------------------------------------------------------

/**
 * Register new user
 * - Hashes password
 * - Normalizes image (req.file or req.body.image)
 * - Creates related Client/Coach doc depending on role
 * - Returns JWT + user without password
 */
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, profileInfo } = req.body;

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "Email already in use" });

    const image = normalizeImage(
      req.file?.filename ? `/uploads/${req.file.filename}` : req.body.image
    );

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      profileInfo,
      ...(image ? { image } : {}),
    });

    const savedUser = await user.save();

    // Create related doc depending on role
    if (role === "client") {
      await Client.findOneAndUpdate(
        { userId: savedUser._id },
        { $setOnInsert: { userId: savedUser._id } },
        { new: true, upsert: true }
      );
    } else if (role === "coach") {
      await Coach.findOneAndUpdate(
        { userId: savedUser._id },
        { $setOnInsert: { userId: savedUser._id } },
        { new: true, upsert: true }
      );
    }

    const token = jwt.sign(
      { userId: savedUser._id, role: savedUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({ token, user: stripUser(savedUser) });
  } catch (error) {
    res.status(500).json({ message: "Registration failed", error: error.message });
  }
};

/**
 * Login
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const u = await User.findOne({ email });
    if (!u) return res.status(400).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, u.password);
    if (!ok) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { userId: u._id, role: u.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({ token, user: stripUser(u) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --- Profile Handlers --------------------------------------------------------

/**
 * Get current user's profile (protected)
 */
exports.getProfile = async (req, res) => {
  try {
    const id = req.user?.userId;
    if (!id) return res.status(401).json({ message: "No user in token" });

    const me = await User.findById(id).select("-password -__v");
    if (!me) return res.status(404).json({ message: "User not found" });

    res.json(me);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Update current user's profile (protected)
 * - Updates User basic info
 * - If role=client, updates Client.fitnessGoal
 */
exports.updateMe = async (req, res) => {
  try {
    const id = req.user?.userId;
    if (!id) return res.status(401).json({ message: "No user in token" });

    const { name, email, image, profileInfo, goal } = req.body || {};
    const update = {};

    if (typeof name !== "undefined") update.name = String(name).trim();
    if (typeof email !== "undefined") update.email = String(email).trim();
    if (typeof image !== "undefined") update.image = normalizeImage(image);
    if (typeof profileInfo !== "undefined") update.profileInfo = profileInfo;

    const me = await User.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
      select: "-password -__v",
    });
    if (!me) return res.status(404).json({ message: "User not found" });

    // Update client goal if needed
    if (me.role === "client" && typeof goal !== "undefined") {
      await Client.findOneAndUpdate(
        { userId: me._id },
        { fitnessGoal: goal },
        { new: true, upsert: true }
      );
    }

    res.json(me);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Change password (protected)
 */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Both current and new password are required" });
    }

    const me = await User.findById(req.user.userId);
    if (!me) return res.status(404).json({ message: "User not found" });

    const ok = await bcrypt.compare(currentPassword, me.password);
    if (!ok) return res.status(401).json({ message: "Current password is incorrect" });

    me.password = await bcrypt.hash(newPassword, 10);
    await me.save();

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --- Admin Handlers ----------------------------------------------------------

/**
 * Admin: Update user basic info by userId
 * - Normalizes image
 * - Handles role transitions
 */
exports.adminUpdateUserById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const update = {};
    if (typeof req.body.name !== "undefined") update.name = String(req.body.name).trim();
    if (typeof req.body.email !== "undefined") update.email = String(req.body.email).trim();
    if (typeof req.body.role !== "undefined") update.role = String(req.body.role).toLowerCase();

    const img = normalizeImage(
      req.file?.filename ? `/uploads/${req.file.filename}` : req.body.image
    );
    if (typeof req.body.image !== "undefined" || req.file) {
      update.image = img || undefined;
    }

    const user = await User.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Handle role transitions
    if (user.role === "client") {
      await Client.findOneAndUpdate(
        { userId: id },
        { $setOnInsert: { userId: id } },
        { new: true, upsert: true }
      );
      await Coach.findOneAndDelete({ userId: id });
    } else if (user.role === "coach") {
      await Coach.findOneAndUpdate(
        { userId: id },
        { $setOnInsert: { userId: id } },
        { new: true, upsert: true }
      );
      await Client.findOneAndDelete({ userId: id });
    } else if (user.role === "admin") {
      await Client.findOneAndDelete({ userId: id });
      await Coach.findOneAndDelete({ userId: id });
    }

    res.json(stripUser(user));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Verify the currently logged-in admin's password
 */
exports.verifyAdminPassword = async (req, res) => {
  try {
    const { password } = req.body || {};
    if (!password) return res.status(400).json({ message: "Password is required" });

    const me = await User.findById(req.user.userId);
    if (!me) return res.status(404).json({ message: "User not found" });
    if (me.role !== "admin") return res.status(403).json({ message: "Admin only" });

    const ok = await bcrypt.compare(password, me.password);
    if (!ok) return res.status(401).json({ message: "Invalid password" });

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
