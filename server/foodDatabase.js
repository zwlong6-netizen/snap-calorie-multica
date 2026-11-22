// server/foodDatabase.js

export const PRESET_FOODS = [
  { id: 'f_steak', name: '香煎西冷牛排', alias: ['牛排', '西冷牛排', 'steak'], category: '肉禽类', standardWeight: 200, unit: '克', caloriesPer100g: 244, proteinPer100g: 23.1, fatPer100g: 16.0, carbsPer100g: 0.6, defaultConfidence: 0.96 },
  { id: 'f_filet', name: '菲力牛排', alias: ['牛排', '菲力', '瘦牛肉'], category: '肉禽类', standardWeight: 180, unit: '克', caloriesPer100g: 188, proteinPer100g: 26.0, fatPer100g: 8.5, carbsPer100g: 0.0, defaultConfidence: 0.91 },
  { id: 'f_chicken_breast', name: '香煎鸡胸肉沙拉', alias: ['鸡胸肉', '沙拉', '鸡肉沙拉', 'chicken salad'], category: '轻食沙拉', standardWeight: 250, unit: '克', caloriesPer100g: 135, proteinPer100g: 22.5, fatPer100g: 3.2, carbsPer100g: 4.0, defaultConfidence: 0.95 },
  { id: 'f_toast', name: '全麦吐司', alias: ['吐司', '面包', '全麦面包', 'toast'], category: '主食谷物', standardWeight: 60, unit: '片(2片/60g)', caloriesPer100g: 253, proteinPer100g: 9.5, fatPer100g: 3.5, carbsPer100g: 46.0, defaultConfidence: 0.94 },
  { id: 'f_boiled_egg', name: '水煮白壳蛋', alias: ['鸡蛋', '水煮蛋', '白煮蛋', 'egg'], category: '蛋类豆品', standardWeight: 50, unit: '颗', caloriesPer100g: 156, proteinPer100g: 13.0, fatPer100g: 10.5, carbsPer100g: 1.5, defaultConfidence: 0.98 },
  { id: 'f_brown_rice', name: '杂粮五谷糙米饭', alias: ['糙米饭', '米饭', '杂粮饭', '五谷饭', 'rice'], category: '主食谷物', standardWeight: 150, unit: '碗', caloriesPer100g: 116, proteinPer100g: 2.6, fatPer100g: 0.9, carbsPer100g: 24.5, defaultConfidence: 0.92 },
  { id: 'f_americano', name: '冰美式咖啡', alias: ['咖啡', '美式咖啡', '美式', '黑咖啡', 'americano'], category: '饮品水饮', standardWeight: 300, unit: 'ml', caloriesPer100g: 1.7, proteinPer100g: 0.1, fatPer100g: 0.0, carbsPer100g: 0.3, defaultConfidence: 0.99 },
  { id: 'f_milk', name: '纯牛奶', alias: ['牛奶', '鲜牛奶', 'milk'], category: '乳制品', standardWeight: 200, unit: 'ml', caloriesPer100g: 65, proteinPer100g: 3.4, fatPer100g: 3.6, carbsPer100g: 5.0, defaultConfidence: 0.96 },
  { id: 'f_broccoli', name: '清炒西兰花', alias: ['西兰花', '青花菜', 'broccoli'], category: '蔬菜菌菇', standardWeight: 150, unit: '克', caloriesPer100g: 38, proteinPer100g: 2.8, fatPer100g: 1.2, carbsPer100g: 4.5, defaultConfidence: 0.93 },
  { id: 'f_greek_yogurt', name: '无糖希腊酸奶配蓝莓', alias: ['酸奶', '希腊酸奶', '蓝莓酸奶', 'yogurt'], category: '乳制品', standardWeight: 180, unit: '杯', caloriesPer100g: 95, proteinPer100g: 8.5, fatPer100g: 2.5, carbsPer100g: 9.5, defaultConfidence: 0.90 },
  { id: 'f_salmon', name: '香煎三文鱼排', alias: ['三文鱼', '烤三文鱼', 'salmon'], category: '海鲜水产', standardWeight: 180, unit: '克', caloriesPer100g: 208, proteinPer100g: 22.0, fatPer100g: 13.0, carbsPer100g: 0.0, defaultConfidence: 0.92 },
  { id: 'f_apple', name: '红富士苹果', alias: ['苹果', 'apple'], category: '水果果干', standardWeight: 200, unit: '个', caloriesPer100g: 52, proteinPer100g: 0.3, fatPer100g: 0.2, carbsPer100g: 13.5, defaultConfidence: 0.97 },
  { id: 'f_banana', name: '香蕉', alias: ['香蕉', 'banana'], category: '水果果干', standardWeight: 120, unit: '根', caloriesPer100g: 89, proteinPer100g: 1.1, fatPer100g: 0.2, carbsPer100g: 22.0, defaultConfidence: 0.95 },
  { id: 'f_oatmeal', name: '纯燕麦粥', alias: ['燕麦', '麦片', '燕麦片', 'oats'], category: '主食谷物', standardWeight: 200, unit: '碗', caloriesPer100g: 68, proteinPer100g: 2.5, fatPer100g: 1.5, carbsPer100g: 12.0, defaultConfidence: 0.93 },
  { id: 'f_pepper_beef', name: '黑椒牛柳炒彩椒', alias: ['黑椒牛肉', '牛柳', '炒牛肉'], category: '肉禽类', standardWeight: 200, unit: '克', caloriesPer100g: 165, proteinPer100g: 18.0, fatPer100g: 9.0, carbsPer100g: 4.5, defaultConfidence: 0.89 }
];

export function searchFoods(query = '') {
  const q = query.trim().toLowerCase();
  if (!q) {
    return PRESET_FOODS.slice(0, 10);
  }
  return PRESET_FOODS.filter(item => {
    if (item.name.toLowerCase().includes(q)) return true;
    if (item.category.toLowerCase().includes(q)) return true;
    if (item.alias && item.alias.some(a => a.toLowerCase().includes(q))) return true;
    return false;
  });
}

export function calculateNutrients(food, weightGrams) {
  const factor = weightGrams / 100;
  const calories = Math.round(food.caloriesPer100g * factor);
  const protein = +(food.proteinPer100g * factor).toFixed(1);
  const fat = +(food.fatPer100g * factor).toFixed(1);
  const carbs = +(food.carbsPer100g * factor).toFixed(1);
  return {
    calories,
    protein,
    fat,
    carbs,
    weight: Math.round(weightGrams)
  };
}
