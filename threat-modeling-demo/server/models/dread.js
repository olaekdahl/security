/**
 * DREAD Risk Scoring Model
 * 
 * DREAD is a risk assessment model used to calculate the severity of threats:
 * - D: Damage Potential (How bad is the impact?)
 * - R: Reproducibility (How easy is it to reproduce?)
 * - E: Exploitability (How easy is it to attack?)
 * - A: Affected Users (How many users are impacted?)
 * - D: Discoverability (How easy is it to find?)
 */

export const DREAD_FACTORS = {
  DAMAGE: {
    code: "D",
    name: "Damage Potential",
    description: "How much damage can the attack cause?",
    scale: {
      0: "Nothing",
      1: "Minimal impact",
      2: "Minor data disclosure",
      3: "Individual user data disclosed",
      4: "Some user data or minor system data compromised",
      5: "Moderate data breach, some system impact",
      6: "Significant data breach, system degradation",
      7: "Extensive data compromise, major system impact",
      8: "Severe breach, significant financial/reputation damage",
      9: "Critical system compromise, major business impact",
      10: "Complete system destruction, catastrophic damage",
    },
  },
  
  REPRODUCIBILITY: {
    code: "R",
    name: "Reproducibility",
    description: "How easy is it to reproduce the attack?",
    scale: {
      0: "Essentially impossible to reproduce",
      1: "Very difficult, requires rare conditions",
      2: "Difficult, specific timing or conditions needed",
      3: "Somewhat difficult, needs insider knowledge",
      4: "Moderately difficult",
      5: "Average difficulty, requires some skill",
      6: "Fairly easy with right knowledge",
      7: "Easy to reproduce with basic skills",
      8: "Very easy, minimal conditions needed",
      9: "Almost always reproducible",
      10: "Always reproducible, trivial",
    },
  },
  
  EXPLOITABILITY: {
    code: "E",
    name: "Exploitability",
    description: "What is needed to exploit the vulnerability?",
    scale: {
      0: "Requires custom hardware/impossible",
      1: "Requires advanced skills and custom tools",
      2: "Needs expert knowledge and specialized tools",
      3: "Skilled attacker with custom tools",
      4: "Above average skills, some custom tools",
      5: "Moderate skills, publicly available tools",
      6: "Basic skills, common tools",
      7: "Beginner skills, simple tools",
      8: "Novice, using automated tools",
      9: "Script kiddie level",
      10: "No tools required, browser only",
    },
  },
  
  AFFECTED_USERS: {
    code: "A",
    name: "Affected Users",
    description: "How many users are affected?",
    scale: {
      0: "None",
      1: "Single user under rare conditions",
      2: "Individual user, targeted attack",
      3: "Small group of users",
      4: "Some users (<10%)",
      5: "Moderate number of users (10-25%)",
      6: "Significant portion (25-50%)",
      7: "Majority of users (50-75%)",
      8: "Most users (75-90%)",
      9: "Nearly all users (90%+)",
      10: "All users",
    },
  },
  
  DISCOVERABILITY: {
    code: "D",
    name: "Discoverability",
    description: "How easy is it to discover the vulnerability?",
    scale: {
      0: "Requires source code access and expert analysis",
      1: "Very hard, needs extensive insider knowledge",
      2: "Hard, requires deep security expertise",
      3: "Difficult, needs specialized security tools",
      4: "Moderate, detailed manual analysis needed",
      5: "Average, standard security scanning finds it",
      6: "Fairly easy, basic scanning or fuzzing",
      7: "Easy, obvious with manual testing",
      8: "Very easy, visible in normal usage",
      9: "Obvious to anyone looking",
      10: "Publicly known or documented",
    },
    note: "Some practitioners set Discoverability to max (assume attacker will find it)",
  },
};

/**
 * Calculate DREAD score for a threat
 * @param {Object} ratings - Ratings for each DREAD factor (0-10)
 * @returns {Object} DREAD score breakdown and total
 */
export function calculateDREAD(ratings) {
  const factors = ["damage", "reproducibility", "exploitability", "affectedUsers", "discoverability"];
  const factorKeys = ["DAMAGE", "REPRODUCIBILITY", "EXPLOITABILITY", "AFFECTED_USERS", "DISCOVERABILITY"];
  const breakdown = {};
  let total = 0;
  
  factors.forEach((factor, index) => {
    // Accept 0-10 rating directly
    const rating = Math.min(10, Math.max(0, Math.round(Number(ratings[factor]) || 0)));
    const factorKey = factorKeys[index];
    
    breakdown[factor] = {
      rating,
      description: DREAD_FACTORS[factorKey].scale[rating] || `Rating: ${rating}`,
    };
    
    total += rating;
  });
  
  // Average score (0-10)
  const averageScore = total / 5;
  
  return {
    breakdown,
    total: Math.round(averageScore * 10) / 10,
    maxScore: 10,
    riskLevel: getRiskLevel(averageScore),
    recommendation: getRecommendation(averageScore),
  };
}

/**
 * Get risk level from DREAD score
 */
function getRiskLevel(score) {
  if (score >= 8) return { level: "CRITICAL", color: "#dc2626", action: "Immediate remediation required" };
  if (score >= 6) return { level: "HIGH", color: "#ea580c", action: "Remediate before next release" };
  if (score >= 4) return { level: "MEDIUM", color: "#ca8a04", action: "Schedule for remediation" };
  if (score >= 2) return { level: "LOW", color: "#65a30d", action: "Address when convenient" };
  return { level: "INFORMATIONAL", color: "#0284c7", action: "No action required" };
}

/**
 * Get recommendation based on score
 */
function getRecommendation(score) {
  if (score >= 8) {
    return {
      urgency: "CRITICAL",
      timeline: "Immediate (24-48 hours)",
      actions: [
        "Escalate to security team immediately",
        "Consider temporary mitigation (disable feature if needed)",
        "Begin remediation development",
        "Prepare incident response plan",
      ],
    };
  }
  if (score >= 6) {
    return {
      urgency: "HIGH",
      timeline: "Within 1 week",
      actions: [
        "Prioritize in current sprint",
        "Develop and test fix",
        "Plan deployment",
        "Document mitigation steps",
      ],
    };
  }
  if (score >= 4) {
    return {
      urgency: "MEDIUM",
      timeline: "Within 1 month",
      actions: [
        "Add to security backlog",
        "Schedule for upcoming sprint",
        "Research best mitigation approach",
      ],
    };
  }
  return {
    urgency: "LOW",
    timeline: "When convenient",
    actions: [
      "Document for future reference",
      "Address during refactoring",
      "Monitor for changes in risk profile",
    ],
  };
}

/**
 * Score common vulnerability types with DREAD
 * All ratings are on the 0-10 scale; total = average of the 5 factors.
 */
export const COMMON_VULNERABILITY_SCORES = {
  "SQL/NoSQL Injection": {
    damage: 9,           // Complete database compromise possible
    reproducibility: 8,  // Easily reproducible once found
    exploitability: 7,   // Tools widely available
    affectedUsers: 10,   // All users potentially affected
    discoverability: 6,  // Found with automated scanning
    total: 8.0,
    riskLevel: "CRITICAL",
  },

  "Cross-Site Scripting (XSS)": {
    damage: 6,           // Session hijacking, phishing, credential theft
    reproducibility: 8,  // Reliable once payload is crafted
    exploitability: 8,   // Browser-based, minimal skill needed
    affectedUsers: 6,    // Visitors of affected pages
    discoverability: 7,  // Evident with basic testing
    total: 7.0,
    riskLevel: "HIGH",
  },

  "Broken Authentication": {
    damage: 8,           // Full account takeover
    reproducibility: 7,  // Credential stuffing is repeatable
    exploitability: 6,   // Automated tools available
    affectedUsers: 7,    // Any user without MFA
    discoverability: 7,  // Obvious with login page analysis
    total: 7.0,
    riskLevel: "HIGH",
  },

  "Sensitive Data Exposure": {
    damage: 7,           // PII/financial data breach
    reproducibility: 6,  // Depends on transport/storage config
    exploitability: 6,   // Network sniffing or misconfigured endpoint
    affectedUsers: 7,    // All users with sensitive data
    discoverability: 7,  // TLS checks and header scanning reveal it
    total: 6.6,
    riskLevel: "HIGH",
  },

  "CSRF": {
    damage: 6,           // Unauthorized state-changing actions
    reproducibility: 8,  // Crafted link always works
    exploitability: 8,   // Simple link or img tag
    affectedUsers: 6,    // Authenticated users
    discoverability: 7,  // Visible in form submissions without tokens
    total: 7.0,
    riskLevel: "HIGH",
  },

  "Insecure Deserialization": {
    damage: 8,           // RCE / full system compromise possible
    reproducibility: 5,  // Requires specific gadget chain
    exploitability: 5,   // Specialized knowledge required
    affectedUsers: 9,    // All users if RCE is achieved
    discoverability: 3,  // Hard to find without source review
    total: 6.0,
    riskLevel: "HIGH",
  },

  "Security Misconfiguration": {
    damage: 7,           // Information disclosure or direct access
    reproducibility: 8,  // Config issues are consistently exploitable
    exploitability: 8,   // Requires no special skill
    affectedUsers: 7,    // Broad exposure
    discoverability: 7,  // Scanner or manual header review
    total: 7.4,
    riskLevel: "HIGH",
  },

  "Missing Rate Limiting": {
    damage: 8,           // DoS or brute-forced credentials
    reproducibility: 10, // Always reproducible — no conditions needed
    exploitability: 10,  // Any script or tool achieves it
    affectedUsers: 9,    // All users (availability impact)
    discoverability: 8,  // No token → obvious in minutes
    total: 9.0,
    riskLevel: "CRITICAL",
  },
};

/**
 * Compare multiple threats by DREAD score
 * @param {Array} threats - Array of threat objects with DREAD scores
 * @returns {Array} Sorted threats by risk (highest first)
 */
export function prioritizeThreats(threats) {
  return threats
    .map(threat => ({
      ...threat,
      dreadScore: calculateDREAD(threat.ratings),
    }))
    .sort((a, b) => b.dreadScore.total - a.dreadScore.total);
}

/**
 * Get DREAD overview for educational purposes
 */
export function getDREADOverview() {
  return {
    name: "DREAD",
    fullName: "Damage, Reproducibility, Exploitability, Affected Users, Discoverability",
    description: "A quantitative risk assessment model for rating threat severity",
    origin: "Microsoft (circa 2002, part of SDL)",
    useCase: "Prioritizing threats based on risk score",
    factors: Object.entries(DREAD_FACTORS).map(([key, value]) => ({
      key,
      ...value,
    })),
    scoring: {
      range: "0-10 (average of all factors)",
      levels: [
        { range: "8-10", level: "CRITICAL", action: "Immediate fix" },
        { range: "6-8", level: "HIGH", action: "Fix before release" },
        { range: "4-6", level: "MEDIUM", action: "Schedule fix" },
        { range: "2-4", level: "LOW", action: "Fix when convenient" },
        { range: "0-2", level: "INFO", action: "Accept or note" },
      ],
    },
    process: [
      "1. Identify the threat/vulnerability",
      "2. Rate each DREAD factor (0-4)",
      "3. Calculate average score",
      "4. Determine risk level",
      "5. Prioritize remediation based on score",
    ],
    critiques: [
      "Subjectivity in ratings",
      "Discoverability debate (assume attacker will find it?)",
      "Doesn't account for business context",
      "Consider using with other methods (STRIDE, PASTA)",
    ],
  };
}
