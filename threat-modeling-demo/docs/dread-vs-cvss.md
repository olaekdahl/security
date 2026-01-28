# DREAD vs CVSS Comparison

A side-by-side comparison of two popular vulnerability scoring methodologies.

## Quick Overview

| Aspect | DREAD | CVSS v3.1 |
|--------|-------|-----------|
| **Origin** | Microsoft (~1999) | FIRST (2005, v3.1 in 2019) |
| **Scale** | 0-10 (simple average) | 0-10 (weighted formula) |
| **Complexity** | Simple, 5 factors | Complex, 8+ metrics |
| **Time to Score** | 2-5 minutes | 5-15 minutes |
| **Standardization** | Informal | Industry standard |
| **Best For** | Rapid triage, internal | CVEs, vendor advisories |

---

## Factor Comparison

### DREAD Factors → CVSS Equivalents

| DREAD | Maps To (CVSS) | Notes |
|-------|----------------|-------|
| **Damage** | Impact metrics (C, I, A) | CVSS splits into Confidentiality, Integrity, Availability |
| **Reproducibility** | Attack Complexity (AC) | Inverse relationship |
| **Exploitability** | Attack Vector (AV) + Privileges Required (PR) | CVSS is more granular |
| **Affected Users** | Scope (S) | CVSS has binary scope change |
| **Discoverability** | No direct equivalent | CVSS assumes public knowledge |

---

## Scoring Example: SQL Injection

### DREAD Scoring

| Factor | Score | Rationale |
|--------|-------|-----------|
| Damage | 9 | Full database access |
| Reproducibility | 9 | Works reliably |
| Exploitability | 7 | Tools available |
| Affected Users | 10 | All users at risk |
| Discoverability | 8 | Found with scanning |

**DREAD Score: 8.6 (CRITICAL)**

### CVSS v3.1 Scoring

| Metric | Value | Rationale |
|--------|-------|-----------|
| Attack Vector (AV) | Network (N) | Remote attack |
| Attack Complexity (AC) | Low (L) | No special conditions |
| Privileges Required (PR) | None (N) | No auth needed |
| User Interaction (UI) | None (N) | No user action needed |
| Scope (S) | Changed (C) | Affects beyond component |
| Confidentiality (C) | High (H) | Full data access |
| Integrity (I) | High (H) | Can modify data |
| Availability (A) | High (H) | Can drop tables |

**CVSS v3.1 Vector:** `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H`
**CVSS Score: 10.0 (CRITICAL)**

---

## When to Use Each

### Use DREAD When:

- ✅ Rapid threat modeling sessions
- ✅ Internal risk prioritization
- ✅ Design phase security review
- ✅ Training new security engineers
- ✅ Quick business risk communication
- ✅ Agile sprint planning

### Use CVSS When:

- ✅ Publishing CVE advisories
- ✅ Vendor security bulletins
- ✅ Compliance requirements (PCI-DSS, etc.)
- ✅ SLAs for vulnerability remediation
- ✅ Cross-organization comparison
- ✅ Automated vulnerability management

---

## Combining Both

Many organizations use both:

```
┌─────────────────────────────────────────────────────────┐
│                    Threat Discovered                     │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│              Quick DREAD Score (2 min)                   │
│                                                         │
│  "Is this urgent? Should we stop the release?"          │
└─────────────────────────────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
              ▼                           ▼
    ┌─────────────────┐         ┌─────────────────┐
    │  DREAD < 6.0    │         │  DREAD ≥ 6.0    │
    │  (Low/Medium)   │         │  (High/Critical)│
    └─────────────────┘         └─────────────────┘
              │                           │
              ▼                           ▼
    ┌─────────────────┐         ┌─────────────────┐
    │ Add to backlog  │         │ Immediate triage│
    │ Regular CVSS    │         │ Full CVSS score │
    │ scoring later   │         │ Incident process│
    └─────────────────┘         └─────────────────┘
```

---

## Pros and Cons

### DREAD

| Pros | Cons |
|------|------|
| Fast to calculate | Subjective ratings |
| Easy to understand | Not standardized |
| Good for communication | Discoverability debate |
| Flexible | Less granular |

### CVSS

| Pros | Cons |
|------|------|
| Industry standard | Complex to calculate |
| Consistent across orgs | Requires training |
| Environmental metrics | Can be gamed |
| Temporal scoring | Overhead for internal use |

---

## Conversion Approximation

While not exact, you can roughly convert:

| DREAD | ≈ CVSS | Risk Level |
|-------|--------|------------|
| 0-2.9 | 0-3.9 | Low |
| 3.0-5.9 | 4.0-6.9 | Medium |
| 6.0-7.9 | 7.0-8.9 | High |
| 8.0-10.0 | 9.0-10.0 | Critical |

> ⚠️ **Warning:** This is an approximation only. Always score using the proper methodology for your use case.

---

## References

- [CVSS v3.1 Calculator](https://www.first.org/cvss/calculator/3.1)
- [CVSS Specification](https://www.first.org/cvss/v3.1/specification-document)
- [Microsoft Threat Modeling](https://docs.microsoft.com/en-us/azure/security/develop/threat-modeling-tool)
- [OWASP Risk Rating](https://owasp.org/www-community/OWASP_Risk_Rating_Methodology)
