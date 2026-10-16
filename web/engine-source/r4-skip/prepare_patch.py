"""Reproduce the small skip-mode patch on the already released r4 BGM bundle.

Run python3 web/engine-source/r4-skip/prepare_patch.py --web web
The retained r4 input is hash-pinned; output and lazy modules have new URLs.
"""
from pathlib import Path
import argparse
import hashlib
import json

HERE = Path(__file__).resolve().parent
SOURCE = 'index-r4-bgm-743786b1.js'
SOURCE_SHA = '8deb6a98f2b7a003a2046f5d2800adf277066e1f029aff8c87e42f75af0e2956'
TARGET = 'index-r4-skip-20261016.js'
CHUNKS = {
    'initRegister-r4-continuity01.js': 'initRegister-r4-skip-20261016.js',
    'index.es-r4-continuity01.js': 'index.es-r4-skip-20261016.js',
}

def digest(value): return hashlib.sha256(value).hexdigest()

def patch(source):
    assert digest(source.encode()) == SOURCE_SHA, 'Unexpected input engine bundle'
    edits = [
        ('fullScreen:dT.off,skipAll:!1}', 'fullScreen:dT.off,skipAll:!0,fishSkipModeVersion:1}'),
        ('optionData:{...t.optionData,...r},appreciationData:', 'optionData:normalizeR4SkipOptions(r,t.optionData),appreciationData:'),
        ('xRe=()=>{const e=kn("gaming.")', 'xRe=()=>{const R4SkipAll=tt(R4State=>R4State.userData.optionData.skipAll),e=kn("gaming.")'),
        ('children:e("buttons.forward")', 'children:e("buttons.forward")+(R4SkipAll?"":"（已读）")'),
        ('id:"Button_ControlPanel_fast",className:De.singleButton,style:', 'id:"Button_ControlPanel_fast",title:R4SkipAll?"快进全部文本；再次点击停止":"仅快进已读文本；可在选项中改为全部，或按住 Ctrl 临时快进",className:De.singleButton,style:'),
        ('ARe=()=>{const e=vo(!1)', 'ARe=()=>{const R4SkipAll=tt(R4State=>R4State.userData.optionData.skipAll),e=vo(!1)'),
        ('children:"快进 / FAST"', 'children:R4SkipAll?"快进 / FAST":"已读快进 / READ"'),
    ]
    for old, new in edits:
        assert source.count(old) == 1, 'Patch anchor mismatch: ' + old
        source = source.replace(old, new)
    helper = (HERE / 'skip-options.mjs').read_text().replace('export function', 'function', 1)
    return source + '\n/* r4 skip mode: defaults, one-time settings migration, explicit read-only label. */\n' + helper

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--web', type=Path, default=HERE.parents[1])
    args = parser.parse_args()
    assets = args.web / 'assets'
    source = (assets / SOURCE).read_text()
    result = patch(source)
    chunks = {}
    for old, new in CHUNKS.items():
        chunk = (assets / old).read_text()
        assert chunk.count('./' + SOURCE) == 1 and result.count(old) == 1
        chunks[new] = chunk.replace('./' + SOURCE, './' + TARGET)
        result = result.replace(old, new)
    (assets / TARGET).write_text(result)
    for name, content in chunks.items(): (assets / name).write_text(content)
    report = {
        'source': SOURCE, 'source_sha256': SOURCE_SHA,
        'output': TARGET, 'output_sha256': digest(result.encode()),
        'chunks': {k: digest(v.encode()) for k, v in chunks.items()},
        'scope': 'Skip mode default and one-time migration; mode-specific button labels. No gameplay script, art, audio or save namespace changes.',
    }
    (HERE / 'patch-manifest.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(report, ensure_ascii=False, indent=2))

if __name__ == '__main__': main()
