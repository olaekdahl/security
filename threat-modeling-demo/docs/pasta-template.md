# PASTA Threat Modeling Template (7 Stages)

Purpose: Use PASTA to connect business objectives, attacker behavior, technical threats, vulnerabilities, and mitigations.
Audience: Security architects, developers, product owners.

---

## Stage 1: Define Business Objectives
- Application name:
- Business owner / stakeholders:
- Primary business goals:
- What would be catastrophic to the business? (fraud, data breach, downtime, regulatory penalties)
- Risk appetite (high/medium/low tolerance):

## Stage 2: Define Technical Scope
- System boundaries (in scope / out of scope):
- Environments (dev/test/prod):
- Tech stack (React, Node, AWS services):
- Dependencies (3rd party services, libraries, SDKs):
- Data classification (public/internal/confidential/restricted):

## Stage 3: Application Decomposition
- Architecture summary:
- DFD(s) attached:
- Trust boundaries:
- Assets:
- Entry points:
- Privileged operations (admin, money movement, exports, role changes):
- Assumptions:

## Stage 4: Threat Analysis (Attacker Perspective)
- Threat agents (who):
- Motivations (why):
- Capabilities (what skill/resources):
- STRIDE brainstorming summary (link to stride-table.md):
- Abuse cases / misuse cases:

## Stage 5: Vulnerability Analysis (Evidence-Based)
- SAST results:
- DAST results:
- Dependency/SCA results:
- Cloud configuration review (IAM/S3/security groups):
- Pen-test findings (if any):
- Gaps vs OWASP Top 10 / API Top 10:

## Stage 6: Attack Modeling (Scenarios)
For each top threat, write 1–3 scenarios.

### Scenario template
- Scenario ID:
- Goal:
- Preconditions:
- Steps (1..N):
- What would stop it today? (controls)
- What logs/telemetry would show it?
- Business impact:
- Likelihood:
- Risk rating (reference risk-register.csv):

## Stage 7: Risk and Mitigation Plan
- Prioritized mitigation backlog (top 10):
- Owners + target dates:
- Validation plan (tests, monitoring, alerts):
- Residual risk (what remains, why acceptable):
- Sign-off (security + product):

---

## Deliverables Checklist
- DFD in PlantUML (dfd-level1.puml)
- STRIDE threat table (stride-table.md)
- Risk register with DREAD scoring (risk-register.csv)
- OWASP test plan (owasp-test-plan.md)
- PASTA narrative (this file)
