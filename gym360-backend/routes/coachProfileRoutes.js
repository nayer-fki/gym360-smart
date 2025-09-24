// routes/coachProfileRoutes.js
const express = require("express");
const router = express.Router();
const { verifyToken, verifyCoach } = require("../middlewares/auth");
const upload = require("../middlewares/upload"); // <-- no curly braces
const h = require("../handlers/coachProfile");

// auth
router.use(verifyToken, verifyCoach);

// profile
router.get("/", h.getProfile);
router.put("/", h.updateProfile);

// avatar upload (field name must be "avatar")
router.post("/avatar", upload.single("avatar"), h.uploadAvatar);

module.exports = router;
