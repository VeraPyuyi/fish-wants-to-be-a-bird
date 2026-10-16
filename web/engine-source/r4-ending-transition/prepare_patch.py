"""Reproduce the ending boundary and fade from the save-audit release."""
from pathlib import Path
import hashlib,json
HERE=Path(__file__).resolve().parent; WEB=HERE.parents[1]
SOURCE='index-r4-save-audit-20261016.js'; TARGET='index-r4-ending-transition-20261016.js'
EXPECTED='bb37d7752490ada180e22ecb9a0ff1ee5a22e128b3e144213e75ff50d8060064'
def once(s,a,b):
 assert s.count(a)==1,(a[:100],s.count(a))
 return s.replace(a,b,1)
def build():
 s=(WEB/'assets'/SOURCE).read_text(); assert hashlib.sha256(s.encode()).hexdigest()==EXPECTED
 s=(HERE/'boundary.js').read_text()+s
 s=once(s,(WEB/'engine-source/r4-save-audit/ending-player.mjs').read_text().replace('export function ','function '),(HERE/'ending-player.mjs').read_text().replace('export function ','function '))
 s=once(s,'I.flowchartManager.unlockPendingCurrentScene()},Oa=()=>{Pe.getState()', 'I.flowchartManager.unlockPendingCurrentScene();r4StopAtEndingBoundary()},Oa=()=>{if(r4StopAtEndingBoundary())return;Pe.getState()')
 s=once(s,'dp=()=>{if(I.gameplay.isFast', 'dp=(source="manual")=>{if(source!=="manual"&&r4StopAtEndingBoundary())return;if(I.gameplay.isFast')
 s=once(s,'JAe=()=>{dp(),', 'JAe=()=>{dp("auto"),')
 s=once(s,'return}dp()},X3.fast_timeout)', 'return}dp("fast")},X3.fast_timeout)')
 s=once(s,'G$=()=>{I.gameplay.isAuto?', 'G$=()=>{if(r4StopAtEndingBoundary())return;I.gameplay.isAuto?')
 s=once(s,'z$=(e=!1)=>{if(dP()', 'z$=(e=!1)=>{if(r4StopAtEndingBoundary())return;if(dP()')
 s=once(s,'eTe=(e=150)=>{dP()', 'eTe=(e=150)=>{if(r4StopAtEndingBoundary())return;dP()')
 s=once(s,'o=te.useCallback(Y$(()=>{dp()},100),[])', 'o=te.useCallback(Y$(()=>{dp("wheel")},100),[])')
 for old,new in [('initRegister-r4-save-audit-20261016.js','initRegister-r4-ending-transition-20261016.js'),('index.es-r4-save-audit-20261016.js','index.es-r4-ending-transition-20261016.js')]:
  s=once(s,old,new); chunk=(WEB/'assets'/old).read_text(); (WEB/'assets'/new).write_text(once(chunk,'./'+SOURCE,'./'+TARGET))
 (WEB/'assets'/TARGET).write_text(s)
 report={'input':SOURCE,'input_sha256':EXPECTED,'output':TARGET,'output_sha256':hashlib.sha256(s.encode()).hexdigest()}
 (HERE/'patch-manifest.json').write_text(json.dumps(report,indent=2)+'\n'); print(json.dumps(report))
if __name__=='__main__':build()
