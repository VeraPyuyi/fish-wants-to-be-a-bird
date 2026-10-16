/** MPL-2.0. Keep story checkpoints independent of ending playback and replay. */
const r4SaveIO = createSaveQueue({getItem:key=>Un.getItem(key),setItem:(key,value)=>Un.setItem(key,value),clone:value=>vt(value)});
function r4IsEndingState() {
  return Boolean(endingFilmSession) || Y.getCalculationStageState().PerformList.some(p=>p.script?.command===ct.video);
}
function r4CheckpointBeforeEnding() {
  J$.cancel();
  const scene=I.sceneManager.sceneData;
  // Fresh script execution points at playVideo. A restored video points beyond it.
  if (scene.currentScene.sentenceList[scene.currentSentenceId]?.command===ct.video) {
    yP().catch(error=>ee.error('结尾前进度保存失败',error));
  }
}
function QuickSaveLoadEntry() {
  const save=tt(state=>state.saveData.saveData[0]);
  te.useEffect(()=>{j_(0,0)},[]);
  return C.jsxs('div',{style:{display:'flex',flexDirection:'column',alignItems:'center',gap:'4px'},children:[
    C.jsx('button',{id:'load-quick-save',type:'button',disabled:!save,onClick:()=>H$(0),
      style:{font:'30px 思源宋体,serif',padding:'10px 24px',border:'1px solid '+(save?'#37748b':'#9ba6ac'),borderRadius:'8px',color:save?'#16465a':'#74828a',background:save?'#eaf3f4':'#e2e6e8',cursor:save?'pointer':'not-allowed'},children:'读取快速存档'}),
    C.jsx('span',{style:{fontSize:'18px',color:'#647480'},children:save?save.saveTime:'暂无手动快速存档'})]});
}
