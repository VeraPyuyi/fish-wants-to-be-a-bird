#!/usr/bin/env python3
"""Reproduce the ending-player bundle from the preserved background-fix bundle."""
import hashlib
from pathlib import Path
SOURCE='index-r4-background-20261016.js'
TARGET='index-r4-ending-20261016.js'
EXPECTED='9a6e8ea7ebafb1a714b208b4ebd0b6dd66a0f541121a57a5a652c2133e3f9a5e'
HERE=Path(__file__).resolve().parent
WEB=HERE.parents[1]
def once(text,old,new):
    assert text.count(old)==1, ('anchor mismatch',old[:100],text.count(old))
    return text.replace(old,new,1)
def build():
    original=(WEB/'assets'/SOURCE).read_text()
    assert hashlib.sha256(original.encode()).hexdigest()==EXPECTED
    controller=(WEB/'engine-source/r4-bgm/bgm-controller.mjs').read_text().replace('export function','function',1)
    replacement=(HERE/'bgm-controller.mjs').read_text().replace('export const ','const ').replace('export function ','function ')
    result=once(original,controller,replacement)
    start=result.index('mEe=e=>{'); end=result.index('},yEe=e=>',start)+1
    result=result[:start]+'mEe=createEndingPerform'+result[end:]
    result=once(result,'Sne(e).filter(n=>t.ignoreLineGate?!0:n.lineNumber<=xne)','Sne(e).filter(n=>n.type!==rn.video&&(t.ignoreLineGate?!0:n.lineNumber<=xne))')
    result=once(result,'a=document.createElement("audio"),a.src=r,n&&(a.loop=!0)','a=document.createElement("audio"),opLocalTransientAudio.add(a),a.src=r,n&&(a.loop=!0)')
    result=once(result,'a&&(a.onended=null,a.pause(),a.remove(),a=null)','a&&(opLocalTransientAudio.delete(a),a.onended=null,a.pause(),a.remove(),a=null)')
    # Add a keyboard-accessible native title action using the established styling.
    anchor='r.enableAppreciationMode&&C.jsx("div",{className:`${v("Title_button",Kn.Title_button)}'
    button='C.jsx("button",{id:"ending-replay","aria-label":"重播结尾视频",type:"button",className:v("Title_button",Kn.Title_button),style:{textAlign:"left"},onClick:replayEndingFilm,onMouseEnter:c,children:m("重播结尾视频")}),'
    result=once(result,anchor,button+anchor)
    for old,new in [('initRegister-r4-background-20261016.js','initRegister-r4-ending-20261016.js'),('index.es-r4-background-20261016.js','index.es-r4-ending-20261016.js')]:
        result=once(result,old,new)
        chunk=(WEB/'assets'/old).read_text()
        (WEB/'assets'/new).write_text(once(chunk,'./'+SOURCE,'./'+TARGET))
    result=(HERE/'ending-player.mjs').read_text().replace('export function ','function ')+(HERE/'adapter.js').read_text()+'\n'+result
    (WEB/'assets'/TARGET).write_text(result)
    print(TARGET,hashlib.sha256(result.encode()).hexdigest())
if __name__=='__main__':build()
