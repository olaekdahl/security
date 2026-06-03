# Threat Modeling Demo

A comprehensive demonstration of **STRIDE**, **PASTA**, and **DREAD** threat modeling methodologies using a full-stack application with **Node.js**, **MongoDB**, and **React**.

## 🎯 Overview

This demo teaches three essential security threat modeling frameworks:

| Framework | Purpose | Approach |
|-----------|---------|----------|
| **STRIDE** | Threat Identification | Category-based enumeration (6 threat types) |
| **PASTA** | Risk Analysis | 7-stage process with attack simulation |
| **DREAD** | Risk Scoring | Quantitative rating (0-10 scale) |

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   React SPA     │───▶│  Node/Express    │──▶ │    MongoDB      │
│   (Port 3000)   │     │   (Port 3001)   │     │   (Port 27017)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
       │                        │
       │   • Auth (JWT)         │   • STRIDE Models
       │   • DREAD Calculator   │   • PASTA Analysis
       │   • Interactive Demo   │   • Threat Registry
       │                        │   • Asset Management
```

## 🚀 Quick Start

### Option 1: Docker (Recommended)

```bash
# Start all services
docker compose up -d

# Open in browser
open http://localhost:3000
```

### Option 2: Manual Setup

```bash
# 1. Start MongoDB
docker run -d -p 27017:27017 --name mongo mongo:8

# 2. Install and start API server
npm install
npm start

# 3. Install and start React client (new terminal)
cd client
npm install
npm run dev
```

## 📚 Framework Deep Dives

Each section below shows **the important code that powers the demo** and explains what it
does. The full implementations live in [server/models/](server/models/) and the runnable
walkthrough is [scripts/demo.sh](scripts/demo.sh).

---

### Demo 1: STRIDE - Threat Identification

STRIDE helps identify threats by categorizing them into 6 types:

| Code | Category | Security Property | Question |
|------|----------|-------------------|----------|
| **S** | Spoofing | Authentication | Can someone pretend to be something/someone else? |
| **T** | Tampering | Integrity | Can data be modified without detection? |
| **R** | Repudiation | Non-repudiation | Can users deny their actions? |
| **I** | Information Disclosure | Confidentiality | Can sensitive data be exposed? |
| **D** | Denial of Service | Availability | Can the system be made unavailable? |
| **E** | Elevation of Privilege | Authorization | Can users gain unauthorized access? |

#### Key code 1 — the threat catalog

Each STRIDE category is modeled as data so the engine can attach examples, mitigations, and
the security property it protects. From [server/models/stride.js](server/models/stride.js):

```js
export const STRIDE_CATEGORIES = {
  TAMPERING: {
    code: "T",
    name: "Tampering",
    description: "Modifying data or code without authorization",
    securityProperty: "Integrity",          // the CIA property this threat breaks
    examples: ["SQL/NoSQL injection", "Cross-site scripting (XSS)", ...],
    mitigations: ["Input validation and sanitization", "Parameterized queries", ...],
    affectedAssets: ["databases", "files", "configurations", "user inputs"],
  },
  // ...Spoofing, Repudiation, Information Disclosure, DoS, Elevation of Privilege
};
```

**What it does:** turns STRIDE from a memory aid into a structured knowledge base. Every
category carries the mitigations and security property it maps to, so analysis output is
consistent and explainable instead of free-form.

#### Key code 2 — applying STRIDE to an asset

The engine walks every category and decides whether it *applies* to the asset and *how
severe* it is, based on the asset's properties:

```js
case "INFORMATION_DISCLOSURE":
  // Applies if the asset is a database/API/user store/file/config/credential
  applicable = ["database", "api", "user", "file", "config", "credential"].some(
    t => assetType.includes(t) || assetName.includes(t)
  );
  if (applicable) {
    // Severity is driven by the asset's own flags
    severity = asset.containsSensitiveData ? "CRITICAL" : "MEDIUM";
    specificThreats = ["Data exposure", "Error message leakage", "Unauthorized data access"];
    recommendations = ["Encrypt sensitive data", "Implement proper access controls", ...];
  }
  break;
```

**What it does:** makes the analysis *context-aware*. A public-facing API raises the DoS
severity; an asset holding sensitive data pushes Information Disclosure to `CRITICAL`. The
output is a tailored list of applicable threats with severity and fixes — not a generic
checklist.

**Run it:**
```bash
curl http://localhost:3001/api/demo/stride/example | jq .

# Analyze your own asset — flags change the results
curl -X POST http://localhost:3001/api/demo/interactive/stride \
  -H "Content-Type: application/json" \
  -d '{"asset":{"name":"Customer Database","type":"database",
       "containsSensitiveData":true,"handlesUserInput":true,"hasAuditLog":true}}' | jq .
```

---

### Demo 2: PASTA - Risk-Centric Analysis

PASTA (Process for Attack Simulation and Threat Analysis) is a 7-stage methodology that
moves from business context all the way to attack simulation and risk:

1. **Define Business Objectives** - What are we protecting and why?
2. **Define Technical Scope** - Architecture, components, data flows
3. **Decompose Application** - Entry points, roles, data stores
4. **Threat Analysis** - Threat actors, attack vectors
5. **Vulnerability Analysis** - Code review, CVEs, configurations
6. **Attack Analysis** - Attack trees, scenarios, simulations
7. **Risk & Impact Analysis** - Scores, priorities, mitigations

#### Key code — each stage is a structured process step

From [server/models/pasta.js](server/models/pasta.js), every stage declares its activities,
the artifacts it produces, and the questions it forces you to answer:

```js
export const PASTA_STAGES = {
  STAGE_2: {
    number: 2,
    name: "Define Technical Scope",
    activities: ["Document application architecture", "Map data flows",
                 "Identify trust boundaries", ...],
    outputs:    ["Architecture diagram", "Data flow diagram (DFD)",
                 "Trust boundary map", ...],          // ← links to docs/dfd-level1.mmd
    questions:  ["What are the main components?", "Where does data flow?",
                 "Where are the trust boundaries?", ...],
  },
  // STAGE_1 Business Objectives ... STAGE_7 Risk & Impact Analysis
};
```

**What it does:** encodes PASTA as a repeatable pipeline. Because each stage names its
**outputs**, the methodology connects directly to the other artifacts in this repo — e.g.
Stage 2's "Data flow diagram" is [docs/dfd-level1.mmd](docs/dfd-level1.mmd), and Stage 5's
vulnerability analysis feeds the DREAD scores below. The `questions` array is what makes
PASTA *risk-centric*: you answer business and attacker questions before rating anything.

**Run it:**
```bash
curl http://localhost:3001/api/demo/pasta/example | jq '{
  application: .application.name,
  stagesCompleted: .analysis.summary.completedStages,
  stages: [.analysis.stages[] | {stage: .number, name: .name, status: .status}]
}'
```

---

### Demo 3: DREAD - Risk Scoring

DREAD provides a quantitative risk score (0-10):

| Factor | Question | Scale (0-10) |
|--------|----------|-------------|
| **D**amage | How bad is the impact? | 0=None → 10=Complete system |
| **R**eproducibility | How easy to reproduce? | 0=Very hard → 10=Always |
| **E**xploitability | How much work to exploit? | 0=Advanced → 10=No tools |
| **A**ffected Users | How many impacted? | 0=None → 10=All users |
| **D**iscoverability | How easy to find? | 0=Very hard → 10=Trivial |

#### Key code 1 — turning five ratings into one score

From [server/models/dread.js](server/models/dread.js):

```js
export function calculateDREAD(ratings) {
  const factors = ["damage", "reproducibility", "exploitability",
                   "affectedUsers", "discoverability"];
  let total = 0;
  factors.forEach((factor) => {
    // Clamp each rating to a safe 0-10 integer (never trust raw input)
    const rating = Math.min(10, Math.max(0, Math.round(Number(ratings[factor]) || 0)));
    total += rating;
  });

  const averageScore = total / 5;        // average the 5 factors → 0-10
  return {
    total: Math.round(averageScore * 10) / 10,
    riskLevel: getRiskLevel(averageScore),
    recommendation: getRecommendation(averageScore),
  };
}
```

**What it does:** averages the five factors into a single 0-10 number and clamps each input
to a valid range so malformed/hostile input can't skew the score. One number makes threats
directly comparable and sortable.

#### Key code 2 — score → risk level → action

The raw number is meaningless without a decision. `getRiskLevel` maps the score to a level
*and a recommended action and timeline*:

```js
function getRiskLevel(score) {
  if (score >= 8) return { level: "CRITICAL", action: "Immediate remediation required" };
  if (score >= 6) return { level: "HIGH",     action: "Remediate before next release" };
  if (score >= 4) return { level: "MEDIUM",   action: "Schedule for remediation" };
  if (score >= 2) return { level: "LOW",      action: "Address when convenient" };
  return { level: "INFORMATIONAL", action: "No action required" };
}
```

| Score Range | Risk Level | Action |
|-------------|------------|--------|
| 8-10 | CRITICAL | Immediate fix (24-48 hours) |
| 6-8 | HIGH | Fix before release |
| 4-6 | MEDIUM | Schedule for fix |
| 2-4 | LOW | Fix when convenient |
| 0-2 | INFO | Accept or note |

**What it does:** converts a score into a *decision* — every threat gets an owner-ready
verdict and timeline, which is the whole point of scoring.

#### Key code 3 — prioritizing many threats

`prioritizeThreats` scores a list and sorts highest-risk first, so remediation order falls
straight out of the data:

```js
export function prioritizeThreats(threats) {
  return threats
    .map(threat => ({ ...threat, dreadScore: calculateDREAD(threat.ratings) }))
    .sort((a, b) => b.dreadScore.total - a.dreadScore.total);   // worst first
}
```

**Run it:**
```bash
curl -X POST http://localhost:3001/api/demo/interactive/dread \
  -H "Content-Type: application/json" \
  -d '{
    "threatName": "NoSQL Injection",
    "ratings": {
      "damage": 4, "reproducibility": 3, "exploitability": 2,
      "affectedUsers": 4, "discoverability": 3
    }
  }' | jq '{threat: .threatName, score: .score.total,
            riskLevel: .score.riskLevel.level, action: .score.riskLevel.action}'
```

---

### Putting it together: the full workflow demo

[scripts/demo.sh](scripts/demo.sh) runs all three frameworks end to end — STRIDE finds the
threats, DREAD scores them, PASTA frames the risk, and the output is a prioritized
remediation plan:

```bash
bash scripts/demo.sh
```

## 🔐 Security Features Demonstrated

This application demonstrates security best practices:

### Authentication & Authorization
- JWT-based authentication with expiration
- Password hashing with bcrypt (12 rounds)
- Account lockout after 5 failed attempts
- Role-based access control (RBAC)

### Input Validation
- Joi schema validation
- NoSQL injection prevention
- Request size limits

### Security Headers (via Helmet.js)
- Content-Security-Policy
- X-Content-Type-Options
- X-Frame-Options
- Strict-Transport-Security

### Rate Limiting
- 100 requests per 15 minutes (general)
- 10 requests per 15 minutes (auth endpoints)

### Audit Logging
- All actions logged with timestamps
- IP addresses recorded
- Non-repudiation support

## 📁 Project Structure

```
threat-modeling-demo/
├── server/
│   ├── index.js              # Express server with security middleware
│   ├── db/
│   │   └── mongo.js          # MongoDB connection
│   ├── models/
│   │   ├── stride.js         # STRIDE framework implementation
│   │   ├── pasta.js          # PASTA framework implementation
│   │   └── dread.js          # DREAD scoring implementation
│   └── routes/
│       ├── auth.js           # Authentication routes
│       ├── threats.js        # Threat CRUD operations
│       ├── assets.js         # Asset management
│       ├── analysis.js       # Analysis endpoints
│       └── demo.js           # Interactive demo endpoints
├── client/
│   ├── src/
│   │   ├── App.js            # Main React application
│   │   └── index.css         # Styling
│   └── public/
├── docker-compose.yml
├── Dockerfile.api
├── Dockerfile.client
└── README.md
```

## 🧪 API Endpoints

### Demo (No Auth Required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/demo/quick-start` | Quick start guide |
| GET | `/api/demo/stride/example` | STRIDE example analysis |
| GET | `/api/demo/pasta/example` | PASTA example analysis |
| GET | `/api/demo/dread/example` | DREAD scoring example |
| GET | `/api/demo/full-example` | Complete threat modeling example |
| POST | `/api/demo/interactive/stride` | Run STRIDE on your asset |
| POST | `/api/demo/interactive/dread` | Calculate DREAD score |

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login (returns JWT) |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Get current user |

### Threats (Auth Required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/threats` | List all threats |
| GET | `/api/threats/summary` | Get threat statistics |
| POST | `/api/threats` | Create new threat |
| PUT | `/api/threats/:id` | Update threat |
| POST | `/api/threats/:id/calculate-dread` | Calculate DREAD score |

### Assets (Auth Required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/assets` | List all assets |
| POST | `/api/assets` | Create new asset |
| POST | `/api/assets/:id/analyze-stride` | Run STRIDE analysis |

### Analysis (Auth Required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analysis/overview` | Framework comparison |
| POST | `/api/analysis/comprehensive` | Full analysis using all frameworks |

## 🎓 Learning Exercises

### Exercise 1: STRIDE Analysis
1. Open the STRIDE page in the React app
2. Review the example analysis of a login endpoint
3. Identify which STRIDE categories apply to your own application

### Exercise 2: DREAD Scoring
1. Open the DREAD calculator
2. Score the "NoSQL Injection" vulnerability
3. Adjust ratings and observe how the risk level changes
4. Compare with common vulnerability scores

### Exercise 3: Complete Workflow
1. Register an account
2. Add an asset (e.g., "Payment API")
3. Run STRIDE analysis on the asset
4. Create threat entries from findings
5. Score each threat with DREAD
6. Prioritize remediation based on scores

## 🔄 Recommended Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                    THREAT MODELING WORKFLOW                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │  1. IDENTIFY ASSETS           │
              │  (What are we protecting?)    │
              └───────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │  2. STRIDE ANALYSIS           │
              │  (What threats exist?)        │
              │  - Spoofing                   │
              │  - Tampering                  │
              │  - Repudiation                │
              │  - Information Disclosure     │
              │  - Denial of Service          │
              │  - Elevation of Privilege     │
              └───────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │  3. PASTA (Optional)          │
              │  (Deep risk analysis)         │
              │  - 7-stage process            │
              │  - Attack simulation          │
              └───────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │  4. DREAD SCORING             │
              │  (How bad is each threat?)    │
              │  Score 0-10 for priority      │
              └───────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │  5. REMEDIATE BY PRIORITY     │
              │  CRITICAL → Immediate         │
              │  HIGH     → Before release    │
              │  MEDIUM   → Schedule fix      │
              │  LOW      → When convenient   │
              └───────────────────────────────┘
```

## 📖 References

- [Microsoft STRIDE](https://docs.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats)
- [OWASP Threat Modeling](https://owasp.org/www-community/Threat_Modeling)
- [PASTA Threat Modeling](https://owasp.org/www-pdf-archive/AppSecEU2012_PASTA.pdf)
- [MITRE ATT&CK](https://attack.mitre.org/)

## 📜 License

MIT License - Use freely for learning and development.
