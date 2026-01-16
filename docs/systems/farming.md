# 农业系统设计文档

## 系统概述

农业系统是 Sonacatworld 的核心生产系统之一，允许 AI 居民通过种植作物获得食物和经济收益。本系统实现了完整的农业循环：购买种子 → 播种 → 生长 → 收获 → 消费/出售。

---

## 作物设计

### 作物种类

| 作物名称 | 英文名 | 生长周期 | 饥饿恢复 | 售价 | 种子价格 |
|---------|--------|---------|---------|------|----------|
| 小麦 | Wheat | 3天 | 15 | 30金 | 10金 |
| 大米 | Rice | 4天 | 20 | 40金 | 15金 |
| 萝卜 | Turnip | 2天 | 10 | 20金 | 5金 |
| 甜菜 | Beet | 5天 | 25 | 50金 | 20金 |

### 作物属性

```typescript
interface Crop {
  id: string;
  name: string;
  seedId: string;
  growthTime: number; // 游戏天数
  hungerRestore: number;
  sellPrice: number;
  description: string;
}

interface Seed {
  id: string;
  name: string;
  cropId: string;
  buyPrice: number;
  description: string;
}
```

---

## 种植系统

### 农田设计

#### 农田属性

```typescript
interface FarmPlot {
  id: string;
  ownerId: string; // 所属AI
  position: Position;
  state: PlotState;
  crop?: PlantedCrop;
}

enum PlotState {
  EMPTY = 'empty',           // 空闲
  PLANTED = 'planted',       // 已种植
  GROWING = 'growing',       // 生长中
  READY = 'ready',           // 可收获
  WITHERED = 'withered'      // 枯萎（可选）
}

interface PlantedCrop {
  seedId: string;
  cropId: string;
  plantedAt: GameTime;
  harvestAt: GameTime;
  growthProgress: number; // 0-1
}
```

#### 农田分配

- 每个AI居民初始拥有 **2-4块农田**
- 农田位置固定，属于特定AI
- 后续可扩展：购买更多农田

---

## 农业流程

### 1. 购买种子

```typescript
// AI决策购买种子
const decision = await aiAgent.decide({
  action: 'buy_seed',
  context: {
    money: character.money,
    emptyPlots: character.getEmptyPlots(),
    seedPrices: shop.getSeedPrices()
  }
});

// 执行购买
if (decision.action === 'buy_seed') {
  shop.buyItem(character, decision.seedId, decision.quantity);
}
```

### 2. 播种

```typescript
// 前置条件检查
function canPlant(character: Character, plot: FarmPlot, seed: Seed): boolean {
  return (
    plot.state === PlotState.EMPTY &&
    plot.ownerId === character.id &&
    character.inventory.has(seed.id)
  );
}

// 播种动作
function plant(character: Character, plot: FarmPlot, seed: Seed): void {
  // 1. 消耗种子
  character.inventory.remove(seed.id, 1);
  
  // 2. 更新农田状态
  plot.state = PlotState.PLANTED;
  plot.crop = {
    seedId: seed.id,
    cropId: seed.cropId,
    plantedAt: gameTime.current,
    harvestAt: gameTime.current + getCrop(seed.cropId).growthTime,
    growthProgress: 0
  };
  
  // 3. 触发事件
  eventBus.emit('crop_planted', { character, plot, seed });
}
```

### 3. 生长

```typescript
// 每个游戏时间步更新生长进度
function updateGrowth(plot: FarmPlot, currentTime: GameTime): void {
  if (plot.state !== PlotState.PLANTED && plot.state !== PlotState.GROWING) {
    return;
  }
  
  const crop = plot.crop!;
  const totalGrowthTime = getCrop(crop.cropId).growthTime;
  const elapsedTime = currentTime - crop.plantedAt;
  
  // 更新生长进度
  crop.growthProgress = Math.min(elapsedTime / totalGrowthTime, 1.0);
  
  // 更新状态
  if (crop.growthProgress >= 1.0) {
    plot.state = PlotState.READY;
    eventBus.emit('crop_ready', { plot });
  } else {
    plot.state = PlotState.GROWING;
  }
}
```

### 4. 收获

```typescript
// 前置条件检查
function canHarvest(character: Character, plot: FarmPlot): boolean {
  return (
    plot.state === PlotState.READY &&
    plot.ownerId === character.id
  );
}

// 收获动作
function harvest(character: Character, plot: FarmPlot): Item {
  const crop = getCrop(plot.crop!.cropId);
  
  // 1. 添加作物到库存
  character.inventory.add(crop.id, 1);
  
  // 2. 清空农田
  plot.state = PlotState.EMPTY;
  plot.crop = undefined;
  
  // 3. 触发事件
  eventBus.emit('crop_harvested', { character, plot, crop });
  
  return crop;
}
```

### 5. 使用作物

#### 食用
```typescript
function eatCrop(character: Character, crop: Crop): void {
  // 1. 消耗作物
  character.inventory.remove(crop.id, 1);
  
  // 2. 恢复饥饿值
  character.hunger = Math.min(
    character.hunger + crop.hungerRestore,
    character.maxHunger
  );
  
  // 3. 触发事件
  eventBus.emit('crop_eaten', { character, crop });
}
```

#### 出售
```typescript
function sellCrop(character: Character, crop: Crop, quantity: number): void {
  // 使用经济系统的出售功能
  shop.sellItem(character, crop, quantity);
}
```

---

## 生长可视化

### 生长阶段

```typescript
enum GrowthStage {
  SEED = 'seed',           // 0-25%
  SPROUT = 'sprout',       // 25-50%
  GROWING = 'growing',     // 50-75%
  MATURE = 'mature',       // 75-100%
  READY = 'ready'          // 100%
}

function getGrowthStage(progress: number): GrowthStage {
  if (progress >= 1.0) return GrowthStage.READY;
  if (progress >= 0.75) return GrowthStage.MATURE;
  if (progress >= 0.5) return GrowthStage.GROWING;
  if (progress >= 0.25) return GrowthStage.SPROUT;
  return GrowthStage.SEED;
}
```

### 渲染表现

- **种子阶段**: 土壤有小点
- **发芽阶段**: 小芽破土
- **生长阶段**: 植株变大
- **成熟阶段**: 植株茂盛
- **可收获**: 发光/闪烁效果

---

## AI 农业决策

### 决策场景

#### 场景1：有空闲农田
```typescript
// LLM Prompt
const prompt = `
你是${character.name}，当前状态：
- 金钱: ${character.money}
- 饥饿值: ${character.hunger}/100
- 空闲农田: ${emptyPlots.length}块
- 库存种子: ${character.inventory.getSeeds()}

可选行为：
1. 购买种子并种植（需要金钱）
2. 使用现有种子种植
3. 暂不种植，做其他事

请决策你的行为。
`;
```

#### 场景2：作物成熟
```typescript
const prompt = `
你的农田里有${readyPlots.length}块作物成熟可收获：
${readyPlots.map(p => `- ${getCrop(p.crop.cropId).name}`).join('\n')}

请决策：
1. 收获作物
2. 稍后再收获
`;
```

#### 场景3：作物用途
```typescript
const prompt = `
你收获了${crop.name}，当前状态：
- 饥饿值: ${character.hunger}/100
- 金钱: ${character.money}
- ${crop.name}售价: ${crop.sellPrice}金
- ${crop.name}饥饿恢复: ${crop.hungerRestore}

请决策：
1. 立即食用（恢复饥饿值）
2. 存入库存稍后使用
3. 出售换钱
`;
```

### 决策策略

#### 勤劳农夫型
```typescript
personality: {
  farming_priority: 'high',
  crop_preference: 'high_value', // 优先种高价值作物
  behavior: {
    keep_plots_full: true, // 保持农田满载
    sell_surplus: true,    // 出售多余作物
    reinvest: true         // 利润再投资
  }
}
```

#### 自给自足型
```typescript
personality: {
  farming_priority: 'medium',
  crop_preference: 'balanced',
  behavior: {
    grow_for_food: true,  // 主要为食物种植
    sell_occasionally: true,
    maintain_reserve: true // 保持食物储备
  }
}
```

---

## 经济分析

### 作物收益对比

#### 小麦
- **投入**: 10金（种子）
- **周期**: 3天
- **产出**: 30金（售价）或 15饥饿恢复
- **利润**: 20金
- **日均收益**: 6.67金/天
- **性价比**: ⭐⭐⭐

#### 大米
- **投入**: 15金
- **周期**: 4天
- **产出**: 40金 或 20饥饿恢复
- **利润**: 25金
- **日均收益**: 6.25金/天
- **性价比**: ⭐⭐⭐

#### 萝卜
- **投入**: 5金
- **周期**: 2天
- **产出**: 20金 或 10饥饿恢复
- **利润**: 15金
- **日均收益**: 7.5金/天
- **性价比**: ⭐⭐⭐⭐（快速周转）

#### 甜菜
- **投入**: 20金
- **周期**: 5天
- **产出**: 50金 或 25饥饿恢复
- **利润**: 30金
- **日均收益**: 6金/天
- **性价比**: ⭐⭐（长期投资）

### 种植策略建议

**快速收益**
- 主种萝卜（2天周期）
- 快速周转
- 低风险

**稳定收益**
- 小麦+大米组合
- 交替种植
- 平滑收益曲线

**长期投资**
- 部分种植甜菜
- 高单次利润
- 需要资金储备

---

## 高级功能（未来扩展）

### 1. 作物品质系统
```typescript
enum CropQuality {
  NORMAL = 'normal',     // 1.0x 价格
  GOOD = 'good',         // 1.2x 价格
  EXCELLENT = 'excellent' // 1.5x 价格
}

// 影响品质的因素
- 种植时机
- 天气条件
- 施肥（新增道具）
- 浇水（新增机制）
```

### 2. 季节系统
```typescript
enum Season {
  SPRING = 'spring',
  SUMMER = 'summer',
  AUTUMN = 'autumn',
  WINTER = 'winter'
}

// 季节影响
- 不同作物在不同季节生长速度不同
- 某些作物只能在特定季节种植
- 季节性价格波动
```

### 3. 农田升级
```typescript
interface FarmPlotUpgrade {
  level: number;
  bonuses: {
    growthSpeed: number;  // 生长速度加成
    quality: number;      // 品质提升概率
    yieldBonus: number;   // 产量加成
  };
  upgradeCost: number;
}
```

### 4. 灌溉系统
- 需要定期浇水
- 影响生长速度
- 增加管理复杂度

### 5. 病虫害系统
- 随机事件导致作物生病
- 需要使用道具治疗
- 增加风险要素

---

## 数据持久化

### 保存数据

```typescript
interface FarmingData {
  plots: FarmPlot[];
  characterSeeds: Map<string, Seed[]>;
  characterCrops: Map<string, Crop[]>;
  harvestHistory: HarvestRecord[];
}

interface HarvestRecord {
  characterId: string;
  cropId: string;
  quantity: number;
  timestamp: GameTime;
}
```

---

## 事件系统

### 农业事件

```typescript
enum FarmingEvent {
  SEED_BOUGHT = 'seed_bought',
  CROP_PLANTED = 'crop_planted',
  CROP_GROWING = 'crop_growing',
  CROP_READY = 'crop_ready',
  CROP_HARVESTED = 'crop_harvested',
  CROP_EATEN = 'crop_eaten',
  CROP_SOLD = 'crop_sold',
}
```

---

## UI 设计需求

### 农田界面

- 农田网格显示
- 每块农田显示：
  - 作物类型
  - 生长进度条
  - 成熟倒计时
  - 收获按钮（成熟时）

### 种植界面

- 可用种子列表
- 种子信息（名称、价格、生长时间）
- 选择农田
- 确认种植按钮

---

## 测试用例

```typescript
describe('Farming System', () => {
  test('应该成功种植种子', () => {
    // 准备：AI有种子，有空闲农田
    // 执行：种植
    // 验证：种子消耗，农田状态变化
  });
  
  test('作物应该按时间正确生长', () => {
    // 准备：种植作物
    // 执行：推进时间
    // 验证：生长进度正确
  });
  
  test('应该能够收获成熟作物', () => {
    // 准备：作物成熟
    // 执行：收获
    // 验证：获得作物，农田清空
  });
  
  test('食用作物应该恢复饥饿值', () => {
    // 准备：有作物
    // 执行：食用
    // 验证：饥饿值增加
  });
});
```

---

## 总结

农业系统是 Sonacatworld 的重要经济支柱，提供了：

✅ **稳定收入来源**: 可预测的收益  
✅ **食物供应**: 满足基本生存需求  
✅ **策略深度**: 不同作物不同策略  
✅ **长期规划**: 需要时间管理能力  

通过农业系统，AI能够展现计划性和策略性，形成多样化的发展路径。
