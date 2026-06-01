# STRIDE Threat Table (Template)

Use this table after you create your DFD (data flow diagram) and have identified:
- Assets (what you care about)
- Entry points (where attackers interact)
- Trust boundaries (where trust changes)
- Key data flows (where sensitive data moves)

Reference: STRIDE maps threats to desired security properties:
- Spoofing -> Authenticity
- Tampering -> Integrity
- Repudiation -> Non-repudiation
- Information disclosure -> Confidentiality
- Denial of service -> Availability
- Elevation of privilege -> Authorization

## How to use
1) Pick a DFD element or data flow (one row).
2) Brainstorm threats using STRIDE headings.
3) Capture impact, mitigations, and evidence/tests.
4) Assign an owner and track in the risk register.

---

## STRIDE by Component / Flow

| ID | DFD Element / Flow | Asset(s) at Risk | S | T | R | I | D | E | Notes / Example Threat Statement | Suggested Mitigations | Evidence / Tests |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TM-001 | Browser -> API (POST /login) | Accounts, sessions | Yes |  |  | Yes | Yes |  | Attacker attempts credential stuffing; token theft via insecure storage | Rate limit, MFA for risky logins, secure cookies, short-lived tokens, anomaly detection | OWASP auth testing; unit/integration tests; WAF rule; logs |
| TM-002 | Browser -> API (GET /api/orders) | Order history |  | Yes |  | Yes |  | Yes | IDOR/BOLA: user changes orderId to view others' orders | Server-side authz checks (object-level), RBAC/ABAC, deny-by-default | API tests for object-level auth; negative tests |
| TM-003 | API -> DB (Read/Write) | PII, integrity |  | Yes |  | Yes |  |  | SQL injection or unsafe query construction | Param queries/ORM, input validation, least privilege DB role | SAST; unit tests; DB role review |
| TM-004 | API -> S3 (Put/Get) | Files, PII |  | Yes |  | Yes |  | Yes | Public bucket / overbroad IAM; attacker reads or overwrites objects | Block public access, IAM least privilege, SSE, pre-signed URLs w/ short TTL | IaC policy checks; AWS Config; access logs |
| TM-005 | API -> Email Provider | Notifications |  |  | Yes | Yes |  |  | Email spoofing; repudiation without audit | DKIM/SPF/DMARC, signed events, audit logs | Email auth tests; logging verification |

Legend: put "Yes" if applicable, and include threat statement + mitigations.

---

## STRIDE prompts (quick)
- Spoofing: Can someone pretend to be a user/service/admin?
- Tampering: Can someone change data in transit or at rest?
- Repudiation: Can someone deny an action due to missing logs?
- Information disclosure: Can data leak (PII, secrets, internal info)?
- Denial of service: Can the system be made unavailable or expensive?
- Elevation of privilege: Can a low-priv user become high-priv?
