#!/usr/bin/env python3
"""Serve only the public game directory on a stable local origin."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse
import webbrowser
import urllib.request

ROOT = Path(__file__).resolve().parent

class GameHandler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map,
                      '.wasm': 'application/wasm', '.mp3': 'audio/mpeg',
                      '.webp': 'image/webp', '.ogg': 'audio/ogg'}
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()

def main():
    parser = argparse.ArgumentParser(description='启动本地视觉小说')
    parser.add_argument('--port', type=int, default=8765)
    parser.add_argument('--open', action='store_true', help='服务就绪后打开浏览器')
    args = parser.parse_args()
    public = ROOT / 'web'
    if not (public / 'index.html').exists():
        raise SystemExit('游戏文件尚未就绪：缺少 web/index.html。')
    handler = partial(GameHandler, directory=str(public))
    try:
        server = ThreadingHTTPServer(('127.0.0.1', args.port), handler)
    except OSError as exc:
        if args.open:
            try:
                with urllib.request.urlopen(f'http://127.0.0.1:{args.port}/webgal-engine.json', timeout=2) as response:
                    if response.status == 200:
                        webbrowser.open(f'http://127.0.0.1:{args.port}')
                        return
            except (OSError, urllib.error.URLError):
                pass
        raise SystemExit(f'无法启动：{exc}。如果游戏已经运行，请打开原有页面。')
    print(f'本地试玩：http://127.0.0.1:{args.port}', flush=True)
    print('仅提供 web 目录。保留此窗口；按 Ctrl+C 结束。', flush=True)
    if args.open:
        webbrowser.open(f'http://127.0.0.1:{args.port}')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()

if __name__ == '__main__':
    main()
