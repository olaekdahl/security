# DREAD Risk Scoring Guide

## Overview

DREAD is a risk assessment model developed by Microsoft for evaluating security threats. It provides a quantitative approach to prioritizing vulnerabilities based on five factors.

## The DREAD Acronym

| Factor | Question | Protects |
|--------|----------|----------|
| **D**amage | How bad would an attack be? | Business Impact |
| **R**eproducibility | How easy is it to reproduce? | Consistency |
| **E**xploitability | How much work to launch the attack? | Effort Required |
| **A**ffected Users | How many people impacted? | Scope |
| **D**iscoverability | How easy to discover the threat? | Visibility |

## Scoring Scale (0-10)

Each factor is rated from 0 (lowest risk) to 10 (highest risk).

### Damage Potential

| Score | Description | Example |
|-------|-------------|---------|
| 0 | Nothing | No impact |
| 1-2 | Minimal impact | Minor UI glitch |
| 3-4 | Individual user data affected | Single user's preferences leaked |
| 5-6 | Moderate data breach | Some PII exposed |
| 7-8 | Significant breach | Financial data, credentials exposed |
| 9-10 | Complete system compromise | Full database dump, ransomware |

### Reproducibility

| Score | Description | Example |
|-------|-------------|---------|
| 0 | Essentially impossible | Requires solar flare + full moon |
| 1-2 | Very difficult | Needs rare race condition |
| 3-4 | Difficult | Specific timing required |
| 5-6 | Moderate | Requires some skill |
| 7-8 | Easy | Basic technical knowledge |
| 9-10 | Trivial | Always works, one click |

### Exploitability

| Score | Description | Example |
|-------|-------------|---------|
| 0 | Requires custom hardware | Nation-state level |
| 1-2 | Advanced skills + custom tools | Expert security researcher |
| 3-4 | Skilled attacker | Professional pentester |
| 5-6 | Moderate skills | Using Metasploit |
| 7-8 | Beginner skills | Running scripts |
| 9-10 | No tools needed | Browser URL manipulation |

### Affected Users

| Score | Description | Example |
|-------|-------------|---------|
| 0 | None | No users affected |
| 1-2 | Single user | Targeted attack only |
| 3-4 | Small group (<10%) | Specific user segment |
| 5-6 | Moderate (10-25%) | Regional users |
| 7-8 | Majority (50-75%) | Most active users |
| 9-10 | All users (100%) | Every account compromised |

### Discoverability

| Score | Description | Example |
|-------|-------------|---------|
| 0 | Requires source code access | Deep code review only |
| 1-2 | Very hard | Extensive reverse engineering |
| 3-4 | Hard | Specialized security tools |
| 5-6 | Moderate | Standard vulnerability scanning |
| 7-8 | Easy | Manual testing finds it |
| 9-10 | Obvious/Public | CVE published, in documentation |

> **Note:** Some practitioners always set Discoverability to 10, assuming attackers will eventually find any vulnerability.

## Calculating the Score

```
DREAD Score = (D + R + E + A + D) / 5
```

The result is a value between 0 and 10.

## Risk Levels

| Score Range | Risk Level | Action Required |
|-------------|------------|-----------------|
| 0.0 - 2.9 | LOW | Monitor, fix in regular cycle |
| 3.0 - 5.9 | MEDIUM | Plan remediation within 30 days |
| 6.0 - 7.9 | HIGH | Prioritize fix within 7 days |
| 8.0 - 10.0 | CRITICAL | Immediate action (24-48 hours) |

---

## Real-World Examples

### Example 1: SQL Injection in Login Form

**Scenario:** User login form vulnerable to SQL injection, allowing authentication bypass.

| Factor | Rating | Justification |
|--------|--------|---------------|
| Damage | 9 | Full database access, credential theft |
| Reproducibility | 9 | Works every time with correct payload |
| Exploitability | 7 | Common attack, tools available (sqlmap) |
| Affected Users | 10 | All users' data at risk |
| Discoverability | 8 | Found with basic security scanning |

**Score:** (9 + 9 + 7 + 10 + 8) / 5 = **8.6 (CRITICAL)**

**Recommendation:** Immediate remediation. Implement parameterized queries.

---

### Example 2: Cross-Site Scripting (XSS) in Comments

**Scenario:** Stored XSS in user comments section.

| Factor | Rating | Justification |
|--------|--------|---------------|
| Damage | 6 | Session hijacking, defacement |
| Reproducibility | 8 | Easy to replicate once found |
| Exploitability | 6 | Requires crafting malicious script |
| Affected Users | 7 | Any user viewing the comment |
| Discoverability | 7 | Found by inputting script tags |

**Score:** (6 + 8 + 6 + 7 + 7) / 5 = **6.8 (HIGH)**

**Recommendation:** Fix within 7 days. Implement output encoding and CSP.

---

### Example 3: Insecure Direct Object Reference (IDOR)

**Scenario:** Changing order ID in URL reveals other users' orders.

| Factor | Rating | Justification |
|--------|--------|---------------|
| Damage | 5 | PII exposure (names, addresses) |
| Reproducibility | 10 | Just change the number in URL |
| Exploitability | 10 | No tools needed, just browser |
| Affected Users | 6 | Individual users targeted |
| Discoverability | 8 | Obvious to anyone curious |

**Score:** (5 + 10 + 10 + 6 + 8) / 5 = **7.8 (HIGH)**

**Recommendation:** Implement authorization checks on all resource access.

---

### Example 4: Missing Rate Limiting on Password Reset

**Scenario:** No rate limit on password reset endpoint allows brute forcing.

| Factor | Rating | Justification |
|--------|--------|---------------|
| Damage | 7 | Account takeover possible |
| Reproducibility | 8 | Automated tools work reliably |
| Exploitability | 5 | Requires automation scripts |
| Affected Users | 4 | Targeted attack on specific users |
| Discoverability | 6 | Found by testing endpoint limits |

**Score:** (7 + 8 + 5 + 4 + 6) / 5 = **6.0 (HIGH)**

**Recommendation:** Implement rate limiting, CAPTCHA, and account lockout.

---

### Example 5: Verbose Error Messages

**Scenario:** Application displays stack traces with internal paths and versions.

| Factor | Rating | Justification |
|--------|--------|---------------|
| Damage | 3 | Information disclosure only |
| Reproducibility | 10 | Trigger any error |
| Exploitability | 9 | Just cause an error condition |
| Affected Users | 2 | Helps attacker, not direct user impact |
| Discoverability | 10 | Obvious in normal usage |

**Score:** (3 + 10 + 9 + 2 + 10) / 5 = **6.8 (HIGH)**

**Recommendation:** Implement generic error pages, log details server-side only.

---

### Example 6: Weak Session Token Generation

**Scenario:** Session tokens are sequential integers.

| Factor | Rating | Justification |
|--------|--------|---------------|
| Damage | 8 | Full session hijacking |
| Reproducibility | 9 | Predictable pattern |
| Exploitability | 7 | Simple script to enumerate |
| Affected Users | 8 | Many concurrent sessions at risk |
| Discoverability | 5 | Requires analysis of tokens |

**Score:** (8 + 9 + 7 + 8 + 5) / 5 = **7.4 (HIGH)**

**Recommendation:** Use cryptographically secure random session tokens.

---

### Example 7: Outdated TLS Configuration

**Scenario:** Server supports TLS 1.0 and weak cipher suites.

| Factor | Rating | Justification |
|--------|--------|---------------|
| Damage | 6 | Man-in-the-middle possible |
| Reproducibility | 4 | Requires network position |
| Exploitability | 4 | Needs specialized tools |
| Affected Users | 5 | Users on compromised networks |
| Discoverability | 9 | SSL Labs scan shows it |

**Score:** (6 + 4 + 4 + 5 + 9) / 5 = **5.6 (MEDIUM)**

**Recommendation:** Disable TLS 1.0/1.1, use only strong cipher suites.

---

### Example 8: Missing CSRF Protection

**Scenario:** State-changing POST requests lack CSRF tokens.

| Factor | Rating | Justification |
|--------|--------|---------------|
| Damage | 6 | Unauthorized actions on behalf of user |
| Reproducibility | 7 | Reliable with crafted page |
| Exploitability | 5 | Requires social engineering |
| Affected Users | 5 | Users who click malicious links |
| Discoverability | 6 | Check forms for hidden tokens |

**Score:** (6 + 7 + 5 + 5 + 6) / 5 = **5.8 (MEDIUM)**

**Recommendation:** Implement CSRF tokens on all state-changing requests.

---

## Comparison Chart

| Vulnerability | D | R | E | A | D | Score | Level |
|---------------|---|---|---|---|---|-------|-------|
| SQL Injection | 9 | 9 | 7 | 10 | 8 | 8.6 | CRITICAL |
| Stored XSS | 6 | 8 | 6 | 7 | 7 | 6.8 | HIGH |
| IDOR | 5 | 10 | 10 | 6 | 8 | 7.8 | HIGH |
| Missing Rate Limit | 7 | 8 | 5 | 4 | 6 | 6.0 | HIGH |
| Verbose Errors | 3 | 10 | 9 | 2 | 10 | 6.8 | HIGH |
| Weak Sessions | 8 | 9 | 7 | 8 | 5 | 7.4 | HIGH |
| Weak TLS | 6 | 4 | 4 | 5 | 9 | 5.6 | MEDIUM |
| Missing CSRF | 6 | 7 | 5 | 5 | 6 | 5.8 | MEDIUM |

---

## Best Practices

1. **Be Consistent** - Use the same criteria across your organization
2. **Involve Stakeholders** - Get input from developers, ops, and business
3. **Document Assumptions** - Record why each rating was chosen
4. **Review Periodically** - Threat landscape changes over time
5. **Consider Context** - A vulnerability in a demo app differs from production
6. **Don't Over-Engineer** - DREAD is meant to be quick; use CVSS for deeper analysis

## Limitations of DREAD

- **Subjectivity** - Different analysts may rate differently
- **Discoverability Debate** - Assumes attackers eventually find everything
- **No Business Context** - Doesn't account for regulatory or compliance impact
- **Static Snapshot** - Doesn't adapt to changing threat landscape

Consider combining DREAD with:
- **CVSS** for standardized vulnerability scoring
- **FAIR** for quantitative financial risk analysis
- **Business Impact Analysis** for organizational context

## References

- [Microsoft STRIDE and DREAD](https://docs.microsoft.com/en-us/azure/security/develop/threat-modeling-tool)
- [OWASP Risk Rating Methodology](https://owasp.org/www-community/OWASP_Risk_Rating_Methodology)
- [CVSS v3.1 Specification](https://www.first.org/cvss/specification-document)
