# 公开发布边界

公开仓库仅由 `tools/public_release.py` 生成。导出白名单是：

- `web/` 的运行时文件；
- `README.md`、本文件；
- 本地启动器 `serve.py`，资源检查 `tools/engine_validate.py` 与导出工具 `tools/public_release.py`；
- `.github/workflows/pages.yml`。

不要把 `production/`、`delivery/`、`tmp/`、小说全文、其他内部工具、图片或音频原料加入公开仓库。发布前运行：

```sh
python3 tools/public_release.py --output production/technical/release_r2/public-repo --smoke
```

该命令会重新创建目标目录、拒绝白名单以外的内容、生成 SHA-256 清单，并以本地静态服务请求首页及关键文件。审阅完成后，将导出内容同步至公开仓库 `VeraPyuyi/fish-wants-to-be-a-bird` 的独立检出目录，保留该目录的 Git 历史，再推送发布；不要将整个制作目录复制进去。GitHub Pages 使用 `.github/workflows/pages.yml`。仅在目标仓库不存在时才新建仓库。

确认 Pages 已部署本次游戏首页并能进入序章后，再发布个人网站的介绍动态。
