# WebGAL 4.6.4：本项目 BGM 切换修改

引擎上游：[OpenWebGAL/WebGAL 4.6.4](https://github.com/OpenWebGAL/WebGAL/tree/4.6.4)，许可证为 MPL-2.0，完整文本随游戏保留在 `../../LICENSE-WebGAL-MPL-2.0.txt`。

本目录提供本项目改动的可读源码 `bgm-controller.mjs`、包含原组件替换片段的 `prepare_patch.py` 和校验清单。修改同样按 MPL-2.0 提供；不改变游戏剧本与素材各自的使用范围。

变更限于一个原生 BGM 播放器的源切换与音量过渡：旧曲先用 200ms 淡出，新曲实际播放后用 300–600ms 淡入；同曲用 240ms 平滑调音量，保留播放位置。音量设为零立即静音。新请求取消旧过渡，避免快速推进和读档后旧回调恢复错误音量。原生 loop 和所有音频文件均未改变。

## 重现本次构建

在游戏仓库根目录执行以下步骤。输入来自本项目上一已发布版本，包含此前的项目字体/界面适配。补丁严格检查两个原组件片段，不接受不匹配或重复应用。

```sh
mkdir -p /tmp/birdfish-before-engine /tmp/birdfish-after-engine
git show a88b0222b8e978ec3dd35159a42f2259fcc82ff8:web/assets/index-R1tKotR6.js > /tmp/birdfish-before-engine/index-R1tKotR6.js
git show a88b0222b8e978ec3dd35159a42f2259fcc82ff8:web/assets/initRegister-CesUtdWC.js > /tmp/birdfish-before-engine/initRegister-CesUtdWC.js
git show a88b0222b8e978ec3dd35159a42f2259fcc82ff8:web/assets/index.es-erQsk_Nn.js > /tmp/birdfish-before-engine/index.es-erQsk_Nn.js
python3 web/engine-source/r4-bgm/prepare_patch.py --source /tmp/birdfish-before-engine/index-R1tKotR6.js --output /tmp/birdfish-after-engine/index-r4-bgm-743786b1.js
```

输出 SHA-256 应为 `8deb6a98f2b7a003a2046f5d2800adf277066e1f029aff8c87e42f75af0e2956`，与运行文件 `../../assets/index-r4-bgm-743786b1.js` 一致。另外输出两个同步更名的懒加载模块，确保它们引用同一个播放器入口。使用 Python 3 即可重现，无额外依赖。

正式源码的音轨、插画和叙述仍位于游戏自己的目录；本目录不包含小说全文或内部测试记录。
