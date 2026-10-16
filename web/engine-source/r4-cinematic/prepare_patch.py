"""Reproduce the frameless, preloaded ending player from the fast-background release."""
from pathlib import Path
import hashlib,json
HERE=Path(__file__).resolve().parent
WEB=HERE.parents[1]
SOURCE='index-r4-fast-background-20261016.js'
TARGET='index-r4-cinematic-20261016.js'
EXPECTED='a5ed2bc730f0a82a96c3d2cf2362ed3ff613e8154b959ac739bf3734487e50e9'
def once(s,a,b):
 assert s.count(a)==1,('Unexpected anchor',a[:100],s.count(a))
 return s.replace(a,b,1)
def plain(path):return path.read_text().replace('export function ','function ').replace('export async function ','async function ')
def build():
 s=(WEB/'assets'/SOURCE).read_text()
 assert hashlib.sha256(s.encode()).hexdigest()==EXPECTED
 s=once(s,plain(WEB/'engine-source/r4-replay/ending-player.mjs'),plain(HERE/'ending-player.mjs'))
 s=once(s,(WEB/'engine-source/r4-replay/adapter.js').read_text(),plain(HERE/'video-cache.mjs')+plain(HERE/'fullscreen.mjs')+(HERE/'adapter.js').read_text())
 s=once(s,'function uPe(e,t){t.syncPixiStage', 'function uPe(e,t){if(e.bgName&&!Pe.getState().GUI.showTitle)preloadEndingFilm();t.syncPixiStage')
 s=once(s,'CRe=()=>{B_();','CRe=()=>{enterGameFullscreen();B_();')
 s=once(s,'async function PRe(){Gc(', 'async function PRe(){enterGameFullscreen();Gc(')
 s=once(s,'function gP(e){if(!e)', 'function gP(e){if(e)enterGameFullscreen();if(!e)')
 s=once(s,'const i=t?()=>e.requestFullscreen():async()=>{},o=t?()=>document.exitFullscreen():async()=>{};', 'const i=()=>enterGameFullscreen(e),o=exitGameFullscreen;')
 s=once(s,'return document.addEventListener("fullscreenchange",a),()=>{document.removeEventListener("fullscreenchange",a)}', 'return document.addEventListener("fullscreenchange",a),document.addEventListener("webkitfullscreenchange",a),()=>{document.removeEventListener("fullscreenchange",a),document.removeEventListener("webkitfullscreenchange",a)}')
 s=once(s,'document.documentElement.requestFullscreen(),CM&&CM.lock(["Escape","F11"])', 'enterGameFullscreen()')
 for old,new in [('initRegister-r4-fast-background-20261016.js','initRegister-r4-cinematic-20261016.js'),('index.es-r4-fast-background-20261016.js','index.es-r4-cinematic-20261016.js')]:
  s=once(s,old,new)
  chunk=(WEB/'assets'/old).read_text()
  (WEB/'assets'/new).write_text(once(chunk,'./'+SOURCE,'./'+TARGET))
 (WEB/'assets'/TARGET).write_text(s)
 report={'input':SOURCE,'input_sha256':EXPECTED,'output':TARGET,'output_sha256':hashlib.sha256(s.encode()).hexdigest()}
 (HERE/'patch-manifest.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
if __name__=='__main__':build()
