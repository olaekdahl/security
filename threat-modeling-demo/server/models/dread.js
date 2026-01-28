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
 */
export const COMMON_VULNERABILITY_SCORES = {
  "SQL/NoSQL Injection": {
    damage: 4,           // Complete database compromise
    reproducibility: 3,  // Easily reproducible once found
    exploitability: 2,   // Moderate skill needed
    affectedUsers: 4,    // All users potentially affected
    discoverability: 3,  // Easy to find with scanning
    total: 8.0,
    riskLevel: "CRITICAL",
  },
  
  "Cross-Site Scripting (XSS)": {
    damage: 2,           // Session hijacking, phishing
    reproducibility: 4,  // Always reproducible
    exploitability: 3,   // Easy with basic knowledge
    affectedUsers: 2,    // Targeted users
    discoverability: 3,  // Easy to find
    total: 7.0,
    riskLevel: "HIGH",
  },
  
  "Broken Authentication": {
    damage: 4,           // Account takeover
    reproducibility: 3,  // Depends on implementation
    exploitability: 2,   // Moderate skill
    affectedUsers: 3,    // Many users at risk
    discoverability: 2,  // Requires analysis
    total: 7.0,
    riskLevel: "HIGH",
  },
  
  "Sensitive Data Exposure": {
    damage: 3,           // Data breach
    reproducibility: 2,  // Depends on conditions
    exploitability: 2,   // Moderate skill
    affectedUsers: 4,    // All users with sensitive data
    discoverability: 2,  // Requires analysis
    total: 6.5,
    riskLevel: "HIGH",
  },
  
  "CSRF": {
    damage: 2,           // Unauthorized actions
    reproducibility: 4,  // Always reproducible
    exploitability: 3,   // Easy
    affectedUsers: 2,    // Targeted users
    discoverability: 3,  // Obvious when looked for
    total: 7.0,
    riskLevel: "HIGH",
  },
  
  "Insecure Deserialization": {
    damage: 4,           // RCE possible
    reproducibility: 2,  // Requires specific conditions
    exploitability: 1,   // Advanced skill needed
    affectedUsers: 4,    // All users
    discoverability: 1,  // Hard to find
    total: 6.0,
    riskLevel: "HIGH",
  },
  
  "Security Misconfiguration": {
    damage: 2,           // Information disclosure
    reproducibility: 3,  // Usually reproducible
    exploitability: 4,   // No skill needed
    affectedUsers: 3,    // Many users
    discoverability: 3,  // Easy to find
    total: 7.5,
    riskLevel: "HIGH",
  },
  
  "Missing Rate Limiting": {
    damage: 2,           // DoS, brute force
    reproducibility: 4,  // Always reproducible
    exploitability: 4,   // No skill needed
    affectedUsers: 4,    // All users (availability)
    discoverability: 4,  // Obvious
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
