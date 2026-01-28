/**
 * Demo Routes
 * Interactive demo endpoints for learning threat modeling
 */
import { Router } from "express";
import { getDB } from "../db/mongo.js";
import { analyzeSTRIDE, STRIDE_CATEGORIES, getSTRIDEOverview } from "../models/stride.js";
import { analyzePASTA, getPASTAOverview } from "../models/pasta.js";
import { calculateDREAD, getDREADOverview, COMMON_VULNERABILITY_SCORES } from "../models/dread.js";

const router = Router();

/**
 * GET /api/demo/quick-start
 * Quick start guide for the demo
 */
router.get("/quick-start", (_req, res) => {
  res.json({
    welcome: "Welcome to the Threat Modeling Demo!",
    description: "This demo showcases STRIDE, PASTA, and DREAD threat modeling methodologies",
    frameworks: {
      stride: "Threat identification by category (Spoofing, Tampering, etc.)",
      pasta: "Risk-centric 7-stage process with attack simulation",
      dread: "Quantitative risk scoring (0-10 scale)",
    },
    tryTheseEndpoints: [
      { method: "GET", path: "/api/demo/stride/example", description: "See STRIDE in action" },
      { method: "GET", path: "/api/demo/pasta/example", description: "See PASTA in action" },
      { method: "GET", path: "/api/demo/dread/example", description: "See DREAD scoring" },
      { method: "GET", path: "/api/demo/full-example", description: "Complete threat modeling example" },
      { method: "POST", path: "/api/demo/interactive/stride", description: "Run STRIDE on your own asset" },
      { method: "POST", path: "/api/demo/interactive/dread", description: "Calculate your own DREAD score" },
    ],
    authentication: {
      note: "These demo endpoints don't require authentication",
      forFullAccess: "Register at POST /api/auth/register",
    },
  });
});

/**
 * GET /api/demo/stride/example
 * Example STRIDE analysis
 */
router.get("/stride/example", (_req, res) => {
  const exampleAsset = {
    name: "User Login API",
    type: "authentication",
    isPublicFacing: true,
    handlesUserInput: true,
    containsSensitiveData: true,
    authenticationRequired: false, // It's the auth endpoint itself
    hasAuditLog: true,
    hasAdminFunctions: false,
  };
  
  const analysis = analyzeSTRIDE(exampleAsset);
  
  res.json({
    title: "STRIDE Analysis Example",
    description: "Analyzing a User Login API endpoint for security threats",
    framework: getSTRIDEOverview(),
    asset: exampleAsset,
    analysis,
    explanation: {
      whatIsSTRIDE: "STRIDE is a threat classification model that helps identify 6 types of security threats",
      howToUse: [
        "1. Identify an asset or component to analyze",
        "2. For each STRIDE category, determine if it applies",
        "3. If applicable, identify specific threats",
        "4. Develop mitigations for each threat",
        "5. Score threats using DREAD to prioritize",
      ],
      categories: Object.entries(STRIDE_CATEGORIES).map(([key, cat]) => ({
        code: cat.code,
        name: cat.name,
        question: `Could an attacker ${cat.description.toLowerCase()}?`,
        protects: cat.securityProperty,
      })),
    },
  });
});

/**
 * GET /api/demo/pasta/example
 * Example PASTA analysis
 */
router.get("/pasta/example", (_req, res) => {
  const exampleApp = {
    name: "E-Commerce Platform",
    businessFunction: "Online retail sales",
    dataClassification: "Confidential (PII, payment data)",
    compliance: ["PCI-DSS", "GDPR"],
    frontend: "React SPA",
    backend: "Node.js/Express",
    database: "MongoDB",
    inputValidation: true,
    strongAuth: true,
    securityHeaders: true,
    riskTolerance: "Low",
    components: [
      { name: "Web Frontend", type: "frontend", technology: "React" },
      { name: "API Gateway", type: "backend", technology: "Express" },
      { name: "Payment Service", type: "service", technology: "Stripe Integration" },
      { name: "User Database", type: "datastore", technology: "MongoDB" },
    ],
  };
  
  const analysis = analyzePASTA(exampleApp);
  
  res.json({
    title: "PASTA Analysis Example",
    description: "Risk-centric threat modeling for an E-Commerce Platform",
    framework: getPASTAOverview(),
    application: exampleApp,
    analysis,
    explanation: {
      whatIsPASTA: "PASTA is a 7-stage risk-centric methodology that simulates attacks",
      stages: [
        "Stage 1: Define business objectives and what we're protecting",
        "Stage 2: Define technical scope and architecture",
        "Stage 3: Decompose the application into components",
        "Stage 4: Analyze threats using intelligence",
        "Stage 5: Identify vulnerabilities",
        "Stage 6: Model and simulate attacks",
        "Stage 7: Analyze risks and plan mitigations",
      ],
      whenToUse: [
        "Complex applications with significant business impact",
        "Applications handling sensitive data",
        "When compliance requires risk assessment",
        "When attack simulation is needed to validate threats",
      ],
    },
  });
});

/**
 * GET /api/demo/dread/example
 * Example DREAD scoring
 */
router.get("/dread/example", (_req, res) => {
  const exampleVulnerability = {
    name: "NoSQL Injection in Login",
    description: "The login endpoint accepts unsanitized JSON that could allow operator injection",
    ratings: {
      damage: 4,           // Full database compromise possible
      reproducibility: 3,  // Easy to reproduce once found
      exploitability: 2,   // Requires some knowledge of MongoDB
      affectedUsers: 4,    // All users potentially affected
      discoverability: 3,  // Can be found with automated scanning
    },
  };
  
  const score = calculateDREAD(exampleVulnerability.ratings);
  
  res.json({
    title: "DREAD Scoring Example",
    description: "Calculating risk score for a NoSQL Injection vulnerability",
    framework: getDREADOverview(),
    vulnerability: exampleVulnerability,
    score,
    explanation: {
      whatIsDREAD: "DREAD is a risk rating model that produces a 0-10 severity score",
      factors: [
        {
          name: "Damage",
          question: "How bad would an attack be?",
          example: `Rating ${exampleVulnerability.ratings.damage}: ${score.breakdown.damage.description}`,
        },
        {
          name: "Reproducibility",
          question: "How easy is it to reproduce the attack?",
          example: `Rating ${exampleVulnerability.ratings.reproducibility}: ${score.breakdown.reproducibility.description}`,
        },
        {
          name: "Exploitability",
          question: "How much work is required to exploit?",
          example: `Rating ${exampleVulnerability.ratings.exploitability}: ${score.breakdown.exploitability.description}`,
        },
        {
          name: "Affected Users",
          question: "How many people are impacted?",
          example: `Rating ${exampleVulnerability.ratings.affectedUsers}: ${score.breakdown.affectedUsers.description}`,
        },
        {
          name: "Discoverability",
          question: "How easy is it to find the vulnerability?",
          example: `Rating ${exampleVulnerability.ratings.discoverability}: ${score.breakdown.discoverability.description}`,
        },
      ],
      calculation: `(${Object.values(exampleVulnerability.ratings).join(" + ")}) / 5 × 2.5 = ${score.total}`,
      interpretation: score.riskLevel,
      action: score.recommendation,
    },
    commonVulnerabilities: COMMON_VULNERABILITY_SCORES,
  });
});

/**
 * GET /api/demo/full-example
 * Complete threat modeling example using all frameworks
 */
router.get("/full-example", (_req, res) => {
  // Define our example system
  const system = {
    name: "User Management API",
    description: "RESTful API for user registration, authentication, and profile management",
    assets: [
      {
        name: "Registration Endpoint",
        type: "api",
        isPublicFacing: true,
        handlesUserInput: true,
        containsSensitiveData: true,
      },
      {
        name: "User Database",
        type: "database",
        containsSensitiveData: true,
        hasAuditLog: true,
      },
      {
        name: "JWT Token System",
        type: "authentication",
        authenticationRequired: true,
        hasAdminFunctions: true,
      },
    ],
  };
  
  // Step 1: STRIDE Analysis on each asset
  const strideResults = system.assets.map(asset => ({
    asset: asset.name,
    analysis: analyzeSTRIDE(asset),
  }));
  
  // Step 2: Collect all identified threats
  const identifiedThreats = [];
  for (const result of strideResults) {
    for (const threat of result.analysis.threats) {
      if (threat.applicable) {
        identifiedThreats.push({
          asset: result.asset,
          category: threat.categoryName,
          severity: threat.severity,
          threats: threat.specificThreats,
          mitigations: threat.recommendations,
        });
      }
    }
  }
  
  // Step 3: Score top threats with DREAD
  const dreadScores = [
    {
      threat: "NoSQL Injection via Registration",
      ratings: { damage: 4, reproducibility: 3, exploitability: 2, affectedUsers: 4, discoverability: 3 },
    },
    {
      threat: "JWT Token Manipulation",
      ratings: { damage: 3, reproducibility: 2, exploitability: 2, affectedUsers: 3, discoverability: 2 },
    },
    {
      threat: "Credential Stuffing",
      ratings: { damage: 3, reproducibility: 4, exploitability: 4, affectedUsers: 2, discoverability: 4 },
    },
    {
      threat: "Sensitive Data Exposure",
      ratings: { damage: 3, reproducibility: 2, exploitability: 2, affectedUsers: 4, discoverability: 2 },
    },
  ].map(item => ({
    ...item,
    score: calculateDREAD(item.ratings),
  })).sort((a, b) => b.score.total - a.score.total);
  
  res.json({
    title: "Complete Threat Modeling Example",
    description: "End-to-end threat modeling using STRIDE, PASTA, and DREAD",
    workflow: [
      "1. STRIDE: Identify threats by category for each asset",
      "2. PASTA: (Optional) Deep dive with attack simulation",
      "3. DREAD: Score and prioritize threats",
      "4. Remediate: Address high-priority threats first",
    ],
    system,
    step1_stride: {
      description: "STRIDE analysis identifies threats by category",
      results: strideResults.map(r => ({
        asset: r.asset,
        threatsFound: r.analysis.summary.totalThreats,
        categories: r.analysis.summary.byCategory,
      })),
      allThreats: identifiedThreats,
    },
    step2_pasta: {
      description: "PASTA provides risk-centric deep analysis (summarized)",
      note: "For full PASTA analysis, use POST /api/analysis/pasta/analyze",
      keyInsights: [
        "Business impact: User data breach could result in regulatory fines",
        "Threat actors: External attackers, script kiddies, malicious insiders",
        "Attack vectors: Injection, authentication bypass, session hijacking",
      ],
    },
    step3_dread: {
      description: "DREAD scores prioritize remediation efforts",
      prioritizedThreats: dreadScores.map(t => ({
        threat: t.threat,
        score: t.score.total,
        riskLevel: t.score.riskLevel.level,
        action: t.score.riskLevel.action,
        timeline: t.score.recommendation.timeline,
      })),
    },
    step4_remediation: {
      description: "Address threats in priority order",
      plan: dreadScores.slice(0, 3).map((t, i) => ({
        priority: i + 1,
        threat: t.threat,
        score: t.score.total,
        actions: t.score.recommendation.actions,
        timeline: t.score.recommendation.timeline,
      })),
    },
    summary: {
      totalAssetsAnalyzed: system.assets.length,
      totalThreatsIdentified: identifiedThreats.length,
      criticalThreats: dreadScores.filter(t => t.score.riskLevel.level === "CRITICAL").length,
      highThreats: dreadScores.filter(t => t.score.riskLevel.level === "HIGH").length,
      topRisk: dreadScores[0]?.threat,
      topRiskScore: dreadScores[0]?.score.total,
    },
  });
});

/**
 * POST /api/demo/interactive/stride
 * Interactive STRIDE analysis
 */
router.post("/interactive/stride", (req, res) => {
  const { asset } = req.body;
  
  if (!asset?.name || !asset?.type) {
    return res.status(400).json({
      error: "Please provide an asset with name and type",
      example: {
        name: "My API Endpoint",
        type: "api",
        isPublicFacing: true,
        handlesUserInput: true,
        containsSensitiveData: false,
      },
      validTypes: ["api", "database", "authentication", "file", "network", "server"],
    });
  }
  
  const analysis = analyzeSTRIDE(asset);
  
  res.json({
    message: "STRIDE analysis complete",
    asset,
    analysis,
    nextSteps: [
      "Review applicable threats",
      "For each threat, consider the specific threats listed",
      "Use DREAD scoring to prioritize (POST /api/demo/interactive/dread)",
      "Implement recommended mitigations",
    ],
  });
});

/**
 * POST /api/demo/interactive/dread
 * Interactive DREAD scoring
 */
router.post("/interactive/dread", (req, res) => {
  const { ratings, threatName } = req.body;
  
  if (!ratings) {
    return res.status(400).json({
      error: "Please provide DREAD ratings",
      example: {
        threatName: "SQL Injection",
        ratings: {
          damage: 3,           // 0-4: How bad?
          reproducibility: 3,  // 0-4: How easy to reproduce?
          exploitability: 2,   // 0-4: How easy to exploit?
          affectedUsers: 3,    // 0-4: How many affected?
          discoverability: 3,  // 0-4: How easy to find?
        },
      },
      ratingGuide: {
        "0": "None/Impossible",
        "1": "Low/Difficult",
        "2": "Medium/Moderate",
        "3": "High/Easy",
        "4": "Critical/Trivial",
      },
    });
  }
  
  const required = ["damage", "reproducibility", "exploitability", "affectedUsers", "discoverability"];
  const missing = required.filter(r => ratings[r] === undefined);
  
  if (missing.length > 0) {
    return res.status(400).json({
      error: `Missing ratings: ${missing.join(", ")}`,
      provided: ratings,
    });
  }
  
  const score = calculateDREAD(ratings);
  
  res.json({
    message: "DREAD score calculated",
    threatName: threatName || "Unnamed Threat",
    ratings,
    score,
    interpretation: {
      level: score.riskLevel.level,
      action: score.riskLevel.action,
      timeline: score.recommendation.timeline,
      remediationSteps: score.recommendation.actions,
    },
    comparison: {
      note: "Compare with common vulnerabilities:",
      examples: Object.entries(COMMON_VULNERABILITY_SCORES).slice(0, 3).map(([name, data]) => ({
        name,
        score: data.total,
        level: data.riskLevel,
      })),
    },
  });
});

/**
 * GET /api/demo/security-headers
 * Show security headers this server uses
 */
router.get("/security-headers", (req, res) => {
  res.json({
    title: "Security Headers Demo",
    description: "This server implements various security headers (via Helmet.js)",
    currentHeaders: {
      "Content-Security-Policy": res.get("Content-Security-Policy"),
      "X-Content-Type-Options": res.get("X-Content-Type-Options"),
      "X-Frame-Options": res.get("X-Frame-Options"),
      "X-XSS-Protection": res.get("X-XSS-Protection"),
      "Strict-Transport-Security": res.get("Strict-Transport-Security"),
    },
    explanation: {
      "Content-Security-Policy": "Controls resources the browser is allowed to load",
      "X-Content-Type-Options": "Prevents MIME type sniffing",
      "X-Frame-Options": "Prevents clickjacking by controlling iframe embedding",
      "X-XSS-Protection": "Enables browser XSS filtering",
      "Strict-Transport-Security": "Enforces HTTPS connections",
    },
    strideRelevance: {
      "Information Disclosure": "CSP and X-Content-Type-Options prevent data leakage",
      "Tampering": "X-XSS-Protection helps prevent XSS attacks",
      "Spoofing": "HSTS prevents downgrade attacks",
    },
  });
});

export default router;
