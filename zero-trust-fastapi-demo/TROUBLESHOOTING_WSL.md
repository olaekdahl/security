# WSL Troubleshooting

## Docker is not available in WSL

In Docker Desktop on Windows:

1. Settings → General → enable **Use the WSL 2 based engine**.
2. Settings → Resources → WSL Integration → enable your distro.

Then restart WSL:

```powershell
wsl --shutdown
```

Open WSL again and test:

```bash
docker ps
```

## Port-forward works in WSL but not Windows browser

Usually Windows can reach WSL `localhost`, but corporate VPNs and endpoint controls can interfere. For live demos, use the WSL terminal as the source of truth.

## Linkerd command not found

```bash
source ~/.bashrc
export PATH=$HOME/.linkerd2/bin:$PATH
linkerd version
```

## Linkerd check fails before install

Run:

```bash
kubectl cluster-info
kubectl get nodes
linkerd check --pre
```

Fix the first failing check before continuing.

## Mesh traffic output is empty

Generate traffic first:

```bash
make mesh-traffic
```

Then run:

```bash
linkerd viz -n zt-demo stat deploy
linkerd viz -n zt-demo edges deployment
```

## Bad client is not blocked after applying policy

Confirm all workloads have a Linkerd sidecar:

```bash
kubectl -n zt-demo get pods -o wide
kubectl -n zt-demo get pods -o jsonpath='{range .items[*]}{.metadata.name}{" containers="}{.spec.containers[*].name}{"\n"}{end}'
```

You should see `linkerd-proxy` in the container list. If not:

```bash
make mesh
make mesh-authz
```
