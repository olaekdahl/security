/**
 * Analysis Routes
 * Run comprehensive STRIDE, PASTA, and DREAD analyses
 */
import { Router } from "express";
import { getDB } from "../db/mongo.js";
import { authenticateToken } from "./auth.js";
import { getSTRIDEOverview, analyzeSTRIDE, STRIDE_CATEGORIES } from "../models/stride.js";
import { getPASTAOverview, analyzePASTA, PASTA_STAGES } from "../models/pasta.js";
import { getDREADOverview, calculateDREAD, DREAD_FACTORS, COMMON_VULNERABILITY_SCORES, prioritizeThreats } from "../models/dread.js";

const router = Router();

// All analysis routes require authentication
router.use(authenticateToken);

// ═══════════════════════════════════════════════════════════════
// OVERVIEW ENDPOINTS (Educational)
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/analysis/overview
 * Get overview of all three frameworks
 */
router.get("/overview", (_req, res) => {
  res.json({
    frameworks: {
      stride: getSTRIDEOverview(),
      pasta: getPASTAOverview(),
      dread: getDREADOverview(),
    },
    comparison: {
      stride: {
        purpose: "Threat identification",
        approach: "Category-based enumeration",
        output: "List of potential threats by type",
        when: "During design/architecture review",
      },
      pasta: {
        purpose: "Risk-centric threat modeling",
        approach: "7-stage process with attack simulation",
        output: "Prioritized risk register with mitigations",
        when: "Comprehensive security assessment",
      },
      dread: {
        purpose: "Risk scoring and prioritization",
        approach: "Quantitative rating (0-10)",
        output: "Risk score and priority level",
        when: "After threats are identified",
      },
    },
    recommendedWorkflow: [
      "1. Use STRIDE to identify potential threats",
      "2. Use PASTA for comprehensive analysis (optional for complex systems)",
      "3. Use DREAD to score and prioritize each threat",
      "4. Address threats based on DREAD priority",
    ],
  });
});

/**
 * GET /api/analysis/stride
 * Get STRIDE framework details
 */
router.get("/stride", (_req, res) => {
  res.json(getSTRIDEOverview());
});

/**
 * GET /api/analysis/stride/categories
 * Get all STRIDE categories with details
 */
router.get("/stride/categories", (_req, res) => {
  res.json({
    categories: STRIDE_CATEGORIES,
  });
});

/**
 * GET /api/analysis/pasta
 * Get PASTA framework details
 */
router.get("/pasta", (_req, res) => {
  res.json(getPASTAOverview());
});

/**
 * GET /api/analysis/pasta/stages
 * Get all PASTA stages with details
 */
router.get("/pasta/stages", (_req, res) => {
  res.json({
    stages: PASTA_STAGES,
  });
});

/**
 * GET /api/analysis/dread
 * Get DREAD framework details
 */
router.get("/dread", (_req, res) => {
  res.json(getDREADOverview());
});

/**
 * GET /api/analysis/dread/factors
 * Get all DREAD factors with scales
 */
router.get("/dread/factors", (_req, res) => {
  res.json({
    factors: DREAD_FACTORS,
  });
});

/**
 * GET /api/analysis/dread/common-vulnerabilities
 * Get pre-scored common vulnerabilities
 */
router.get("/dread/common-vulnerabilities", (_req, res) => {
  res.json({
    vulnerabilities: COMMON_VULNERABILITY_SCORES,
  });
});

// ═══════════════════════════════════════════════════════════════
// ANALYSIS ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/analysis/stride/analyze
 * Run STRIDE analysis on provided asset
 */
router.post("/stride/analyze", async (req, res) => {
  try {
    const { asset } = req.body;
    
    if (!asset || !asset.name || !asset.type) {
      return res.status(400).json({ error: "Asset name and type required" });
    }
    
    const analysis = analyzeSTRIDE(asset);
    
    // Store analysis
    await getDB().collection("analyses").insertOne({
      type: "STRIDE",
      asset,
      analysis,
      createdBy: req.user.username,
      createdAt: new Date(),
    });
    
    res.json({
      message: "STRIDE analysis complete",
      analysis,
    });
  } catch (err) {
    console.error("Error running STRIDE analysis:", err);
    res.status(500).json({ error: "Analysis failed" });
  }
});

/**
 * POST /api/analysis/pasta/analyze
 * Run PASTA analysis on application
 */
router.post("/pasta/analyze", async (req, res) => {
  try {
    const { appInfo } = req.body;
    
    if (!appInfo || !appInfo.name) {
      return res.status(400).json({ error: "Application info required" });
    }
    
    const analysis = analyzePASTA(appInfo);
    
    // Store analysis
    await getDB().collection("analyses").insertOne({
      type: "PASTA",
      appInfo,
      analysis,
      createdBy: req.user.username,
      createdAt: new Date(),
    });
    
    res.json({
      message: "PASTA analysis complete",
      analysis,
    });
  } catch (err) {
    console.error("Error running PASTA analysis:", err);
    res.status(500).json({ error: "Analysis failed" });
  }
});

/**
 * POST /api/analysis/dread/calculate
 * Calculate DREAD score for ratings
 */
router.post("/dread/calculate", (req, res) => {
  try {
    const { ratings } = req.body;
    
    if (!ratings) {
      return res.status(400).json({ error: "Ratings required" });
    }
    
    const required = ["damage", "reproducibility", "exploitability", "affectedUsers", "discoverability"];
    const missing = required.filter(r => ratings[r] === undefined);
    
    if (missing.length > 0) {
      return res.status(400).json({ error: `Missing ratings: ${missing.join(", ")}` });
    }
    
    const score = calculateDREAD(ratings);
    
    res.json({
      message: "DREAD score calculated",
      score,
    });
  } catch (err) {
    console.error("Error calculating DREAD:", err);
    res.status(500).json({ error: "Calculation failed" });
  }
});

/**
 * POST /api/analysis/dread/prioritize
 * Prioritize multiple threats by DREAD score
 */
router.post("/dread/prioritize", (req, res) => {
  try {
    const { threats } = req.body;
    
    if (!Array.isArray(threats) || threats.length === 0) {
      return res.status(400).json({ error: "Array of threats required" });
    }
    
    const prioritized = prioritizeThreats(threats);
    
    res.json({
      message: "Threats prioritized by DREAD score",
      count: prioritized.length,
      threats: prioritized,
    });
  } catch (err) {
    console.error("Error prioritizing threats:", err);
    res.status(500).json({ error: "Prioritization failed" });
  }
});

/**
 * POST /api/analysis/comprehensive
 * Run comprehensive analysis using all three frameworks
 */
router.post("/comprehensive", async (req, res) => {
  try {
    const { appInfo, assets } = req.body;
    
    if (!appInfo?.name) {
      return res.status(400).json({ error: "Application info required" });
    }
    
    const db = getDB();
    
    // 1. Run PASTA analysis
    const pastaAnalysis = analyzePASTA(appInfo);
    
    // 2. Run STRIDE analysis on each asset
    const strideAnalyses = (assets || []).map(asset => ({
      asset: asset.name,
      analysis: analyzeSTRIDE(asset),
    }));
    
    // 3. Collect all threats and score with DREAD
    const allThreats = [];
    
    // From STRIDE
    for (const { asset, analysis } of strideAnalyses) {
      for (const threat of analysis.threats) {
        if (threat.applicable) {
          allThreats.push({
            name: `${threat.categoryName} - ${asset}`,
            source: "STRIDE",
            category: threat.category,
            severity: threat.severity,
            ratings: estimateDREADRatings(threat),
          });
        }
      }
    }
    
    // From PASTA attack scenarios
    for (const scenario of pastaAnalysis.stages[5]?.findings?.attackScenarios || []) {
      allThreats.push({
        name: scenario.name,
        source: "PASTA",
        probability: scenario.probability,
        impact: scenario.impact,
        ratings: estimateDREADFromPASTA(scenario),
      });
    }
    
    // 4. Calculate DREAD and prioritize
    const prioritizedThreats = prioritizeThreats(allThreats);
    
    // 5. Generate summary
    const summary = {
      application: appInfo.name,
      analyzedAt: new Date().toISOString(),
      totalThreats: prioritizedThreats.length,
      bySeverity: {
        critical: prioritizedThreats.filter(t => t.dreadScore.riskLevel.level === "CRITICAL").length,
        high: prioritizedThreats.filter(t => t.dreadScore.riskLevel.level === "HIGH").length,
        medium: prioritizedThreats.filter(t => t.dreadScore.riskLevel.level === "MEDIUM").length,
        low: prioritizedThreats.filter(t => t.dreadScore.riskLevel.level === "LOW").length,
      },
      topRisks: prioritizedThreats.slice(0, 5).map(t => ({
        name: t.name,
        score: t.dreadScore.total,
        level: t.dreadScore.riskLevel.level,
        action: t.dreadScore.riskLevel.action,
      })),
    };
    
    // Store comprehensive analysis
    const analysisDoc = {
      type: "COMPREHENSIVE",
      appInfo,
      pastaAnalysis,
      strideAnalyses,
      prioritizedThreats,
      summary,
      createdBy: req.user.username,
      createdAt: new Date(),
    };
    
    const result = await db.collection("analyses").insertOne(analysisDoc);
    
    res.json({
      message: "Comprehensive analysis complete",
      analysisId: result.insertedId,
      summary,
      details: {
        pasta: pastaAnalysis.summary,
        stride: strideAnalyses.map(s => ({
          asset: s.asset,
          threats: s.analysis.summary.totalThreats,
        })),
        threatsPrioritized: prioritizedThreats.length,
      },
    });
  } catch (err) {
    console.error("Error running comprehensive analysis:", err);
    res.status(500).json({ error: "Comprehensive analysis failed" });
  }
});

/**
 * GET /api/analysis/history
 * Get analysis history
 */
router.get("/history", async (req, res) => {
  try {
    const db = getDB();
    const { type, limit = 20 } = req.query;
    
    const filter = {};
    if (type) filter.type = type.toUpperCase();
    
    const analyses = await db.collection("analyses")
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .project({
        type: 1,
        "appInfo.name": 1,
        "asset.name": 1,
        "summary.totalThreats": 1,
        createdBy: 1,
        createdAt: 1,
      })
      .toArray();
    
    res.json({
      count: analyses.length,
      analyses,
    });
  } catch (err) {
    console.error("Error getting analysis history:", err);
    res.status(500).json({ error: "Failed to get history" });
  }
});

// Helper function to estimate DREAD ratings from STRIDE threat
function estimateDREADRatings(strideThreat) {
  const severityMap = {
    LOW: { base: 1 },
    MEDIUM: { base: 2 },
    HIGH: { base: 3 },
    CRITICAL: { base: 4 },
  };
  
  const base = severityMap[strideThreat.severity]?.base || 2;
  
  return {
    damage: base,
    reproducibility: Math.min(4, base + 1),
    exploitability: base,
    affectedUsers: base,
    discoverability: Math.min(4, base + 1),
  };
}

// Helper function to estimate DREAD ratings from PASTA scenario
function estimateDREADFromPASTA(scenario) {
  const impactMap = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
  const impact = impactMap[scenario.impact] || 2;
  const prob = Math.round(scenario.probability * 4);
  
  return {
    damage: impact,
    reproducibility: prob,
    exploitability: prob,
    affectedUsers: Math.min(4, impact + 1),
    discoverability: Math.min(4, prob + 1),
  };
}

export default router;
