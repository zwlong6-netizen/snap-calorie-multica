// public/app.js
// 遵循 PRD 与 UI/UX 设计规范的主前端交互逻辑

let currentDate = '2026-11-22';
let currentSummary = null;
let currentRecognizedFood = null; // 当前正在确认的识别结果
let currentSelectedMealType = 'lunch';

// DOM 元素获取
const currentDateTitle = document.getElementById('current-date-title');
const btnPrevDay = document.getElementById('btn-prev-day');
const btnNextDay = document.getElementById('btn-next-day');
const btnResetData = document.getElementById('btn-reset-data');

// 仪表盘元素
const energyCard = document.getElementById('energy-card');
const targetCaloriesText = document.getElementById('target-calories-text');
const remainingLabel = document.getElementById('remaining-label');
const remainingVal = document.getElementById('remaining-val');
const consumedSummaryText = document.getElementById('consumed-summary-text');
const consumedPercentageText = document.getElementById('consumed-percentage-text');
const calorieProgressBar = document.getElementById('calorie-progress-bar');

const macroCarbVal = document.getElementById('macro-carb-val');
const macroCarbBar = document.getElementById('macro-carb-bar');
const macroProteinVal = document.getElementById('macro-protein-val');
const macroProteinBar = document.getElementById('macro-protein-bar');
const macroFatVal = document.getElementById('macro-fat-val');
const macroFatBar = document.getElementById('macro-fat-bar');

const mealsContainer = document.getElementById('meals-container');

// 相机取景与扫描弹窗
const btnOpenCamera = document.getElementById('btn-open-camera');
const cameraModal = document.getElementById('camera-modal');
const btnCloseCamera = document.getElementById('btn-close-camera');
const fileInput = document.getElementById('file-input');
const cameraCaptureInput = document.getElementById('camera-capture-input');
const btnShutter = document.getElementById('btn-shutter');
const btnDemoSample = document.getElementById('btn-demo-sample');
const cameraPreviewImg = document.getElementById('camera-preview-img');
const cameraPlaceholder = document.getElementById('camera-placeholder');
const laserScanner = document.getElementById('laser-scanner');

// PWA 安装引导浮层与弹窗元素
const pwaInstallBanner = document.getElementById('pwa-install-banner');
const btnPwaInstall = document.getElementById('btn-pwa-install');
const btnPwaDismiss = document.getElementById('btn-pwa-dismiss');
const iosGuideModal = document.getElementById('ios-guide-modal');
const btnCloseIosGuide = document.getElementById('btn-close-ios-guide');
const btnUnderstoodIos = document.getElementById('btn-understood-ios');

let deferredPrompt = null;

// 半屏结果卡片 (Bottom Sheet)
const resultSheetBackdrop = document.getElementById('result-sheet-backdrop');
const btnCloseSheet = document.getElementById('btn-close-sheet');
const confidenceTag = document.getElementById('confidence-tag');
const sheetFoodName = document.getElementById('sheet-food-name');
const sheetFoodEmoji = document.getElementById('sheet-food-emoji');
const sheetCalorieNum = document.getElementById('sheet-calorie-num');
const sheetWeightText = document.getElementById('sheet-weight-text');
const sheetProteinVal = document.getElementById('sheet-protein-val');
const sheetFatVal = document.getElementById('sheet-fat-val');
const sheetCarbsVal = document.getElementById('sheet-carbs-val');

const portionWeightLabel = document.getElementById('portion-weight-label');
const portionRange = document.getElementById('portion-range');
const btnStepMinus = document.getElementById('btn-step-minus');
const btnStepPlus = document.getElementById('btn-step-plus');
const presetPills = document.querySelectorAll('.preset-pill');
const mealPills = document.querySelectorAll('.meal-pill');
const btnConfirmRecord = document.getElementById('btn-confirm-record');
const btnConfirmCal = document.getElementById('btn-confirm-cal');

const btnOpenSearchModal = document.getElementById('btn-open-search-modal');
const btnManualExactWeight = document.getElementById('btn-manual-exact-weight');

// 搜索模态
const searchModal = document.getElementById('search-modal');
const btnCloseSearch = document.getElementById('btn-close-search');
const foodSearchInput = document.getElementById('food-search-input');
const searchResultsBox = document.getElementById('search-results-box');
const hotChips = document.querySelectorAll('.hot-chip');

// 精确克重输入
const weightInputModal = document.getElementById('weight-input-modal');
const btnCloseWeightModal = document.getElementById('btn-close-weight-modal');
const exactWeightInput = document.getElementById('exact-weight-input');
const btnSaveExactWeight = document.getElementById('btn-save-exact-weight');

const toast = document.getElementById('toast');

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.remove('hidden');
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 2200);
}

// 1. 加载每日看板数据
async function loadSummary() {
  try {
    const res = await fetch(`/api/summary?date=${currentDate}`);
    const json = await res.json();
    if (json.success) {
      currentSummary = json.data;
      renderDashboard(currentSummary);
    }
  } catch (err) {
    showToast('获取数据失败: ' + err.message);
  }
}

function renderDashboard(data) {
  currentDateTitle.textContent = formatDateLabel(data.date);
  targetCaloriesText.textContent = `目标 ${data.targetCalories.toLocaleString()} kcal`;

  // 剩余卡路里与超标状态
  if (data.isOverLimit) {
    energyCard.classList.add('over-limit');
    remainingLabel.textContent = '⚠️ 已超出日摄入上限';
    remainingVal.textContent = Math.abs(data.remainingCalories);
  } else {
    energyCard.classList.remove('over-limit');
    remainingLabel.textContent = '剩余还可吃';
    remainingVal.textContent = data.remainingCalories;
  }

  consumedSummaryText.textContent = `已摄入: ${data.consumedCalories.toLocaleString()} kcal`;
  consumedPercentageText.textContent = `${data.caloriePercentage}%`;
  calorieProgressBar.style.width = `${Math.min(100, data.caloriePercentage)}%`;

  // 三大宏量营养素
  const m = data.macros;
  macroCarbVal.textContent = `${m.carbs.consumed}g / ${m.carbs.target}g`;
  macroCarbBar.style.width = `${m.carbs.percentage}%`;

  macroProteinVal.textContent = `${m.protein.consumed}g / ${m.protein.target}g`;
  macroProteinBar.style.width = `${m.protein.percentage}%`;

  macroFatVal.textContent = `${m.fat.consumed}g / ${m.fat.target}g`;
  macroFatBar.style.width = `${m.fat.percentage}%`;

  // 餐次明细时间轴渲染
  renderMealsTimeline(data.meals);
}

function renderMealsTimeline(meals) {
  mealsContainer.innerHTML = '';
  meals.forEach(meal => {
    const box = document.createElement('div');
    box.className = 'meal-group-box';

    const header = document.createElement('div');
    header.className = 'meal-header-row';
    header.innerHTML = `
      <span class="meal-name-label">${meal.name}</span>
      <span class="meal-header-cal">${meal.calories} kcal</span>
    `;

    const itemsList = document.createElement('div');
    itemsList.className = 'meal-items-list';

    if (!meal.entries || meal.entries.length === 0) {
      itemsList.innerHTML = `
        <div class="meal-empty-hint" data-meal="${meal.key}">
          + 暂无记录，点击拍照快捷记录此餐
        </div>
      `;
      itemsList.querySelector('.meal-empty-hint').addEventListener('click', () => {
        currentSelectedMealType = meal.key;
        openCamera();
      });
    } else {
      meal.entries.forEach(item => {
        const itemRow = document.createElement('div');
        itemRow.className = 'meal-item-row';
        itemRow.innerHTML = `
          <div class="meal-item-main">
            <span class="food-item-name">${item.foodName} (${item.weight}${item.unit || 'g'})</span>
            <span class="food-item-meta">${item.time || ''} · 蛋白${item.protein}g / 脂肪${item.fat}g / 碳水${item.carbs}g</span>
          </div>
          <div class="meal-item-side">
            <span class="food-item-cal">${item.calories} kcal</span>
            <button class="del-item-btn" title="删除该条记录" data-id="${item.id}">🗑️</button>
          </div>
        `;
        itemRow.querySelector('.del-item-btn').addEventListener('click', async (e) => {
          e.stopPropagation();
          await deleteEntry(item.id);
        });
        itemsList.appendChild(itemRow);
      });
    }

    box.appendChild(header);
    box.appendChild(itemsList);
    mealsContainer.appendChild(box);
  });
}

async function deleteEntry(id) {
  try {
    const res = await fetch(`/api/entries/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) {
      showToast('已删除记录');
      loadSummary();
    }
  } catch (err) {
    showToast('删除失败: ' + err.message);
  }
}

function formatDateLabel(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${y}年${parseInt(m, 10)}月${parseInt(d, 10)}日`;
}

// 2. 相机操作与 AI 识别
function openCamera() {
  cameraModal.classList.remove('hidden');
  cameraPreviewImg.classList.add('hidden');
  cameraPlaceholder.classList.remove('hidden');
  laserScanner.classList.remove('hidden');
}

function closeCamera() {
  cameraModal.classList.add('hidden');
}

// 触发快门识别
async function triggerRecognition({ filename = 'steak_sample.jpg', base64 = '' }) {
  laserScanner.style.animationDuration = '0.6s'; // 加速扫描动效
  showToast('AI 特征识别分析中...');

  try {
    const res = await fetch('/api/food/recognize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename,
        base64,
        mealType: currentSelectedMealType
      })
    });
    const result = await res.json();
    if (result.success) {
      closeCamera();
      showResultSheet(result);
    } else {
      showToast('识别失败: ' + (result.message || '请重试'));
    }
  } catch (err) {
    showToast('识别服务超时，进入手动模式: ' + err.message);
  } finally {
    laserScanner.style.animationDuration = '2s';
  }
}

// 3. 展现识别结果确认卡片
function showResultSheet(foodData) {
  currentRecognizedFood = { ...foodData };
  confidenceTag.textContent = `AI 识别成功 ${Math.round(foodData.confidence * 100)}%`;
  sheetFoodName.textContent = foodData.name;
  sheetFoodEmoji.textContent = getFoodEmoji(foodData.name);

  // 初始化滑块
  portionRange.value = foodData.weight;
  updateSheetCalculations(foodData.weight);

  // 选中对应餐次
  updateMealPills(foodData.mealType || currentSelectedMealType);

  resultSheetBackdrop.classList.remove('hidden');
}

function getFoodEmoji(name) {
  if (name.includes('牛排') || name.includes('肉')) return '🥩';
  if (name.includes('鸡') || name.includes('沙拉')) return '🥗';
  if (name.includes('吐司') || name.includes('面包')) return '🍞';
  if (name.includes('蛋')) return '🥚';
  if (name.includes('饭')) return '🍚';
  if (name.includes('咖啡')) return '☕';
  if (name.includes('牛奶') || name.includes('酸奶')) return '🥛';
  if (name.includes('鱼')) return '🐟';
  if (name.includes('苹果')) return '🍎';
  return '🍽️';
}

function updateSheetCalculations(weight) {
  if (!currentRecognizedFood) return;
  const food = currentRecognizedFood;
  const standardWeight = food.weight || 200;
  
  // 按照线性比例计算当前份量营养
  const ratio = weight / (food.weight || 1);
  const curCal = Math.round(food.calories * ratio);
  const curProtein = +(food.protein * ratio).toFixed(1);
  const curFat = +(food.fat * ratio).toFixed(1);
  const curCarbs = +(food.carbs * ratio).toFixed(1);

  sheetCalorieNum.textContent = curCal;
  sheetWeightText.textContent = `当前份量: ${weight} 克 (${food.unit || '份'})`;
  portionWeightLabel.textContent = `${weight}g (${(weight / standardWeight).toFixed(1)}份)`;

  sheetProteinVal.textContent = `${curProtein}g`;
  sheetFatVal.textContent = `${curFat}g`;
  sheetCarbsVal.textContent = `${curCarbs}g`;

  btnConfirmCal.textContent = curCal;

  // 更新当前保存用的状态
  currentRecognizedFood.currentCalculated = {
    weight,
    calories: curCal,
    protein: curProtein,
    fat: curFat,
    carbs: curCarbs
  };
}

function updateMealPills(selectedMeal) {
  currentSelectedMealType = selectedMeal;
  mealPills.forEach(pill => {
    if (pill.dataset.meal === selectedMeal) {
      pill.classList.add('active');
    } else {
      pill.classList.remove('active');
    }
  });
}

// 4. 确认入库
async function confirmRecord() {
  if (!currentRecognizedFood) return;
  const calc = currentRecognizedFood.currentCalculated || currentRecognizedFood;

  try {
    const res = await fetch('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: currentDate,
        mealType: currentSelectedMealType,
        foodId: currentRecognizedFood.foodId,
        weight: calc.weight,
        customName: currentRecognizedFood.name,
        note: `AI拍照识别入库 (${Math.round(currentRecognizedFood.confidence * 100)}%)`
      })
    });
    const json = await res.json();
    if (json.success) {
      resultSheetBackdrop.classList.add('hidden');
      showToast(`✅ 成功记录 ${currentRecognizedFood.name} (+${calc.calories} kcal)`);
      loadSummary();
    }
  } catch (err) {
    showToast('保存失败: ' + err.message);
  }
}

// 5. 食物搜索与候选替换
async function handleSearchFoods(query = '') {
  try {
    const res = await fetch(`/api/food/search?q=${encodeURIComponent(query)}`);
    const json = await res.json();
    if (json.success) {
      renderSearchResults(json.data);
    }
  } catch (err) {
    showToast('检索失败');
  }
}

function renderSearchResults(foods) {
  searchResultsBox.innerHTML = '';
  if (!foods || foods.length === 0) {
    searchResultsBox.innerHTML = '<div style="text-align:center;color:#64748B;padding:20px;">未找到匹配食物</div>';
    return;
  }
  foods.forEach(f => {
    const item = document.createElement('div');
    item.className = 'search-result-item';
    item.innerHTML = `
      <div>
        <div class="sr-name">${f.name}</div>
        <div class="sr-category">${f.category} · 标量 ${f.standardWeight}${f.unit}</div>
      </div>
      <div class="sr-cal">${f.caloriesPer100g} kcal/100g</div>
    `;
    item.addEventListener('click', () => {
      // 替换当前识别食物
      replaceCurrentFood(f);
      searchModal.classList.add('hidden');
    });
    searchResultsBox.appendChild(item);
  });
}

function replaceCurrentFood(food) {
  const defaultWeight = food.standardWeight;
  const factor = defaultWeight / 100;
  const newFoodData = {
    foodId: food.id,
    name: food.name,
    category: food.category,
    confidence: 0.99,
    weight: defaultWeight,
    unit: food.unit,
    calories: Math.round(food.caloriesPer100g * factor),
    protein: +(food.proteinPer100g * factor).toFixed(1),
    fat: +(food.fatPer100g * factor).toFixed(1),
    carbs: +(food.carbsPer100g * factor).toFixed(1),
    mealType: currentSelectedMealType
  };
  showResultSheet(newFoodData);
  showToast(`已更换为: ${food.name}`);
}

// 事件监听绑定
btnOpenCamera.addEventListener('click', () => {
  currentSelectedMealType = 'lunch';
  openCamera();
});

btnCloseCamera.addEventListener('click', closeCamera);

btnShutter.addEventListener('click', () => {
  triggerRecognition({ filename: 'steak_dish.jpg' });
});

btnDemoSample.addEventListener('click', () => {
  cameraPlaceholder.classList.add('hidden');
  cameraPreviewImg.classList.remove('hidden');
  cameraPreviewImg.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect width="100%" height="100%" fill="%232d3748"/><circle cx="200" cy="200" r="140" fill="%23e2e8f0"/><text x="50%" y="45%" text-anchor="middle" font-size="70">🥩</text><text x="50%" y="65%" text-anchor="middle" fill="%231a202c" font-size="20" font-weight="bold">香煎西冷牛排配时蔬</text></svg>';
  setTimeout(() => {
    triggerRecognition({ filename: 'sirloin_steak.jpg' });
  }, 400);
});

function handleImageFileSelected(file) {
  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      cameraPlaceholder.classList.add('hidden');
      cameraPreviewImg.classList.remove('hidden');
      cameraPreviewImg.src = reader.result;
      triggerRecognition({ filename: file.name, base64: reader.result });
    };
    reader.readAsDataURL(file);
  }
}

fileInput.addEventListener('change', (e) => {
  handleImageFileSelected(e.target.files[0]);
});

if (cameraCaptureInput) {
  cameraCaptureInput.addEventListener('change', (e) => {
    handleImageFileSelected(e.target.files[0]);
  });
}

btnCloseSheet.addEventListener('click', () => {
  resultSheetBackdrop.classList.add('hidden');
});

// 份量滑块与加减步进
portionRange.addEventListener('input', (e) => {
  const val = parseInt(e.target.value, 10);
  updateSheetCalculations(val);
  presetPills.forEach(p => p.classList.remove('active'));
});

btnStepMinus.addEventListener('click', () => {
  let val = Math.max(20, parseInt(portionRange.value, 10) - 20);
  portionRange.value = val;
  updateSheetCalculations(val);
  presetPills.forEach(p => p.classList.remove('active'));
});

btnStepPlus.addEventListener('click', () => {
  let val = Math.min(800, parseInt(portionRange.value, 10) + 20);
  portionRange.value = val;
  updateSheetCalculations(val);
  presetPills.forEach(p => p.classList.remove('active'));
});

// 快捷档位吸附
presetPills.forEach(pill => {
  pill.addEventListener('click', () => {
    presetPills.forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    const factor = parseFloat(pill.dataset.factor);
    const standard = currentRecognizedFood ? currentRecognizedFood.weight : 200;
    const newWeight = Math.round(standard * factor);
    portionRange.value = newWeight;
    updateSheetCalculations(newWeight);
  });
});

// 餐次选择药丸
mealPills.forEach(pill => {
  pill.addEventListener('click', () => {
    updateMealPills(pill.dataset.meal);
  });
});

// 确认记录
btnConfirmRecord.addEventListener('click', confirmRecord);

// 搜索更换食物弹窗
btnOpenSearchModal.addEventListener('click', () => {
  searchModal.classList.remove('hidden');
  handleSearchFoods('');
});

btnCloseSearch.addEventListener('click', () => {
  searchModal.classList.add('hidden');
});

foodSearchInput.addEventListener('input', (e) => {
  handleSearchFoods(e.target.value);
});

hotChips.forEach(chip => {
  chip.addEventListener('click', () => {
    foodSearchInput.value = chip.dataset.search;
    handleSearchFoods(chip.dataset.search);
  });
});

// 精确克重输入
btnManualExactWeight.addEventListener('click', () => {
  exactWeightInput.value = portionRange.value;
  weightInputModal.classList.remove('hidden');
});

btnCloseWeightModal.addEventListener('click', () => {
  weightInputModal.classList.add('hidden');
});

btnSaveExactWeight.addEventListener('click', () => {
  const val = parseInt(exactWeightInput.value, 10);
  if (val > 0) {
    portionRange.value = val;
    updateSheetCalculations(val);
    weightInputModal.classList.add('hidden');
    showToast(`已更新为 ${val} 克`);
  }
});

// 日期导航
btnPrevDay.addEventListener('click', () => {
  shiftDate(-1);
});

btnNextDay.addEventListener('click', () => {
  shiftDate(1);
});

function shiftDate(days) {
  const d = new Date(currentDate);
  d.setDate(d.getDate() + days);
  currentDate = d.toISOString().split('T')[0];
  loadSummary();
}

btnResetData.addEventListener('click', async () => {
  showToast('数据已刷新');
  loadSummary();
});

// ============================================================
// PWA 渐进式离线注册、安装引导与快捷行为适配
// ============================================================

// 1. 注册 Service Worker (离线与性能加速)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => {
        console.log('[PWA] Service Worker 注册成功:', reg.scope);
      })
      .catch((err) => {
        console.warn('[PWA] Service Worker 注册失败:', err);
      });
  });
}

// 2. 检测运行模式 (判断是否已在全屏独立运行 standalone 模式)
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

// 3. 浏览器添加至主屏幕事件 (Android Chrome / Edge / Desktop PWA)
window.addEventListener('beforeinstallprompt', (e) => {
  // 阻止默认自动弹窗，控制展示自研引导浮层
  e.preventDefault();
  deferredPrompt = e;

  // 若尚未在独立窗口运行且用户未永久关闭引导，则呈现提示浮层
  if (!isStandalone && !sessionStorage.getItem('pwa_dismissed')) {
    if (pwaInstallBanner) {
      pwaInstallBanner.classList.remove('hidden');
    }
  }
});

// 4. 点击安装引导按钮
if (btnPwaInstall) {
  btnPwaInstall.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        showToast('感谢安装！已添加至桌面');
      }
      deferredPrompt = null;
      if (pwaInstallBanner) pwaInstallBanner.classList.add('hidden');
    } else {
      // 若当前环境为 iOS Safari，则弹出专属添加图解
      const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
      if (isIos && iosGuideModal) {
        if (pwaInstallBanner) pwaInstallBanner.classList.add('hidden');
        iosGuideModal.classList.remove('hidden');
      } else {
        showToast('请使用浏览器“添加到主屏幕”功能');
      }
    }
  });
}

// 关闭/忽略引导
if (btnPwaDismiss) {
  btnPwaDismiss.addEventListener('click', () => {
    if (pwaInstallBanner) pwaInstallBanner.classList.add('hidden');
    sessionStorage.setItem('pwa_dismissed', '1');
  });
}

// iOS Safari 引导弹窗关闭
if (btnCloseIosGuide) {
  btnCloseIosGuide.addEventListener('click', () => {
    if (iosGuideModal) iosGuideModal.classList.add('hidden');
  });
}

if (btnUnderstoodIos) {
  btnUnderstoodIos.addEventListener('click', () => {
    if (iosGuideModal) iosGuideModal.classList.add('hidden');
  });
}

// iOS Safari 检测引导展示（当在普通浏览器中首次访问时）
window.addEventListener('load', () => {
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (isIos && !isStandalone && !sessionStorage.getItem('pwa_dismissed')) {
    if (pwaInstallBanner) {
      const descEl = document.getElementById('pwa-app-desc');
      if (descEl) descEl.textContent = '点此查看 iPhone Safari 添加到桌面指引';
      pwaInstallBanner.classList.remove('hidden');
    }
  }

  // 支持快捷方式直接开启拍照 ?action=camera
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('action') === 'camera') {
    setTimeout(() => {
      currentSelectedMealType = 'lunch';
      openCamera();
    }, 300);
  }
});

// 首次启动初始化加载
loadSummary();
