// server/store.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PRESET_FOODS, calculateNutrients } from './foodDatabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '../data.json');

// 初始种子数据，吻合 UI/UX 规范中的 Mock 场景
const INITIAL_DATA = {
  userProfile: {
    targetCalories: 2000,
    targetProtein: 100,
    targetFat: 55,
    targetCarbs: 250
  },
  mealEntries: [
    {
      id: 'entry_1',
      date: '2026-11-22',
      time: '08:30',
      mealType: 'breakfast', // breakfast | lunch | dinner | snack
      mealTypeName: '早餐',
      foodId: 'f_toast',
      foodName: '全麦吐司',
      weight: 60,
      unit: '片(2片/60g)',
      calories: 152,
      protein: 5.7,
      fat: 2.1,
      carbs: 27.6,
      note: '全麦吐司 + 水煮蛋'
    },
    {
      id: 'entry_2',
      date: '2026-11-22',
      time: '08:35',
      mealType: 'breakfast',
      mealTypeName: '早餐',
      foodId: 'f_boiled_egg',
      foodName: '水煮白壳蛋',
      weight: 50,
      unit: '颗',
      calories: 78,
      protein: 6.5,
      fat: 5.3,
      carbs: 0.8,
      note: ''
    },
    {
      id: 'entry_3',
      date: '2026-11-22',
      time: '08:40',
      mealType: 'breakfast',
      mealTypeName: '早餐',
      foodId: 'f_milk',
      foodName: '纯牛奶',
      weight: 200,
      unit: 'ml',
      calories: 130,
      protein: 6.8,
      fat: 7.2,
      carbs: 10.0,
      note: ''
    },
    {
      id: 'entry_4',
      date: '2026-11-22',
      time: '12:45',
      mealType: 'lunch',
      mealTypeName: '午餐',
      foodId: 'f_chicken_breast',
      foodName: '香煎鸡胸肉沙拉',
      weight: 250,
      unit: '克',
      calories: 338,
      protein: 56.3,
      fat: 8.0,
      carbs: 10.0,
      note: '鸡胸肉沙拉'
    },
    {
      id: 'entry_5',
      date: '2026-11-22',
      time: '12:50',
      mealType: 'lunch',
      mealTypeName: '午餐',
      foodId: 'f_brown_rice',
      foodName: '杂粮五谷糙米饭',
      weight: 150,
      unit: '碗',
      calories: 174,
      protein: 3.9,
      fat: 1.4,
      carbs: 36.8,
      note: ''
    },
    {
      id: 'entry_6',
      date: '2026-11-22',
      time: '16:00',
      mealType: 'snack',
      mealTypeName: '加餐',
      foodId: 'f_greek_yogurt',
      foodName: '无糖希腊酸奶配蓝莓',
      weight: 180,
      unit: '杯',
      calories: 171,
      protein: 15.3,
      fat: 4.5,
      carbs: 17.1,
      note: ''
    }
  ]
};

export class Store {
  constructor(filePath = DATA_FILE) {
    this.filePath = filePath;
    this.data = this.loadData();
  }

  loadData() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Failed to read data file, using initial data:', e.message);
    }
    this.saveData(INITIAL_DATA);
    return JSON.parse(JSON.stringify(INITIAL_DATA));
  }

  saveData(dataToSave = this.data) {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(dataToSave, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to save data file:', e.message);
    }
  }

  getUserProfile() {
    return this.data.userProfile;
  }

  updateUserProfile(profile) {
    this.data.userProfile = { ...this.data.userProfile, ...profile };
    this.saveData();
    return this.data.userProfile;
  }

  getEntries(date) {
    if (!date) {
      return this.data.mealEntries;
    }
    return this.data.mealEntries.filter(e => e.date === date);
  }

  getDailySummary(date) {
    const entries = this.getEntries(date);
    const profile = this.getUserProfile();

    const consumedCalories = entries.reduce((acc, cur) => acc + (cur.calories || 0), 0);
    const consumedProtein = +entries.reduce((acc, cur) => acc + (cur.protein || 0), 0).toFixed(1);
    const consumedFat = +entries.reduce((acc, cur) => acc + (cur.fat || 0), 0).toFixed(1);
    const consumedCarbs = +entries.reduce((acc, cur) => acc + (cur.carbs || 0), 0).toFixed(1);

    const remainingCalories = profile.targetCalories - consumedCalories;
    const isOverLimit = remainingCalories < 0;

    // 分餐次聚合
    const mealTypes = [
      { key: 'breakfast', name: '🍳 早餐' },
      { key: 'lunch', name: '🥗 午餐' },
      { key: 'dinner', name: '🍲 晚餐' },
      { key: 'snack', name: '🍇 加餐' }
    ];

    const meals = mealTypes.map(m => {
      const mealEntries = entries.filter(e => e.mealType === m.key);
      const totalCal = mealEntries.reduce((acc, cur) => acc + (cur.calories || 0), 0);
      return {
        key: m.key,
        name: m.name,
        calories: totalCal,
        entries: mealEntries
      };
    });

    return {
      date,
      targetCalories: profile.targetCalories,
      consumedCalories,
      remainingCalories,
      isOverLimit,
      caloriePercentage: Math.min(100, Math.round((consumedCalories / profile.targetCalories) * 100)),
      macros: {
        protein: {
          consumed: consumedProtein,
          target: profile.targetProtein,
          percentage: Math.min(100, Math.round((consumedProtein / profile.targetProtein) * 100))
        },
        fat: {
          consumed: consumedFat,
          target: profile.targetFat,
          percentage: Math.min(100, Math.round((consumedFat / profile.targetFat) * 100))
        },
        carbs: {
          consumed: consumedCarbs,
          target: profile.targetCarbs,
          percentage: Math.min(100, Math.round((consumedCarbs / profile.targetCarbs) * 100))
        }
      },
      meals
    };
  }

  addEntry({ date, time, mealType, foodId, weight, customName, note }) {
    const food = PRESET_FOODS.find(f => f.id === foodId);
    let name = customName || (food ? food.name : '自定义食物');
    let unit = food ? food.unit : '克';
    let nutrients;

    if (food) {
      nutrients = calculateNutrients(food, weight || food.standardWeight);
    } else {
      nutrients = {
        calories: Math.round((weight || 100) * 1.5),
        protein: +((weight || 100) * 0.1).toFixed(1),
        fat: +((weight || 100) * 0.05).toFixed(1),
        carbs: +((weight || 100) * 0.15).toFixed(1),
        weight: weight || 100
      };
    }

    const mealTypeNames = {
      breakfast: '早餐',
      lunch: '午餐',
      dinner: '晚餐',
      snack: '加餐'
    };

    const newEntry = {
      id: 'entry_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      date: date || new Date().toISOString().split('T')[0],
      time: time || new Date().toTimeString().substring(0, 5),
      mealType: mealType || 'lunch',
      mealTypeName: mealTypeNames[mealType] || '午餐',
      foodId: foodId || 'custom',
      foodName: name,
      weight: nutrients.weight,
      unit,
      calories: nutrients.calories,
      protein: nutrients.protein,
      fat: nutrients.fat,
      carbs: nutrients.carbs,
      note: note || ''
    };

    this.data.mealEntries.push(newEntry);
    this.saveData();
    return newEntry;
  }

  updateEntry(id, updates) {
    const idx = this.data.mealEntries.findIndex(e => e.id === id);
    if (idx === -1) return null;

    const existing = this.data.mealEntries[idx];
    let food = null;
    if (updates.foodId) {
      food = PRESET_FOODS.find(f => f.id === updates.foodId);
    } else if (existing.foodId) {
      food = PRESET_FOODS.find(f => f.id === existing.foodId);
    }

    const weight = updates.weight !== undefined ? updates.weight : existing.weight;

    if (food && (updates.weight !== undefined || updates.foodId !== undefined)) {
      const nut = calculateNutrients(food, weight);
      updates.calories = nut.calories;
      updates.protein = nut.protein;
      updates.fat = nut.fat;
      updates.carbs = nut.carbs;
      updates.foodName = food.name;
      updates.unit = food.unit;
    }

    const updated = { ...existing, ...updates };
    this.data.mealEntries[idx] = updated;
    this.saveData();
    return updated;
  }

  deleteEntry(id) {
    const idx = this.data.mealEntries.findIndex(e => e.id === id);
    if (idx === -1) return false;
    this.data.mealEntries.splice(idx, 1);
    this.saveData();
    return true;
  }
}

export const defaultStore = new Store();
