#!/usr/bin/env python3
"""Create and verify the minimal public repository for the GitHub Pages release.

This tool is deliberately an allow-list exporter: it never copies the project
root wholesale. It is safe to re-run because its output must be underneath
production/technical/release_r2/ and is recreated on every export.
"""

from __future__ import annotations

import argparse
import hashlib
import http.server
import json
import shutil
import threading
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "production" / "technical" / "release_r2" / "public-repo"
TOP_LEVEL_FILES = ("README.md", "PUBLIC-RELEASE.md", "serve.py", "tools/engine_validate.py", "tools/public_release.py", ".github/workflows/pages.yml")
REQUIRED_WEB_FILES = (
    "index.html",
    "manifest.json",
    "webgal-serviceworker.js",
    "game-recovery.js",
    "game/config.txt",
    "game/scene/start.txt",
)
FORBIDDEN_PARTS = {"delivery", "production", "tmp", ".git", "__pycache__"}
FORBIDDEN_NAMES = {"启动试玩.command"}


def fail(message: str) -> None:
    raise SystemExit(f"public-release: {message}")


def require_source() -> None:
    missing = [path for path in (ROOT / "web", *(ROOT / item for item in TOP_LEVEL_FILES)) if not path.exists()]
    if missing:
        fail("missing release inputs: " + ", ".join(str(path.relative_to(ROOT)) for path in missing))
    missing_web = [name for name in REQUIRED_WEB_FILES if not (ROOT / "web" / name).is_file()]
    if missing_web:
        fail("missing required web files: " + ", ".join(missing_web))


def safe_output(path: Path) -> Path:
    resolved = path.resolve()
    release_root = (ROOT / "production" / "technical" / "release_r2").resolve()
    if resolved == release_root or release_root not in resolved.parents:
        fail(f"output must be below {release_root}")
    return resolved


def copy_file(source: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)


def export(output: Path) -> list[Path]:
    require_source()
    if output.exists():
        if (output / ".git").exists():
            fail("export destination is a Git checkout; choose a fresh export directory")
        shutil.rmtree(output)
    output.mkdir(parents=True)

    copied: list[Path] = []
    for source in sorted((ROOT / "web").rglob("*")):
        relative = source.relative_to(ROOT)
        if not source.is_file():
            continue
        if any(part in FORBIDDEN_PARTS for part in relative.parts) or source.name in FORBIDDEN_NAMES or "全本" in source.name:
            fail(f"forbidden input encountered: {relative}")
        destination = output / relative
        copy_file(source, destination)
        copied.append(relative)

    for relative_name in TOP_LEVEL_FILES:
        source = ROOT / relative_name
        destination = output / relative_name
        copy_file(source, destination)
        copied.append(Path(relative_name))

    return copied


def manifest(output: Path, copied: list[Path]) -> None:
    files = []
    for relative in sorted(copied):
        source = output / relative
        digest = hashlib.sha256(source.read_bytes()).hexdigest()
        files.append({"path": relative.as_posix(), "sha256": digest, "bytes": source.stat().st_size})
    (output / "PUBLIC-MANIFEST.json").write_text(
        json.dumps({"release": "r2-20260907", "files": files}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def verify(output: Path) -> None:
    unexpected = []
    allowed = {"web", "README.md", "PUBLIC-RELEASE.md", "serve.py", "tools", ".github", "PUBLIC-MANIFEST.json"}
    for path in output.iterdir():
        if path.name not in allowed:
            unexpected.append(path.name)
    if unexpected:
        fail("unexpected public top-level paths: " + ", ".join(sorted(unexpected)))
    for name in REQUIRED_WEB_FILES:
        if not (output / "web" / name).is_file():
            fail(f"release output is missing web/{name}")
    for forbidden in FORBIDDEN_PARTS | FORBIDDEN_NAMES:
        if list(output.rglob(forbidden)):
            fail(f"forbidden content copied to public output: {forbidden}")
    config = (output / "web/game/config.txt").read_text(encoding="utf-8")
    if "Game_key:fish_wants_to_be_an_eagle_r2_20260907;" not in config:
        fail("r2 Game_key is missing")
    index = (output / "web/index.html").read_text(encoding="utf-8")
    if "想要变成鹰的鱼" not in index or "r2-20260907" not in index:
        fail("title or cache revision is missing from index.html")
    print(f"verified {output}")


def smoke(output: Path) -> None:
    handler = lambda *args, **kwargs: http.server.SimpleHTTPRequestHandler(*args, directory=str(output / "web"), **kwargs)
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        base = f"http://127.0.0.1:{server.server_port}"
        for path in ("/", "/manifest.json", "/webgal-serviceworker.js", "/game/config.txt", "/game/scene/start.txt"):
            with urllib.request.urlopen(base + path, timeout=5) as response:
                if response.status != 200:
                    fail(f"local Pages smoke request failed: {path} -> {response.status}")
        print("local Pages smoke check passed")
    finally:
        server.shutdown()
        thread.join(timeout=5)
        server.server_close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Create the strict r2 public Pages export.")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--verify-only", action="store_true", help="validate an existing export without copying")
    parser.add_argument("--smoke", action="store_true", help="serve the exported web directory and request key Pages paths")
    args = parser.parse_args()
    output = safe_output(args.output)
    if args.verify_only:
        verify(output)
    else:
        copied = export(output)
        manifest(output, copied)
        verify(output)
        print(f"exported {len(copied)} public files to {output}")
    if args.smoke:
        smoke(output)


if __name__ == "__main__":
    main()
