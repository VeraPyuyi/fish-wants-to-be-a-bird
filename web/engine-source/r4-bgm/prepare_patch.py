"""Produce a deterministic, reviewed BGM-only bundle patch in this isolated directory.

Default does not touch web/. An explicit --output path is required for integration.
"""
from pathlib import Path
import argparse, hashlib, json

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
DEFAULT_SOURCE = ROOT / 'web/assets/index-R1tKotR6.js'
RUNTIME_NAME = 'index-r4-bgm-743786b1.js'
CHUNKS = {'initRegister-CesUtdWC.js': 'initRegister-r4-continuity01.js',
          'index.es-erQsk_Nn.js': 'index.es-r4-continuity01.js'}
OLD_CONTROL = 'p=tt(_=>_.GUI.isEnterGame),[v,g]=te.useState(setTimeout(()=>{},0)),x=(_,b,S)=>{S>=0?_.volume=0:_.volume=b;const E=10,A=b/S*E,T=()=>{const O=setTimeout(()=>{_.volume+A>=b?_.volume=b:_.volume+A<=0?(_.volume=0,Y.setStageAndCommit("bgm",{src:"",enter:0,volume:100})):(_.volume+=A,T())},E);g(O)};T()};return te.useEffect(()=>{clearTimeout(v);const _=document.getElementById("currentBgm");_&&(l===0?_.volume=s:x(_,s,l),_.src&&p&&_.play().catch(()=>{}))},[r,t,e.bgm.src,s,l,p]),'
NEW_CONTROL = 'p=tt(_=>_.GUI.isEnterGame),v=te.useRef(null);return te.useEffect(()=>{const _=document.getElementById("currentBgm");_&&(v.current||(v.current=createR4BgmController(_,()=>Y.setStageAndCommit("bgm",{src:"",enter:0,volume:100}))),v.current.update({src:r?t:e.bgm.src,targetVolume:s,enter:l,enabled:p,isTitle:r}))},[r,t,e.bgm.src,s,l,p]),te.useEffect(()=>()=>{v.current&&v.current.dispose()},[]),'
OLD_ELEMENT = 'C.jsx("audio",{id:"currentBgm",src:r?t:e.bgm.src,loop:!0,autoPlay:p},r.toString()+t)'
NEW_ELEMENT = 'C.jsx("audio",{id:"currentBgm",loop:!0,preload:"auto"},"r4-stable-bgm")'

def digest(b): return hashlib.sha256(b).hexdigest()

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', type=Path, default=DEFAULT_SOURCE)
    parser.add_argument('--output', type=Path, default=HERE / RUNTIME_NAME)
    parser.add_argument('--assets-dir', type=Path, help='Original sibling chunks; defaults to input directory')
    args = parser.parse_args()
    original = args.source.read_bytes()
    text = original.decode()
    if 'function createR4BgmController(' in text:
        raise SystemExit('Already patched: refusing duplicate application')
    for old in [OLD_CONTROL, OLD_ELEMENT]:
        if text.count(old) != 1:
            raise SystemExit('BGM patch anchor mismatch; inspect this engine version before applying')
    controller = (HERE / 'bgm-controller.mjs').read_text().replace('export function', 'function', 1)
    # Hoisted declaration is local to the existing ESM bundle, with no new global API.
    updated = text.replace(OLD_CONTROL, NEW_CONTROL).replace(OLD_ELEMENT, NEW_ELEMENT)
    updated += '\n/* R4 BGM transitions: original approved tracks, one native player. */\n' + controller
    # Keep circular ESM imports on the same entry module after versioning it.
    # The optional Live2D/animation chunks must never import the obsolete entry.
    chunks = {}
    assets = args.assets_dir or args.source.parent
    for old, new in CHUNKS.items():
        chunk = (assets / old).read_text()
        if chunk.count('./index-R1tKotR6.js') != 1 or updated.count(old) != 1:
            raise SystemExit('Lazy module reference mismatch')
        chunks[new] = chunk.replace('./index-R1tKotR6.js', './' + RUNTIME_NAME)
        updated = updated.replace(old, new)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(updated)
    for name, content in chunks.items():
        (args.output.parent / name).write_text(content)
    def display(p):
        try: return str(p.resolve().relative_to(ROOT))
        except ValueError: return p.name
    manifest = {'source': display(args.source), 'output': display(args.output),
                'before_sha256': digest(original), 'after_sha256': digest(updated.encode()),
                'controller_sha256': digest((HERE/'bgm-controller.mjs').read_bytes()),
                'music_files_modified': False, 'patch_scope': 'BGM hook/controller, stable audio element, versioned ESM references',
                'chunks': {name: digest(content.encode()) for name, content in chunks.items()}}
    (HERE/'patch-manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
    print(json.dumps(manifest, indent=2))

if __name__ == '__main__': main()
