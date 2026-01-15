# 农业系统设计文档

## 系统概述

农业系统是 AI 小镇的核心生产系统之一，通过"投资-等待-收获"的循环，为角色提供食物来源和经济收入。

## 核心机制

### 作物数据

| 作物 | 种子价格 | 生长时间 | 饥饿恢复 | 售价 | 净利润 | 时薪 |
|------|----------|----------|----------|------|--------|------|
| 小麦 | 5 金币 | 5 分钟 | 20 | 15 金币 | 10 | 120 |
| 大米 | 8 金币 | 8 分钟 | 30 | 25 金币 | 17 | 127.5 |
| 萝卜 | 3 金币 | 3 分钟 | 15 | 10 金币 | 7 | 140 |
| 甜菜 | 6 金币 | 6 分钟 | 25 | 20 金币 | 14 | 140 |

### 种植流程

```
1. 购买种子（杂货铺）
   ↓
2. 前往农田
   ↓
3. 选择空闲地块
   ↓
4. 播种（消耗种子）
   ↓
5. 等待生长（实时计时）
   ↓
6. 作物成熟（可视化提示）
   ↓
7. 收获（获得作物）
   ↓
8. 选择用途（食用/出售）
```

## 数据结构

### Crop 配置

```typescript
interface CropConfig {
  type: ItemType;
  seedType: ItemType;
  seedCost: number;
  growthTime: number; // 毫秒
  hungerRestore: number;
  sellValue: number;
  name: string;
}

const CROPS: Record<string, CropConfig> = {
  WHEAT: {
    type: ItemType.CROP_WHEAT,
    seedType: ItemType.SEED_WHEAT,
    seedCost: 5,
    growthTime: 5 * 60 * 1000, // 5分钟
    hungerRestore: 20,
    sellValue: 15,
    name: '小麦'
  },
  // ... 其他作物
};
```

### FarmPlot 类

```typescript
class FarmPlot {
  id: string;
  owner: Character;
  crop: Crop | null;
  plantedAt: number | null;
  growthProgress: number; // 0-1
  
  plant(seedType: ItemType, gameTime: number): PlantResult {
    if (this.crop !== null) {
      return { success: false, message: "地块已有作物" };
    }
    
    const cropConfig = getCropConfigBySeed(seedType);
    if (!cropConfig) {
      return { success: false, message: "无效的种子类型" };
    }
    
    this.crop = {
      type: cropConfig.type,
      config: cropConfig
    };
    this.plantedAt = gameTime;
    this.growthProgress = 0;
    
    return { success: true, message: `成功种植${cropConfig.name}` };
  }
  
  update(currentTime: number): void {
    if (this.crop && this.plantedAt !== null) {
      const elapsed = currentTime - this.plantedAt;
      this.growthProgress = Math.min(1, elapsed / this.crop.config.growthTime);
    }
  }
  
  canHarvest(): boolean {
    return this.growthProgress >= 1;
  }
  
  harvest(): HarvestResult {
    if (!this.canHarvest()) {
      return { success: false, message: "作物尚未成熟" };
    }
    
    const harvested = this.crop!.type;
    const cropConfig = this.crop!.config;
    
    // 重置地块
    this.crop = null;
    this.plantedAt = null;
    this.growthProgress = 0;
    
    return {
      success: true,
      item: harvested,
      quantity: 1,
      message: `收获了 ${cropConfig.name}`
    };
  }
}

interface Crop {
  type: ItemType;
  config: CropConfig;
}

interface PlantResult {
  success: boolean;
  message: string;
}

interface HarvestResult {
  success: boolean;
  item?: ItemType;
  quantity?: number;
  message: string;
}
```

### Farm 类

```typescript
class Farm {
  id: string;
  owner: Character;
  plots: FarmPlot[];
  maxPlots: number;
  
  constructor(owner: Character, initialPlots: number = 4) {
    this.id = generateId();
    this.owner = owner;
    this.maxPlots = initialPlots;
    this.plots = [];
    
    for (let i = 0; i < initialPlots; i++) {
      this.plots.push(new FarmPlot(this.owner));
    }
  }
  
  getAvailablePlots(): FarmPlot[] {
    return this.plots.filter(p => p.crop === null);
  }
  
  getMaturePlots(): FarmPlot[] {
    return this.plots.filter(p => p.canHarvest());
  }
  
  expandFarm(additionalPlots: number, cost: number): boolean {
    if (this.owner.money < cost) {
      return false;
    }
    
    this.owner.money -= cost;
    for (let i = 0; i < additionalPlots; i++) {
      this.plots.push(new FarmPlot(this.owner));
    }
    this.maxPlots += additionalPlots;
    
    return true;
  }
}
```

### FarmingSystem 类

```typescript
class FarmingSystem implements ISystem {
  private farms: Map<string, Farm>; // characterId -> Farm
  
  init(): void {
    this.farms = new Map();
  }
  
  update(deltaTime: number): void {
    const currentTime = GameTime.getCurrentTime();
    
    for (const farm of this.farms.values()) {
      for (const plot of farm.plots) {
        plot.update(currentTime);
      }
    }
  }
  
  createFarmForCharacter(character: Character, plotCount: number = 4): Farm {
    const farm = new Farm(character, plotCount);
    this.farms.set(character.id, farm);
    return farm;
  }
  
  getFarm(character: Character): Farm | null {
    return this.farms.get(character.id) || null;
  }
  
  plantSeed(character: Character, plotIndex: number, seedType: ItemType): PlantResult {
    const farm = this.getFarm(character);
    if (!farm) {
      return { success: false, message: "角色没有农田" };
    }
    
    if (plotIndex < 0 || plotIndex >= farm.plots.length) {
      return { success: false, message: "无效的地块索引" };
    }
    
    if (!character.inventory.has(seedType, 1)) {
      return { success: false, message: "没有足够的种子" };
    }
    
    const plot = farm.plots[plotIndex];
    const result = plot.plant(seedType, GameTime.getCurrentTime());
    
    if (result.success) {
      character.inventory.remove(seedType, 1);
    }
    
    return result;
  }
  
  harvestPlot(character: Character, plotIndex: number): HarvestResult {
    const farm = this.getFarm(character);
    if (!farm) {
      return { success: false, message: "角色没有农田" };
    }
    
    if (plotIndex < 0 || plotIndex >= farm.plots.length) {
      return { success: false, message: "无效的地块索引" };
    }
    
    const plot = farm.plots[plotIndex];
    const result = plot.harvest();
    
    if (result.success && result.item) {
      character.inventory.add(result.item, result.quantity || 1);
    }
    
    return result;
  }
  
  destroy(): void {
    this.farms.clear();
  }
}
```

## 策略考虑

### 作物选择策略

**高频低利（萝卜、甜菜）**
- 优点：快速周转，灵活应对需求
- 缺点：需要频繁操作
- 适合：活跃型角色，急需金钱/食物时

**低频高利（大米）**
- 优点：单次利润高，操作少
- 缺点：资金占用时间长
- 适合：稳健型角色，有充足启动资金

**平衡策略（小麦）**
- 中等周期，中等利润
- 适合新手角色

### 农田规模策略

**小规模专注**
- 2-4 个地块
- 精细管理，及时收获
- 低资金需求

**大规模扩张**
- 8-12 个地块
- 批量种植，定期收获
- 高资金需求，高回报

### 多样化种植

- 不同作物错开成熟时间
- 分散风险（如饥饿紧急时有快速作物）
- 利用不同售价优化收益

## LLM 决策集成

### 决策输入

```typescript
interface FarmingDecisionContext {
  characterState: {
    hunger: number;
    money: number;
    inventory: Record<ItemType, number>;
  };
  farmState: {
    totalPlots: number;
    availablePlots: number;
    maturePlots: number;
    growingCrops: Array<{
      type: string;
      progress: number;
      timeRemaining: number;
    }>;
  };
  marketPrices: {
    seeds: Record<string, number>;
    crops: Record<string, number>;
  };
}
```

### 决策输出

```typescript
interface FarmingDecision {
  action: 'plant' | 'harvest' | 'expand' | 'wait';
  cropType?: string;
  plotIndex?: number;
  reasoning: string;
}
```

### 决策示例

```json
{
  "action": "plant",
  "cropType": "wheat",
  "plotIndex": 0,
  "reasoning": "我还有 50 金币和空闲地块，种植小麦可以在 5 分钟后获得收益"
}
```

## 可视化

### 农田渲染

```typescript
class FarmRenderer {
  renderFarm(farm: Farm, context: CanvasRenderingContext2D): void {
    for (let i = 0; i < farm.plots.length; i++) {
      const plot = farm.plots[i];
      const x = (i % 4) * PLOT_SIZE;
      const y = Math.floor(i / 4) * PLOT_SIZE;
      
      this.renderPlot(plot, x, y, context);
    }
  }
  
  renderPlot(plot: FarmPlot, x: number, y: number, ctx: CanvasRenderingContext2D): void {
    // 绘制地块底色
    ctx.fillStyle = '#8B4513'; // 土壤色
    ctx.fillRect(x, y, PLOT_SIZE, PLOT_SIZE);
    
    if (plot.crop) {
      // 绘制作物（根据生长进度）
      const stage = this.getGrowthStage(plot.growthProgress);
      this.drawCrop(plot.crop.type, stage, x, y, ctx);
      
      // 显示生长进度条
      this.drawProgressBar(plot.growthProgress, x, y, ctx);
    }
  }
  
  getGrowthStage(progress: number): 'seed' | 'sprout' | 'growing' | 'mature' {
    if (progress < 0.25) return 'seed';
    if (progress < 0.5) return 'sprout';
    if (progress < 1.0) return 'growing';
    return 'mature';
  }
}
```

## 扩展功能

### 1. 作物品质系统

```typescript
enum CropQuality {
  NORMAL = 1.0,
  GOOD = 1.2,
  EXCELLENT = 1.5
}

// 影响售价和恢复值
const finalValue = baseValue * quality;
```

### 2. 肥料系统

```typescript
class Fertilizer {
  applyTo(plot: FarmPlot): void {
    plot.growthSpeedMultiplier = 1.5; // 生长速度提升 50%
  }
}
```

### 3. 季节系统

```typescript
enum Season {
  SPRING,
  SUMMER,
  FALL,
  WINTER
}

// 某些作物在特定季节生长更快或产量更高
```

### 4. 作物疾病

```typescript
class PlantDisease {
  probability: number;
  effect: 'reduce_yield' | 'slow_growth' | 'crop_death';
  
  infect(plot: FarmPlot): void;
}
```

## 测试用例

### 功能测试

1. **种植测试**
   - 成功种植种子
   - 种子不足时种植失败
   - 地块已占用时种植失败

2. **生长测试**
   - 生长进度正确更新
   - 到达生长时间后可收获

3. **收获测试**
   - 成功收获成熟作物
   - 未成熟作物无法收获
   - 收获后地块清空

### 平衡测试

1. **收益测试**
   - 验证各作物的理论时薪
   - 对比不同种植策略的实际收益

2. **资金流测试**
   - 模拟角色从 100 金币启动农业
   - 验证能否维持正增长

---

**最后更新**：2026-01-15
