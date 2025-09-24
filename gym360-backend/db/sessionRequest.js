// SessionRequest model — one request per proposed session.
// Created by a coach; only admins can approve/reject.
const mongoose = require("mongoose");

const SessionRequestSchema = new mongoose.Schema(
  {
    coachId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    clientIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true }],
    date: { type: Date, required: true },     // day part
    time: { type: String, required: true },   // "HH:mm"
    type: { type: String, enum: ["Cardio", "Muscu", "Yoga", "Autre"], default: "Cardio" },
    note: { type: String },                   // optional: coach note to admin

    // Request lifecycle
    status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending", index: true },
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // admin who decided
    decidedAt: { type: Date },
    decisionNote: { type: String },

    // Link to real session when approved
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "Session" },

    // --- New fields for notifications ---
    coachSeenAt: { type: Date, default: null },       // last time coach saw notification
    statusChangedAt: { type: Date, default: null },   // when admin approved/rejected
  },
  { timestamps: true }
);

// Useful indexes for listing/filters
SessionRequestSchema.index({ coachId: 1, status: 1, date: -1 });
SessionRequestSchema.index({ date: -1, time: 1 });

module.exports = mongoose.model("SessionRequest", SessionRequestSchema);
