# Threat Modeling Worked Examples

### STRIDE, DREAD, PASTA, and an OWASP Test Plan

These are illustrative teaching artifacts for Lesson 11. To keep them coherent, all four analyze the same application, "ShopFlow," and reuse the data flow from slide 11.6. In a real engagement the four would feed each other: STRIDE finds the threats, DREAD ranks them, PASTA wraps the whole effort in business context, and the OWASP test plan verifies the mitigations actually work.

---

## The example application: ShopFlow

ShopFlow is a MERN e-commerce application. Its components map directly to the slide 11.6 data flow diagram.

| Type | Element |
|------|---------|
| External entities | Customer (React SPA in the browser), Fulfillment partner |
| Processes | Process order, Collect payment, Ship products |
| Data stores | `Orders`, `Invoices`, `Users` (MongoDB collections) |
| Supporting services | Node/Express API, JWT authentication, third-party payment processor |

Trust boundaries (where data crosses from less trusted to more trusted):

1. Browser to API
2. API to MongoDB
3. API to payment processor
4. API to fulfillment partner

Key assets: customer PII, payment tokens, order and invoice records, the JWT signing secret, and the database credentials.

---

## 1. STRIDE report

**System:** ShopFlow web application
**Scope:** Order and payment flow (entry points and data stores from the slide 11.6 diagram)
**Method:** STRIDE per element. Each entry point and data flow is walked through all six categories with the prompt "what could go wrong here?"

| ID | STRIDE category | Element / entry point | Threat | Existing control | Recommended mitigation |
|----|-----------------|-----------------------|--------|------------------|------------------------|
| S1 | Spoofing | Login endpoint / JWT | Attacker forges or replays a JWT to impersonate another customer | JWT signed with HS256 | Short token lifetime, rotate the signing secret, validate signature server side, add refresh tokens |
| S2 | Spoofing | Fulfillment integration | Attacker poses as the fulfillment partner and posts fake shipping updates | Static API key in header | Mutual TLS, signed webhooks, source IP allowlist |
| T1 | Tampering | Order submission (browser to API) | Client edits the price or quantity field in the order payload | Client side validation only | Re-price server side from the catalog, never trust a client supplied price |
| T2 | Tampering | `Invoices` collection | Stored invoice totals altered through NoSQL injection | Role based DB account | Parameterized queries, input sanitization, least privilege DB user |
| R1 | Repudiation | Collect payment | Customer disputes a payment they authorized and no record proves intent | Payment processor receipt | Append only audit log of payment events with timestamp, user, and IP |
| R2 | Repudiation | Admin actions | An admin edits an order then denies doing so | None | Audit logging of all privileged actions |
| I1 | Information disclosure | `Users` API response | API returns the full user object, including the password hash and address | None | Field projection / DTOs, never return the password hash |
| I2 | Information disclosure | Transport | Order and billing data sent over HTTP | Partial HTTPS | Enforce HTTPS and HSTS everywhere, TLS 1.2 or higher |
| D1 | Denial of service | List orders endpoint | An unbounded query exhausts the Node event loop and the Mongo connection pool | None | Pagination, query limits, rate limiting, request size caps |
| D2 | Denial of service | Login endpoint | Credential stuffing floods the auth path | None | Rate limiting, backoff or lockout after repeated failures, CAPTCHA after N attempts |
| E1 | Elevation of privilege | Admin order endpoint | A normal user calls an admin only endpoint that is only hidden in the UI | UI hides the button | Server side role check on every privileged route |
| E2 | Elevation of privilege | JWT claims | User edits the `role` claim in the token payload | Signature check | Verify the signature server side, never trust decoded claims on their own |

**Summary:** 12 threats identified across all six categories (2 Spoofing, 2 Tampering, 2 Repudiation, 2 Information disclosure, 2 Denial of service, 2 Elevation of privilege). These feed the DREAD ranking below.

---

## 2. DREAD report

**Purpose:** Rank the STRIDE findings so remediation effort goes where it matters most.

**Scoring rubric:** Each factor is scored 1 (low) to 10 (high). The risk score is the average of the five factors.

| Factor | Question |
|--------|----------|
| Damage | How bad would a successful attack be? |
| Reproducibility | How reliably can the attack be repeated? |
| Exploitability | How much effort or skill does the attack take? |
| Affected users | How many users are impacted? |
| Discoverability | How easy is the threat to find? |

**Rating bands:** 0 to 3.9 Low, 4 to 6.4 Medium, 6.5 to 8.4 High, 8.5 to 10 Critical.

| Priority | ID | Threat | D | R | E | A | D | Score | Rating |
|----------|----|--------|---|---|---|---|---|-------|--------|
| 1 | E1 | Admin endpoint with no server side role check | 9 | 10 | 9 | 8 | 6 | 8.4 | High |
| 2 | T1 | Client tampers with order price | 7 | 9 | 8 | 5 | 7 | 7.2 | High |
| 3 | D1 | Unbounded query causes denial of service | 6 | 8 | 6 | 8 | 6 | 6.8 | High |
| 4 | I1 | API response leaks password hash and PII | 7 | 10 | 4 | 7 | 4 | 6.4 | Medium |
| 5 | S1 | JWT forged or replayed | 8 | 6 | 5 | 6 | 5 | 6.0 | Medium |
| 6 | D2 | Credential stuffing on login | 5 | 7 | 5 | 4 | 6 | 5.4 | Medium |
| 7 | I2 | Sensitive data sent over HTTP | 6 | 6 | 4 | 6 | 5 | 5.4 | Medium |
| 8 | R1 | Payment repudiation, no audit trail | 4 | 5 | 3 | 3 | 4 | 3.8 | Low |

**Reading the result:** E1 scores highest because it is trivial to exploit (change the URL), works every time, and exposes every customer's data. It goes to the top of the fix list. R1 is real but low impact and hard to exploit, so it is logged and scheduled rather than treated as a fire.

**Caveat to state in class:** DREAD scoring is subjective, and two analysts can score the same threat differently. Microsoft, which originated DREAD alongside STRIDE, later moved away from it for this reason. Many teams now rank with CVSS instead. The value of DREAD here is that it forces a relative ranking, which beats treating every finding as equally urgent.

---

## 3. PASTA report

**Process for Attack Simulation and Threat Analysis.** PASTA is a seven stage, risk centric methodology that starts from business objectives and ends with prioritized, business aligned countermeasures. Note that a STRIDE pass and a DREAD ranking like the ones above would live inside stages 4 and 7 of this process.

### Stage 1: Define business objectives
- Process online orders and payments reliably and securely.
- Protect customer PII and payment data (PCI-DSS and GDPR / CCPA obligations apply).
- Maintain availability during peak sales events.
- Risk appetite: low tolerance for payment data loss or extended downtime.

### Stage 2: Define the technical scope
- In scope: React SPA, Node/Express API, MongoDB, JWT authentication, the checkout integration with the third party payment processor, and the fulfillment API.
- Infrastructure: cloud hosting behind a load balancer and CDN.
- Out of scope: the payment processor's internal systems and the fulfillment partner's warehouse software.

### Stage 3: Application decomposition
- Reuse the slide 11.6 data flow diagram: entities, processes, data stores, and the four trust boundaries listed above.
- Actors and roles: anonymous visitor, authenticated customer, admin, and the service account the API uses to reach MongoDB.
- Assets: customer PII, payment tokens, order and invoice records, JWT signing secret, DB credentials.

### Stage 4: Threat analysis
- Relevant e-commerce threat intelligence: credential stuffing, card testing and payment fraud, client side script injection of the checkout page (Magecart style), and API abuse or scraping.
- Map each to likely actors: opportunistic fraudsters, automated bots, and motivated attackers targeting payment data.

### Stage 5: Vulnerability and weakness analysis
- Correlate the threats above with concrete weaknesses found in the STRIDE report: missing server side authorization (E1), client trusted pricing (T1), over broad API responses (I1), missing rate limiting (D1, D2), and unencrypted transport (I2).
- Cross reference OWASP Top 10 and CWE entries for each.

### Stage 6: Attack modeling
Attack tree for the goal "exfiltrate customer payment data."

```
GOAL: Exfiltrate customer payment data
├── Path A: Abuse missing authorization
│     └── Call admin order/export endpoint as a normal user (E1)
├── Path B: Inject malicious script into checkout
│     ├── Stored XSS via an unsanitized review field
│     └── Compromise a vulnerable front end dependency
├── Path C: Intercept data in transit
│     └── Capture traffic sent over HTTP (I2)
└── Path D: Compromise the data store directly
      └── NoSQL injection against the Invoices collection (T2)
```

### Stage 7: Risk and impact analysis
- Combine likelihood (from stages 4 and 5) with business impact (from stage 1) to prioritize. Path A and Path B carry the highest combined risk: both are realistic and both expose payment data directly.
- Recommended countermeasures, tied back to business objectives: enforce server side authorization, add Content Security Policy and dependency scanning to defend the checkout, enforce HTTPS everywhere, and parameterize all database access.
- Document residual risk and the accepted risk owner for anything not remediated.

---

## 4. OWASP test plan

**System under test:** ShopFlow
**References:** OWASP Testing Framework (test activities across the lifecycle) and the OWASP Top 10 (2021) as the coverage checklist.

### Section A: Testing across the development lifecycle

| Lifecycle phase | Test activity |
|-----------------|---------------|
| Before development | Review security policy and standards, confirm a threat model exists |
| During design | Review the architecture and data flow against security requirements |
| During development | Static analysis (SAST) and secure code review |
| During deployment | Dynamic analysis (DAST), configuration review, penetration test |
| Maintenance and operations | Regression testing, dependency monitoring, periodic retest |

### Section B: Test cases mapped to the OWASP Top 10

| Test ID | OWASP category | Objective | Method / tool | Expected result |
|---------|----------------|-----------|---------------|-----------------|
| OT-01 | A01 Broken access control | Access the admin order endpoint as a normal user; attempt IDOR on `/orders/:id` | Manual, Burp Suite or OWASP ZAP | Both return 403, no cross user data |
| OT-02 | A02 Cryptographic failures | Verify TLS config and that no sensitive data travels over HTTP; confirm passwords use bcrypt | testssl.sh, manual | TLS 1.2+, HSTS set, strong hashing |
| OT-03 | A03 Injection | NoSQL injection on login and search; stored XSS on product reviews | OWASP ZAP, manual payloads | Input rejected or sanitized |
| OT-04 | A04 Insecure design | Confirm threat model coverage and rate limiting on auth | Design review | Controls present by design |
| OT-05 | A05 Security misconfiguration | Check security headers, default credentials, and verbose error pages | securityheaders.com, manual | helmet.js headers present, no stack traces |
| OT-06 | A06 Vulnerable and outdated components | Scan dependencies for known CVEs | npm audit, Snyk | No high or critical findings |
| OT-07 | A07 Identification and authentication failures | Brute force the login, test password policy and JWT validation | Burp Intruder, manual | Lockout or backoff triggers, weak tokens rejected |
| OT-08 | A08 Software and data integrity failures | Verify CI/CD integrity and check for insecure deserialization | Pipeline review, manual | Build artifacts verified, no unsafe deserialization |
| OT-09 | A09 Security logging and monitoring failures | Confirm auth and payment events are logged and alertable | Log review | Events logged with user, time, IP |
| OT-10 | A10 Server side request forgery | Test any URL fetching feature (webhook config, image import) | Manual, OWASP ZAP | Requests restricted to an allowlist |

### Section C: Tools, roles, and sign-off
- Tools: OWASP ZAP or Burp Suite (DAST), npm audit or Snyk (dependency scanning), ESLint security rules or SonarQube (SAST), manual review for design and access control.
- Roles: developer runs SAST and dependency scans in the pipeline; security tester runs DAST and the penetration test; product owner accepts residual risk.
- Sign-off: testing is complete when every Top 10 test case has a recorded result and all high and critical findings are remediated or formally accepted.

---

*These artifacts are illustrative examples created for instructional use. Scores, findings, and controls are representative, not the result of an actual assessment.*