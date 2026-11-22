// server/aiService.js
import { PRESET_FOODS, calculateNutrients } from './foodDatabase.js';

export async function recognizeFoodImage({ filename = '', base64 = '', mealType = 'lunch' }) {
  // 模拟 AI 推理延时 200-500ms
  await new Promise(resolve => setTimeout(resolve, 250));

  let matchedFood = null;
  const lowerName = (filename || '').toLowerCase();

  if (lowerName.includes('steak') || lowerName.includes('牛排') || lowerName.includes('beef')) {
    matchedFood = PRESET_FOODS.find(f => f.id === 'f_steak');
  } else if (lowerName.includes('salad') || lowerName.includes('沙拉') || lowerName.includes('chicken')) {
    matchedFood = PRESET_FOODS.find(f => f.id === 'f_chicken_breast');
  } else if (lowerName.includes('toast') || lowerName.includes('面包') || lowerName.includes('吐司')) {
    matchedFood = PRESET_FOODS.find(f => f.id === 'f_toast');
  } else if (lowerName.includes('egg') || lowerName.includes('蛋')) {
    matchedFood = PRESET_FOODS.find(f => f.id === 'f_boiled_egg');
  } else if (lowerName.includes('salmon') || lowerName.includes('三文鱼') || lowerName.includes('鱼')) {
    matchedFood = PRESET_FOODS.find(f => f.id === 'f_salmon');
  } else if (lowerName.includes('apple') || lowerName.includes('苹果')) {
    matchedFood = PRESET_FOODS.find(f => f.id === 'f_apple');
  } else {
    // 默认高保真匹配（根据 PRD/UI 规范默认以西冷牛排作为 MVP 推荐演示食物）
    matchedFood = PRESET_FOODS[0];
  }

  const defaultWeight = matchedFood.standardWeight;
  const nutrients = calculateNutrients(matchedFood, defaultWeight);

  // 推荐备选食物，满足 UI 规范“低置信度/多候选项”交互
  const candidates = PRESET_FOODS
    .filter(f => f.id !== matchedFood.id && (f.category === matchedFood.category || Math.random() > 0.5))
    .slice(0, 3)
    .map(c => ({
      id: c.id,
      name: c.name,
      category: c.category,
      caloriesPer100g: c.caloriesPer100g,
      proteinPer100g: c.proteinPer100g,
      fatPer100g: c.fatPer100g,
      carbsPer100g: c.carbsPer100g,
      confidence: +(c.defaultConfidence - 0.15).toFixed(2)
    }));

  return {
    success: true,
    foodId: matchedFood.id,
    name: matchedFood.name,
    category: matchedFood.category,
    confidence: matchedFood.defaultConfidence,
    weight: defaultWeight,
    unit: matchedFood.unit,
    calories: nutrients.calories,
    protein: nutrients.protein,
    fat: nutrients.fat,
    carbs: nutrients.carbs,
    mealType,
    macroRatio: {
      proteinRatio: Math.round((nutrients.protein * 4 / Math.max(1, nutrients.calories)) * 100),
      fatRatio: Math.round((nutrients.fat * 9 / Math.max(1, nutrients.calories)) * 100),
      carbsRatio: Math.round((nutrients.carbs * 4 / Math.max(1, nutrients.calories)) * 100)
    },
    candidates
  };
}
