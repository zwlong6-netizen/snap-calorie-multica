// tests/api.test.js
import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PRESET_FOODS, searchFoods, calculateNutrients } from '../server/foodDatabase.js';
import { recognizeFoodImage } from '../server/aiService.js';
import { Store } from '../server/store.js';
import { createServer } from '../server/app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_DB = path.join(__dirname, 'test-data.json');

// 清理测试临时文件
function cleanup() {
  if (fs.existsSync(TEST_DB)) {
    fs.unlinkSync(TEST_DB);
  }
}

test('1. 食物数据库检索与营养素计算', async (t) => {
  await t.test('searchFoods 模糊搜索', () => {
    const steakResults = searchFoods('牛排');
    assert.ok(steakResults.length >= 2, '应该搜索到至少2种牛排');
    assert.ok(steakResults.some(s => s.name === '香煎西冷牛排'));

    const emptyResults = searchFoods('xyz999不存在的食物');
    assert.strictEqual(emptyResults.length, 0);

    const defaultResults = searchFoods('');
    assert.ok(defaultResults.length > 0);
  });

  await t.test('calculateNutrients 营养素换算', () => {
    const food = PRESET_FOODS.find(f => f.id === 'f_steak');
    // 西冷牛排 200g: 244 * 2 = 488 kcal
    const nut = calculateNutrients(food, 200);
    assert.strictEqual(nut.calories, 488);
    assert.strictEqual(nut.weight, 200);
    assert.strictEqual(nut.protein, 46.2);
    assert.strictEqual(nut.fat, 32.0);
    assert.strictEqual(nut.carbs, 1.2);
  });
});

test('2. AI 图像识别模块与兜底机制', async (t) => {
  await t.test('指定图片名称识别对应食物', async () => {
    const res = await recognizeFoodImage({ filename: 'my_steak_dinner.jpg', mealType: 'dinner' });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.name, '香煎西冷牛排');
    assert.strictEqual(res.mealType, 'dinner');
    assert.ok(res.confidence >= 0.85, '置信度应满足 PRD >= 85% 要求');
    assert.ok(res.candidates.length > 0, '需提供候选食物列表');
  });

  await t.test('未知图片自动兜底稳定返回标准结构化数据', async () => {
    const res = await recognizeFoodImage({ filename: 'unknown_meal.png' });
    assert.strictEqual(res.success, true);
    assert.ok(res.calories > 0);
    assert.ok(res.protein >= 0);
    assert.ok(res.macroRatio.proteinRatio !== undefined);
  });
});

test('3. Store 核心业务逻辑与动态差额计算', async (t) => {
  cleanup();
  const store = new Store(TEST_DB);

  await t.test('基础用户画像与每日汇总', () => {
    const profile = store.getUserProfile();
    assert.strictEqual(profile.targetCalories, 2000);

    const summary = store.getDailySummary('2026-11-22');
    assert.strictEqual(summary.targetCalories, 2000);
    assert.ok(summary.consumedCalories > 0);
    assert.strictEqual(summary.remainingCalories, 2000 - summary.consumedCalories);
    assert.strictEqual(summary.isOverLimit, false);
    assert.strictEqual(summary.meals.length, 4, '应包含早中晚加餐 4 个餐次');
  });

  await t.test('新增摄入记录并动态影响每日汇总', () => {
    const prevSummary = store.getDailySummary('2026-11-22');
    const newEntry = store.addEntry({
      date: '2026-11-22',
      time: '19:30',
      mealType: 'dinner',
      foodId: 'f_steak',
      weight: 200
    });

    assert.strictEqual(newEntry.calories, 488);
    assert.strictEqual(newEntry.mealTypeName, '晚餐');

    const newSummary = store.getDailySummary('2026-11-22');
    assert.strictEqual(newSummary.consumedCalories, prevSummary.consumedCalories + 488);
    assert.strictEqual(newSummary.remainingCalories, prevSummary.remainingCalories - 488);
  });

  await t.test('手动微调克重更新记录', () => {
    const entries = store.getEntries('2026-11-22');
    const dinnerEntry = entries.find(e => e.mealType === 'dinner');
    assert.ok(dinnerEntry);

    // 修改克重为 100g (减半: 244 kcal)
    const updated = store.updateEntry(dinnerEntry.id, { weight: 100 });
    assert.strictEqual(updated.weight, 100);
    assert.strictEqual(updated.calories, 244);
    assert.strictEqual(updated.protein, 23.1);

    const summary = store.getDailySummary('2026-11-22');
    const dinnerMeal = summary.meals.find(m => m.key === 'dinner');
    assert.strictEqual(dinnerMeal.calories, 244);
  });

  await t.test('删除记录', () => {
    const entries = store.getEntries('2026-11-22');
    const dinnerEntry = entries.find(e => e.mealType === 'dinner');
    const ok = store.deleteEntry(dinnerEntry.id);
    assert.strictEqual(ok, true);

    const entriesAfter = store.getEntries('2026-11-22');
    assert.ok(!entriesAfter.some(e => e.id === dinnerEntry.id));
  });

  cleanup();
});

test('4. HTTP API 端到端集成测试', async (t) => {
  cleanup();
  const store = new Store(TEST_DB);
  const server = createServer(store);

  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  await t.test('GET /health 健康检查探针返回 200 OK', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.status, 'UP');
    assert.strictEqual(data.service, 'ai-calorie-tracker');
  });

  async function request(urlPath, options = {}) {
    const res = await fetch(`${baseUrl}${urlPath}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    return { status: res.status, data };
  }

  await t.test('GET /api/summary 返回今日能量收支', async () => {
    const res = await request('/api/summary?date=2026-11-22');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.data.targetCalories, 2000);
  });

  await t.test('POST /api/food/recognize AI 识别接口', async () => {
    const res = await request('/api/food/recognize', {
      method: 'POST',
      body: JSON.stringify({ filename: 'steak_dish.png', mealType: 'lunch' })
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.name, '香煎西冷牛排');
    assert.strictEqual(res.data.calories, 488);
  });

  await t.test('GET /api/food/search 搜索接口', async () => {
    const res = await request('/api/food/search?q=沙拉');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.ok(res.data.data.length > 0);
  });

  await t.test('POST /api/entries 创建摄入记录', async () => {
    const res = await request('/api/entries', {
      method: 'POST',
      body: JSON.stringify({
        date: '2026-11-22',
        mealType: 'dinner',
        foodId: 'f_salmon',
        weight: 180
      })
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.data.calories, 374);
  });

  await new Promise(resolve => server.close(resolve));
  cleanup();
});
