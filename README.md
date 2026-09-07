# 想要变成鹰的鱼

基于 WebGAL 制作的中文视觉小说序章试玩，提供本地预览与 GitHub Pages 发布配置。

## 游玩

[在线试玩](https://verapyuyi.github.io/fish-wants-to-be-a-bird/)（Pages 部署完成后可用）。请通过网站地址游玩，不要直接打开 `web/index.html`。

点击或按空格推进文本；底栏提供回想、自动、快进、存读档和选项。存档保存于当前浏览器和站点地址中；清除站点数据或更换浏览器会影响本机存档。r2 使用独立存档键，先前版本的数据不会被删除或覆盖。

## 本地预览

使用 Python 3 在仓库根目录运行 `python3 serve.py --open`，然后保留该窗口。资源未载入时，使用页面中的“重新载入”。

## 发布内容与许可

公开仓库包含运行所需的 `web/`、说明、启动与检查工具及 Pages 工作流。原生剧本为 `web/game/scene/start.txt`，界面样式源码在 `web/game/template/`。完整原作、内部记录、制作原料、旧图、交付压缩包和临时文件均不在公开导出范围内。

引擎、字体、图像和音频的署名与适用许可在 `web/LICENSE-*` 和 `web/CREDITS-*` 中。
