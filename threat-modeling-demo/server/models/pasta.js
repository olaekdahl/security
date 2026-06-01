/**
 * PASTA Threat Modeling Framework
 * 
 * PASTA = Process for Attack Simulation and Threat Analysis
 * A 7-stage, risk-centric threat modeling methodology
 */

export const PASTA_STAGES = {
  STAGE_1: {
    number: 1,
    name: "Define Business Objectives",
    description: "Identify business objectives and security requirements",
    activities: [
      "Identify business objectives",
      "Define security requirements",
      "Identify compliance requirements (GDPR, HIPAA, PCI-DSS, etc.)",
      "Determine risk tolerance",
      "Identify key stakeholders",
    ],
    outputs: [
      "Business impact analysis",
      "Security requirements document",
      "Compliance checklist",
      "Risk appetite statement",
    ],
    questions: [
      "What is the primary business function?",
      "What data does the application handle?",
      "What are the compliance requirements?",
      "What is the acceptable risk level?",
      "Who are the key stakeholders?",
    ],
  },
  
  STAGE_2: {
    number: 2,
    name: "Define Technical Scope",
    description: "Define the technical scope of the application",
    activities: [
      "Document application architecture",
      "Identify all components and services",
      "Map data flows",
      "Document dependencies",
      "Identify trust boundaries",
    ],
    outputs: [
      "Architecture diagram",
      "Data flow diagram (DFD)",
      "Component inventory",
      "Trust boundary map",
    ],
    questions: [
      "What are the main components?",
      "What technologies are used?",
      "Where does data flow?",
      "What are the external dependencies?",
      "Where are the trust boundaries?",
    ],
  },
  
  STAGE_3: {
    number: 3,
    name: "Decompose Application",
    description: "Break down the application into its components",
    activities: [
      "Identify entry points",
      "Document APIs and interfaces",
      "Map user roles and permissions",
      "Identify data stores",
      "Document authentication/authorization flows",
    ],
    outputs: [
      "Entry point inventory",
      "API documentation",
      "Role matrix",
      "Data store inventory",
    ],
    questions: [
      "What are all the entry points?",
      "What APIs are exposed?",
      "What user roles exist?",
      "Where is data stored?",
      "How is authentication handled?",
    ],
  },
  
  STAGE_4: {
    number: 4,
    name: "Threat Analysis",
    description: "Identify threats using threat intelligence",
    activities: [
      "Research relevant threat actors",
      "Review threat intelligence feeds",
      "Analyze historical incidents",
      "Map attack patterns (MITRE ATT&CK)",
      "Identify likely attack vectors",
    ],
    outputs: [
      "Threat actor profiles",
      "Attack pattern library",
      "Threat intelligence report",
      "Attack vector list",
    ],
    questions: [
      "Who would want to attack this system?",
      "What are their motivations?",
      "What techniques would they use?",
      "What similar systems have been attacked?",
      "What vulnerabilities are commonly exploited?",
    ],
  },
  
  STAGE_5: {
    number: 5,
    name: "Vulnerability Analysis",
    description: "Identify vulnerabilities in the application",
    activities: [
      "Perform code review",
      "Run SAST/DAST tools",
      "Check for known CVEs",
      "Review configurations",
      "Assess third-party dependencies",
    ],
    outputs: [
      "Vulnerability assessment report",
      "CVE inventory",
      "Configuration review findings",
      "Dependency audit results",
    ],
    questions: [
      "What vulnerabilities exist in the code?",
      "Are there known CVEs in dependencies?",
      "Are configurations secure?",
      "Are default credentials changed?",
      "Is input validation implemented?",
    ],
  },
  
  STAGE_6: {
    number: 6,
    name: "Attack Analysis",
    description: "Model and simulate attacks",
    activities: [
      "Create attack trees",
      "Model attack scenarios",
      "Simulate attacks (pen testing)",
      "Map attacks to vulnerabilities",
      "Calculate attack probability",
    ],
    outputs: [
      "Attack trees",
      "Attack scenarios",
      "Penetration test results",
      "Attack probability matrix",
    ],
    questions: [
      "How would an attacker exploit each vulnerability?",
      "What is the attack chain?",
      "What is the probability of success?",
      "What would be the impact?",
      "Can attacks be combined?",
    ],
  },
  
  STAGE_7: {
    number: 7,
    name: "Risk & Impact Analysis",
    description: "Analyze risks and determine mitigations",
    activities: [
      "Calculate risk scores",
      "Prioritize risks",
      "Develop mitigation strategies",
      "Create remediation plan",
      "Define residual risk acceptance",
    ],
    outputs: [
      "Risk register",
      "Prioritized risk list",
      "Mitigation plan",
      "Remediation timeline",
      "Residual risk statement",
    ],
    questions: [
      "What is the risk level of each threat?",
      "Which risks should be addressed first?",
      "What mitigations are available?",
      "What is the cost of mitigation?",
      "What residual risk is acceptable?",
    ],
  },
};

/**
 * Perform PASTA analysis for an application
 * @param {Object} appInfo - Application information
 * @returns {Object} PASTA analysis results
 */
export function analyzePASTA(appInfo) {
  const analysis = {
    application: appInfo.name,
    timestamp: new Date().toISOString(),
    stages: [],
    summary: {
      completedStages: 0,
      totalRisks: 0,
      highPriorityRisks: 0,
    },
  };
  
  // Stage 1: Business Objectives
  analysis.stages.push({
    ...PASTA_STAGES.STAGE_1,
    findings: analyzeBusinessObjectives(appInfo),
    status: "complete",
  });
  
  // Stage 2: Technical Scope
  analysis.stages.push({
    ...PASTA_STAGES.STAGE_2,
    findings: analyzeTechnicalScope(appInfo),
    status: "complete",
  });
  
  // Stage 3: Application Decomposition
  analysis.stages.push({
    ...PASTA_STAGES.STAGE_3,
    findings: decomposeApplication(appInfo),
    status: "complete",
  });
  
  // Stage 4: Threat Analysis
  analysis.stages.push({
    ...PASTA_STAGES.STAGE_4,
    findings: performThreatAnalysis(appInfo),
    status: "complete",
  });
  
  // Stage 5: Vulnerability Analysis
  analysis.stages.push({
    ...PASTA_STAGES.STAGE_5,
    findings: performVulnerabilityAnalysis(appInfo),
    status: "complete",
  });
  
  // Stage 6: Attack Analysis
  const attackAnalysis = performAttackAnalysis(appInfo);
  analysis.stages.push({
    ...PASTA_STAGES.STAGE_6,
    findings: attackAnalysis,
    status: "complete",
  });
  
  // Stage 7: Risk Analysis
  const riskAnalysis = performRiskAnalysis(appInfo, attackAnalysis);
  analysis.stages.push({
    ...PASTA_STAGES.STAGE_7,
    findings: riskAnalysis,
    status: "complete",
  });
  
  // Calculate summary
  analysis.summary.completedStages = analysis.stages.filter(s => s.status === "complete").length;
  analysis.summary.totalRisks = riskAnalysis.risks?.length || 0;
  analysis.summary.highPriorityRisks = riskAnalysis.risks?.filter(r => r.priority === "HIGH" || r.priority === "CRITICAL").length || 0;
  
  return analysis;
}

function analyzeBusinessObjectives(appInfo) {
  return {
    businessFunction: appInfo.businessFunction || "Web application service",
    dataClassification: appInfo.dataClassification || "Confidential",
    complianceRequirements: appInfo.compliance || ["GDPR", "SOC2"],
    stakeholders: appInfo.stakeholders || ["Development Team", "Security Team", "Business Owners"],
    riskTolerance: appInfo.riskTolerance || "Medium",
    securityRequirements: [
      "Protect user data confidentiality",
      "Ensure system availability",
      "Maintain data integrity",
      "Provide audit trail for actions",
      "Comply with regulatory requirements",
    ],
  };
}

function analyzeTechnicalScope(appInfo) {
  return {
    architecture: {
      frontend: appInfo.frontend || "React SPA",
      backend: appInfo.backend || "Node.js/Express",
      database: appInfo.database || "MongoDB",
      hosting: appInfo.hosting || "Cloud (containerized)",
    },
    components: appInfo.components || [
      { name: "Web Client", type: "frontend", technology: "React" },
      { name: "API Server", type: "backend", technology: "Node.js/Express" },
      { name: "Database", type: "datastore", technology: "MongoDB" },
      { name: "Authentication", type: "service", technology: "JWT" },
    ],
    trustBoundaries: [
      { name: "Internet/DMZ", description: "External users to load balancer" },
      { name: "DMZ/Application", description: "Load balancer to app servers" },
      { name: "Application/Database", description: "App servers to database" },
    ],
    dataFlows: [
      { from: "User", to: "React App", data: "User interactions" },
      { from: "React App", to: "API Server", data: "API requests (JSON)" },
      { from: "API Server", to: "MongoDB", data: "Database queries" },
    ],
  };
}

function decomposeApplication(appInfo) {
  return {
    entryPoints: [
      { name: "Public API endpoints", description: "/api/auth/*, /api/public/*" },
      { name: "Authenticated API endpoints", description: "/api/threats/*, /api/assets/*" },
      { name: "Admin endpoints", description: "/api/admin/*" },
    ],
    userRoles: appInfo.roles || [
      { name: "Anonymous", permissions: ["read public data"] },
      { name: "User", permissions: ["read", "write own data"] },
      { name: "Admin", permissions: ["read", "write", "delete", "manage users"] },
    ],
    dataStores: [
      { name: "users", sensitivity: "HIGH", encryption: true },
      { name: "threats", sensitivity: "MEDIUM", encryption: false },
      { name: "audit_logs", sensitivity: "HIGH", encryption: false },
    ],
    authenticationMechanisms: [
      { type: "Password", strength: "Medium (bcrypt hashed)" },
      { type: "JWT", strength: "High (signed, short-lived)" },
    ],
  };
}

function performThreatAnalysis(appInfo) {
  return {
    threatActors: [
      {
        name: "External Attacker",
        motivation: "Financial gain, data theft",
        capability: "Medium-High",
        likelihood: "High",
      },
      {
        name: "Malicious Insider",
        motivation: "Revenge, financial gain",
        capability: "High (has legitimate access)",
        likelihood: "Low-Medium",
      },
      {
        name: "Script Kiddie",
        motivation: "Notoriety, curiosity",
        capability: "Low",
        likelihood: "Medium",
      },
    ],
    attackVectors: [
      { name: "SQL/NoSQL Injection", likelihood: "High", impact: "Critical" },
      { name: "Authentication Bypass", likelihood: "Medium", impact: "Critical" },
      { name: "XSS", likelihood: "Medium", impact: "Medium" },
      { name: "CSRF", likelihood: "Medium", impact: "Medium" },
      { name: "DDoS", likelihood: "Medium", impact: "High" },
    ],
    mitreAttackTechniques: [
      { id: "T1190", name: "Exploit Public-Facing Application" },
      { id: "T1110", name: "Brute Force" },
      { id: "T1078", name: "Valid Accounts" },
      { id: "T1059", name: "Command and Scripting Interpreter" },
    ],
  };
}

function performVulnerabilityAnalysis(appInfo) {
  return {
    codeVulnerabilities: [
      {
        type: "NoSQL Injection",
        location: "User input handling",
        severity: "HIGH",
        status: appInfo.inputValidation ? "Mitigated" : "Open",
      },
      {
        type: "Weak Authentication",
        location: "Login endpoint",
        severity: "HIGH",
        status: appInfo.strongAuth ? "Mitigated" : "Open",
      },
    ],
    configurationIssues: [
      {
        type: "Missing security headers",
        severity: "MEDIUM",
        status: appInfo.securityHeaders ? "Mitigated" : "Open",
      },
      {
        type: "Debug mode enabled",
        severity: "LOW",
        status: "Check in production",
      },
    ],
    dependencyVulnerabilities: [
      {
        package: "Check package.json",
        recommendation: "Run npm audit regularly",
      },
    ],
  };
}

function performAttackAnalysis(appInfo) {
  return {
    attackTrees: [
      {
        goal: "Steal user credentials",
        paths: [
          ["Phishing attack", "Harvest credentials"],
          ["NoSQL injection", "Extract database", "Crack hashes"],
          ["Session hijacking", "Steal session token"],
        ],
      },
      {
        goal: "Access admin functions",
        paths: [
          ["Compromise admin account", "Authenticate as admin"],
          ["JWT manipulation", "Forge admin token"],
          ["Privilege escalation", "Elevate user role"],
        ],
      },
    ],
    attackScenarios: [
      {
        name: "Credential Stuffing Attack",
        steps: [
          "Obtain leaked credentials from dark web",
          "Automate login attempts",
          "Bypass rate limiting if possible",
          "Access compromised accounts",
        ],
        probability: 0.7,
        impact: "HIGH",
      },
      {
        name: "NoSQL Injection Attack",
        steps: [
          "Identify input fields",
          "Test for injection (e.g., {$ne: null})",
          "Extract or modify data",
          "Escalate to full database access",
        ],
        probability: appInfo.inputValidation ? 0.1 : 0.8,
        impact: "CRITICAL",
      },
    ],
  };
}

function performRiskAnalysis(appInfo, attackAnalysis) {
  const risks = [];
  
  // Generate risks from attack scenarios
  attackAnalysis.attackScenarios?.forEach((scenario, index) => {
    const riskScore = calculateRiskScore(scenario.probability, scenario.impact);
    risks.push({
      id: `RISK-${String(index + 1).padStart(3, "0")}`,
      name: scenario.name,
      description: `Risk from ${scenario.name}`,
      probability: scenario.probability,
      impact: scenario.impact,
      riskScore,
      priority: getRiskPriority(riskScore),
      mitigation: getMitigation(scenario.name),
      status: "Open",
    });
  });
  
  return {
    risks,
    mitigationPlan: risks.map(r => ({
      riskId: r.id,
      mitigation: r.mitigation,
      effort: "Medium",
      timeline: "Sprint 2",
    })),
    residualRisks: [
      "Zero-day vulnerabilities in dependencies",
      "Social engineering attacks",
      "Advanced persistent threats",
    ],
  };
}

function calculateRiskScore(probability, impact) {
  const impactScores = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
  const impactScore = impactScores[impact] || 2;
  return probability * impactScore * 2.5; // Scale to 0-10
}

function getRiskPriority(score) {
  if (score >= 8) return "CRITICAL";
  if (score >= 6) return "HIGH";
  if (score >= 4) return "MEDIUM";
  return "LOW";
}

function getMitigation(attackName) {
  const mitigations = {
    "Credential Stuffing Attack": [
      "Implement rate limiting",
      "Add MFA",
      "Use CAPTCHA after failed attempts",
      "Monitor for credential leaks",
    ],
    "NoSQL Injection Attack": [
      "Validate all user inputs",
      "Use parameterized queries",
      "Implement least privilege database access",
      "Regular security testing",
    ],
  };
  return mitigations[attackName] || ["Implement defense in depth"];
}

/**
 * Get PASTA overview for educational purposes
 */
export function getPASTAOverview() {
  return {
    name: "PASTA",
    fullName: "Process for Attack Simulation and Threat Analysis",
    description: "A risk-centric threat modeling methodology with 7 stages",
    origin: "Tony UcedaVélez and Marco Morana (2015)",
    useCase: "Business-focused threat modeling with attack simulation",
    stages: Object.values(PASTA_STAGES),
    benefits: [
      "Business-focused approach",
      "Attack simulation validates threats",
      "Risk-based prioritization",
      "Comprehensive 7-stage process",
      "Integrates with existing security practices",
    ],
    process: [
      "1. Define business objectives and security requirements",
      "2. Define technical scope and architecture",
      "3. Decompose application into components",
      "4. Analyze threats using threat intelligence",
      "5. Identify vulnerabilities",
      "6. Simulate attacks and build attack trees",
      "7. Analyze risks and develop mitigations",
    ],
  };
}
