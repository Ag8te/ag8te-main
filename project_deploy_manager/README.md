# Project Deploy Manager

Scripts for remotely managing, monitoring, and troubleshooting the project in production or production-adjacent environments.

## Table of contents

- [Local environment setup](#local-environment-setup)
  - [1. Python](#1-python)
  - [2. Virtual environment (recommended)](#2-virtual-environment-recommended)
  - [3. Install dependencies](#3-install-dependencies)
- [Connection test script](#connection-test-script)
  - [Arguments and options](#arguments-and-options)
  - [Implementation examples](#implementation-examples)
  - [Use as a module](#use-as-a-module)
- [Docker check script](#docker-check-script)
- [Install Docker script](#install-docker-script)
- [Logging and troubleshooting](#logging-and-troubleshooting)
- [Shared module and additional scripts](#shared-module-and-additional-scripts)
  - [Disk](#disk)
  - [Host](#host)
  - [Directories](#directories)
  - [Env file](#env-file)
  - [Docker (additional)](#docker-additional)
  - [Docker Compose](#docker-compose)
  - [Nginx](#nginx)
  - [DNS](#dns)
  - [Git](#git)
- [Use as a module (all scripts)](#use-as-a-module-all-scripts)
- [Examples by script](#examples-by-script)
- [VS Code launch.json examples](#vs-code-launchjson-examples)
- [common.py (shared module)](#commonpy-shared-module)

---

## Scripts overview

| Script | Type | Purpose |
|--------|------|--------|
| **connection_test.py** | Remote | Test SSH connectivity; print `true`/`false`. |
| **check_docker.py** | Remote | Check if Docker is installed on remote host. |
| **install_docker.py** | Remote | Install Docker on remote host (get.docker.com or RHEL repo). |
| **check_disk_space_local.py** | Local | Report disk usage (`df -h`); optional threshold. |
| **check_disk_space_remote.py** | Remote | Same on remote host. |
| **check_disk_memory_local.py** | Local | Report memory usage (`free -h`); optional threshold. |
| **check_disk_memory_remote.py** | Remote | Same on remote host. |
| **restart_host_local.py** | Local | Reboot local machine. |
| **restart_host_remote.py** | Remote | Reboot remote host. |
| **create_dir_local.py** | Local | Create directory (mkdir -p). |
| **create_dir_remote.py** | Remote | Create directory on remote host. |
| **delete_dir_local.py** | Local | Remove directory (rmdir or rm -rf with -r). |
| **delete_dir_remote.py** | Remote | Remove directory on remote host. |
| **list_dir_local.py** | Local | List directory contents (ls); optional -l, -a, -R. |
| **list_dir_remote.py** | Remote | List directory contents on remote host. |
| **copy_env_local.py** | Local | Copy env file to a specified local directory. |
| **copy_env_remote.py** | Remote | Copy local env file to a directory on remote host. |
| **docker_prune_containers_local.py** | Local | Remove stopped Docker containers. |
| **docker_prune_containers_remote.py** | Remote | Same on remote host. |
| **docker_list_volumes_local.py** | Local | List Docker volumes. |
| **docker_list_volumes_remote.py** | Remote | Same on remote host. |
| **docker_delete_volume_local.py** | Local | Remove a Docker volume by name. |
| **docker_delete_volume_remote.py** | Remote | Same on remote host. |
| **docker_list_all_images_local.py** | Local | List Docker images (repo, tag, id, size); optional `-a`. |
| **docker_list_all_images_remote.py** | Remote | Same on remote host. |
| **docker_scp_image_to_remote.py** | Remote | Save image locally, copy to remote via SFTP, load on remote. |
| **docker_run_image_remote.py** | Remote | Run a container from an image on the remote host. |
| **docker_compose_check_installation_local.py** | Local | Check if Docker Compose is available; print true/false. |
| **docker_compose_check_installation_remote.py** | Remote | Same on remote host. |
| **docker_compose_install_local.py** | Local | Install Docker Compose (plugin or standalone). |
| **docker_compose_install_remote.py** | Remote | Install Docker Compose on remote host. |
| **docker_compose_up_local.py** | Local | Run `docker compose up -d` in project dir. |
| **docker_compose_up_remote.py** | Remote | Same on remote host. |
| **docker_compose_up_build_local.py** | Local | Run `docker compose up -d --build` locally. |
| **docker_compose_up_build_remote.py** | Remote | Same on remote host. |
| **docker_compose_up_build_with_replicas_local.py** | Local | `docker compose up -d --build` with scale (service + count). |
| **docker_compose_up_build_with_replicas_remote.py** | Remote | Same on remote host. |
| **docker_compose_down_local.py** | Local | Run `docker compose down` in project dir. |
| **docker_compose_down_remote.py** | Remote | Same on remote host. |
| **docker_compose_logs_follow_stream_local.py** | Local | Stream `docker compose logs -f` (optional service); Ctrl+C to stop. |
| **docker_compose_logs_follow_stream_remote.py** | Remote | Stream remote compose logs to local stdout. |
| **docker_compose_ps_local.py** | Local | Run `docker compose ps`; print service status. |
| **docker_compose_ps_remote.py** | Remote | Same on remote host. |
| **docker_compose_list_containers_local.py** | Local | List all containers as table (ID, service, ports, etc.). |
| **docker_compose_list_containers_remote.py** | Remote | Same on remote host. |
| **docker_compose_run_setup_scripts_local.py** | Local | Run setup CLI in app container: populate-countries, populate-categories, populate-services; optional create-admin. |
| **docker_compose_run_setup_scripts_remote.py** | Remote | Same on remote host. |
| **docker_compose_volume_stats_local.py** | Local | Report volume size/usage for compose project. |
| **docker_compose_volume_stats_remote.py** | Remote | Same on remote host. |
| **nginx_check_install_local.py** | Local | Check if nginx is installed; print true/false. |
| **nginx_check_install_remote.py** | Remote | Same on remote host. |
| **nginx_install_local.py** | Local | Install nginx (apt/yum/dnf). |
| **nginx_install_remote.py** | Remote | Install nginx on remote host. |
| **nginx_start_local.py** | Local | Start nginx (systemctl/service). |
| **nginx_start_remote.py** | Remote | Start nginx on remote host. |
| **nginx_stop_local.py** | Local | Stop nginx. |
| **nginx_stop_remote.py** | Remote | Stop nginx on remote host. |
| **nginx_restart_local.py** | Local | Restart nginx. |
| **nginx_restart_remote.py** | Remote | Restart nginx on remote host. |
| **nginx_stream_logs_local.py** | Local | Stream nginx logs (tail -f); optional access/error/both. |
| **nginx_stream_logs_remote.py** | Remote | Stream nginx logs from remote; Ctrl+C to stop. |
| **nginx_fetch_nginx_conf_file_local.py** | Local | Read nginx config; print or save to file. |
| **nginx_fetch_nginx_conf_file_remote.py** | Remote | Fetch nginx config from remote to local. |
| **nginx_deploy_nginx_conf_file_local.py** | Local | Deploy config to nginx path; validate and reload. |
| **nginx_deploy_nginx_conf_file_remote.py** | Remote | Deploy local config to remote; validate and reload. |
| **nginx_run_certbot_local.py** | Local | Run certbot for nginx (obtain/renew certs). |
| **nginx_run_certbot_remote.py** | Remote | Run certbot on remote host. |
| **dns_lookup_local.py** | Local | Run DNS lookup (dig); optional type, server, short. |
| **dns_lookup_remote.py** | Remote | Same on remote host via SSH. |
| **git_check_installed_local.py** | Local | Check if git is installed; print true/false. |
| **git_check_installed_remote.py** | Remote | Same on remote host. |
| **git_install_local.py** | Local | Install git (dnf/yum/apt). |
| **git_install_remote.py** | Remote | Install git on remote host. |
| **git_clone_local.py** | Local | Clone repo; optional path/branch; use `GIT_PAC_TOKEN` for auth. |
| **git_clone_remote.py** | Remote | Clone repo on remote; target path required; PAC token for auth. |
| **git_get_current_branch_local.py** | Local | Print current branch name; repo path as arg. |
| **git_get_current_branch_remote.py** | Remote | Same on remote repo. |
| **git_checkout_branch_local.py** | Local | Checkout branch; repo path and branch as args. |
| **git_checkout_branch_remote.py** | Remote | Same on remote repo. |
| **git_pull_update_local.py** | Local | Run git pull; repo path as arg; optional branch; PAC token for auth. |
| **git_pull_update_remote.py** | Remote | Same on remote repo. |
| **common.py** | Module | Shared helpers (run_local, run_remote, SSH, CLI args). Not run directly. |

Every script in the table exists as a file in `project_deploy_manager/` (e.g. `check_docker.py`, `connection_test.py`). Run from that directory with the project venv active.

**Every script exposes a callable function for use as a module.** The function name matches the script name (e.g. `check_disk_space_local` from `check_disk_space_local.py`). Functions typically return `(exit_code, stdout, stderr)`. See [Use as a module (all scripts)](#use-as-a-module-all-scripts) for examples.

All remote scripts take `host`, `username`, and `password` (or `SSH_PASSWORD` env). All scripts support `-v`/`--verbose` and `-d`/`--debug`; logs go to stderr. Git clone/pull use `GIT_PAC_TOKEN` env for PAC (Personal Access Token) auth when cloning/pulling over HTTPS.

---

## Use as a module (all scripts)

Every script can be imported and called from Python. Functions return `(exit_code, stdout, stderr)` unless noted. Run from `project_deploy_manager/` or add it to `PYTHONPATH`.

| Script | Callable | Returns |
|--------|----------|--------|
| connection_test.py | `test_ssh_connection(host, user, password, ...)` | `bool` |
| check_docker.py | `check_remote_docker(host, user, password, ...)` | `(bool, version_str)` |
| install_docker.py | `install_remote_docker(host, user, password, ...)` | `bool` |
| check_disk_space_local.py | `check_disk_space_local(threshold=..., no_header=...)` | `(code, out, err)` |
| check_disk_space_remote.py | `check_disk_space_remote(host, user, password, ...)` | `(code, out, err)` |
| check_disk_memory_local.py | `check_disk_memory_local(threshold_pct=...)` | `(code, out, err)` |
| check_disk_memory_remote.py | `check_disk_memory_remote(host, user, password, ...)` | `(code, out, err)` |
| restart_host_local.py | `restart_host_local(delay_sec=..., dry_run=...)` | `(code, out, err)` |
| restart_host_remote.py | `restart_host_remote(host, user, password, dry_run=...)` | `(code, out, err)` |
| create_dir_local.py | `create_dir_local(path, parents=..., )` | `(code, out, err)` |
| create_dir_remote.py | `create_dir_remote(host, user, password, path, ...)` | `(code, out, err)` |
| delete_dir_local.py | `delete_dir_local(path, recursive=...)` | `(code, out, err)` |
| delete_dir_remote.py | `delete_dir_remote(host, user, password, path, ...)` | `(code, out, err)` |
| list_dir_local.py | `list_dir_local(path=..., long_format=..., )` | `(code, out, err)` |
| list_dir_remote.py | `list_dir_remote(host, user, password, path=..., ...)` | `(code, out, err)` |
| copy_env_local.py | `copy_env_local(source, target_dir, create_dir=...)` | `(code, out, err)` |
| copy_env_remote.py | `copy_env_remote(host, user, password, source, target_dir, ...)` | `(code, out, err)` |
| dns_lookup_local.py | `dns_lookup_local(name, record_type=..., server=..., short=...)` | `(code, out, err)` |
| dns_lookup_remote.py | `dns_lookup_remote(host, user, password, name, ...)` | `(code, out, err)` |
| nginx_check_install_local.py | `nginx_check_install_local()` | `(code, 'true'\|'false', err)` |
| nginx_check_install_remote.py | `nginx_check_install_remote(host, user, password, ...)` | `(code, 'true'\|'false', err)` |
| nginx_start_local.py | `nginx_start_local()` | `(code, out, err)` |
| git_check_installed_local.py | `git_check_installed_local()` | `(code, 'true'\|'false', err)` |
| git_install_local.py | `git_install_local()` | `(code, out, err)` |
| git_get_current_branch_local.py | `git_get_current_branch_local(repo_path=...)` | `(code, out, err)` |
| docker_prune_containers_local.py | `docker_prune_containers_local(dry_run=...)` | `(code, out, err)` |

**Usage examples:**

```python
import sys
# Connection & Docker
from connection_test import test_ssh_connection
from check_docker import check_remote_docker
from install_docker import install_remote_docker
ok = test_ssh_connection("192.168.1.1", "root", "mypass")
installed, ver = check_remote_docker("192.168.1.1", "root", "mypass")
install_remote_docker("192.168.1.1", "root", "mypass")

# Disk
from check_disk_space_local import check_disk_space_local
from check_disk_memory_remote import check_disk_memory_remote
code, out, err = check_disk_space_local(threshold=90)
code, out, err = check_disk_memory_remote("192.168.1.1", "root", "mypass", threshold_pct=95)
if code == 0:
    print(out)

# Host, dirs, env
from restart_host_local import restart_host_local
from create_dir_remote import create_dir_remote
from copy_env_local import copy_env_local
code, _, _ = restart_host_local(dry_run=True)
code, out, err = create_dir_remote("192.168.1.1", "root", "mypass", "/home/user/app")
code, out, err = copy_env_local(".env", "/path/to/app", create_dir=True)

# DNS
from dns_lookup_local import dns_lookup_local
from dns_lookup_remote import dns_lookup_remote
code, out, err = dns_lookup_local("example.com", record_type="MX", short=True)
code, out, err = dns_lookup_remote("192.168.1.1", "root", "mypass", "example.com")

# Nginx, Git
from nginx_check_install_local import nginx_check_install_local
from git_get_current_branch_local import git_get_current_branch_local
code, installed, _ = nginx_check_install_local()  # installed is "true" or "false"
code, branch, err = git_get_current_branch_local("/path/to/repo")
```

Other scripts (docker_*, docker_compose_*, nginx_* remote/stop/restart, git_* install/clone/checkout/pull) follow the same pattern: import the module and call a function with the same name as the script (e.g. `from docker_prune_containers_local import ...` then call the function with the same logical args as the CLI). See each script's docstring and `def` for the exact signature.

---

## Examples by script

One or more runnable examples for every script. Replace `102.215.92.41`, `root`, `pass`, paths, and tokens with your values. Run from `project_deploy_manager` with venv active.

| Script | Example(s) |
|--------|------------|
| **connection_test.py** | `python connection_test.py 102.215.92.41 root "YOUR_PASSWORD"` · `python connection_test.py 102.215.92.41 root -v` · `export SSH_PASSWORD='YOUR_PASSWORD'; python connection_test.py 102.215.92.41 root` |
| **check_docker.py** | `python check_docker.py 102.215.92.41 root 'YOUR_PASSWORD'` · `python check_docker.py 102.215.92.41 root -v` |
| **install_docker.py** | `python install_docker.py 102.215.92.41 root 'YOUR_PASSWORD'` · `python install_docker.py 102.215.92.41 root "$SSH_PASSWORD" -v` |
| **check_disk_space_local.py** | `python check_disk_space_local.py` · `python check_disk_space_local.py --threshold 90` · `python check_disk_space_local.py -v` |
| **check_disk_space_remote.py** | `python check_disk_space_remote.py 102.215.92.41 root 'YOUR_PASSWORD'` · `python check_disk_space_remote.py 102.215.92.41 root "$SSH_PASSWORD" -v --threshold 85` |
| **check_disk_memory_local.py** | `python check_disk_memory_local.py` · `python check_disk_memory_local.py --threshold-pct 95 -v` |
| **check_disk_memory_remote.py** | `python check_disk_memory_remote.py 102.215.92.41 root 'YOUR_PASSWORD'` · `python check_disk_memory_remote.py 102.215.92.41 root "$SSH_PASSWORD" --threshold-pct 90 -v` |
| **restart_host_local.py** | `python restart_host_local.py --dry-run` · `python restart_host_local.py` · `python restart_host_local.py --delay 300` |
| **restart_host_remote.py** | `python restart_host_remote.py 102.215.92.41 root --dry-run` · `python restart_host_remote.py 102.215.92.41 root 'YOUR_PASSWORD'` |
| **create_dir_local.py** | `python create_dir_local.py /path/to/dir` · `python create_dir_local.py /tmp/a/b/c --no-parents` |
| **create_dir_remote.py** | `python create_dir_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /home/user/app/data` · `python create_dir_remote.py 102.215.92.41 root /var/log/myapp -v` |
| **delete_dir_local.py** | `python delete_dir_local.py /tmp/empty_dir` · `python delete_dir_local.py /tmp/old -r` |
| **delete_dir_remote.py** | `python delete_dir_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /home/user/old` · `python delete_dir_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /tmp/cache -r -v` |
| **list_dir_local.py** | `python list_dir_local.py` · `python list_dir_local.py /tmp -l -a` · `python list_dir_local.py /var/log -l -R` |
| **list_dir_remote.py** | `python list_dir_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /home/user` · `python list_dir_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /var/app -l -a -v` |
| **copy_env_local.py** | `python copy_env_local.py .env /path/to/app` · `python copy_env_local.py .env /path/to/app --create-dir -v` |
| **copy_env_remote.py** | `python copy_env_remote.py 102.215.92.41 root 'YOUR_PASSWORD' .env /home/user/app` · `python copy_env_remote.py 102.215.92.41 root 'YOUR_PASSWORD' .env /home/user/app --create-dir -v` |
| **docker_prune_containers_local.py** | `python docker_prune_containers_local.py` · `python docker_prune_containers_local.py -v` |
| **docker_prune_containers_remote.py** | `python docker_prune_containers_remote.py 102.215.92.41 root 'YOUR_PASSWORD'` · `python docker_prune_containers_remote.py 102.215.92.41 root -v` |
| **docker_list_volumes_local.py** | `python docker_list_volumes_local.py` · `python docker_list_volumes_local.py -v` |
| **docker_list_volumes_remote.py** | `python docker_list_volumes_remote.py 102.215.92.41 root 'YOUR_PASSWORD'` · `python docker_list_volumes_remote.py 102.215.92.41 root` |
| **docker_delete_volume_local.py** | `python docker_delete_volume_local.py my_volume` · `python docker_delete_volume_local.py postgres_data -v` |
| **docker_delete_volume_remote.py** | `python docker_delete_volume_remote.py 102.215.92.41 root 'YOUR_PASSWORD' my_volume` · `python docker_delete_volume_remote.py 102.215.92.41 root postgres_data -v` |
| **docker_list_all_images_local.py** | `python docker_list_all_images_local.py` · `python docker_list_all_images_local.py -a -v` |
| **docker_list_all_images_remote.py** | `python docker_list_all_images_remote.py 102.215.92.41 root 'YOUR_PASSWORD'` · `python docker_list_all_images_remote.py 102.215.92.41 root 'YOUR_PASSWORD' -a -v` |
| **docker_scp_image_to_remote.py** | `python docker_scp_image_to_remote.py 102.215.92.41 root 'YOUR_PASSWORD' myapp:latest` · `python docker_scp_image_to_remote.py 102.215.92.41 root 'YOUR_PASSWORD' nginx:alpine -o /tmp/nginx.tar --keep` |
| **docker_run_image_remote.py** | `python docker_run_image_remote.py 102.215.92.41 root 'YOUR_PASSWORD' myapp:latest -d -p 8080:80 --name myapp` · `python docker_run_image_remote.py 102.215.92.41 root 'YOUR_PASSWORD' nginx:alpine -d -p 80:80 --rm` |
| **docker_compose_check_installation_local.py** | `python docker_compose_check_installation_local.py` · `python docker_compose_check_installation_local.py -v` |
| **docker_compose_check_installation_remote.py** | `python docker_compose_check_installation_remote.py 102.215.92.41 root 'YOUR_PASSWORD'` · `python docker_compose_check_installation_remote.py 102.215.92.41 root -v` |
| **docker_compose_install_local.py** | `python docker_compose_install_local.py` · `python docker_compose_install_local.py -v` |
| **docker_compose_install_remote.py** | `python docker_compose_install_remote.py 102.215.92.41 root 'YOUR_PASSWORD'` · `python docker_compose_install_remote.py 102.215.92.41 root "$SSH_PASSWORD" -v` |
| **docker_compose_up_local.py** | `python docker_compose_up_local.py` · `python docker_compose_up_local.py --project-dir /path/to/app -f docker-compose.prod.yml -v` |
| **docker_compose_up_remote.py** | `python docker_compose_up_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /home/user/app` · `python docker_compose_up_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /home/user/app -f docker-compose.prod.yml` |
| **docker_compose_up_build_local.py** | `python docker_compose_up_build_local.py` · `python docker_compose_up_build_local.py --project-dir . -f docker-compose.yml -v` |
| **docker_compose_up_build_remote.py** | `python docker_compose_up_build_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /home/user/app` · `python docker_compose_up_build_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /home/user/app -f docker-compose.yml -v` |
| **docker_compose_up_build_with_replicas_local.py** | `python docker_compose_up_build_with_replicas_local.py web 3` · `python docker_compose_up_build_with_replicas_local.py --project-dir . worker 2 -v` |
| **docker_compose_up_build_with_replicas_remote.py** | `python docker_compose_up_build_with_replicas_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /home/user/app web 3` · `python docker_compose_up_build_with_replicas_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /home/user/app worker 2 -f docker-compose.yml` |
| **docker_compose_down_local.py** | `python docker_compose_down_local.py` · `python docker_compose_down_local.py --project-dir /path/to/app -f docker-compose.prod.yml -v` |
| **docker_compose_down_remote.py** | `python docker_compose_down_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /home/user/app` · `python docker_compose_down_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /home/user/app -f docker-compose.yml` |
| **docker_compose_logs_follow_stream_local.py** | `python docker_compose_logs_follow_stream_local.py` · `python docker_compose_logs_follow_stream_local.py --project-dir . web` (Ctrl+C to stop) |
| **docker_compose_logs_follow_stream_remote.py** | `python docker_compose_logs_follow_stream_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /home/user/app` · `python docker_compose_logs_follow_stream_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /home/user/app web` (Ctrl+C to stop) |
| **docker_compose_ps_local.py** | `python docker_compose_ps_local.py` · `python docker_compose_ps_local.py --project-dir /path/to/app -f docker-compose.yml -v` |
| **docker_compose_ps_remote.py** | `python docker_compose_ps_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /home/user/app` · `python docker_compose_ps_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /home/user/app -f docker-compose.yml` |
| **docker_compose_list_containers_local.py** | `python docker_compose_list_containers_local.py` · `python docker_compose_list_containers_local.py --project-dir /path/to/app -a` |
| **docker_compose_list_containers_remote.py** | `python docker_compose_list_containers_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /home/user/app` · `python docker_compose_list_containers_remote.py 102.215.92.41 root 'pass' /home/user/app -a` |
| **docker_compose_volume_stats_local.py** | `python docker_compose_volume_stats_local.py` · `python docker_compose_volume_stats_local.py --project-dir /path/to/app -v` |
| **docker_compose_run_setup_scripts_local.py** | `python docker_compose_run_setup_scripts_local.py` · `python docker_compose_run_setup_scripts_local.py --project-dir /path/to/app --admin-email admin@example.com --admin-password secret --admin-name "Admin"` |
| **docker_compose_run_setup_scripts_remote.py** | `python docker_compose_run_setup_scripts_remote.py 102.215.92.41 root 'pass' /home/project` · with optional `--admin-email`, `--admin-password`, `--admin-name` to run create-admin |
| **docker_compose_volume_stats_remote.py** | `python docker_compose_volume_stats_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /home/user/app` · `python docker_compose_volume_stats_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /home/user/app -f docker-compose.yml -v` |
| **nginx_check_install_local.py** | `python nginx_check_install_local.py` · `python nginx_check_install_local.py -v` |
| **nginx_check_install_remote.py** | `python nginx_check_install_remote.py 102.215.92.41 root 'YOUR_PASSWORD'` · `python nginx_check_install_remote.py 102.215.92.41 root -v` |
| **nginx_install_local.py** | `python nginx_install_local.py` · `python nginx_install_local.py -v` |
| **nginx_install_remote.py** | `python nginx_install_remote.py 102.215.92.41 root 'YOUR_PASSWORD'` · `python nginx_install_remote.py 102.215.92.41 root "$SSH_PASSWORD" -v` |
| **nginx_start_local.py** | `python nginx_start_local.py` · `python nginx_start_local.py -v` |
| **nginx_start_remote.py** | `python nginx_start_remote.py 102.215.92.41 root 'YOUR_PASSWORD'` |
| **nginx_stop_local.py** | `python nginx_stop_local.py` · `python nginx_stop_local.py -v` |
| **nginx_stop_remote.py** | `python nginx_stop_remote.py 102.215.92.41 root 'YOUR_PASSWORD'` |
| **nginx_restart_local.py** | `python nginx_restart_local.py` · `python nginx_restart_local.py -v` |
| **nginx_restart_remote.py** | `python nginx_restart_remote.py 102.215.92.41 root 'YOUR_PASSWORD'` |
| **nginx_stream_logs_local.py** | `python nginx_stream_logs_local.py` · `python nginx_stream_logs_local.py --log access` (Ctrl+C to stop) |
| **nginx_stream_logs_remote.py** | `python nginx_stream_logs_remote.py 102.215.92.41 root 'YOUR_PASSWORD'` · `python nginx_stream_logs_remote.py 102.215.92.41 root 'YOUR_PASSWORD' --log error` (Ctrl+C to stop) |
| **nginx_fetch_nginx_conf_file_local.py** | `python nginx_fetch_nginx_conf_file_local.py` · `python nginx_fetch_nginx_conf_file_local.py -o /tmp/nginx.conf` |
| **nginx_fetch_nginx_conf_file_remote.py** | `python nginx_fetch_nginx_conf_file_remote.py 102.215.92.41 root 'YOUR_PASSWORD' -o ../nginx_dir/old/nginx.conf` |
| **nginx_deploy_nginx_conf_file_local.py** | `python nginx_deploy_nginx_conf_file_local.py /tmp/nginx.conf` · `python nginx_deploy_nginx_conf_file_local.py /tmp/site.conf /etc/nginx/sites-available/default --no-reload` |
| **nginx_deploy_nginx_conf_file_remote.py** | `python nginx_deploy_nginx_conf_file_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /tmp/nginx.conf` · `python nginx_deploy_nginx_conf_file_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /tmp/site.conf /etc/nginx/sites-available/default` |
| **nginx_run_certbot_local.py** | `python nginx_run_certbot_local.py example.com www.example.com --email admin@example.com --agree-tos --non-interactive` · `python nginx_run_certbot_local.py example.com --dry-run` |
| **nginx_run_certbot_remote.py** | `python nginx_run_certbot_remote.py 102.215.92.41 root 'YOUR_PASSWORD' example.com www.example.com --email admin@example.com --agree-tos --non-interactive` |
| **dns_lookup_local.py** | `python dns_lookup_local.py example.com` · `python dns_lookup_local.py example.com --type MX --short` · `python dns_lookup_local.py example.com -s 8.8.8.8 --type AAAA` |
| **dns_lookup_remote.py** | `python dns_lookup_remote.py 102.215.92.41 root 'YOUR_PASSWORD' example.com` · `python dns_lookup_remote.py 102.215.92.41 root example.com --type NS --short -v` |
| **git_check_installed_local.py** | `python git_check_installed_local.py` · `python git_check_installed_local.py -v` |
| **git_check_installed_remote.py** | `python git_check_installed_remote.py 102.215.92.41 root 'YOUR_PASSWORD'` · `python git_check_installed_remote.py 102.215.92.41 root -v` |
| **git_install_local.py** | `python git_install_local.py` · `python git_install_local.py -v` |
| **git_install_remote.py** | `python git_install_remote.py 102.215.92.41 root 'YOUR_PASSWORD'` · `python git_install_remote.py 102.215.92.41 root "$SSH_PASSWORD" -v` |
| **git_clone_local.py** | `export GIT_PAC_TOKEN=ghp_xxx; python git_clone_local.py https://github.com/user/repo.git` · `python git_clone_local.py https://github.com/user/repo.git /tmp/repo -b main` |
| **git_clone_remote.py** | `python git_clone_remote.py 102.215.92.41 root 'YOUR_PASSWORD' https://github.com/user/repo.git /home/user/repo` · `python git_clone_remote.py 102.215.92.41 root 'YOUR_PASSWORD' https://github.com/user/repo.git /home/user/repo -b main` |
| **git_get_current_branch_local.py** | `python git_get_current_branch_local.py` · `python git_get_current_branch_local.py /path/to/repo` · `python git_get_current_branch_local.py . -v` |
| **git_get_current_branch_remote.py** | `python git_get_current_branch_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /home/user/repo` · `python git_get_current_branch_remote.py 102.215.92.41 root /home/user/repo -v` |
| **git_checkout_branch_local.py** | `python git_checkout_branch_local.py . main` · `python git_checkout_branch_local.py /path/to/repo develop -v` |
| **git_checkout_branch_remote.py** | `python git_checkout_branch_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /home/user/repo main` · `python git_checkout_branch_remote.py 102.215.92.41 root /home/user/repo develop -v` |
| **git_pull_update_local.py** | `python git_pull_update_local.py` · `python git_pull_update_local.py /path/to/repo` · `python git_pull_update_local.py . -b main -v` |
| **git_pull_update_remote.py** | `python git_pull_update_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /home/user/repo` · `python git_pull_update_remote.py 102.215.92.41 root /home/user/repo -b main -v` |
| **common.py** | Not run directly; import and use in your own scripts. |

**Block examples (copy-paste):**

```bash
# === Connection & Docker ===
python connection_test.py 102.215.92.41 root 'YOUR_PASSWORD' -v
python check_docker.py 102.215.92.41 root 'YOUR_PASSWORD'
python install_docker.py 102.215.92.41 root 'YOUR_PASSWORD' -v

# === Disk (local) ===
python check_disk_space_local.py
python check_disk_space_local.py --threshold 90 -v
python check_disk_memory_local.py
python check_disk_memory_local.py --threshold-pct 95

# === Disk (remote) ===
export SSH_PASSWORD='YOUR_PASSWORD'
python check_disk_space_remote.py 102.215.92.41 root -v
python check_disk_memory_remote.py 102.215.92.41 root --threshold-pct 90

# === Host ===
python restart_host_local.py --dry-run
python restart_host_remote.py 102.215.92.41 root 'YOUR_PASSWORD' --dry-run

# === Directories (local) ===
python create_dir_local.py /path/to/dir
python list_dir_local.py /path/to/dir -l -a
python delete_dir_local.py /tmp/empty_dir
python delete_dir_local.py /tmp/old -r

# === Directories (remote) ===
python create_dir_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /home/user/app/data
python list_dir_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /home/user/app
python delete_dir_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /home/user/old -r

# === Env file ===
python copy_env_local.py .env /path/to/app --create-dir
python copy_env_remote.py 102.215.92.41 root 'YOUR_PASSWORD' .env /home/user/app --create-dir -v

# === Docker (local) ===
python docker_list_all_images_local.py
python docker_list_all_images_local.py -a -v
python docker_prune_containers_local.py -v
python docker_list_volumes_local.py
python docker_delete_volume_local.py my_volume

# === Docker (remote) ===
python docker_prune_containers_remote.py 102.215.92.41 root 'YOUR_PASSWORD'
python docker_list_volumes_remote.py 102.215.92.41 root 'YOUR_PASSWORD'
python docker_list_all_images_remote.py 102.215.92.41 root 'YOUR_PASSWORD'
python docker_delete_volume_remote.py 102.215.92.41 root 'YOUR_PASSWORD' postgres_data
python docker_scp_image_to_remote.py 102.215.92.41 root 'YOUR_PASSWORD' myapp:latest
python docker_run_image_remote.py 102.215.92.41 root 'YOUR_PASSWORD' myapp:latest -d -p 8080:80 --name myapp

# === Docker Compose (local) ===
python docker_compose_check_installation_local.py
python docker_compose_up_local.py --project-dir /path/to/app
python docker_compose_up_build_local.py --project-dir /path/to/app -f docker-compose.yml
python docker_compose_up_build_with_replicas_local.py --project-dir /path/to/app web 3
python docker_compose_ps_local.py --project-dir /path/to/app
python docker_compose_logs_follow_stream_local.py --project-dir /path/to/app web   # Ctrl+C to stop
python docker_compose_volume_stats_local.py --project-dir /path/to/app
python docker_compose_down_local.py --project-dir /path/to/app

# === Docker Compose (remote) ===
python docker_compose_check_installation_remote.py 102.215.92.41 root 'YOUR_PASSWORD'
python docker_compose_up_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /home/user/app
python docker_compose_up_build_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /home/user/app -f docker-compose.yml
python docker_compose_up_build_with_replicas_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /home/user/app web 3
python docker_compose_ps_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /home/user/app
python docker_compose_ps_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /home/project
python docker_compose_logs_follow_stream_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /home/project   # Ctrl+C to stop
python docker_compose_volume_stats_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /home/user/app
python docker_compose_down_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /home/user/app

# === Nginx (local) ===
python nginx_check_install_local.py
python nginx_install_local.py -v
python nginx_start_local.py
python nginx_restart_local.py -v
python nginx_stream_logs_local.py --log access   # Ctrl+C to stop
python nginx_fetch_nginx_conf_file_local.py -o /tmp/nginx.conf
python nginx_deploy_nginx_conf_file_local.py /tmp/nginx.conf
python nginx_run_certbot_local.py example.com www.example.com --email admin@example.com --agree-tos --non-interactive

# === Nginx (remote) ===
python nginx_check_install_remote.py 102.215.92.41 root 'YOUR_PASSWORD'
python nginx_install_remote.py 102.215.92.41 root 'YOUR_PASSWORD' -v

# === DNS (local) ===
python dns_lookup_local.py ag8te.com 
python dns_lookup_local.py ag8te.com  --type A --short

# === DNS (remote) ===
python dns_lookup_remote.py 102.215.92.41 root 'YOUR_PASSWORD' ag8te.com --type A --short
python dns_lookup_remote.py 102.215.92.41 root 'YOUR_PASSWORD' example.com --type A --short
python nginx_start_remote.py 102.215.92.41 root 'YOUR_PASSWORD'
python nginx_restart_remote.py 102.215.92.41 root 'YOUR_PASSWORD'
python nginx_stream_logs_remote.py 102.215.92.41 root 'YOUR_PASSWORD' --log error   # Ctrl+C to stop
python nginx_fetch_nginx_conf_file_remote.py 102.215.92.41 root 'YOUR_PASSWORD' -o /tmp/nginx.conf
python nginx_deploy_nginx_conf_file_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /tmp/nginx.conf
python nginx_run_certbot_remote.py 102.215.92.41 root 'YOUR_PASSWORD' example.com www.example.com --email admin@example.com --agree-tos --non-interactive

# === Git (local) ===
python git_check_installed_local.py
python git_install_local.py -v
export GIT_PAC_TOKEN=ghp_xxxx
python git_clone_local.py https://github.com/user/repo.git /tmp/repo -b main
python git_get_current_branch_local.py /tmp/repo
python git_checkout_branch_local.py /tmp/repo main
python git_pull_update_local.py /tmp/repo -v

# === Git (remote) ===
python git_check_installed_remote.py 102.215.92.41 root 'YOUR_PASSWORD'
python git_install_remote.py 102.215.92.41 root 'YOUR_PASSWORD' -v
python git_clone_remote.py 102.215.92.41 root 'YOUR_PASSWORD' https://github.com/user/repo.git /home/user/repo -b main
python git_get_current_branch_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /home/user/repo
python git_checkout_branch_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /home/user/repo main
python git_pull_update_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /home/user/repo -b main -v
```

---

## Local environment setup

### 1. Python

Use Python 3.8 or newer:

```bash
python3 --version
```

### 2. Virtual environment (recommended)

From the repo root:

```bash
cd project_deploy_manager
python3 -m venv .venv
source .venv/bin/activate   # Linux/macOS
venv\Scripts\activate   # Windows
```

### 3. Install dependencies

With the venv active:

```bash
pip install -r requirements.txt
```

Or install globally (not recommended):

```bash
pip install -r requirements.txt
```

---

## Connection test script

**File:** `connection_test.py`

Tests SSH connectivity to a remote host using username and password. Prints `true` on success and `false` on failure.

### Arguments and options

| Argument / option | Description |
|-------------------|-------------|
| `host` | Remote hostname or IP (positional). |
| `username` | SSH username (positional). |
| `password` | SSH password (positional, optional if `SSH_PASSWORD` set). |
| `-p`, `--port` | SSH port (default: 22). |
| `-t`, `--timeout` | Connection timeout in seconds (default: 10). |
| `-v`, `--verbose` | Log connection attempt and result (INFO). |
| `-d`, `--debug` | Debug logs and full tracebacks. |

### Exit codes

| Code | Meaning |
|------|---------|
| 0 | Connection succeeded. |
| 1 | Connection failed. |
| 2 | Password missing (argument or `SSH_PASSWORD` env). |

### Implementation examples

**Basic (password as argument):**

```bash
python connection_test.py 102.215.92.41.example.com myuser mypassword
```

**Password with special characters (must quote):**

```bash
python connection_test.py 102.215.92.41 root 'YOUR_PASSWORD'
```

**Password from environment (recommended for scripts/CI):**

```bash
export SSH_PASSWORD=mypassword
python connection_test.py 102.215.92.41.example.com myuser
```

**Custom port and timeout:**

```bash
python connection_test.py 102.215.92.41.example.com myuser -p 2222 -t 5
```

**Verbose (see attempt and error on failure):**

```bash
python connection_test.py 102.215.92.41 root 'YOUR_PASSWORD' -v
```

**Use in a shell script (check before deploy):**

```bash
if [ "$(python connection_test.py 102.215.92.41 root "$SSH_PASSWORD")" = "true" ]; then
  echo "Host reachable, proceeding..."
else
  echo "SSH failed" && exit 1
fi
```

**Manual SSH (for interactive test):**

```bash
ssh root@server.ag8te.com
```

### Use as a module

```python
from connection_test import test_ssh_connection

if test_ssh_connection("102.215.92.41.example.com", "myuser", "mypassword"):
    print("Connected")
else:
    print("Connection failed")
```

With custom port and timeout:

```python
if test_ssh_connection("102.215.92.41.example.com", "myuser", "mypassword", port=2222, timeout=5.0):
    print("Connected")
```

With logging (see troubleshooting section for level):

```python
import logging
logging.basicConfig(level=logging.INFO)
from connection_test import test_ssh_connection
test_ssh_connection("host", "user", "pass")
```

---

## Docker check script

**File:** `check_docker.py`

Connects via SSH to a remote host and checks whether Docker is installed (present in PATH). Prints `true` if installed, `false` otherwise.

### Arguments and options

| Argument / option | Description |
|-------------------|-------------|
| `host` | Remote hostname or IP (positional). |
| `username` | SSH username (positional). |
| `password` | SSH password (positional, optional if `SSH_PASSWORD` set). |
| `-p`, `--port` | SSH port (default: 22). |
| `-t`, `--timeout` | Connection timeout in seconds (default: 10). |
| `-v`, `--verbose` | Log check and print remote `docker --version` to stderr. |
| `-d`, `--debug` | Debug logs. |

### Exit codes

| Code | Meaning |
|------|---------|
| 0 | Docker installed. |
| 1 | Docker not installed or SSH failed. |
| 2 | Password missing. |

### Implementation examples

**Basic:**

```bash
python check_docker.py 102.215.92.41 root 'mypassword'
```

**Password from env:**

```bash
export SSH_PASSWORD='mypassword'
python check_docker.py 102.215.92.41 root
```

**Verbose (see docker version on stderr):**

```bash
python check_docker.py 102.215.92.41 root 'YOUR_PASSWORD' -v
```

**Use before install_docker in a script:**

```bash
if [ "$(python check_docker.py 102.215.92.41 root "$SSH_PASSWORD")" = "false" ]; then
  python install_docker.py 102.215.92.41 root "$SSH_PASSWORD" -v
fi
```

### Use as a module

```python
from check_docker import check_remote_docker

installed, version = check_remote_docker("102.215.92.41.example.com", "myuser", "mypassword")
if installed:
    print("Docker installed:", version or "yes")
else:
    print("Docker not installed or SSH failed")
```

---

## Install Docker script

**File:** `install_docker.py`

Connects via SSH and installs Docker on the remote host. Uses the official [get.docker.com](https://get.docker.com) script for Debian/Ubuntu; for RHEL/AlmaLinux/Rocky/CentOS/Fedora uses the Docker CE repo. If Docker is already installed, does nothing and exits 0. After install, starts and enables the Docker service.

**Requirements:** Remote SSH user must be **root** or have **sudo without password** for the install commands.

### Arguments and options

| Argument / option | Description |
|-------------------|-------------|
| `host` | Remote hostname or IP (positional). |
| `username` | SSH username (positional). |
| `password` | SSH password (positional, optional if `SSH_PASSWORD` set). |
| `-p`, `--port` | SSH port (default: 22). |
| `-t`, `--timeout` | SSH connection timeout in seconds (default: 10). |
| `-v`, `--verbose` | Log progress and stream install output. |
| `-d`, `--debug` | Debug logs and paramiko. |

### Exit codes

| Code | Meaning |
|------|---------|
| 0 | Docker installed or already present. |
| 1 | Install failed. |
| 2 | Password missing. |

### Implementation examples

**Basic (quote password if it contains `#`, `$`, etc.):**

```bash
python install_docker.py 102.215.92.41 root 'mypassword'
python install_docker.py 102.215.92.41 root 'YOUR_PASSWORD'
```

**Password from env:**

```bash
export SSH_PASSWORD='mypassword'
python install_docker.py 102.215.92.41 root
```

**Verbose (recommended; streams install output):**

```bash
python install_docker.py 102.215.92.41 root "$SSH_PASSWORD" -v
```

**Full workflow: connection test → check Docker → install if missing:**

```bash
HOST=102.215.92.41
USER=root
python connection_test.py "$HOST" "$USER" "$SSH_PASSWORD" || exit 1
[ "$(python check_docker.py "$HOST" "$USER" "$SSH_PASSWORD")" = "true" ] || \
  python install_docker.py "$HOST" "$USER" "$SSH_PASSWORD" -v
```

### Use as a module

```python
from install_docker import install_remote_docker

if install_remote_docker("102.215.92.41.example.com", "myuser", "mypassword"):
    print("Docker installed or already present")
else:
    print("Install failed")
```

---

### Logging and troubleshooting

By default the script is quiet (only errors). Use `-v`/`--verbose` or `-d`/`--debug` to see what’s happening.

**Verbose (INFO):** log each connection attempt and result, plus the error type and message on failure:

```bash
python connection_test.py 102.215.92.41.example.com myuser -v
```

Example output on failure:

```
INFO: Attempting SSH connection to myuser@102.215.92.41.example.com:22 (timeout=10.0s)
WARNING: SSH connection failed: NoValidConnectionsError: [Errno 111] Connection refused
false
```

**Debug (DEBUG):** same as verbose, plus paramiko logs and full exception tracebacks:

```bash
python connection_test.py 102.215.92.41.example.com myuser -d
```

Use debug when the failure reason is unclear or you need to inspect SSH/paramiko behavior. All log output goes to stderr so the script still prints only `true` or `false` on stdout for scripting.

**When using as a module**, configure logging before calling `test_ssh_connection` so you see the same messages:

```python
import logging
from connection_test import test_ssh_connection

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

if test_ssh_connection("102.215.92.41.example.com", "myuser", "mypassword"):
    print("Connected")
```

---

## Shared module and additional scripts

Scripts in this folder use the shared **`common.py`** module (see [common.py (shared module)](#commonpy-shared-module)). All support `-v`/`--verbose` and `-d`/`--debug`; logs go to stderr; exit 0 on success, non-zero on failure. Remote scripts require password via argument or `SSH_PASSWORD` env (quote the password if it contains `#`, `$`, etc.).

---

### Disk

#### check_disk_space_local.py

Reports disk usage on the local machine (`df -h`). Optional threshold: exit 1 if any filesystem use% ≥ given value.

| Option | Description |
|--------|-------------|
| `-v`, `--verbose` | Log (INFO). |
| `-d`, `--debug` | Debug logs. |
| `--threshold PCT` | Exit 1 if any use% ≥ PCT (e.g. 90). |
| `--no-header` | Omi.t header line from output. |

**Exit codes:** 0 = success or within threshold; 1 = command failed or threshold exceeded.

**Examples:**

```bash
# Basic (human-readable df)
python check_disk_space_local.py

# Fail if any filesystem >= 90% full (e.g. for CI)
python check_disk_space_local.py --threshold 90

# Output without header (for parsing)
python check_disk_space_local.py --no-header

# Verbose
python check_disk_space_local.py -v
```

#### check_disk_space_remote.py

Same as local but runs `df -h` on the remote host via SSH.

| Argument / option | Description |
|-------------------|-------------|
| `host` | Remote hostname or IP (positional). |
| `username` | SSH username (positional). |
| `password` | SSH password (positional or `SSH_PASSWORD`). |
| `-p`, `--port` | SSH port (default: 22). |
| `-t`, `--timeout` | SSH timeout (default: 10). |
| `-v`, `-d` | Verbose / debug. |
| `--threshold PCT` | Exit 1 if any use% ≥ PCT. |
| `--no-header` | Omit header from output. |

**Examples:**

```bash
python check_disk_space_remote.py 102.215.92.41 root 'YOUR_PASSWORD'
export SSH_PASSWORD='YOUR_PASSWORD'
python check_disk_space_remote.py 102.215.92.41 root -v
python check_disk_space_remote.py 102.215.92.41 root "$SSH_PASSWORD" --threshold 85
```

#### check_disk_memory_local.py

Reports memory usage on the local machine (`free -h`). Optional `--threshold-pct PCT`: exit 1 if memory use% ≥ PCT.

| Option | Description |
|--------|-------------|
| `-v`, `-d` | Verbose / debug. |
| `--threshold-pct PCT` | Exit 1 if memory use% ≥ PCT. |

**Examples:**

```bash
python check_disk_memory_local.py
python check_disk_memory_local.py --threshold-pct 95 -v
```

#### check_disk_memory_remote.py

Same as local but runs `free -h` (and optional threshold check) on the remote host via SSH. Same positional/SSH options as other remote scripts.

**Examples:**

```bash
python check_disk_memory_remote.py 102.215.92.41 root 'YOUR_PASSWORD'
export SSH_PASSWORD='YOUR_PASSWORD'
python check_disk_memory_remote.py 102.215.92.41 root --threshold-pct 90 -v
```

**Use as a module:**

```python
from check_disk_space_local import check_disk_space_local
from check_disk_space_remote import check_disk_space_remote
from check_disk_memory_local import check_disk_memory_local
from check_disk_memory_remote import check_disk_memory_remote
code, out, err = check_disk_space_local(threshold=90)
code, out, err = check_disk_space_remote("host", "user", "pass", threshold=85)
code, out, err = check_disk_memory_local(threshold_pct=95)
code, out, err = check_disk_memory_remote("host", "user", "pass", threshold_pct=90)
```

---

### Host

#### restart_host_local.py

Reboots the local machine (`systemctl reboot` or `shutdown -r`). Optional delay; use `--dry-run` to only print the command.

| Option | Description |
|--------|-------------|
| `-v`, `-d` | Verbose / debug. |
| `--delay SEC` | Delay reboot by SEC seconds (uses `shutdown -r`). |
| `--dry-run` | Print command only; do not reboot. |

**Exit codes:** 0 = success or dry-run; 1 = command failed.

**Examples:**

```bash
# Dry-run (safe; only prints command)
python restart_host_local.py --dry-run

# Reboot immediately
python restart_host_local.py

# Reboot in 5 minutes
python restart_host_local.py --delay 300
```

#### restart_host_remote.py

Reboots the remote host via SSH (`sudo reboot`). Same SSH args as other remote scripts. Optional `--dry-run`.

**Examples:**

```bash
# Dry-run only
python restart_host_remote.py 102.215.92.41 root --dry-run

# Actually reboot remote
export SSH_PASSWORD='YOUR_PASSWORD'
python restart_host_remote.py 102.215.92.41 root
```

**Use as a module:**

```python
from restart_host_local import restart_host_local
from restart_host_remote import restart_host_remote
code, out, err = restart_host_local(delay_sec=0, dry_run=True)
code, out, err = restart_host_remote("host", "user", "pass", dry_run=True)
```

---

### Directories

#### create_dir_local.py

Creates a directory locally (`mkdir -p` by default). Use `--no-parents` to create only the final component (fails if parents are missing).

| Argument / option | Description |
|-------------------|-------------|
| `path` | Directory path to create (positional). |
| `-p`, `--parents` | Create parent directories as needed (default). |
| `--no-parents` | Do not create parents; fail if path exists or parents missing. |
| `-v`, `-d` | Verbose / debug. |

**Examples:**

```bash
python create_dir_local.py /path/to/dir
python create_dir_local.py /tmp/a/b/c
python create_dir_local.py /tmp/leaf --no-parents -v
```

#### create_dir_remote.py

Creates a directory on the remote host via SSH. Same options; remote scripts take `host`, `username`, `password` (or `SSH_PASSWORD`), then `path`.

**Examples:**

```bash
python create_dir_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /home/user/app/data
export SSH_PASSWORD='YOUR_PASSWORD'
python create_dir_remote.py 102.215.92.41 root /var/log/myapp -v
```

**Use as a module:**

```python
from create_dir_local import create_dir_local
from create_dir_remote import create_dir_remote
from delete_dir_local import delete_dir_local
from delete_dir_remote import delete_dir_remote
from list_dir_local import list_dir_local
from list_dir_remote import list_dir_remote
code, out, err = create_dir_local("/path/to/dir", parents=True)
code, out, err = create_dir_remote("host", "user", "pass", "/home/user/app")
code, out, err = delete_dir_local("/tmp/old", recursive=True)
code, out, err = list_dir_local(".", long_format=True, all_entries=True)
code, out, err = list_dir_remote("host", "user", "pass", "/var/app", long_format=True)
```

#### delete_dir_local.py

Removes a directory locally. Without `-r`, only empty directories are removed (`rmdir`). With `-r`/`--recursive`, removes the directory and all contents (`rm -rf`).

| Argument / option | Description |
|-------------------|-------------|
| `path` | Directory path to remove (positional). |
| `-r`, `--recursive` | Remove directory and all its contents. |
| `-v`, `-d` | Verbose / debug. |

**Examples:**

```bash
python delete_dir_local.py /tmp/empty_dir
python delete_dir_local.py /tmp/old -r
python delete_dir_local.py /var/cache/app -r -v
```

#### delete_dir_remote.py

Same on remote host via SSH. Args: `host`, `username`, `password`, `path`; optional `-r`/`--recursive`.

**Examples:**

```bash
python delete_dir_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /home/user/old
python delete_dir_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /tmp/cache -r -v
```

#### list_dir_local.py

Lists directory contents locally (`ls`). Output to stdout.

| Argument / option | Description |
|-------------------|-------------|
| `path` | Directory to list (default: `.`). |
| `-l`, `--long` | Long format (permissions, owner, size, date). |
| `-a`, `--all` | Include hidden entries (names starting with `.`). |
| `-R`, `--recursive` | List subdirectories recursively. |
| `-v`, `-d` | Verbose / debug. |

**Examples:**

```bash
python list_dir_local.py
python list_dir_local.py /tmp
python list_dir_local.py /var/log -l -a
python list_dir_local.py /path/to/dir -l -R -v
```

#### list_dir_remote.py

Same on remote host via SSH. Args: `host`, `username`, `password`, then optional `path` (default: `.`). Same `-l`, `-a`, `-R` options.

**Examples:**

```bash
python list_dir_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /home/user
python list_dir_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /var/app -l -a
export SSH_PASSWORD='YOUR_PASSWORD'
python list_dir_remote.py 102.215.92.41 root /tmp -l -R -v
```

---

### Env file

#### copy_env_local.py

Copies a local env file (e.g. `.env`) into a specified directory. The file keeps its name (e.g. `target_dir/.env`).

| Argument / option | Description |
|-------------------|-------------|
| `source` | Path to env file (e.g. `.env` or `/path/to/.env`). |
| `target_dir` | Destination directory. |
| `--create-dir` | Create target directory if it does not exist. |
| `-v`, `-d` | Verbose / debug. |

**Examples:**

```bash
python copy_env_local.py .env /path/to/app
python copy_env_local.py .env /path/to/app --create-dir -v
python copy_env_local.py /path/to/project/.env /var/app --create-dir
```

#### copy_env_remote.py

Copies a local env file to a directory on the remote host via SFTP. Same source/target semantics: file keeps its name in the remote directory.

| Argument / option | Description |
|-------------------|-------------|
| `host`, `username`, `password` | SSH connection (or `SSH_PASSWORD` env). |
| `source` | Local path to env file. |
| `target_dir` | Destination directory on remote (e.g. `/home/user/app`). |
| `--create-dir` | Create target directory on remote if missing (`mkdir -p`). |
| `-v`, `-d` | Verbose / debug. |

**Examples:**

```bash
python copy_env_remote.py 102.215.92.41 root 'YOUR_PASSWORD' .env /home/user/app
python copy_env_remote.py 102.215.92.41 root 'YOUR_PASSWORD' .env /home/user/app --create-dir -v
export SSH_PASSWORD='YOUR_PASSWORD'
python copy_env_remote.py 102.215.92.41 root /path/to/.env /var/www/app --create-dir
```

**Use as a module:**

```python
from copy_env_local import copy_env_local
from copy_env_remote import copy_env_remote
code, out, err = copy_env_local(".env", "/path/to/app", create_dir=True)
code, out, err = copy_env_remote("host", "user", "pass", ".env", "/home/user/app", create_dir=True)
```

---

### Docker (additional)

#### docker_prune_containers_local.py

Removes stopped Docker containers (`docker container prune -f`). No positional args.

| Option | Description |
|--------|-------------|
| `-v`, `-d` | Verbose / debug. |
| `--dry-run` | (Local only; script may not prompt; use to avoid accidental prune.) |

**Examples:**

```bash
python docker_prune_containers_local.py
python docker_prune_containers_local.py -v
```

#### docker_prune_containers_remote.py

Same on remote host via SSH. Same SSH args (host, username, password, `-p`, `-t`, `-v`, `-d`).

**Examples:**

```bash
python docker_prune_containers_remote.py 102.215.92.41 root 'YOUR_PASSWORD'
export SSH_PASSWORD='YOUR_PASSWORD'
python docker_prune_containers_remote.py 102.215.92.41 root -v
```

#### docker_list_volumes_local.py

Lists Docker volumes (`docker volume ls`). No positional args. Output to stdout.

**Examples:**

```bash
python docker_list_volumes_local.py
python docker_list_volumes_local.py -v
# Pipe or redirect
python docker_list_volumes_local.py | grep postgres
```

#### docker_list_volumes_remote.py

Same on remote host via SSH.

**Examples:**

```bash
python docker_list_volumes_remote.py 102.215.92.41 root 'YOUR_PASSWORD'
export SSH_PASSWORD='YOUR_PASSWORD'
python docker_list_volumes_remote.py 102.215.92.41 root
```

#### docker_delete_volume_local.py

Removes a Docker volume by name (`docker volume rm <name>`). Volume name is positional.

| Argument / option | Description |
|-------------------|-------------|
| `volume` | Volume name to remove (positional). |
| `-v`, `-d` | Verbose / debug. |

**Examples:**

```bash
python docker_delete_volume_local.py my_volume
python docker_delete_volume_local.py postgres_data -v
```

#### docker_delete_volume_remote.py

Same on remote host via SSH. Args: host, username, password, then volume name.

**Examples:**

```bash
python docker_delete_volume_remote.py 102.215.92.41 root 'YOUR_PASSWORD' postgres_data
export SSH_PASSWORD='YOUR_PASSWORD'
python docker_delete_volume_remote.py 102.215.92.41 root my_volume -v
```

**Full workflow example (remote: list volumes, prune containers, delete a volume):**

```bash
HOST=102.215.92.41
USER=root
export SSH_PASSWORD='YOUR_PASSWORD'
python docker_list_volumes_remote.py "$HOST" "$USER"
python docker_prune_containers_remote.py "$HOST" "$USER" -v
python docker_delete_volume_remote.py "$HOST" "$USER" old_volume_name
```

#### docker_list_all_images_local.py

Lists Docker images locally (`docker images`). Output: repo, tag, image id, size.

| Option | Description |
|--------|-------------|
| `-a`, `--all` | Show all images (including intermediate). |
| `-v`, `-d` | Verbose / debug. |

**Examples:**

```bash
python docker_list_all_images_local.py
python docker_list_all_images_local.py -a -v
```

#### docker_list_all_images_remote.py

Same on remote host via SSH. Same SSH args (host, username, password, `-p`, `-t`, `-v`, `-d`). Optional `-a`/`--all`.

**Examples:**

```bash
python docker_list_all_images_remote.py 102.215.92.41 root 'YOUR_PASSWORD'
export SSH_PASSWORD='YOUR_PASSWORD'
python docker_list_all_images_remote.py 102.215.92.41 root -a -v
```

#### docker_scp_image_to_remote.py

Saves a Docker image locally (`docker save`), copies the tar to the remote host via SFTP, and loads it on the remote (`docker load`). Use this to push an image from your machine to a remote host without a registry.

| Argument / option | Description |
|-------------------|-------------|
| `image` | Image reference (e.g. `myapp:latest`, `nginx:alpine`). |
| `host`, `username`, `password` | SSH connection (or `SSH_PASSWORD` env). |
| `-o`, `--output PATH` | Local tar path for saved image (default: temp file). |
| `--remote-path PATH` | Remote path for tar on host (default: `/tmp/docker-image-<name>.tar`). |
| `--keep` | Keep local and remote tar files after load. |

**Exit codes:** 0 = success; 1 = save/copy/load failed; 2 = password missing.

**Examples:**

```bash
# Push myapp:latest to remote (temp files cleaned up)
python docker_scp_image_to_remote.py 102.215.92.41 root 'YOUR_PASSWORD' myapp:latest

# Save to a specific local file and keep it on remote
python docker_scp_image_to_remote.py 102.215.92.41 root 'YOUR_PASSWORD' nginx:alpine -o /tmp/nginx.tar --keep

# Use SSH_PASSWORD
export SSH_PASSWORD='YOUR_PASSWORD'
python docker_scp_image_to_remote.py 102.215.92.41 root myapp:latest -v
```

#### docker_run_image_remote.py

Runs a Docker container from an image on the remote host via SSH (`docker run ...`).

| Argument / option | Description |
|-------------------|-------------|
| `image` | Image reference (e.g. `myapp:latest`, `nginx:alpine`). |
| `host`, `username`, `password` | SSH connection (or `SSH_PASSWORD` env). |
| `-d`, `--detach` | Run container in background. |
| `--name NAME` | Container name. |
| `-p`, `--publish SPEC` | Publish port (e.g. `8080:80`); can repeat. |
| `-e`, `--env VAR=VAL` | Environment variable; can repeat. |
| `--rm` | Remove container when it exits. |
| `extra ...` | Extra args for `docker run` (e.g. `-v` /data:/app). |

**Examples:**

```bash
# Run myapp in background, publish 8080:80, name the container
python docker_run_image_remote.py 102.215.92.41 root 'YOUR_PASSWORD' myapp:latest -d -p 8080:80 --name myapp

# Run nginx, publish 80:80, remove container on exit
python docker_run_image_remote.py 102.215.92.41 root 'YOUR_PASSWORD' nginx:alpine -d -p 80:80 --rm

# With env vars and volume
python docker_run_image_remote.py 102.215.92.41 root 'YOUR_PASSWORD' myapp:latest -d -e NODE_ENV=prod -p 3000:3000 -- -v /data:/app
```

**Workflow: list images locally, push image to remote, run it on remote:**

```bash
python docker_list_all_images_local.py -a
python docker_scp_image_to_remote.py 102.215.92.41 root 'YOUR_PASSWORD' myapp:latest
python docker_list_all_images_remote.py 102.215.92.41 root 'YOUR_PASSWORD'
python docker_run_image_remote.py 102.215.92.41 root 'YOUR_PASSWORD' myapp:latest -d -p 8080:80 --name myapp
```

---

### Docker Compose

All Docker Compose scripts use `docker compose` (plugin). Optional `--project-dir` (local) or positional `project_dir` (remote); optional `-f`/`--file` for compose file path. Remote scripts use standard SSH args (`host`, `username`, `password` or `SSH_PASSWORD`).

| Script | Description |
|--------|-------------|
| **docker_compose_check_installation_local/remote** | Check if Docker Compose is available; print `true`/`false`. Exit 0 if installed, 1 if not. |
| **docker_compose_install_local/remote** | Install Docker Compose (plugin or standalone as per OS). Exit 0 on success. |
| **docker_compose_up_local/remote** | Run `docker compose up -d` in project directory. |
| **docker_compose_up_build_local/remote** | Run `docker compose up -d --build`. |
| **docker_compose_up_build_with_replicas_local/remote** | Run `docker compose up -d --build` with scale: args `SERVICE COUNT` (e.g. `web 3`). |
| **docker_compose_down_local/remote** | Run `docker compose down` in project directory. |
| **docker_compose_logs_follow_stream_local/remote** | Run `docker compose logs -f`; optional service name. Stream to stdout until Ctrl+C. |
| **docker_compose_ps_local/remote** | Run `docker compose ps`; print service status (name, state, ports). |
| **docker_compose_volume_stats_local/remote** | Report volume size/usage (e.g. `docker system df -v` from project dir). |

**Common options (all scripts):** `-v`/`--verbose`, `-d`/`--debug`. Local scripts: `--project-dir DIR` (default: `.`). Remote: positional `project_dir` (default: `.`). All support `-f`/`--file FILE` for compose file.

**Examples:**

```bash
# Local: check, up, ps, logs, volume stats, down
python docker_compose_check_installation_local.py
python docker_compose_up_local.py --project-dir /path/to/app
python docker_compose_up_local.py --project-dir /path/to/app -f docker-compose.prod.yml -v
python docker_compose_up_build_local.py --project-dir /path/to/app
python docker_compose_up_build_with_replicas_local.py --project-dir /path/to/app web 3
python docker_compose_ps_local.py --project-dir /path/to/app
python docker_compose_logs_follow_stream_local.py --project-dir /path/to/app web   # Ctrl+C to stop
python docker_compose_volume_stats_local.py --project-dir /path/to/app
python docker_compose_down_local.py --project-dir /path/to/app -f docker-compose.prod.yml

# Remote: same workflow
export SSH_PASSWORD='YOUR_PASSWORD'
python docker_compose_check_installation_remote.py 102.215.92.41 root
python docker_compose_up_remote.py 102.215.92.41 root /home/user/app
python docker_compose_up_remote.py 102.215.92.41 root /home/user/app -f docker-compose.prod.yml
python docker_compose_up_build_with_replicas_remote.py 102.215.92.41 root /home/user/app web 3
python docker_compose_ps_remote.py 102.215.92.41 root /home/user/app
python docker_compose_logs_follow_stream_remote.py 102.215.92.41 root /home/user/app web   # Ctrl+C to stop
python docker_compose_volume_stats_remote.py 102.215.92.41 root /home/user/app
python docker_compose_down_remote.py 102.215.92.41 root /home/user/app
```

---

### Nginx

All Nginx scripts support `-v`/`-d`. Remote scripts use standard SSH args (`host`, `username`, `password` or `SSH_PASSWORD`). Local start/stop/restart use `systemctl` or `service`; remote use `sudo systemctl` or `sudo service`.

| Script | Description |
|--------|-------------|
| **nginx_check_install_local/remote** | Check if nginx is installed; print `true`/`false`. Exit 0 if installed. |
| **nginx_install_local/remote** | Install nginx (dnf, yum, or apt). Requires sudo (local) or sudo on remote. |
| **nginx_start_local/remote** | Start nginx. |
| **nginx_stop_local/remote** | Stop nginx. |
| **nginx_restart_local/remote** | Restart nginx. |
| **nginx_stream_logs_local/remote** | Stream nginx logs (`tail -f`); `--log access` \| `error` \| `both` (default: both). Ctrl+C to stop. |
| **nginx_fetch_nginx_conf_file_local/remote** | Read/fetch nginx config; optional `-o FILE` to save. Default path: `/etc/nginx/nginx.conf`. |
| **nginx_deploy_nginx_conf_file_local/remote** | Deploy local config file to nginx path; run `nginx -t` and reload if valid. Optional `--no-reload`. |
| **nginx_run_certbot_local/remote** | Run certbot for nginx (obtain/renew certs). Args: domain(s); optional `--email`, `--dry-run`, `--agree-tos`, `--non-interactive`. |

**Examples:**

```bash
# Local: check, install, start, stream logs, fetch/deploy config, certbot
python nginx_check_install_local.py
python nginx_install_local.py -v
python nginx_start_local.py
python nginx_restart_local.py -v
python nginx_stream_logs_local.py --log access   # Ctrl+C to stop
python nginx_fetch_nginx_conf_file_local.py -o /tmp/nginx.conf
python nginx_deploy_nginx_conf_file_local.py /tmp/nginx.conf
python nginx_run_certbot_local.py example.com www.example.com --email admin@example.com --agree-tos --non-interactive

# Remote: same workflow
export SSH_PASSWORD='YOUR_PASSWORD'
python nginx_check_install_remote.py 102.215.92.41 root
python nginx_install_remote.py 102.215.92.41 root -v
python nginx_start_remote.py 102.215.92.41 root
python nginx_restart_remote.py 102.215.92.41 root
python nginx_stream_logs_remote.py 102.215.92.41 root --log error   # Ctrl+C to stop
python nginx_fetch_nginx_conf_file_remote.py 102.215.92.41 root -o /tmp/nginx.conf
python nginx_deploy_nginx_conf_file_remote.py 102.215.92.41 root /tmp/nginx.conf /etc/nginx/nginx.conf
python nginx_run_certbot_remote.py 102.215.92.41 root example.com www.example.com --email admin@example.com --agree-tos --non-interactive
```

---

### DNS

DNS lookup scripts run `dig` locally or on a remote host. If `dig` is not installed, A/AAAA lookups fall back to `getent hosts` (available on most systems). For MX, NS, TXT, etc., install **bind-utils** (RHEL/AlmaLinux) or **dnsutils** (Debian/Ubuntu). Both scripts support `-v`/`-d`; remote scripts use standard SSH args.

| Script | Description |
|--------|-------------|
| **dns_lookup_local.py** | Run `dig` locally; arg: hostname/domain; optional `--type TYPE`, `-s SERVER`, `--short`. |
| **dns_lookup_remote.py** | Same on remote host via SSH; args: host, username, password, name; same options. |

**Options (both scripts):**

| Option | Description |
|--------|-------------|
| `name` | Hostname or domain to look up (positional). |
| `--type TYPE` | Record type: A, AAAA, MX, NS, TXT, CNAME, SOA, etc. (default: A). |
| `-s`, `--server SERVER` | Resolver to use (e.g. 8.8.8.8 or ns1.example.com). |
| `--short` | Short output only (`dig +short`). |

**Exit codes:** 0 = success; 1 = dig failed; 2 = missing password (remote only).

**Examples:**

```bash
# Local: A record (default)
python dns_lookup_local.py example.com

# Local: MX, short output
python dns_lookup_local.py example.com --type MX --short

# Local: AAAA via specific resolver
python dns_lookup_local.py example.com -s 8.8.8.8 --type AAAA

# Remote: A record
python dns_lookup_remote.py 102.215.92.41 root 'YOUR_PASSWORD' example.com

# Remote: NS records, short
python dns_lookup_remote.py 102.215.92.41 root example.com --type NS --short -v
```

**Use as a module:**

```python
import sys
from dns_lookup_local import dns_lookup_local
from dns_lookup_remote import dns_lookup_remote

# Local: returns (exit_code, stdout, stderr)
code, out, err = dns_lookup_local("example.com")
code, out, err = dns_lookup_local("example.com", record_type="MX", short=True)

# Remote: same signature; password from arg or SSH_PASSWORD env
code, out, err = dns_lookup_remote("192.168.1.1", "root", "mypass", "example.com")
code, out, err = dns_lookup_remote(
    "192.168.1.1", "root", "mypass", "example.com",
    record_type="A", short=True, port=22
)
if code == 0:
    print(out)
else:
    print(err, file=sys.stderr)
```

---

### Git

All Git scripts support `-v`/`-d`. Remote scripts use standard SSH args (`host`, `username`, `password` or `SSH_PASSWORD`). Clone and pull use **PAC token** for HTTPS auth: pass `--pac-token TOKEN` (e.g. on git_clone_remote) or set `GIT_PAC_TOKEN` in the environment; the script injects it into the repo URL (`https://<token>@host/repo.git`) when cloning/pulling.

| Script | Description |
|--------|-------------|
| **git_check_installed_local.py** | Check if git is installed; print `true`/`false`. Exit 0 if installed. |
| **git_check_installed_remote.py** | Same on remote host. |
| **git_install_local.py** | Install git (dnf, yum, or apt). Requires sudo. |
| **git_install_remote.py** | Install git on remote host. |
| **git_clone_local.py** | `git clone <repo_url> [target_path]`; optional `-b BRANCH`. Use `GIT_PAC_TOKEN` for HTTPS. |
| **git_clone_remote.py** | Clone repo on remote; args: host, user, password, repo_url, target_path; optional `-b BRANCH`, `--pac-token TOKEN`. |
| **git_get_current_branch_local.py** | Print current branch; arg: `repo_path` (default: `.`). |
| **git_get_current_branch_remote.py** | Same on remote; args: host, user, password, repo_path. |
| **git_checkout_branch_local.py** | `git checkout <branch>`; args: `repo_path` (default: `.`), `branch`. |
| **git_checkout_branch_remote.py** | Same on remote; args: host, user, password, repo_path, branch. |
| **git_pull_update_local.py** | `git pull` in repo; arg: `repo_path` (default: `.`); optional `-b BRANCH`. |
| **git_pull_update_remote.py** | Same on remote; args: host, user, password, repo_path; optional `-b BRANCH`. |

**Examples:**

```bash
# Check if git installed locally / on remote
python git_check_installed_local.py
python git_check_installed_remote.py 102.215.92.41 root 'YOUR_PASSWORD'

# Clone locally (PAC token for private repo)
export GIT_PAC_TOKEN=ghp_xxxx
python git_clone_local.py https://github.com/user/repo.git /tmp/repo -b main

# Clone on remote (PAC via arg or GIT_PAC_TOKEN env)
python git_clone_remote.py 102.215.92.41 root 'YOUR_PASSWORD' https://github.com/user/repo.git /home/user/repo -b main
python git_clone_remote.py 102.215.92.41 root 'YOUR_PASSWORD' https://github.com/user/repo.git /home/user/repo --pac-token ghp_xxxx

# Current branch locally / remote
python git_get_current_branch_local.py /path/to/repo
python git_get_current_branch_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /home/user/repo

# Checkout and pull
python git_checkout_branch_local.py /path/to/repo main
python git_pull_update_local.py /path/to/repo -v
python git_checkout_branch_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /home/user/repo main
export SSH_PASSWORD='YOUR_PASSWORD'
python git_pull_update_remote.py 102.215.92.41 root /home/user/repo -b main -v
```

---

## common.py (shared module)

**File:** `common.py`

Not run directly. Provides helpers used by the other scripts. Use it when adding new scripts that run local or remote commands.

### API

| Function | Description |
|----------|-------------|
| **configure_logging(verbose, debug, stream=None)** | Set up logging: INFO if verbose, DEBUG if debug; default stream is stderr. |
| **run_local(command, timeout_sec=60, log=None, shell=True)** | Run a shell command locally. Returns `(exit_code, stdout, stderr)`. Raises no exception; non-zero exit and stderr on failure. |
| **ssh_connect(host, username, password, port=22, timeout=10.0, log=None)** | Connect via SSH (paramiko). Returns `paramiko.SSHClient`. Raises on connection failure. |
| **run_remote(client, command, timeout_sec=60, log=None)** | Run a command on the remote host. Returns `(exit_code, stdout, stderr)`. |
| **add_remote_ssh_args(parser)** | Add to an argparse parser: `host`, `username`, `password` (optional), `-p`/`--port`, `-t`/`--timeout`. |
| **add_common_args(parser)** | Add to an argparse parser: `-v`/`--verbose`, `-d`/`--debug`. |
| **get_password(args)** | Return password from `args.password` or `os.environ.get("SSH_PASSWORD")`. |

### Implementation example (new script)

```python
#!/usr/bin/env python3
import argparse
import sys
from common import (
    add_common_args,
    add_remote_ssh_args,
    configure_logging,
    get_password,
    run_remote,
    ssh_connect,
)

def main() -> int:
    parser = argparse.ArgumentParser(description="Do something on remote host.")
    add_remote_ssh_args(parser)
    add_common_args(parser)
    args = parser.parse_args()
    configure_logging(args.verbose, args.debug)

    password = get_password(args)
    if not password:
        print("Error: password required via argument or SSH_PASSWORD env", file=sys.stderr)
        return 2

    try:
        client = ssh_connect(args.host, args.username, password, port=args.port, timeout=args.timeout)
    except Exception as e:
        print("SSH failed: %s" % e, file=sys.stderr)
        return 1

    try:
        code, out, err = run_remote(client, "whoami", timeout_sec=10)
    finally:
        client.close()

    if code != 0:
        print(err or out, file=sys.stderr)
        return 1
    print(out.strip())
    return 0

if __name__ == "__main__":
    sys.exit(main())
```

For a **local-only** script, use `add_common_args(parser)` and `run_local(command, timeout_sec, log)`; no SSH args.

---

## VS Code launch.json examples

To run and debug these scripts from VS Code, use configurations under `.vscode/launch.json`. Each config should use:

- **`"cwd": "${workspaceFolder}/project_deploy_manager"`** so that `from common import ...` resolves.
- **`"python": "${workspaceFolder}/project_deploy_manager/.venv/bin/python"`** to use the project venv (if you use one).

### Setting SSH_PASSWORD for remote configs

Remote configs pass the password via `"args": [..., "${env:SSH_PASSWORD}"]`. Set `SSH_PASSWORD` in one of these ways:

1. **Terminal (current session):**  
   `export SSH_PASSWORD='yourpassword'`  
   Then start the debugger from that terminal or from the Run and Debug panel (VS Code may inherit env).

2. **VS Code env file:**  
   Add to `.env` in the workspace root (and add `.env` to `.gitignore` if it contains secrets). VS Code can load it via the "envFile" property in launch.json:

   ```json
   "envFile": "${workspaceFolder}/.env"
   ```

   In `.env`:  
   `SSH_PASSWORD=yourpassword`

3. **launch.json env (not recommended for secrets):**  
   In the configuration:  
   `"env": { "SSH_PASSWORD": "yourpassword" }`  
   Avoid committing real passwords.

### Config examples (copy into `.vscode/launch.json`)

**Connection test (remote):**

```json
{
  "name": "Connection test (remote)",
  "type": "debugpy",
  "request": "launch",
  "python": "${workspaceFolder}/project_deploy_manager/.venv/bin/python",
  "program": "${workspaceFolder}/project_deploy_manager/connection_test.py",
  "args": ["102.215.92.41", "root", "${env:SSH_PASSWORD}", "-v"],
  "cwd": "${workspaceFolder}/project_deploy_manager",
  "console": "integratedTerminal",
  "justMyCode": false
}
```

**Check disk space (local):**

```json
{
  "name": "Check disk space (local)",
  "type": "debugpy",
  "request": "launch",
  "python": "${workspaceFolder}/project_deploy_manager/.venv/bin/python",
  "program": "${workspaceFolder}/project_deploy_manager/check_disk_space_local.py",
  "args": ["-v", "--threshold", "90"],
  "cwd": "${workspaceFolder}/project_deploy_manager",
  "console": "integratedTerminal"
}
```

**Check disk space (remote):**

```json
{
  "name": "Check disk space (remote)",
  "type": "debugpy",
  "request": "launch",
  "python": "${workspaceFolder}/project_deploy_manager/.venv/bin/python",
  "program": "${workspaceFolder}/project_deploy_manager/check_disk_space_remote.py",
  "args": ["102.215.92.41", "root", "${env:SSH_PASSWORD}", "-v"],
  "cwd": "${workspaceFolder}/project_deploy_manager",
  "console": "integratedTerminal"
}
```

**Check Docker (remote):**

```json
{
  "name": "Check Docker (remote)",
  "type": "debugpy",
  "request": "launch",
  "python": "${workspaceFolder}/project_deploy_manager/.venv/bin/python",
  "program": "${workspaceFolder}/project_deploy_manager/check_docker.py",
  "args": ["102.215.92.41", "root", "${env:SSH_PASSWORD}", "-v"],
  "cwd": "${workspaceFolder}/project_deploy_manager",
  "console": "integratedTerminal"
}
```

**Install Docker (remote):**

```json
{
  "name": "Install Docker (remote)",
  "type": "debugpy",
  "request": "launch",
  "python": "${workspaceFolder}/project_deploy_manager/.venv/bin/python",
  "program": "${workspaceFolder}/project_deploy_manager/install_docker.py",
  "args": ["102.215.92.41", "root", "${env:SSH_PASSWORD}", "-v"],
  "cwd": "${workspaceFolder}/project_deploy_manager",
  "console": "integratedTerminal"
}
```

**Docker list volumes (local):**

```json
{
  "name": "Docker list volumes (local)",
  "type": "debugpy",
  "request": "launch",
  "python": "${workspaceFolder}/project_deploy_manager/.venv/bin/python",
  "program": "${workspaceFolder}/project_deploy_manager/docker_list_volumes_local.py",
  "args": [],
  "cwd": "${workspaceFolder}/project_deploy_manager",
  "console": "integratedTerminal"
}
```

**Docker delete volume (remote):**

```json
{
  "name": "Docker delete volume (remote)",
  "type": "debugpy",
  "request": "launch",
  "python": "${workspaceFolder}/project_deploy_manager/.venv/bin/python",
  "program": "${workspaceFolder}/project_deploy_manager/docker_delete_volume_remote.py",
  "args": ["102.215.92.41", "root", "${env:SSH_PASSWORD}", "volume_name_here", "-v"],
  "cwd": "${workspaceFolder}/project_deploy_manager",
  "console": "integratedTerminal"
}
```

**Restart host (remote, dry-run):**

```json
{
  "name": "Restart host (remote, dry-run)",
  "type": "debugpy",
  "request": "launch",
  "python": "${workspaceFolder}/project_deploy_manager/.venv/bin/python",
  "program": "${workspaceFolder}/project_deploy_manager/restart_host_remote.py",
  "args": ["102.215.92.41", "root", "${env:SSH_PASSWORD}", "--dry-run"],
  "cwd": "${workspaceFolder}/project_deploy_manager",
  "console": "integratedTerminal"
}
```

Replace `102.215.92.41`, `root`, and `volume_name_here` with your host, user, and volume name. The repo’s `.vscode/launch.json` already contains these (and more) configs; adjust args there as needed.

-------------
ssh root@102.215.92.41
YOUR_PASSWORD
cd /home/project
docker compose logs -f

python create_dir_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /home/project

python list_dir_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /home/project

python git_install_remote.py 102.215.92.41 root 'YOUR_PASSWORD'

python docker_compose_install_remote.py 102.215.92.41 root 'YOUR_PASSWORD'

python git_clone_remote.py 102.215.92.41 root 'YOUR_PASSWORD' https://github.com/Ag8te/ag8te-main /home/project --pac-token YOUR_GITHUB_TOKEN

python copy_env_remote.py 102.215.92.41 root 'YOUR_PASSWORD' ../.env.prod /home/project

python list_dir_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /home/project

python docker_compose_up_build_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /home/project

python docker_compose_logs_follow_stream_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /home/project

python dns_lookup_remote.py 102.215.92.41 root 'YOUR_PASSWORD' ag8te.com

python nginx_check_install_remote.py 102.215.92.41 root 'YOUR_PASSWORD'

python nginx_install_remote.py 102.215.92.41 root 'YOUR_PASSWORD'

python nginx_start_remote.py 102.215.92.41 root 'YOUR_PASSWORD'

python nginx_fetch_nginx_conf_file_remote.py 102.215.92.41 root 'YOUR_PASSWORD' -o ../nginx_dir/old/nginx.conf

python nginx_start_remote.py 102.215.92.41 root 'YOUR_PASSWORD'

python nginx_deploy_nginx_conf_file_remote.py 102.215.92.41 root 'YOUR_PASSWORD' ../nginx_dir/new/nginx.ip.conf

python nginx_deploy_nginx_conf_file_remote.py 102.215.92.41 root 'YOUR_PASSWORD' ../nginx_dir/new/nginx.http.conf
people being dumped and shimmy exposing them on work groups

python nginx_run_certbot_remote.py 102.215.92.41 root 'YOUR_PASSWORD' ag8te.com www.ag8te.com ag8te.co.za www.ag8te.co.za mzansiserve.co.za www.mzansiserve.co.za --email info@ag8te.com --agree-tos --non-interactive

python nginx_deploy_nginx_conf_file_remote.py 102.215.92.41 root 'YOUR_PASSWORD' ../nginx_dir/new/nginx.https.conf

python nginx_restart_remote.py 102.215.92.41 root 'YOUR_PASSWORD'

python nginx_stream_logs_remote.py 102.215.92.41 root 'YOUR_PASSWORD'

python docker_compose_list_containers_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /home/project

# Initial setup: populate countries, categories, services (and optionally create admin)
# Without admin user (optional):
python docker_compose_run_setup_scripts_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /home/project

# With admin user (optional):
python docker_compose_run_setup_scripts_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /home/project --admin-email info@ag8te.com --admin-password 'tsebiessecret' --admin-name "tsebie"

# Streams remote git pull output to the console
python git_pull_update_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /home/project


python docker_compose_down_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /home/project

python docker_compose_up_build_remote.py 102.215.92.41 root 'YOUR_PASSWORD' /home/project

docker system df
docker image prune 
docker container prune 

ssh root@102.215.92.41
YOUR_PASSWORD
cd /home/project
docker-compose exec app flask seed-agents
