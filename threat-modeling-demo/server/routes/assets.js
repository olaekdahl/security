/**
 * Assets Management Routes
 * CRUD operations for assets that can be analyzed for threats
 */
import { Router } from "express";
import Joi from "joi";
import { ObjectId } from "mongodb";
import { getDB } from "../db/mongo.js";
import { authenticateToken } from "./auth.js";
import { analyzeSTRIDE } from "../models/stride.js";

const router = Router();

// All asset routes require authentication
router.use(authenticateToken);

// Validation schemas
const assetSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  type: Joi.string().valid(
    "api", "database", "authentication", "file", "network",
    "user-input", "server", "client", "service", "config"
  ).required(),
  description: Joi.string().max(1000).optional(),
  dataFlows: Joi.array().items(Joi.object({
    from: Joi.string().required(),
    to: Joi.string().required(),
    data: Joi.string().required(),
    protocol: Joi.string().optional(),
  })).optional(),
  properties: Joi.object({
    isPublicFacing: Joi.boolean().default(false),
    handlesUserInput: Joi.boolean().default(false),
    containsSensitiveData: Joi.boolean().default(false),
    authenticationRequired: Joi.boolean().default(false),
    hasAuditLog: Joi.boolean().default(false),
    hasAdminFunctions: Joi.boolean().default(false),
  }).optional(),
  technologies: Joi.array().items(Joi.string()).optional(),
  trustBoundary: Joi.string().optional(),
});

/**
 * GET /api/assets
 * List all assets
 */
router.get("/", async (req, res) => {
  try {
    const db = getDB();
    const { type, analyzed } = req.query;
    
    const filter = {};
    if (type) filter.type = type;
    if (analyzed === "true") filter.strideAnalysis = { $exists: true };
    if (analyzed === "false") filter.strideAnalysis = { $exists: false };
    
    const assets = await db.collection("assets")
      .find(filter)
      .sort({ name: 1 })
      .toArray();
    
    res.json({
      count: assets.length,
      assets,
    });
  } catch (err) {
    console.error("Error listing assets:", err);
    res.status(500).json({ error: "Failed to list assets" });
  }
});

/**
 * GET /api/assets/types
 * Get available asset types
 */
router.get("/types", (_req, res) => {
  res.json({
    types: [
      { value: "api", label: "API Endpoint", icon: "🔌" },
      { value: "database", label: "Database", icon: "🗄️" },
      { value: "authentication", label: "Authentication System", icon: "🔐" },
      { value: "file", label: "File Storage", icon: "📁" },
      { value: "network", label: "Network Component", icon: "🌐" },
      { value: "user-input", label: "User Input Handler", icon: "⌨️" },
      { value: "server", label: "Server/Service", icon: "🖥️" },
      { value: "client", label: "Client Application", icon: "📱" },
      { value: "service", label: "External Service", icon: "☁️" },
      { value: "config", label: "Configuration", icon: "⚙️" },
    ],
  });
});

/**
 * GET /api/assets/:id
 * Get a specific asset
 */
router.get("/:id", async (req, res) => {
  try {
    const db = getDB();
    const asset = await db.collection("assets").findOne({
      _id: new ObjectId(req.params.id),
    });
    
    if (!asset) {
      return res.status(404).json({ error: "Asset not found" });
    }
    
    res.json(asset);
  } catch (err) {
    console.error("Error getting asset:", err);
    res.status(500).json({ error: "Failed to get asset" });
  }
});

/**
 * POST /api/assets
 * Create a new asset
 */
router.post("/", async (req, res) => {
  try {
    const { error, value } = assetSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    
    const db = getDB();
    
    const asset = {
      ...value,
      properties: value.properties || {
        isPublicFacing: false,
        handlesUserInput: false,
        containsSensitiveData: false,
        authenticationRequired: false,
        hasAuditLog: false,
        hasAdminFunctions: false,
      },
      createdBy: req.user.username,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const result = await db.collection("assets").insertOne(asset);
    
    // Audit log
    await db.collection("audit_logs").insertOne({
      action: "ASSET_CREATED",
      assetId: result.insertedId.toString(),
      assetName: value.name,
      username: req.user.username,
      timestamp: new Date(),
    });
    
    res.status(201).json({
      message: "Asset created",
      asset: { _id: result.insertedId, ...asset },
    });
  } catch (err) {
    console.error("Error creating asset:", err);
    res.status(500).json({ error: "Failed to create asset" });
  }
});

/**
 * PUT /api/assets/:id
 * Update an asset
 */
router.put("/:id", async (req, res) => {
  try {
    const { error, value } = assetSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    
    const db = getDB();
    const assetId = new ObjectId(req.params.id);
    
    const result = await db.collection("assets").updateOne(
      { _id: assetId },
      {
        $set: {
          ...value,
          updatedAt: new Date(),
        },
      }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Asset not found" });
    }
    
    const updated = await db.collection("assets").findOne({ _id: assetId });
    res.json({ message: "Asset updated", asset: updated });
  } catch (err) {
    console.error("Error updating asset:", err);
    res.status(500).json({ error: "Failed to update asset" });
  }
});

/**
 * DELETE /api/assets/:id
 * Delete an asset
 */
router.delete("/:id", async (req, res) => {
  try {
    const db = getDB();
    const assetId = new ObjectId(req.params.id);
    
    const asset = await db.collection("assets").findOne({ _id: assetId });
    if (!asset) {
      return res.status(404).json({ error: "Asset not found" });
    }
    
    // Check if any threats reference this asset
    const linkedThreats = await db.collection("threats").countDocuments({
      assetId: req.params.id,
    });
    
    if (linkedThreats > 0) {
      return res.status(409).json({
        error: `Cannot delete: ${linkedThreats} threat(s) linked to this asset`,
      });
    }
    
    await db.collection("assets").deleteOne({ _id: assetId });
    
    // Audit log
    await db.collection("audit_logs").insertOne({
      action: "ASSET_DELETED",
      assetId: req.params.id,
      assetName: asset.name,
      username: req.user.username,
      timestamp: new Date(),
    });
    
    res.json({ message: "Asset deleted" });
  } catch (err) {
    console.error("Error deleting asset:", err);
    res.status(500).json({ error: "Failed to delete asset" });
  }
});

/**
 * POST /api/assets/:id/analyze-stride
 * Run STRIDE analysis on an asset
 */
router.post("/:id/analyze-stride", async (req, res) => {
  try {
    const db = getDB();
    const assetId = new ObjectId(req.params.id);
    
    const asset = await db.collection("assets").findOne({ _id: assetId });
    if (!asset) {
      return res.status(404).json({ error: "Asset not found" });
    }
    
    // Run STRIDE analysis
    const analysis = analyzeSTRIDE({
      name: asset.name,
      type: asset.type,
      ...asset.properties,
    });
    
    // Store analysis results
    await db.collection("assets").updateOne(
      { _id: assetId },
      {
        $set: {
          strideAnalysis: analysis,
          analyzedAt: new Date(),
          analyzedBy: req.user.username,
        },
      }
    );
    
    // Audit log
    await db.collection("audit_logs").insertOne({
      action: "STRIDE_ANALYSIS_RUN",
      assetId: req.params.id,
      assetName: asset.name,
      threatsFound: analysis.summary.totalThreats,
      username: req.user.username,
      timestamp: new Date(),
    });
    
    res.json({
      message: "STRIDE analysis complete",
      analysis,
    });
  } catch (err) {
    console.error("Error running STRIDE analysis:", err);
    res.status(500).json({ error: "Failed to run STRIDE analysis" });
  }
});

/**
 * POST /api/assets/:id/create-threats
 * Create threat entries from STRIDE analysis
 */
router.post("/:id/create-threats", async (req, res) => {
  try {
    const db = getDB();
    const assetId = new ObjectId(req.params.id);
    
    const asset = await db.collection("assets").findOne({ _id: assetId });
    if (!asset) {
      return res.status(404).json({ error: "Asset not found" });
    }
    
    if (!asset.strideAnalysis) {
      return res.status(400).json({ error: "Run STRIDE analysis first" });
    }
    
    const threats = [];
    for (const threat of asset.strideAnalysis.threats) {
      if (threat.applicable && threat.severity !== "LOW") {
        const threatDoc = {
          name: `${threat.categoryName} - ${asset.name}`,
          description: `${threat.categoryName} threat identified for ${asset.name}. ` +
            `Specific threats: ${threat.specificThreats.join(", ")}`,
          category: Object.keys(require("../models/stride.js").STRIDE_CATEGORIES)
            .find(k => k.startsWith(threat.category)) || threat.category,
          assetId: req.params.id,
          mitigations: threat.recommendations,
          status: "identified",
          source: "STRIDE_ANALYSIS",
          strideDetails: {
            code: threat.category,
            name: threat.categoryName,
            securityProperty: threat.securityProperty,
            standardMitigations: threat.standardMitigations,
          },
          createdBy: req.user.username,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        threats.push(threatDoc);
      }
    }
    
    if (threats.length === 0) {
      return res.json({ message: "No significant threats to create", count: 0 });
    }
    
    const result = await db.collection("threats").insertMany(threats);
    
    res.json({
      message: `Created ${result.insertedCount} threat(s) from STRIDE analysis`,
      count: result.insertedCount,
      threatIds: Object.values(result.insertedIds),
    });
  } catch (err) {
    console.error("Error creating threats from STRIDE:", err);
    res.status(500).json({ error: "Failed to create threats" });
  }
});

export default router;
