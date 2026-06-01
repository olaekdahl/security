# Review Notes: What changed in v2

This version supersedes the original zip for teaching.

## Why update

1. The original README was useful, but the code comments were sparse for students reading along.
2. The original auth service let the caller request a role at login time. That is convenient for demos, but it can accidentally teach an insecure authorization pattern.
3. The original mTLS section did not create reliable service-to-service traffic, so Linkerd `edges` output could be empty in a live class.
4. Linkerd's current getting-started flow installs CRDs before the control plane; the scripts now do that.
5. The NetworkPolicy segment was replaced by Linkerd AuthorizationPolicy for the main micro-segmentation demo. This keeps the demo focused on mTLS-backed workload identity and avoids CNI-specific NetworkPolicy surprises in kind.

## What improved

- More comments in Python and YAML.
- Dedicated instructor script.
- Course mapping file.
- WSL troubleshooting file.
- In-cluster demo clients for visible mTLS traffic.
- Mesh authorization showing allowed vs blocked service accounts.
- JWT role/scopes are assigned by the auth service rather than chosen by the client.
- PyJWT replaces python-jose to match current FastAPI documentation.
