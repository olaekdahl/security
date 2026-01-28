/**
 * STRIDE Threat Modeling Framework
 * 
 * STRIDE is a mnemonic for six categories of security threats:
 * - S: Spoofing (identity)
 * - T: Tampering (data integrity)
 * - R: Repudiation (deniability)
 * - I: Information Disclosure (confidentiality)
 * - D: Denial of Service (availability)
 * - E: Elevation of Privilege (authorization)
 */

export const STRIDE_CATEGORIES = {
  SPOOFING: {
    code: "S",
    name: "Spoofing",
    description: "Impersonating something or someone else",
    securityProperty: "Authentication",
    examples: [
      "Forging authentication tokens",
      "Session hijacking",
      "Credential stuffing",
      "Phishing attacks",
      "Man-in-the-middle attacks",
    ],
    mitigations: [
      "Strong authentication (MFA)",
      "Certificate pinning",
      "Secure session management",
      "Input validation on identity claims",
      "Rate limiting on auth endpoints",
    ],
    affectedAssets: ["users", "sessions", "API endpoints", "network connections"],
  },
  
  TAMPERING: {
    code: "T",
    name: "Tampering",
    description: "Modifying data or code without authorization",
    securityProperty: "Integrity",
    examples: [
      "SQL/NoSQL injection",
      "Cross-site scripting (XSS)",
      "Parameter manipulation",
      "File upload attacks",
      "Memory corruption",
    ],
    mitigations: [
      "Input validation and sanitization",
      "Parameterized queries",
      "Content Security Policy (CSP)",
      "Digital signatures",
      "Checksums/hashes for data integrity",
    ],
    affectedAssets: ["databases", "files", "configurations", "user inputs"],
  },
  
  REPUDIATION: {
    code: "R",
    name: "Repudiation",
    description: "Claiming to not have performed an action",
    securityProperty: "Non-repudiation",
    examples: [
      "Denying transaction",
      "Claiming account was hacked",
      "Log tampering",
      "Unsigned actions",
    ],
    mitigations: [
      "Comprehensive audit logging",
      "Digital signatures",
      "Timestamps from trusted sources",
      "Secure log storage (append-only)",
      "Transaction receipts",
    ],
    affectedAssets: ["audit logs", "transactions", "user actions"],
  },
  
  INFORMATION_DISCLOSURE: {
    code: "I",
    name: "Information Disclosure",
    description: "Exposing information to unauthorized users",
    securityProperty: "Confidentiality",
    examples: [
      "Data breaches",
      "Error message information leakage",
      "Directory traversal",
      "Insecure direct object references",
      "Unencrypted sensitive data",
    ],
    mitigations: [
      "Encryption at rest and in transit",
      "Access control lists",
      "Data masking/tokenization",
      "Proper error handling",
      "Secure configuration",
    ],
    affectedAssets: ["personal data", "credentials", "business data", "system info"],
  },
  
  DENIAL_OF_SERVICE: {
    code: "D",
    name: "Denial of Service",
    description: "Making a system unavailable or unusable",
    securityProperty: "Availability",
    examples: [
      "DDoS attacks",
      "Resource exhaustion",
      "Algorithmic complexity attacks",
      "Account lockout abuse",
      "Disk space exhaustion",
    ],
    mitigations: [
      "Rate limiting",
      "Input validation (size limits)",
      "Resource quotas",
      "Load balancing",
      "CDN and DDoS protection",
    ],
    affectedAssets: ["servers", "databases", "APIs", "network"],
  },
  
  ELEVATION_OF_PRIVILEGE: {
    code: "E",
    name: "Elevation of Privilege",
    description: "Gaining unauthorized capabilities or access",
    securityProperty: "Authorization",
    examples: [
      "Privilege escalation",
      "Broken access control",
      "JWT manipulation",
      "Role bypass",
      "Insecure deserialization",
    ],
    mitigations: [
      "Principle of least privilege",
      "Role-based access control (RBAC)",
      "Input validation",
      "Secure token handling",
      "Regular permission audits",
    ],
    affectedAssets: ["admin functions", "sensitive operations", "user roles"],
  },
};

/**
 * Analyze an asset or component for STRIDE threats
 * @param {Object} asset - The asset to analyze
 * @returns {Object} STRIDE analysis results
 */
export function analyzeSTRIDE(asset) {
  const analysis = {
    asset: asset.name,
    type: asset.type,
    timestamp: new Date().toISOString(),
    threats: [],
    summary: {
      totalThreats: 0,
      byCategory: {},
    },
  };
  
  // Analyze each STRIDE category based on asset type
  for (const [key, category] of Object.entries(STRIDE_CATEGORIES)) {
    const threat = analyzeCategory(asset, key, category);
    if (threat.applicable) {
      analysis.threats.push(threat);
      analysis.summary.totalThreats++;
      analysis.summary.byCategory[category.code] = threat.severity;
    }
  }
  
  return analysis;
}

/**
 * Analyze a specific STRIDE category for an asset
 */
function analyzeCategory(asset, categoryKey, category) {
  const assetType = asset.type?.toLowerCase() || "";
  const assetName = asset.name?.toLowerCase() || "";
  
  // Determine if this threat category applies to the asset
  let applicable = false;
  let severity = "LOW";
  let specificThreats = [];
  let recommendations = [];
  
  switch (categoryKey) {
    case "SPOOFING":
      applicable = ["authentication", "api", "user", "session", "network"].some(
        t => assetType.includes(t) || assetName.includes(t)
      );
      if (applicable) {
        severity = asset.authenticationRequired ? "MEDIUM" : "HIGH";
        specificThreats = [
          "User impersonation",
          "Token forgery",
          "Session hijacking",
        ];
        recommendations = [
          "Implement MFA",
          "Use secure session tokens",
          "Implement token refresh mechanism",
        ];
      }
      break;
      
    case "TAMPERING":
      applicable = ["database", "api", "file", "input", "form"].some(
        t => assetType.includes(t) || assetName.includes(t)
      );
      if (applicable) {
        severity = asset.handlesUserInput ? "HIGH" : "MEDIUM";
        specificThreats = [
          "NoSQL injection",
          "Parameter manipulation",
          "Data modification",
        ];
        recommendations = [
          "Use parameterized queries",
          "Implement input validation",
          "Add integrity checks",
        ];
      }
      break;
      
    case "REPUDIATION":
      applicable = ["transaction", "api", "action", "payment", "audit"].some(
        t => assetType.includes(t) || assetName.includes(t)
      );
      if (applicable) {
        severity = asset.hasAuditLog ? "LOW" : "HIGH";
        specificThreats = [
          "Unlogged actions",
          "Log tampering",
          "Transaction denial",
        ];
        recommendations = [
          "Implement comprehensive logging",
          "Use append-only log storage",
          "Add digital signatures to critical transactions",
        ];
      }
      break;
      
    case "INFORMATION_DISCLOSURE":
      applicable = ["database", "api", "user", "file", "config", "credential"].some(
        t => assetType.includes(t) || assetName.includes(t)
      );
      if (applicable) {
        severity = asset.containsSensitiveData ? "CRITICAL" : "MEDIUM";
        specificThreats = [
          "Data exposure",
          "Error message leakage",
          "Unauthorized data access",
        ];
        recommendations = [
          "Encrypt sensitive data",
          "Implement proper access controls",
          "Sanitize error messages",
        ];
      }
      break;
      
    case "DENIAL_OF_SERVICE":
      applicable = ["api", "server", "database", "network", "public"].some(
        t => assetType.includes(t) || assetName.includes(t)
      );
      if (applicable) {
        severity = asset.isPublicFacing ? "HIGH" : "MEDIUM";
        specificThreats = [
          "Resource exhaustion",
          "API abuse",
          "Database overload",
        ];
        recommendations = [
          "Implement rate limiting",
          "Set request size limits",
          "Use caching and load balancing",
        ];
      }
      break;
      
    case "ELEVATION_OF_PRIVILEGE":
      applicable = ["authentication", "authorization", "admin", "role", "permission"].some(
        t => assetType.includes(t) || assetName.includes(t)
      );
      if (applicable) {
        severity = asset.hasAdminFunctions ? "CRITICAL" : "MEDIUM";
        specificThreats = [
          "Privilege escalation",
          "Role bypass",
          "Unauthorized admin access",
        ];
        recommendations = [
          "Implement RBAC",
          "Apply least privilege principle",
          "Regular permission audits",
        ];
      }
      break;
  }
  
  return {
    category: category.code,
    categoryName: category.name,
    securityProperty: category.securityProperty,
    applicable,
    severity,
    specificThreats,
    recommendations,
    standardMitigations: applicable ? category.mitigations : [],
  };
}

/**
 * Get STRIDE overview for educational purposes
 */
export function getSTRIDEOverview() {
  return {
    name: "STRIDE",
    fullName: "Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege",
    description: "A threat modeling framework developed by Microsoft to identify security threats",
    origin: "Microsoft (Loren Kohnfelder and Praerit Garg, 1999)",
    useCase: "Identifying threats during system design and architecture review",
    categories: Object.entries(STRIDE_CATEGORIES).map(([key, value]) => ({
      key,
      ...value,
    })),
    process: [
      "1. Decompose the application (create DFD)",
      "2. Enumerate threats using STRIDE for each element",
      "3. Rank threats by risk (use DREAD or other methods)",
      "4. Develop mitigations for high-risk threats",
      "5. Validate mitigations are effective",
    ],
  };
}
