// routes/clientRoutes.js
const express = require("express");
const router = express.Router();
const clientHandler = require("../handlers/client");
const { verifyToken, verifyAdmin, verifyClient } = require("../middlewares/auth");

/**
 * Middleware: allow only owner (same userId) or admin
 * Used for routes with /by-user/:userId
 */
function verifyOwnerOrAdmin(req, res, next) {
  const me = String(req.user?._id || req.user?.userId || "");
  const target = String(req.params.userId || "");
  if (!target) {
    return res.status(400).json({ message: "userId param is required." });
  }
  if (req.user?.role === "admin" || me === target) {
    return next();
  }
  return res.status(403).json({ message: "Access forbidden. Owner or admin only." });
}

// All routes below require a valid token
router.use(verifyToken);

/**
 * GET /api/clients
 * Admin only: list all clients
 */
router.get("/", verifyAdmin, clientHandler.getAllClients);

/**
 * GET /api/clients/by-user/:userId
 * Owner or Admin only: get client by userId
 * (This must be placed before "/:id" to avoid being shadowed)
 */
router.get("/by-user/:userId", verifyOwnerOrAdmin, clientHandler.getClientByUser);

/**
 * PUT /api/clients/by-user/:userId
 * Owner or Admin only: update (or create if missing) client by userId
 */
router.put("/by-user/:userId", verifyOwnerOrAdmin, clientHandler.updateClientByUser);

/**
 * GET /api/clients/:id
 * Client or Admin: get client by clientId
 * IMPORTANT: handler must also check ownership inside DB
 */
router.get("/:id", verifyClient, clientHandler.getClientById);

/**
 * PUT /api/clients/:id
 * Client or Admin: update client by clientId
 * IMPORTANT: handler must also check ownership inside DB
 */
router.put("/:id", verifyClient, clientHandler.updateClient);

/**
 * POST /api/clients
 * Client or Admin: create new client
 */
router.post("/", verifyClient, clientHandler.createClient);

/**
 * DELETE /api/clients/:id
 * Admin only: delete client by clientId
 */
router.delete("/:id", verifyAdmin, clientHandler.deleteClient);

module.exports = router;
