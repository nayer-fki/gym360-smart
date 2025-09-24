// handlers/coachProfile.js
// Coach can read/update own profile and upload avatar.

const mongoose = require("mongoose");
const User = require("../db/user");

const toId = (v) => { try { return new mongoose.Types.ObjectId(v); } catch { return null; } };

// Safe serializer (never return password, tokens, etc.)
function pickPublic(user) {
  if (!user) return null;
  return {
    _id: user._id,
    name: user.name || "",
    email: user.email || "",
    phone: user.phone || "",
    bio: user.bio || "",
    // IMPORTANT: support legacy "image" and new "avatarUrl"
    avatarUrl: user.image || user.avatarUrl || "",
    specialties: Array.isArray(user.specialties) ? user.specialties : [],
    socials: {
      facebook: user?.socials?.facebook || "",
      instagram: user?.socials?.instagram || "",
      twitter: user?.socials?.twitter || "",
      website: user?.socials?.website || "",
    },
  };
}

// GET /api/coach/profile
async function getProfile(req, res) {
  try {
    const uid = req.user?._id;
    if (!uid) return res.status(401).json({ message: "No user in token" });

    const user = await User.findById(toId(uid)).lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json(pickPublic(user));
  } catch (e) {
    console.error("getProfile error", e);
    return res.status(500).json({ message: "Failed to load profile" });
  }
}

// PUT /api/coach/profile
// Body: { name?, phone?, bio?, specialties?(string|array), socials?, password? }
async function updateProfile(req, res) {
  try {
    const uid = req.user?._id;
    if (!uid) return res.status(401).json({ message: "No user in token" });

    const payload = {};
    const { name, phone, bio, specialties, socials, password } = req.body;

    if (typeof name === "string") payload.name = name.trim();
    if (typeof phone === "string") payload.phone = phone.trim();
    if (typeof bio === "string") payload.bio = bio.trim();

    if (typeof specialties !== "undefined") {
      let arr = specialties;
      if (typeof arr === "string") {
        arr = arr.split(",").map((s) => s.trim()).filter(Boolean);
      }
      if (Array.isArray(arr)) payload.specialties = arr.slice(0, 25);
    }

    if (socials && typeof socials === "object") {
      payload.socials = {
        facebook: socials.facebook || "",
        instagram: socials.instagram || "",
        twitter: socials.twitter || "",
        website: socials.website || "",
      };
    }

    const user = await User.findById(toId(uid));
    if (!user) return res.status(404).json({ message: "User not found" });

    Object.assign(user, payload);

    // Optional password change (assumes hashing in schema)
    if (password && typeof password === "string" && password.length >= 6) {
      user.password = password;
    }

    await user.save();
    return res.json(pickPublic(user.toObject()));
  } catch (e) {
    console.error("updateProfile error", e);
    return res.status(500).json({ message: "Failed to update profile" });
  }
}

// POST /api/coach/profile/avatar  (multipart/form-data: avatar=<file>)
async function uploadAvatar(req, res) {
  try {
    const uid = req.user?._id;
    if (!uid) return res.status(401).json({ message: "No user in token" });
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const avatarUrl = `/uploads/${req.file.filename}`;

    // Write to both keys for backward compatibility
    const user = await User.findByIdAndUpdate(
      toId(uid),
      { image: avatarUrl, avatarUrl },
      { new: true }
    ).lean();

    return res.json({ avatarUrl, user: pickPublic(user) });
  } catch (e) {
    console.error("uploadAvatar error", e);
    return res.status(500).json({ message: "Failed to upload avatar" });
  }
}

module.exports = {
  getProfile,
  updateProfile,
  uploadAvatar,
};
