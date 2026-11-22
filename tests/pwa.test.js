import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from '../server/app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, '../public');

test('PWA 移动端与全屏应用规范测试', async (suite) => {
  let server;
  let baseUrl;

  suite.before(async () => {
    server = createServer();
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  suite.after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  const request = async (pathname) => {
    const res = await fetch(`${baseUrl}${pathname}`);
    const text = await res.text();
    return {
      status: res.status,
      headers: res.headers,
      data: text
    };
  };

  await suite.test('1. PWA Web App Manifest 规范符合度', async (t) => {
    const res = await request('/manifest.json');
    assert.strictEqual(res.status, 200);
    assert.ok(res.headers.get('content-type').includes('application/json'));

    const manifest = JSON.parse(res.data);
    assert.strictEqual(manifest.display, 'standalone', '启动模式必须为独立全屏 standalone');
    assert.strictEqual(manifest.orientation, 'portrait', '默认方向必须锁定为竖屏 portrait');
    assert.ok(manifest.name.includes('AI卡路里') || manifest.name.includes('SnapCalorie'));
    assert.strictEqual(manifest.theme_color, '#10B981', '主题色必须为主品牌绿 #10B981');
    assert.strictEqual(manifest.background_color, '#0F172A', '全屏沉浸背景色');

    // 图标检查
    const icon192 = manifest.icons.find((i) => i.sizes === '192x192');
    const icon512 = manifest.icons.find((i) => i.sizes === '512x512');
    const iconMaskable = manifest.icons.find((i) => i.purpose === 'maskable');
    assert.ok(icon192, '必须提供 192x192 标准图标');
    assert.ok(icon512, '必须提供 512x512 高清启动图标');
    assert.ok(iconMaskable, '必须提供 Android 自适应 maskable 图标');

    // 检查图标物理文件存在性
    assert.ok(fs.existsSync(path.join(PUBLIC_DIR, icon192.src)));
    assert.ok(fs.existsSync(path.join(PUBLIC_DIR, icon512.src)));
    assert.ok(fs.existsSync(path.join(PUBLIC_DIR, 'icons/apple-touch-icon.png')));
  });

  await suite.test('2. Service Worker 脚本与离线缓存策略', async (t) => {
    const res = await request('/sw.js');
    assert.strictEqual(res.status, 200);
    assert.ok(res.headers.get('content-type').includes('javascript'));
    const swContent = res.data;
    assert.ok(swContent.includes('addEventListener(\'install\''), '必须包含 SW 安装事件预缓存');
    assert.ok(swContent.includes('addEventListener(\'activate\''), '必须包含 SW 激活与旧缓存清理');
    assert.ok(swContent.includes('addEventListener(\'fetch\''), '必须包含请求拦截策略');
    assert.ok(swContent.includes('STATIC_ASSETS'), '必须包含静态离线缓存清单');
  });

  await suite.test('3. HTML 移动端 Meta、刘海屏视口与相机 capture 适配', async (t) => {
    const res = await request('/');
    assert.strictEqual(res.status, 200);
    const html = res.data;

    // Viewport-fit=cover
    assert.ok(html.includes('viewport-fit=cover'), '移动端视口必须支持刘海屏 viewport-fit=cover');
    // iOS Safari 沉浸式与标题
    assert.ok(html.includes('apple-mobile-web-app-capable'), '必须开启 iOS Safari WebApp 独立全屏支持');
    assert.ok(html.includes('apple-mobile-web-app-status-bar-style'), '必须配置 iOS 状态栏样式');
    assert.ok(html.includes('apple-touch-icon'), '必须引用 Apple Touch Icon');
    assert.ok(html.includes('rel="manifest"'), '必须引入 Web App Manifest');

    // 相机 capture="environment" 后置摄像头直调
    assert.ok(html.includes('capture="environment"'), '必须配置 capture="environment" 优先唤起手机后置摄像头');

    // 安装引导组件
    assert.ok(html.includes('pwa-install-banner'), '必须包含添加到主屏幕引导浮层');
    assert.ok(html.includes('ios-guide-modal'), '必须包含 iOS Safari 添加桌面图解指南');
  });

  await suite.test('4. CSS 移动端安全区与 Standalone 全屏模式适配', async (t) => {
    const res = await request('/style.css');
    assert.strictEqual(res.status, 200);
    const css = res.data;

    assert.ok(css.includes('env(safe-area-inset-top'), 'CSS 需适配顶部刘海安全区');
    assert.ok(css.includes('env(safe-area-inset-bottom'), 'CSS 需适配底部手势横条安全区');
    assert.ok(css.includes('display-mode: standalone'), 'CSS 需为 standalone 独立全屏提供沉浸样式');
    assert.ok(css.includes('pwa-install-banner'), 'CSS 包含 PWA 引导组件样式');
  });
});
