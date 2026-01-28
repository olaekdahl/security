/**
 * Threats Management Routes
 * CRUD operations for threat entries with STRIDE, PASTA, DREAD analysis
 */
import { Router } from "express";
import Joi from "joi";
import { ObjectId } from "mongodb";
import { getDB } from "../db/mongo.js";
import { authenticateToken, requireRole } from "./auth.js";
import { STRIDE_CATEGORIES, analyzeSTRIDE } from "../models/stride.js";
import { calculateDREAD, DREAD_FACTORS } from "../models/dread.js";

const router = Router();

// All threat routes require authentication
router.use(authenticateToken);

// Validation schemas
const threatSchema = Joi.object({
  name: Joi.string().min(3).max(200).required(),
  description: Joi.string().max(2000).optional().allow(''),
  category: Joi.string().valid(...Object.keys(STRIDE_CATEGORIES)).required(),
  assetId: Joi.string().optional(),
  dreadRatings: Joi.object({
    damage: Joi.number().min(0).max(10).required(),
    reproducibility: Joi.number().min(0).max(10).required(),
    exploitability: Joi.number().min(0).max(10).required(),
    affectedUsers: Joi.number().min(0).max(10).required(),
    discoverability: Joi.number().min(0).max(10).required(),
  }).optional(),
  mitigations: Joi.array().items(Joi.string()).optional(),
  status: Joi.string().valid("identified", "analyzed", "mitigated", "accepted", "closed").default("identified"),
});

/**
 * GET /api/threats
 * List all threats with optional filtering
 */
router.get("/", async (req, res) => {
  try {
    const db = getDB();
    const { category, status, minScore, assetId } = req.query;
    
    const filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (assetId) filter.assetId = assetId;
    if (minScore) filter["dreadScore.total"] = { $gte: Number(minScore) };
    
    const threats = await db.collection("threats")
      .find(filter)
      .sort({ "dreadScore.total": -1, createdAt: -1 })
      .toArray();
    
    res.json({
      count: threats.length,
      threats,
    });
  } catch (err) {
    console.error("Error listing threats:", err);
    res.status(500).json({ error: "Failed to list threats" });
  }
});

/**
 * GET /api/threats/summary
 * Get threat summary statistics
 */
router.get("/summary", async (req, res) => {
  try {
    const db = getDB();
    
    const pipeline = [
      {
        $facet: {
          byCategory: [
            { $group: { _id: "$category", count: { $sum: 1 } } },
          ],
          byStatus: [
            { $group: { _id: "$status", count: { $sum: 1 } } },
          ],
          byRiskLevel: [
            { $group: { _id: "$dreadScore.riskLevel.level", count: { $sum: 1 } } },
          ],
          totalCount: [
            { $count: "total" },
          ],
          avgScore: [
            { $group: { _id: null, avg: { $avg: "$dreadScore.total" } } },
          ],
        },
      },
    ];
    
    const [result] = await db.collection("threats").aggregate(pipeline).toArray();
    
    res.json({
      total: result.totalCount[0]?.total || 0,
      averageScore: Math.round((result.avgScore[0]?.avg || 0) * 10) / 10,
      byCategory: Object.fromEntries(result.byCategory.map(c => [c._id, c.count])),
      byStatus: Object.fromEntries(result.byStatus.map(s => [s._id, s.count])),
      byRiskLevel: Object.fromEntries(result.byRiskLevel.filter(r => r._id).map(r => [r._id, r.count])),
    });
  } catch (err) {
    console.error("Error getting summary:", err);
    res.status(500).json({ error: "Failed to get summary" });
  }
});

/**
 * GET /api/threats/:id
 * Get a specific threat by ID
 */
router.get("/:id", async (req, res) => {
  try {
    const db = getDB();
    const threat = await db.collection("threats").findOne({
      _id: new ObjectId(req.params.id),
    });
    
    if (!threat) {
      return res.status(404).json({ error: "Threat not found" });
    }
    
    res.json(threat);
  } catch (err) {
    console.error("Error getting threat:", err);
    res.status(500).json({ error: "Failed to get threat" });
  }
});

/**
 * POST /api/threats
 * Create a new threat entry
 */
router.post("/", async (req, res) => {
  try {
    const { error, value } = threatSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    
    const db = getDB();
    
    // Calculate DREAD score if ratings provided
    let dreadScore = null;
    if (value.dreadRatings) {
      dreadScore = calculateDREAD(value.dreadRatings);
    }
    
    // Get STRIDE category details
    const strideCategory = STRIDE_CATEGORIES[value.category];
    
    const threat = {
      ...value,
      dreadScore,
      strideDetails: {
        code: strideCategory.code,
        name: strideCategory.name,
        securityProperty: strideCategory.securityProperty,
        standardMitigations: strideCategory.mitigations,
      },
      createdBy: req.user.username,
      createdAt: new Date(),
      updatedAt: new Date(),
      history: [{
        action: "created",
        by: req.user.username,
        at: new Date(),
      }],
    };
    
    const result = await db.collection("threats").insertOne(threat);
    
    // Audit log
    await db.collection("audit_logs").insertOne({
      action: "THREAT_CREATED",
      threatId: result.insertedId.toString(),
      threatName: value.name,
      category: value.category,
      username: req.user.username,
      timestamp: new Date(),
    });
    
    res.status(201).json({
      message: "Threat created",
      threat: { _id: result.insertedId, ...threat },
    });
  } catch (err) {
    console.error("Error creating threat:", err);
    res.status(500).json({ error: "Failed to create threat" });
  }
});

/**
 * PUT /api/threats/:id
 * Update a threat
 */
router.put("/:id", async (req, res) => {
  try {
    const { error, value } = threatSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    
    const db = getDB();
    const threatId = new ObjectId(req.params.id);
    
    // Get existing threat
    const existing = await db.collection("threats").findOne({ _id: threatId });
    if (!existing) {
      return res.status(404).json({ error: "Threat not found" });
    }
    
    // Calculate new DREAD score if ratings provided
    let dreadScore = existing.dreadScore;
    if (value.dreadRatings) {
      dreadScore = calculateDREAD(value.dreadRatings);
    }
    
    // Update with history
    const update = {
      $set: {
        ...value,
        dreadScore,
        updatedAt: new Date(),
      },
      $push: {
        history: {
          action: "updated",
          by: req.user.username,
          at: new Date(),
          changes: Object.keys(value),
        },
      },
    };
    
    await db.collection("threats").updateOne({ _id: threatId }, update);
    
    // Audit log
    await db.collection("audit_logs").insertOne({
      action: "THREAT_UPDATED",
      threatId: req.params.id,
      username: req.user.username,
      timestamp: new Date(),
    });
    
    const updated = await db.collection("threats").findOne({ _id: threatId });
    res.json({ message: "Threat updated", threat: updated });
  } catch (err) {
    console.error("Error updating threat:", err);
    res.status(500).json({ error: "Failed to update threat" });
  }
});

/**
 * PATCH /api/threats/:id/status
 * Update threat status
 */
router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["identified", "analyzed", "mitigated", "accepted", "closed"];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    
    const db = getDB();
    const threatId = new ObjectId(req.params.id);
    
    const result = await db.collection("threats").updateOne(
      { _id: threatId },
      {
        $set: { status, updatedAt: new Date() },
        $push: {
          history: {
            action: "status_changed",
            newStatus: status,
            by: req.user.username,
            at: new Date(),
          },
        },
      }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Threat not found" });
    }
    
    res.json({ message: "Status updated", status });
  } catch (err) {
    console.error("Error updating status:", err);
    res.status(500).json({ error: "Failed to update status" });
  }
});

/**
 * DELETE /api/threats/:id
 * Delete a threat (analyst role required)
 */
router.delete("/:id", requireRole("analyst", "admin"), async (req, res) => {
  try {
    const db = getDB();
    const threatId = new ObjectId(req.params.id);
    
    const threat = await db.collection("threats").findOne({ _id: threatId });
    if (!threat) {
      return res.status(404).json({ error: "Threat not found" });
    }
    
    await db.collection("threats").deleteOne({ _id: threatId });
    
    // Audit log
    await db.collection("audit_logs").insertOne({
      action: "THREAT_DELETED",
      threatId: req.params.id,
      threatName: threat.name,
      username: req.user.username,
      timestamp: new Date(),
    });
    
    res.json({ message: "Threat deleted" });
  } catch (err) {
    console.error("Error deleting threat:", err);
    res.status(500).json({ error: "Failed to delete threat" });
  }
});

/**
 * POST /api/threats/:id/calculate-dread
 * Calculate/recalculate DREAD score for a threat
 */
router.post("/:id/calculate-dread", async (req, res) => {
  try {
    const { error, value } = Joi.object({
      damage: Joi.number().min(0).max(4).required(),
      reproducibility: Joi.number().min(0).max(4).required(),
      exploitability: Joi.number().min(0).max(4).required(),
      affectedUsers: Joi.number().min(0).max(4).required(),
      discoverability: Joi.number().min(0).max(4).required(),
    }).validate(req.body);
    
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    
    const dreadScore = calculateDREAD(value);
    const db = getDB();
    const threatId = new ObjectId(req.params.id);
    
    await db.collection("threats").updateOne(
      { _id: threatId },
      {
        $set: {
          dreadRatings: value,
          dreadScore,
          updatedAt: new Date(),
        },
        $push: {
          history: {
            action: "dread_calculated",
            score: dreadScore.total,
            by: req.user.username,
            at: new Date(),
          },
        },
      }
    );
    
    res.json({
      message: "DREAD score calculated",
      dreadScore,
    });
  } catch (err) {
    console.error("Error calculating DREAD:", err);
    res.status(500).json({ error: "Failed to calculate DREAD score" });
  }
});

export default router;
