"""Reproduce the save-lifecycle fixes from the published cinematic runtime."""
from pathlib import Path
import hashlib,json
HERE=Path(__file__).resolve().parent;WEB=HERE.parents[1]
SOURCE='index-r4-cinematic-20261016.js';TARGET='index-r4-save-audit-20261016.js'
EXPECTED='dc07da8def5d31958f7f17784b8932b80c4a64040e6700578377167392bdbd67'
def once(s,a,b):
 assert s.count(a)==1,(a[:120],s.count(a))
 return s.replace(a,b,1)
def build():
 s=(WEB/'assets'/SOURCE).read_text();assert hashlib.sha256(s.encode()).hexdigest()==EXPECTED
 extra=(HERE/'save-queue.mjs').read_text().replace('export function ','function ')+(HERE/'adapter.js').read_text()
 s=extra+s
 s=once(s,(WEB/'engine-source/r4-cinematic/ending-player.mjs').read_text().replace('export function ','function '),(HERE/'ending-player.mjs').read_text().replace('export function ','function '))
 s=once(s,'async function bTe(){J$.cancel(),Pe.dispatch(wa.resetFastSave()),await K$()}', 'async function bTe(){J$.cancel();await r4SaveIO.flush().catch(error=>ee.error("存档写入失败",error))}')
 s=once(s,'function createEndingPerform(e) {\n  const performName', 'function createEndingPerform(e) {\n  r4CheckpointBeforeEnding();\n  const performName')
 s=once(s,'async function yP(){if(Pe.getState().GUI.showTitle||', 'async function yP(){if(r4IsEndingState()||Pe.getState().GUI.showTitle||')
 s=once(s,'function K$(){return RS=RS.catch(()=>{}).then(Wg),RS}', 'function K$(){return RS=Wg(),RS}')
 s=once(s,'Un.setItem(`${I.gameKey}-saves${r}`,n)', 'r4SaveIO.write(`${I.gameKey}-saves${r}`,n)')
 s=once(s,'Un.getItem(`${I.gameKey}-saves${r}`)', 'r4SaveIO.read(`${I.gameKey}-saves${r}`)')
 s=once(s,'await Un.setItem(`${I.gameKey}-saves-fast`,e)', 'await r4SaveIO.write(`${I.gameKey}-saves-fast`,e)')
 s=once(s,'async function mP(){const e=await Un.getItem(`${I.gameKey}-saves-fast`);Pe.dispatch(wa.setFastSave(e))', 'async function mP(){const key=I.gameKey;const saved=await r4SaveIO.read(`${key}-saves-fast`);const e=saved??await r4SaveIO.read(`${key}-saves0`);if(key!==I.gameKey)return;Pe.dispatch(wa.setFastSave(e))')
 s=once(s,'const WE=e=>{if(I.sceneManager.lockSceneWrite)', 'const WE=e=>{if(Pe.getState().GUI.showTitle||r4IsEndingState()||I.sceneManager.lockSceneWrite)')
 s=once(s,'function gP(e){if(e)enterGameFullscreen();if(!e){ee.info("暂无存档");return}const t=e;', 'function gP(e){if(e)enterGameFullscreen();if(!e){ee.info("暂无存档");return}pP();J$.cancel();const t=e;')
 s=once(s,"gap:'28px'},children:[\n    C.jsx('button',{id:'ending-replay'", "gap:'28px'},children:[C.jsx(QuickSaveLoadEntry,{}),\n    C.jsx('button',{id:'ending-replay'")
 for old,new in [('initRegister-r4-cinematic-20261016.js','initRegister-r4-save-audit-20261016.js'),('index.es-r4-cinematic-20261016.js','index.es-r4-save-audit-20261016.js')]:
  s=once(s,old,new);chunk=(WEB/'assets'/old).read_text();(WEB/'assets'/new).write_text(once(chunk,'./'+SOURCE,'./'+TARGET))
 (WEB/'assets'/TARGET).write_text(s)
 report={'input':SOURCE,'input_sha256':EXPECTED,'output':TARGET,'output_sha256':hashlib.sha256(s.encode()).hexdigest()}
 (HERE/'patch-manifest.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
if __name__=='__main__':build()
