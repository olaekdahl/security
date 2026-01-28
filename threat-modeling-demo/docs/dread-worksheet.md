# DREAD Scoring Worksheet

Use this template to score threats consistently across your team.

---

## Threat Information

| Field | Value |
|-------|-------|
| **Threat Name** | |
| **Description** | |
| **STRIDE Category** | ☐ Spoofing ☐ Tampering ☐ Repudiation ☐ Info Disclosure ☐ DoS ☐ Elevation |
| **Affected Asset** | |
| **Identified By** | |
| **Date** | |

---

## DREAD Scoring

### Damage Potential (D)
*How bad would an attack be?*

| Score | Description |
|-------|-------------|
| 0-2 | Minimal/No impact |
| 3-4 | Individual user affected |
| 5-6 | Multiple users or moderate data breach |
| 7-8 | Significant financial/reputation damage |
| 9-10 | Complete system destruction |

**Your Rating:** ____ / 10

**Justification:**
```
[Explain why you chose this rating]
```

---

### Reproducibility (R)
*How easy is it to reproduce the attack?*

| Score | Description |
|-------|-------------|
| 0-2 | Very difficult, rare conditions |
| 3-4 | Requires specific circumstances |
| 5-6 | Reproducible with some effort |
| 7-8 | Easy to reproduce |
| 9-10 | Always reproducible |

**Your Rating:** ____ / 10

**Justification:**
```
[Explain why you chose this rating]
```

---

### Exploitability (E)
*How much work is required to exploit?*

| Score | Description |
|-------|-------------|
| 0-2 | Expert level, custom tools |
| 3-4 | Skilled attacker required |
| 5-6 | Moderate skills, public tools |
| 7-8 | Basic technical knowledge |
| 9-10 | No special skills needed |

**Your Rating:** ____ / 10

**Justification:**
```
[Explain why you chose this rating]
```

---

### Affected Users (A)
*How many users are impacted?*

| Score | Description |
|-------|-------------|
| 0-2 | None or single targeted user |
| 3-4 | Small group (<10%) |
| 5-6 | Moderate portion (10-50%) |
| 7-8 | Majority of users (50-90%) |
| 9-10 | All users |

**Your Rating:** ____ / 10

**Justification:**
```
[Explain why you chose this rating]
```

---

### Discoverability (D)
*How easy is it to discover the vulnerability?*

| Score | Description |
|-------|-------------|
| 0-2 | Requires source code review |
| 3-4 | Needs specialized tools |
| 5-6 | Standard security scanning |
| 7-8 | Easy to find manually |
| 9-10 | Publicly known or obvious |

**Your Rating:** ____ / 10

**Justification:**
```
[Explain why you chose this rating]
```

---

## Score Calculation

| Factor | Rating |
|--------|--------|
| Damage (D) | |
| Reproducibility (R) | |
| Exploitability (E) | |
| Affected Users (A) | |
| Discoverability (D) | |
| **Total** | |

**DREAD Score = Total ÷ 5 = ____**

---

## Risk Level

| Score | Level | Action |
|-------|-------|--------|
| 0.0 - 2.9 | ☐ LOW | Monitor, regular maintenance |
| 3.0 - 5.9 | ☐ MEDIUM | Fix within 30 days |
| 6.0 - 7.9 | ☐ HIGH | Fix within 7 days |
| 8.0 - 10.0 | ☐ CRITICAL | Immediate action required |

---

## Remediation Plan

| Field | Value |
|-------|-------|
| **Assigned To** | |
| **Due Date** | |
| **Priority** | ☐ P1 ☐ P2 ☐ P3 ☐ P4 |

### Recommended Mitigations

1. 
2. 
3. 

### Acceptance Criteria

- [ ] 
- [ ] 
- [ ] 

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Security Analyst | | | |
| Tech Lead | | | |
| Product Owner | | | |

---

## Notes

```
[Additional context, references, or discussion notes]
```
