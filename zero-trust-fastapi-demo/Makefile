SHELL := /usr/bin/env bash

.PHONY: check tools cluster deploy port-forward app-demo linkerd mesh mesh-traffic mesh-authz clean

check:
	bash scripts/00_check_prereqs.sh

tools:
	bash scripts/01_install_tools_wsl.sh

cluster:
	bash scripts/02_create_cluster.sh

deploy:
	bash scripts/03_build_load_deploy.sh

port-forward:
	bash scripts/04_port_forward.sh

app-demo:
	bash scripts/05_run_app_demo.sh

linkerd:
	bash scripts/06_install_linkerd.sh

mesh:
	bash scripts/07_mesh_workloads.sh

mesh-traffic:
	bash scripts/08_generate_mesh_traffic.sh

mesh-authz:
	bash scripts/09_apply_linkerd_authorization.sh

clean:
	bash scripts/cleanup.sh
