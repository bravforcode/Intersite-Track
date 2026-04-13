#!/usr/bin/env python3
"""
Install Obsidian community plugins from source repositories listed in community-plugins.json.

Default source:
https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugins.json
"""

from __future__ import annotations

import argparse
import json
import logging
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable
from urllib.parse import urlparse
from urllib.request import Request, urlopen


DEFAULT_SOURCE = "https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugins.json"
COMMON_BUILD_SCRIPTS = ("build", "dist", "release", "compile", "bundle")
REQUIRED_ARTIFACTS = ("main.js", "manifest.json", "styles.css")


@dataclass(slots=True)
class PluginEntry:
    plugin_id: str
    repo: str
    name: str


@dataclass(slots=True)
class PluginResult:
    plugin_id: str
    repo: str
    status: str
    build_script: str | None = None
    message: str = ""
    artifacts: tuple[str, ...] = ()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Clone, build, and install Obsidian community plugins from source.",
    )
    parser.add_argument(
        "--source",
        default=DEFAULT_SOURCE,
        help="Path or URL for community-plugins.json. Defaults to the official Obsidian releases JSON.",
    )
    parser.add_argument(
        "--vault-path",
        help="Path to the Obsidian vault. Plugins will be installed into <vault>/.obsidian/plugins.",
    )
    parser.add_argument(
        "--plugins-dir",
        help="Explicit target plugin directory. Overrides --vault-path if both are provided.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Maximum number of plugins to process. 0 means no limit.",
    )
    parser.add_argument(
        "--existing",
        choices=("skip", "pull"),
        default="pull",
        help="What to do when the plugin folder already exists. Default: pull",
    )
    parser.add_argument(
        "--plugin-id",
        action="append",
        default=[],
        help="Optional plugin id filter. Repeat the flag to install only selected plugins.",
    )
    parser.add_argument(
        "--keep-node-modules",
        action="store_true",
        help="Keep node_modules after build. Default behavior removes it to save space.",
    )
    parser.add_argument(
        "--log-file",
        default="logs/obsidian-plugin-installer.log",
        help="Log file path. Default: logs/obsidian-plugin-installer.log",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Resolve plugins and print the plan without cloning or building.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    setup_logging(Path(args.log_file))

    try:
        plugins_dir = resolve_plugins_dir(args)
    except ValueError as exc:
        logging.error(str(exc))
        return 2

    plugins = load_plugin_entries(args.source)
    if args.plugin_id:
        allowed = {plugin_id.strip() for plugin_id in args.plugin_id if plugin_id.strip()}
        plugins = [plugin for plugin in plugins if plugin.plugin_id in allowed]

    if args.limit and args.limit > 0:
        plugins = plugins[: args.limit]

    if not plugins:
        logging.warning("No plugins matched the current filters.")
        return 0

    plugins_dir.mkdir(parents=True, exist_ok=True)
    logging.info("Target plugin directory: %s", plugins_dir)
    logging.info("Plugins selected: %s", len(plugins))

    if args.dry_run:
        for plugin in plugins:
            logging.info("[dry-run] %s -> %s", plugin.plugin_id, plugin.repo)
        return 0

    results: list[PluginResult] = []
    for index, plugin in enumerate(plugins, start=1):
        logging.info("[%s/%s] Processing %s (%s)", index, len(plugins), plugin.plugin_id, plugin.repo)
        result = process_plugin(
            plugin=plugin,
            plugins_dir=plugins_dir,
            existing_mode=args.existing,
            keep_node_modules=args.keep_node_modules,
        )
        results.append(result)
        logging.info(
            "[%s] %s | build=%s | artifacts=%s | %s",
            result.status,
            result.plugin_id,
            result.build_script or "-",
            ", ".join(result.artifacts) if result.artifacts else "-",
            result.message or "done",
        )

    print_summary(results, plugins_dir)
    return 0


def resolve_plugins_dir(args: argparse.Namespace) -> Path:
    if args.plugins_dir:
        return Path(args.plugins_dir).expanduser().resolve()
    if args.vault_path:
        return Path(args.vault_path).expanduser().resolve() / ".obsidian" / "plugins"
    raise ValueError("Provide either --vault-path or --plugins-dir.")


def load_plugin_entries(source: str) -> list[PluginEntry]:
    raw = read_source(source)
    payload = json.loads(raw)
    entries: list[PluginEntry] = []

    if not isinstance(payload, list):
        raise ValueError("community-plugins.json must contain a JSON array.")

    for item in payload:
        if not isinstance(item, dict):
            continue
        plugin_id = str(item.get("id", "")).strip()
        repo = str(item.get("repo", "")).strip()
        name = str(item.get("name", plugin_id)).strip() or plugin_id
        if not plugin_id or not repo:
            continue
        entries.append(PluginEntry(plugin_id=plugin_id, repo=repo, name=name))

    return entries


def read_source(source: str) -> str:
    parsed = urlparse(source)
    if parsed.scheme in {"http", "https"}:
        request = Request(source, headers={"User-Agent": "obsidian-plugin-installer/1.0"})
        with urlopen(request, timeout=30) as response:
            return response.read().decode("utf-8")
    return Path(source).expanduser().read_text(encoding="utf-8")


def process_plugin(
    plugin: PluginEntry,
    plugins_dir: Path,
    existing_mode: str,
    keep_node_modules: bool,
) -> PluginResult:
    plugin_dir = plugins_dir / plugin.plugin_id
    repo_url = f"https://github.com/{plugin.repo}.git"

    try:
        if plugin_dir.exists():
            prepare_existing_repo(plugin_dir, existing_mode)
            if existing_mode == "skip":
                return PluginResult(
                    plugin_id=plugin.plugin_id,
                    repo=plugin.repo,
                    status="skipped",
                    message="plugin directory already exists",
                    artifacts=detect_artifacts(plugin_dir),
                )
        else:
            run_command(["git", "clone", repo_url, str(plugin_dir)], cwd=plugins_dir)

        package_json_path = plugin_dir / "package.json"
        if not package_json_path.exists():
            return PluginResult(
                plugin_id=plugin.plugin_id,
                repo=plugin.repo,
                status="no-package-json",
                message="package.json not found; skipped install/build",
                artifacts=detect_artifacts(plugin_dir),
            )

        package_json = json.loads(package_json_path.read_text(encoding="utf-8"))
        scripts = package_json.get("scripts", {}) if isinstance(package_json, dict) else {}
        build_script = detect_build_script(scripts)

        run_command(["npm", "install"], cwd=plugin_dir)

        if not build_script:
            return PluginResult(
                plugin_id=plugin.plugin_id,
                repo=plugin.repo,
                status="no-build-script",
                message="package.json has no supported build script",
                artifacts=detect_artifacts(plugin_dir),
            )

        run_command(["npm", "run", build_script], cwd=plugin_dir)

        artifacts = detect_artifacts(plugin_dir)
        return PluginResult(
            plugin_id=plugin.plugin_id,
            repo=plugin.repo,
            status="built",
            build_script=build_script,
            message="build completed",
            artifacts=artifacts,
        )
    except Exception as exc:  # noqa: BLE001
        logging.exception("Plugin failed: %s", plugin.plugin_id)
        return PluginResult(
            plugin_id=plugin.plugin_id,
            repo=plugin.repo,
            status="failed",
            message=str(exc),
            artifacts=detect_artifacts(plugin_dir),
        )
    finally:
        if not keep_node_modules:
            cleanup_node_modules(plugin_dir)


def prepare_existing_repo(plugin_dir: Path, existing_mode: str) -> None:
    if existing_mode == "skip":
        return
    if not (plugin_dir / ".git").exists():
        raise RuntimeError(f"Existing directory is not a git repository: {plugin_dir}")
    run_command(["git", "-C", str(plugin_dir), "pull", "--ff-only"])


def detect_build_script(scripts: object) -> str | None:
    if not isinstance(scripts, dict):
        return None
    for name in COMMON_BUILD_SCRIPTS:
        if isinstance(scripts.get(name), str):
            return name
    return None


def detect_artifacts(plugin_dir: Path) -> tuple[str, ...]:
    found = [artifact for artifact in REQUIRED_ARTIFACTS if (plugin_dir / artifact).exists()]
    return tuple(found)


def cleanup_node_modules(plugin_dir: Path) -> None:
    node_modules = plugin_dir / "node_modules"
    if node_modules.exists():
        shutil.rmtree(node_modules, ignore_errors=True)


def run_command(command: list[str], cwd: Path | None = None) -> None:
    executable = resolve_executable(command[0])
    resolved_command = [executable, *command[1:]]
    completed = subprocess.run(
        resolved_command,
        cwd=str(cwd) if cwd else None,
        check=False,
        capture_output=True,
        text=True,
    )
    if completed.stdout.strip():
        logging.debug(completed.stdout.strip())
    if completed.stderr.strip():
        logging.debug(completed.stderr.strip())
    if completed.returncode != 0:
        raise RuntimeError(
            f"Command failed ({completed.returncode}): {' '.join(command)}\n"
            f"{completed.stderr.strip() or completed.stdout.strip()}"
        )


def resolve_executable(command: str) -> str:
    direct = shutil.which(command)
    if direct:
        return direct

    if sys.platform.startswith("win"):
        for suffix in (".cmd", ".exe", ".bat"):
            candidate = shutil.which(f"{command}{suffix}")
            if candidate:
                return candidate

    return command


def print_summary(results: Iterable[PluginResult], plugins_dir: Path) -> None:
    results = list(results)
    counts: dict[str, int] = {}
    for result in results:
        counts[result.status] = counts.get(result.status, 0) + 1

    logging.info("Completed plugin installation into %s", plugins_dir)
    logging.info("Summary: %s", ", ".join(f"{status}={count}" for status, count in sorted(counts.items())))

    print("\nObsidian plugin installer summary")
    print(f"Target: {plugins_dir}")
    for status, count in sorted(counts.items()):
        print(f"- {status}: {count}")

    failures = [result for result in results if result.status in {"failed", "no-package-json", "no-build-script"}]
    if failures:
        print("\nPlugins requiring manual follow-up:")
        for result in failures:
            print(f"- {result.plugin_id} ({result.status}) :: {result.message}")


def setup_logging(log_file: Path) -> None:
    log_file.parent.mkdir(parents=True, exist_ok=True)
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        handlers=[
            logging.FileHandler(log_file, encoding="utf-8"),
            logging.StreamHandler(sys.stdout),
        ],
    )


if __name__ == "__main__":
    sys.exit(main())
