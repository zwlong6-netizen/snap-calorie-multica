// server/app.js
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { searchFoods, PRESET_FOODS } from './foodDatabase.js';
import { recognizeFoodImage } from './aiService.js';
import { defaultStore } from './store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, '../public');

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 10 * 1024 * 1024) { // 10MB limit
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

export function createServer(store = defaultStore) {
  return http.createServer(async (req, res) => {
    const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = urlObj.pathname;
    const method = req.method;

    if (method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      return res.end();
    }

    // 探针与健康检查路由 (/health 或 /api/health)
    if (pathname === '/health' || pathname === '/api/health') {
      return sendJson(res, 200, {
        status: 'UP',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        service: 'ai-calorie-tracker',
        version: '1.0.0'
      });
    }

    // API 路由
    if (pathname.startsWith('/api/')) {
      try {
        // 1. 食物拍照识别
        if (pathname === '/api/food/recognize' && method === 'POST') {
          const body = await parseBody(req);
          const result = await recognizeFoodImage(body);
          return sendJson(res, 200, result);
        }

        // 2. 食物库搜索与推荐
        if (pathname === '/api/food/search' && method === 'GET') {
          const query = urlObj.searchParams.get('q') || '';
          const results = searchFoods(query);
          return sendJson(res, 200, { success: true, count: results.length, data: results });
        }

        // 3. 用户设置与目标
        if (pathname === '/api/user/profile') {
          if (method === 'GET') {
            return sendJson(res, 200, { success: true, data: store.getUserProfile() });
          }
          if (method === 'PUT' || method === 'POST') {
            const body = await parseBody(req);
            const updated = store.updateUserProfile(body);
            return sendJson(res, 200, { success: true, data: updated });
          }
        }

        // 4. 每日摄入聚合看板数据
        if (pathname === '/api/summary' && method === 'GET') {
          const date = urlObj.searchParams.get('date') || '2026-11-22';
          const summary = store.getDailySummary(date);
          return sendJson(res, 200, { success: true, data: summary });
        }

        // 5. 摄入记录 CRUD
        if (pathname === '/api/entries') {
          if (method === 'GET') {
            const date = urlObj.searchParams.get('date');
            const entries = store.getEntries(date);
            return sendJson(res, 200, { success: true, count: entries.length, data: entries });
          }
          if (method === 'POST') {
            const body = await parseBody(req);
            const entry = store.addEntry(body);
            return sendJson(res, 201, { success: true, data: entry });
          }
        }

        // 6. 单条记录更新与删除 /api/entries/:id
        const entryMatch = pathname.match(/^\/api\/entries\/([a-zA-Z0-9_-]+)$/);
        if (entryMatch) {
          const entryId = entryMatch[1];
          if (method === 'PUT') {
            const body = await parseBody(req);
            const updated = store.updateEntry(entryId, body);
            if (!updated) {
              return sendJson(res, 404, { success: false, message: '记录未找到' });
            }
            return sendJson(res, 200, { success: true, data: updated });
          }
          if (method === 'DELETE') {
            const ok = store.deleteEntry(entryId);
            if (!ok) {
              return sendJson(res, 404, { success: false, message: '记录未找到' });
            }
            return sendJson(res, 200, { success: true, message: '删除成功' });
          }
        }

        return sendJson(res, 404, { success: false, message: 'API 未找到' });
      } catch (err) {
        console.error('API Error:', err);
        return sendJson(res, 500, { success: false, message: err.message });
      }
    }

    // 静态文件服务
    let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        filePath = path.join(PUBLIC_DIR, 'index.html');
      }
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml'
      };
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      fs.createReadStream(filePath).pipe(res);
    });
  });
}
