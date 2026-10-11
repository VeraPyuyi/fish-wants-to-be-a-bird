#!/usr/bin/env python3
"""Small, project-specific checks for the WebGAL prologue.

This intentionally validates the native scene files; it is not a story
compiler. Run it after `engine_sync.py` and before starting the local server.
"""

from __future__ import annotations

import re
import sys
import json
import itertools
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCENE_DIR = ROOT / "web" / "game" / "scene"
CONTRACT = ROOT / "production" / "narrative" / "scene_contract.json"
ASSET_DIRS = {
    "changeBg": ROOT / "web" / "game" / "background",
    "bgm": ROOT / "web" / "game" / "bgm",
    "playEffect": ROOT / "web" / "game" / "vocal",
    "changeFigure": ROOT / "web" / "game" / "figure",
}
# Commands use ASCII names, while dialogue uses Chinese speaker names.  Keep
# both forms visible so an accidental command typo cannot be silently treated
# as dialogue by WebGAL.
COMMAND_RE = re.compile(r"^([^:\s]+):(.*)$")
KNOWN_COMMANDS = {
    "applyStyle",
    "bgm",
    "changeBg",
    "changeFigure",
    "choose",
    "jumpLabel",
    "label",
    "setVar",
    "changeScene",
    "callScene",
    "playEffect",
    "setTransform",
}
KNOWN_SPEAKERS = {
    "中介店主", "司机", "后方男人", "售票员", "客人乙", "客人甲", "小吃店老板娘", "小贩",
    "年轻乘客", "广播", "张阿姨", "房东", "摩的司机", "旅店老板娘", "检票员", "母亲",
    "清洁阿姨", "父亲", "老板", "老板娘", "苏雨晴",
}


def statement(line: str) -> str:
    """Return the WebGAL statement portion, removing comments and whitespace."""
    return line.split(";", 1)[0].strip()


def asset_name(content: str) -> str:
    """Return the leading WebGAL asset token, excluding native flags.

    WebGAL commands accept options such as ``-volume`` and ``-id`` after an
    asset.  A figure clear has no asset and begins directly with ``-id``.
    """
    stripped = content.strip()
    if not stripped or stripped.startswith("-"):
        return ""
    return stripped.split(None, 1)[0]


def validate_prologue_routes(path: Path) -> list[str]:
    """Walk this prologue's eight native routes, including conditional dialogue."""
    lines = [statement(s) for s in path.read_text(encoding="utf-8").splitlines()]
    labels = {s[6:]: i for i, s in enumerate(lines) if s.startswith("label:")}
    errors = []
    for route in itertools.product((1, 2), repeat=3):
        variables, spoken = {}, []
        index = choice = 0
        for _ in range(2000):
            if index >= len(lines):
                errors.append(f"route {route}: fell off script before end")
                break
            text = lines[index]
            index += 1
            condition = re.search(r" -when=(\w+)==(\d+)$", text)
            if condition:
                if variables.get(condition[1]) != int(condition[2]):
                    continue
                text = text[:condition.start()]
            if text == "end":
                if choice != 3:
                    errors.append(f"route {route}: reached end after only {choice} choices")
                note = "「既然你们不认，那我走就是。」" if route[0] == 1 else "「无论如何，我都要离开这里。」"
                other = "「无论如何，我都要离开这里。」" if route[0] == 1 else "「既然你们不认，那我走就是。」"
                if note not in spoken or other in spoken:
                    errors.append(f"route {route}: farewell note contradicts selected choice")
                break
            if text.startswith("setVar:"):
                match = re.match(r"setVar:(\w+)=(\d+)", text)
                if match:
                    variables[match[1]] = int(match[2])
            elif text.startswith("choose:"):
                if choice >= 3:
                    errors.append(f"route {route}: repeated or extra choice")
                    break
                target = text[7:].split("|")[route[choice] - 1].rsplit(":", 1)[1]
                index = labels[target]
                choice += 1
            elif text.startswith("jumpLabel:"):
                index = labels[text[10:]]
            elif text.startswith("苏雨晴:"):
                spoken.append(text[4:])
        else:
            errors.append(f"route {route}: possible jump loop")
    return errors


def main() -> int:
    errors: list[str] = []
    if not SCENE_DIR.is_dir():
        print(f"ERROR: missing scene directory: {SCENE_DIR}")
        return 1

    scenes = sorted(SCENE_DIR.rglob("*.txt"))
    scene_names = {path.relative_to(SCENE_DIR).as_posix() for path in scenes}
    if "start.txt" not in scene_names:
        errors.append("missing required entry scene: start.txt")

    labels: dict[Path, set[str]] = {}
    pending: list[tuple[Path, int, str, str]] = []
    choices: list[tuple[Path, int, int]] = []
    template_classes = set()
    for stylesheet in (ROOT / "web/game/template").rglob("*.scss"):
        template_classes.update(re.findall(r"\.([A-Za-z_][A-Za-z0-9_-]*)", stylesheet.read_text(encoding="utf-8")))
    for path in scenes:
        labels[path] = set()
        for line_no, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            text = statement(raw)
            if not text:
                continue
            if text == "end":
                continue
            if text.startswith(":"):
                continue  # WebGAL anonymous narration.
            if text.startswith("label:"):
                labels[path].add(text[6:].strip())
                continue
            match = COMMAND_RE.match(text)
            if not match:
                errors.append(f"{path}:{line_no}: unrecognised statement: {text!r}")
                continue
            command, content = match.groups()
            if command not in KNOWN_COMMANDS:
                if command not in KNOWN_SPEAKERS:
                    errors.append(f"{path}:{line_no}: unknown command or speaker: {command}")
                continue
            if command == "applyStyle":
                for mapping in content.strip().split(","):
                    parts = mapping.split("->")
                    if len(parts) != 2 or any(name not in template_classes for name in parts):
                        errors.append(f"{path}:{line_no}: invalid or missing template style: {mapping!r}")
            elif command in {"changeScene", "callScene"}:
                target = content.strip()
                pending.append((path, line_no, command, target))
            elif command == "jumpLabel":
                pending.append((path, line_no, command, content.strip()))
            elif command == "choose":
                options = content.split("|")
                choices.append((path, line_no, len(options)))
                for option in options:
                    if ":" not in option:
                        errors.append(f"{path}:{line_no}: malformed choice: {option!r}")
                        continue
                    target = option.rsplit(":", 1)[1].strip()
                    pending.append((path, line_no, command, target))
            elif command in ASSET_DIRS:
                name = asset_name(content)
                if name and name != "none":
                    asset = ASSET_DIRS[command] / name
                    if not asset.is_file():
                        errors.append(f"{path}:{line_no}: missing {command} asset: {asset}")

    for path, line_no, command, target in pending:
        if command in {"changeScene", "callScene"} or (command == "choose" and target.endswith(".txt")):
            candidate = (path.parent / target).resolve()
            if not candidate.is_file():
                errors.append(f"{path}:{line_no}: missing scene target: {target}")
        else:
            if target not in labels[path]:
                errors.append(f"{path}:{line_no}: missing label in this scene: {target}")

    # This demo is deliberately limited to three binary choices. Keep this
    # contract visible in validation rather than constructing a general plot
    # graph or rewriting the author's scene file.
    if CONTRACT.is_file():
        contract = json.loads(CONTRACT.read_text(encoding="utf-8"))
        expected = len(contract.get("choice_variables", {}))
        if len(choices) != expected:
            errors.append(f"expected {expected} choices from scene contract, found {len(choices)}")
        for path, line_no, option_count in choices:
            if option_count != 2:
                errors.append(f"{path}:{line_no}: demo choices must be binary, found {option_count} options")

    if not errors:
        errors.extend(validate_prologue_routes(SCENE_DIR / "start.txt"))
    if errors:
        print("WebGAL validation failed:")
        print("\n".join(f"- {error}" for error in errors))
        return 1
    combinations = 2 ** len(choices)
    print(
        f"WebGAL validation passed: {len(scenes)} scene file(s), "
        f"{len(choices)} binary choices, {combinations} routes reach end with matching farewell text, "
        f"{len(pending)} jump(s)/choice target(s)."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
