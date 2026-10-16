"""Reproduce fast-forward background synchronization on the retained replay release."""
from pathlib import Path
import hashlib,json
HERE=Path(__file__).resolve().parent
WEB=HERE.parents[1]
SOURCE='index-r4-replay-20261016.js'
TARGET='index-r4-fast-background-20261016.js'
EXPECTED='14f31394f70eb2164abbdb8370e69b9941b5e9c6c2a055b65653b4b7ee548ee0'
def once(s,a,b):
 assert s.count(a)==1,('Unexpected patch anchor',a[:100],s.count(a))
 return s.replace(a,b,1)
def build():
 s=(WEB/'assets'/SOURCE).read_text()
 assert hashlib.sha256(s.encode()).hexdigest()==EXPECTED
 old=(WEB/'engine-source/r4-background/background-swap.mjs').read_text().replace('export function','function',1)
 new=(HERE/'background-swap.mjs').read_text().replace('export function','function',1)
 s=once(s,old,new)
 s=once(s,'fast_timeout:50','fast_timeout:150')
 # dp is the shared fast-forward step (button / held Ctrl). Do not change text,
 # animation timing, choices, or the player's selected skip mode.
 s=once(s,'dp=()=>{I.events.userInteractNext.emit(),',
   'dp=()=>{if(I.gameplay.isFast&&r4BackgroundSwap.waiting(I.gameplay.pixiStage))return;I.events.userInteractNext.emit(),')
 for old,new in [('initRegister-r4-replay-20261016.js','initRegister-r4-fast-background-20261016.js'),('index.es-r4-replay-20261016.js','index.es-r4-fast-background-20261016.js')]:
  s=once(s,old,new)
  chunk=(WEB/'assets'/old).read_text()
  (WEB/'assets'/new).write_text(once(chunk,'./'+SOURCE,'./'+TARGET))
 (WEB/'assets'/TARGET).write_text(s)
 report={'input':SOURCE,'input_sha256':EXPECTED,'output':TARGET,'output_sha256':hashlib.sha256(s.encode()).hexdigest()}
 (HERE/'patch-manifest.json').write_text(json.dumps(report,indent=2)+'\n')
 print(json.dumps(report))
if __name__=='__main__':build()
