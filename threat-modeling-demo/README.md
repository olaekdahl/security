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

### STRIDE - Threat Identification

STRIDE helps identify threats by categorizing them into 6 types:

| Code | Category | Security Property | Question |
|------|----------|-------------------|----------|
| **S** | Spoofing | Authentication | Can someone pretend to be something/someone else? |
| **T** | Tampering | Integrity | Can data be modified without detection? |
| **R** | Repudiation | Non-repudiation | Can users deny their actions? |
| **I** | Information Disclosure | Confidentiality | Can sensitive data be exposed? |
| **D** | Denial of Service | Availability | Can the system be made unavailable? |
| **E** | Elevation of Privilege | Authorization | Can users gain unauthorized access? |

**Demo Endpoint:**
```bash
curl http://localhost:3001/api/demo/stride/example | jq .
```

### PASTA - Risk-Centric Analysis

PASTA (Process for Attack Simulation and Threat Analysis) is a 7-stage methodology:

1. **Define Business Objectives** - What are we protecting and why?
2. **Define Technical Scope** - Architecture, components, data flows
3. **Decompose Application** - Entry points, roles, data stores
4. **Threat Analysis** - Threat actors, attack vectors
5. **Vulnerability Analysis** - Code review, CVEs, configurations
6. **Attack Analysis** - Attack trees, scenarios, simulations
7. **Risk & Impact Analysis** - Scores, priorities, mitigations

**Demo Endpoint:**
```bash
curl http://localhost:3001/api/demo/pasta/example | jq .
```

### DREAD - Risk Scoring

DREAD provides a quantitative risk score (0-10):

| Factor | Question | Scale (0-10) |
|--------|----------|-------------|
| **D**amage | How bad is the impact? | 0=None → 10=Complete system |
| **R**eproducibility | How easy to reproduce? | 0=Very hard → 10=Always |
| **E**xploitability | How much work to exploit? | 0=Advanced → 10=No tools |
| **A**ffected Users | How many impacted? | 0=None → 10=All users |
| **D**iscoverability | How easy to find? | 0=Very hard → 10=Trivial |

**Score = Average(D + R + E + A + D) × 2.5**

| Score Range | Risk Level | Action |
|-------------|------------|--------|
| 8-10 | CRITICAL | Immediate fix (24-48 hours) |
| 6-8 | HIGH | Fix before release |
| 4-6 | MEDIUM | Schedule for fix |
| 2-4 | LOW | Fix when convenient |
| 0-2 | INFO | Accept or note |

**Interactive Calculator:**
```bash
curl -X POST http://localhost:3001/api/demo/interactive/dread \
  -H "Content-Type: application/json" \
  -d '{
    "threatName": "NoSQL Injection",
    "ratings": {
      "damage": 4,
      "reproducibility": 3,
      "exploitability": 2,
      "affectedUsers": 4,
      "discoverability": 3
    }
  }' | jq .
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
