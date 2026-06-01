# OWASP Test Plan (Template) - Web App + API (React + Node)

Goal: Turn threat modeling outputs (STRIDE + DREAD + PASTA) into a concrete security test plan.
Use this plan across the SDLC: before development, during design, development, deployment, and operations.

Reference: OWASP testing activities should occur before development, during definition/design, during development, during deployment, and during maintenance/operations.

---

## 1) Scope
- Application:
- Environments:
- In-scope endpoints (API inventory):
- Authentication mechanisms:
- Roles (user/admin/service):

## 2) Mapping to Threat Model
- Link to DFD: dfd-level1.puml
- Link to STRIDE table: stride-table.md
- Link to risk register: risk-register.csv
- Highest-risk items (DREAD avg >= 7.0): list ThreatIDs

## 3) OWASP Top 10 (2021) Coverage Checklist
For each category, list relevant app areas + test cases + tooling.

### A01: Broken Access Control
- Test cases:
  - Object-level authorization (IDOR/BOLA): change IDs; ensure 403/404
  - Function-level authorization: access /admin as non-admin
  - Mass assignment: attempt to set role=admin in payload
- Tools: automated API tests, DAST, manual proxy testing

### A02: Cryptographic Failures
- Test cases:
  - Enforce TLS; HSTS; no mixed content
  - Validate encryption at rest for DB and S3
  - Secrets not in source code
- Tools: TLS scanners, config checks, secret scanning

### A03: Injection
- Test cases:
  - SQL/NoSQL injection on all inputs (query params, JSON bodies)
  - Command injection for any shell/child_process usage
- Tools: SAST, DAST, unit tests with malicious inputs

### A04: Insecure Design
- Test cases:
  - Verify key abuse cases are mitigated (from PASTA scenarios)
  - Confirm secure defaults and deny-by-default authz
- Tools: design review checklist, threat model review

### A05: Security Misconfiguration
- Test cases:
  - CORS policy correctness
  - CSP/headers correctness
  - AWS: S3 public access blocked; least privilege IAM; SGs
- Tools: IaC scanning, AWS Config, securityheaders.com-like checks

### A06: Vulnerable and Outdated Components
- Test cases:
  - Dependency scanning in CI; fail on critical/high
  - SBOM generation (optional)
- Tools: npm audit, Snyk, osv-scanner

### A07: Identification and Authentication Failures
- Test cases:
  - Password policy, lockout/rate limiting, MFA for admins
  - Session management: cookie flags, rotation, logout, CSRF strategy
  - JWT validation: exp, aud, iss; signature; algorithm restrictions
- Tools: unit tests, DAST auth tests, manual testing

### A08: Software and Data Integrity Failures
- Test cases:
  - Verify CI supply chain protections (pinned deps, signatures)
  - Validate webhook/event signature verification
- Tools: SCA, artifact signing, code review

### A09: Security Logging and Monitoring Failures
- Test cases:
  - Ensure audit events for logins, privilege changes, exports
  - Ensure alerts for anomalous behavior
- Tools: log queries, SIEM rules, synthetic attack drills

### A10: Server-Side Request Forgery (SSRF)
- Test cases:
  - Any feature that fetches URLs (webhooks, importers, thumbnailers)
  - Block access to internal IPs/metadata endpoints
- Tools: manual testing, unit tests for URL allowlists

## 4) API-specific tests (recommended)
- Rate limiting / throttling
- Schema validation (reject extra fields)
- Error handling (no stack traces, no sensitive data)
- Pagination limits / resource exhaustion

## 5) Execution Plan
- Automated (CI):
  - SAST:
  - SCA:
  - Unit/integration security tests:
- Pre-release:
  - DAST:
  - Manual proxy testing:
- Production:
  - Monitoring + alerting:
  - Periodic re-test cadence:

## 6) Evidence
For each test, store:
- Tool output artifacts (reports)
- Links to CI runs
- Tickets for findings
- Retest proof after fixes
