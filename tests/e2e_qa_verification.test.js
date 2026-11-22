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
const QA_DB = path.join(__dirname, 'qa-test-data.json');

function cleanup() {
  if (fs.existsSync(QA_DB)) {
    fs.unlinkSync(QA_DB);
  }
}

test('【质量验收-测试套件】AI卡路里拍照识别与摄入管理 MVP 端到端全量验收', async (suite) => {
  cleanup();
  const store = new Store(QA_DB);
  const server = createServer(store);

  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

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
    return { status: res.status, headers: res.headers, data };
  }

  // ==========================================
  // 1. AI 拍照识别与容错兜底机制测试
  // ==========================================
  await suite.test('1. AI拍照识别与容错兜底机制全量验证', async (t) => {
    await t.test('1.1 典型食物图片输入：精准识别牛排、重量、卡路里与三大宏量营养素', async () => {
      const res = await request('/api/food/recognize', {
        method: 'POST',
        body: JSON.stringify({ filename: 'ribeye_steak.png', mealType: 'dinner' })
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.name, '香煎西冷牛排');
      assert.strictEqual(res.data.weight, 200);
      assert.strictEqual(res.data.calories, 488);
      assert.strictEqual(res.data.protein, 46.2);
      assert.strictEqual(res.data.fat, 32.0);
      assert.strictEqual(res.data.carbs, 1.2);
      assert.ok(res.data.confidence >= 0.85, 'AI 置信度应大于等于 85%');
      assert.strictEqual(res.data.mealType, 'dinner');
    });

    await t.test('1.2 多样化食物别名识别：沙拉、吐司、苹果、三文鱼', async () => {
      const foodsToTest = [
        { file: 'green_salad.jpg', expected: '香煎鸡胸肉沙拉' },
        { file: 'wheat_toast.jpg', expected: '全麦吐司' },
        { file: 'fresh_apple.png', expected: '红富士苹果' },
        { file: 'grilled_salmon.jpeg', expected: '香煎三文鱼排' }
      ];
      for (const item of foodsToTest) {
        const res = await request('/api/food/recognize', {
          method: 'POST',
          body: JSON.stringify({ filename: item.file })
        });
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.data.success, true);
        assert.strictEqual(res.data.name, item.expected);
      }
    });

    await t.test('1.3 异常/未知图片兜底机制：稳定返回高保真结构体且包含备选候选列表', async () => {
      const res = await request('/api/food/recognize', {
        method: 'POST',
        body: JSON.stringify({ filename: 'random_noise_blurry_xyz.bmp' })
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.ok(res.data.name, '兜底时必须包含食物名称');
      assert.ok(res.data.calories > 0, '兜底时卡路里必须有效');
      assert.ok(Array.isArray(res.data.candidates), '必须提供备选候选项');
      assert.ok(res.data.candidates.length >= 1, '候选项数量至少1项');
      assert.ok(res.data.macroRatio.proteinRatio !== undefined);
      assert.ok(res.data.macroRatio.fatRatio !== undefined);
      assert.ok(res.data.macroRatio.carbsRatio !== undefined);
    });

    await t.test('1.4 食物数据库模糊搜索与容错检索通道', async () => {
      // 搜索中文字符
      const res1 = await request('/api/food/search?q=牛奶');
      assert.strictEqual(res1.status, 200);
      assert.ok(res1.data.data.some(f => f.name === '纯牛奶'));

      // 搜索英文别名
      const res2 = await request('/api/food/search?q=americano');
      assert.strictEqual(res2.status, 200);
      assert.ok(res2.data.data.some(f => f.name === '冰美式咖啡'));

      // 搜索分类
      const res3 = await request('/api/food/search?q=水果');
      assert.strictEqual(res3.status, 200);
      assert.ok(res3.data.data.length >= 2, '应检索到苹果和香蕉等水果');

      // 空检索词返回热搜/常用预设
      const res4 = await request('/api/food/search?q=');
      assert.strictEqual(res4.status, 200);
      assert.ok(res4.data.data.length > 0);
    });
  });

  // ==========================================
  // 2. 核心业务逻辑与动态差额计算测试
  // ==========================================
  await suite.test('2. 核心业务逻辑与动态差额计算联动测试', async (t) => {
    await t.test('2.1 今日能量收支仪表盘初态核验 (初始种子数据)', async () => {
      const res = await request('/api/summary?date=2026-11-22');
      assert.strictEqual(res.status, 200);
      const summary = res.data.data;
      assert.strictEqual(summary.targetCalories, 2000);
      // 初始预设消耗：吐司(152) + 鸡蛋(78) + 牛奶(130) + 鸡胸肉沙拉(338) + 糙米饭(174) + 酸奶(171) = 1043 kcal
      assert.strictEqual(summary.consumedCalories, 1043);
      assert.strictEqual(summary.remainingCalories, 957);
      assert.strictEqual(summary.isOverLimit, false);
      assert.strictEqual(summary.caloriePercentage, 52);
      assert.strictEqual(summary.meals.length, 4);
    });

    await t.test('2.2 四餐次记录 CRUD 与时间轴聚合流转', async () => {
      // 新增一条加餐
      const postRes = await request('/api/entries', {
        method: 'POST',
        body: JSON.stringify({
          date: '2026-11-22',
          mealType: 'snack',
          foodId: 'f_apple',
          weight: 200,
          note: '午后加餐红富士苹果'
        })
      });
      assert.strictEqual(postRes.status, 201);
      const newEntry = postRes.data.data;
      assert.strictEqual(newEntry.calories, 104); // 52 * 2
      assert.strictEqual(newEntry.mealTypeName, '加餐');

      // 验证 Summary 动态联动
      const sumRes1 = await request('/api/summary?date=2026-11-22');
      assert.strictEqual(sumRes1.data.data.consumedCalories, 1043 + 104);
      assert.strictEqual(sumRes1.data.data.remainingCalories, 2000 - 1147);

      // 修改该条记录克重为 300g (1.5倍)
      const putRes = await request(`/api/entries/${newEntry.id}`, {
        method: 'PUT',
        body: JSON.stringify({ weight: 300 })
      });
      assert.strictEqual(putRes.status, 200);
      assert.strictEqual(putRes.data.data.weight, 300);
      assert.strictEqual(putRes.data.data.calories, 156); // 52 * 3 = 156

      // 验证更新后的联动差额
      const sumRes2 = await request('/api/summary?date=2026-11-22');
      assert.strictEqual(sumRes2.data.data.consumedCalories, 1043 + 156);

      // 删除加餐记录并复核
      const delRes = await request(`/api/entries/${newEntry.id}`, {
        method: 'DELETE'
      });
      assert.strictEqual(delRes.status, 200);

      const sumRes3 = await request('/api/summary?date=2026-11-22');
      assert.strictEqual(sumRes3.data.data.consumedCalories, 1043);
    });

    await t.test('2.3 摄入超标临界与告警状态 (isOverLimit & remainingCalories 负数)', async () => {
      // 记录一份高热量大餐使热量超标：例如 5 份西冷牛排 (488 * 5 = 2440 kcal)
      const bigMealRes = await request('/api/entries', {
        method: 'POST',
        body: JSON.stringify({
          date: '2026-11-22',
          mealType: 'dinner',
          foodId: 'f_steak',
          weight: 1000 // 1000g = 2440 kcal
        })
      });
      assert.strictEqual(bigMealRes.status, 201);
      const bigMealEntry = bigMealRes.data.data;

      const sumRes = await request('/api/summary?date=2026-11-22');
      const sum = sumRes.data.data;
      assert.ok(sum.consumedCalories > 2000, '总摄入应超出 2000 kcal 目标');
      assert.ok(sum.remainingCalories < 0, '剩余卡路里应为负数');
      assert.strictEqual(sum.isOverLimit, true, 'isOverLimit 状态标识必须为 true');

      // 清理该测试大餐，恢复基线
      await request(`/api/entries/${bigMealEntry.id}`, { method: 'DELETE' });
    });

    await t.test('2.4 用户画像目标与 TDEE 动态调整联动', async () => {
      const updateProfRes = await request('/api/user/profile', {
        method: 'POST',
        body: JSON.stringify({
          targetCalories: 2500,
          targetProtein: 120,
          targetFat: 60,
          targetCarbs: 300
        })
      });
      assert.strictEqual(updateProfRes.status, 200);
      assert.strictEqual(updateProfRes.data.data.targetCalories, 2500);

      const sumRes = await request('/api/summary?date=2026-11-22');
      assert.strictEqual(sumRes.data.data.targetCalories, 2500);
      assert.strictEqual(sumRes.data.data.remainingCalories, 2500 - 1043);

      // 恢复 2000 默认
      await request('/api/user/profile', {
        method: 'POST',
        body: JSON.stringify({
          targetCalories: 2000,
          targetProtein: 100,
          targetFat: 55,
          targetCarbs: 250
        })
      });
    });
  });

  // ==========================================
  // 3. 前端 UI 静态资源与规范符合度验证
  // ==========================================
  await suite.test('3. 前端 UI 规范与交互资源符合度测试', async (t) => {
    await t.test('3.1 首页 HTML 与移动端视口配置完整性', async () => {
      const res = await request('/');
      assert.strictEqual(res.status, 200);
      assert.ok(res.headers.get('content-type').includes('text/html'));
      assert.ok(res.data.includes('viewport-fit=cover') || res.data.includes('width=device-width'));
      assert.ok(res.data.includes('energy-balance-card'), '必须包含能量收支卡片');
      assert.ok(res.data.includes('laser-scanner'), '必须包含激光雷达波扫描动画结构');
      assert.ok(res.data.includes('bottom-sheet'), '必须包含半屏浮层 Bottom Sheet 结构');
      assert.ok(res.data.includes('portion-presets'), '必须包含快捷档位吸附容器');
    });

    await t.test('3.2 样式 CSS 规范色彩核验 (主品牌绿、蛋白质蓝、脂肪橙、碳水粉)', async () => {
      const res = await request('/style.css');
      assert.strictEqual(res.status, 200);
      const css = res.data;
      assert.ok(css.includes('#10B981') || css.includes('#10b981'), '主品牌色需匹配 #10B981 (健康绿)');
      assert.ok(css.includes('#3B82F6') || css.includes('#3b82f6'), '蛋白质色彩需匹配 #3B82F6 (活力蓝)');
      assert.ok(css.includes('#F59E0B') || css.includes('#f59e0b'), '脂肪色彩需匹配 #F59E0B (温暖橙/琥珀)');
      assert.ok(css.includes('#EC4899') || css.includes('#ec4899'), '碳水色彩需匹配 #EC4899 (活力粉)');
      assert.ok(css.includes('laser-scanner'), '包含雷达波扫描样式');
    });

    await t.test('3.3 前端核心 JS app.js 交互绑定完整性', async () => {
      const res = await request('/app.js');
      assert.strictEqual(res.status, 200);
      const js = res.data;
      assert.ok(js.includes('loadSummary'), '包含加载每日看板函数');
      assert.ok(js.includes('triggerRecognition'), '包含 AI 识别触发与扫描加速');
      assert.ok(js.includes('updateSheetCalculations'), '包含毫秒级营养计算与档位吸附联动');
      assert.ok(js.includes('confirmRecord'), '包含打卡入库闭环逻辑');
      assert.ok(js.includes('handleSearchFoods'), '包含搜索替换食物容错逻辑');
    });
  });

  // ==========================================
  // 4. 边界与健壮性测试 (Robustness & Edge cases)
  // ==========================================
  await suite.test('4. 边界异常场景与容错测试', async (t) => {
    await t.test('4.1 404 路由与不存在记录的更新/删除保护', async () => {
      const nonExistRes = await request('/api/entries/non_existent_id', {
        method: 'PUT',
        body: JSON.stringify({ weight: 100 })
      });
      assert.strictEqual(nonExistRes.status, 404);

      const delNonExistRes = await request('/api/entries/non_existent_id', {
        method: 'DELETE'
      });
      assert.strictEqual(delNonExistRes.status, 404);

      const invalidApiRes = await request('/api/unknown_route');
      assert.strictEqual(invalidApiRes.status, 404);
    });

    await t.test('4.2 极值克重计算保护 (0g 或 超大克重 10000g)', async () => {
      const food = PRESET_FOODS[0];
      const nut0 = calculateNutrients(food, 0);
      assert.strictEqual(nut0.calories, 0);
      assert.strictEqual(nut0.weight, 0);

      const nutBig = calculateNutrients(food, 5000);
      assert.strictEqual(nutBig.calories, Math.round(food.caloriesPer100g * 50));
      assert.ok(nutBig.protein > 0);
    });

    await t.test('4.3 自定义未在库中的食物创建与兼容计算', async () => {
      const res = await request('/api/entries', {
        method: 'POST',
        body: JSON.stringify({
          date: '2026-11-22',
          mealType: 'lunch',
          foodId: 'f_custom_unknown',
          customName: '自制低卡手工燕麦饼干',
          weight: 150
        })
      });
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.data.data.foodName, '自制低卡手工燕麦饼干');
      assert.ok(res.data.data.calories > 0);

      // 清理
      await request(`/api/entries/${res.data.data.id}`, { method: 'DELETE' });
    });
  });

  await new Promise(resolve => server.close(resolve));
  cleanup();
});
