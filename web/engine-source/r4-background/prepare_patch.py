"""Reproduce atomic static-background swaps on the released r4 skip bundle."""
from pathlib import Path
import argparse
import hashlib
import json

HERE = Path(__file__).resolve().parent
SOURCE = 'index-r4-skip-20261016.js'
SOURCE_SHA = 'e45f01df0a8f52a7d562939abf4edd70d7570d648754ac79d0510a29ed5ac327'
TARGET = 'index-r4-background-20261016.js'
CHUNKS = {
    'initRegister-r4-skip-20261016.js': 'initRegister-r4-background-20261016.js',
    'index.es-r4-skip-20261016.js': 'index.es-r4-background-20261016.js',
}

def digest(value): return hashlib.sha256(value).hexdigest()

def replace_once(source, old, new):
    assert source.count(old) == 1, 'Patch anchor mismatch: ' + old
    return source.replace(old, new)

def patch(source):
    assert digest(source.encode()) == SOURCE_SHA, 'Unexpected input engine bundle'
    start, end = source.index('addBg(t,r){'), source.index('addVideoBg(t,r){')
    method = source[start:end]
    # Cached textures must be attached in the same task that retires the old sprite.
    method = replace_once(method, 'const c=()=>{setTimeout(()=>{', 'const c=()=>{')
    method = replace_once(method, 'this.requestRender()}},0)};', 'this.requestRender()}};')
    source = source[:start] + method + source[end:]
    source = replace_once(source, 'function hPe(e,t){', 'function r4CommitBackground(e,t){')
    source = replace_once(source, 'if(n.includes(o))continue;',
        'if(n.includes(o)||r4BackgroundSwap.holding(t,o))continue;')
    source = replace_once(source, 'registerAnimation(t,r,n="default"){var i;t&&(',
        'registerAnimation(t,r,n="default"){var i;if(r4BackgroundSwap.holding(this,n))return;t&&(')
    helper = (HERE / 'background-swap.mjs').read_text().replace('export function', 'function', 1)
    adapter = '''
const r4BackgroundSwap=createBackgroundSwap({
  isStatic:url=>/\\.(?:webp|png|jpe?g)(?:[?#]|$)/i.test(url),
  ready:(stage,url)=>{const t=stage.assetLoader.resources?.[url]?.texture;return !!(t&&t.valid&&t.width>0&&t.height>0)},
  load:(stage,url,done)=>stage.loadAsset(url,done),
  current:stage=>I.gameplay.pixiStage===stage?Y.getViewStageState():null,
  commit:(stage,state,skip)=>{r4CommitBackground(state,skip);cPe(state.effects)},
  failed:url=>{ee.error("背景未能载入，保留上一画面",url);window.dispatchEvent(new CustomEvent("webgal-asset-error",{detail:{url}}))}
});
function hPe(state,skip){const stage=I.gameplay.pixiStage;if(stage)r4BackgroundSwap.update(stage,state,skip)}
'''
    return source + '\n/* r4 atomic background replacement */\n' + helper + adapter

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--web', type=Path, default=HERE.parents[1])
    args = parser.parse_args()
    assets = args.web / 'assets'
    result = patch((assets / SOURCE).read_text())
    chunks = {}
    for old, new in CHUNKS.items():
        chunk = (assets / old).read_text()
        chunk = replace_once(chunk, './' + SOURCE, './' + TARGET)
        result = replace_once(result, old, new)
        chunks[new] = chunk
    (assets / TARGET).write_text(result)
    for name, content in chunks.items(): (assets / name).write_text(content)
    report = {'source': SOURCE, 'source_sha256': SOURCE_SHA,
              'output': TARGET, 'output_sha256': digest(result.encode()),
              'chunks': {k: digest(v.encode()) for k,v in chunks.items()}}
    (HERE / 'patch-manifest.json').write_text(json.dumps(report, indent=2)+'\n')
    print(json.dumps(report, indent=2))

if __name__ == '__main__': main()
