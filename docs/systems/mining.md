# 挖矿系统设计文档

## 系统概述

挖矿系统是资源消耗型的采集系统，通过消耗矿场资源池获取矿物，矿物主要用于出售获取金钱。

## 矿物配置

| 矿物 | 稀有度 | 概率 | 售价 | 期望价值 |
|------|--------|------|------|----------|
| 铜矿 | Common | 50% | 15 | 7.5 |
| 铁矿 | Uncommon | 35% | 30 | 10.5 |
| 银矿 | Rare | 12% | 60 | 7.2 |
| 金矿 | Epic | 3% | 150 | 4.5 |

**期望价值**：29.7 金币/次

## 核心机制

### Mine 类

```typescript
class Mine {
  private resourcePool: WeightedPool<ItemType>;
  private currentResources: number;
  private maxResources: number;
  private lastRefreshTime: number;
  private readonly REFRESH_INTERVAL = 3600000; // 1小时
  private readonly REFRESH_AMOUNT = 100;

  constructor(maxResources: number = 1000) {
    this.maxResources = maxResources;
    this.currentResources = maxResources;
    this.lastRefreshTime = Date.now();
    
    this.resourcePool = new WeightedPool<ItemType>();
    this.resourcePool.add(ItemType.MINERAL_COPPER, 50);
    this.resourcePool.add(ItemType.MINERAL_IRON, 35);
    this.resourcePool.add(ItemType.MINERAL_SILVER, 12);
    this.resourcePool.add(ItemType.MINERAL_GOLD, 3);
  }

  canMine(): boolean {
    return this.currentResources > 0;
  }

  mine(): ItemType | null {
    if (!this.canMine()) {
      return null;
    }

    this.currentResources--;
    return this.resourcePool.draw();
  }

  update(currentTime: number): void {
    // 定期补充资源
    const elapsed = currentTime - this.lastRefreshTime;
    
    if (elapsed >= this.REFRESH_INTERVAL) {
      const refreshes = Math.floor(elapsed / this.REFRESH_INTERVAL);
      this.replenish(this.REFRESH_AMOUNT * refreshes);
      this.lastRefreshTime += refreshes * this.REFRESH_INTERVAL;
    }
  }

  replenish(amount: number): void {
    this.currentResources = Math.min(
      this.maxResources,
      this.currentResources + amount
    );
  }

  getResourceStatus(): { current: number; max: number; percentage: number } {
    return {
      current: this.currentResources,
      max: this.maxResources,
      percentage: this.currentResources / this.maxResources
    };
  }
}
```

### MiningSystem 类

```typescript
class MiningSystem implements ISystem {
  private mine: Mine;
  private miningCooldown: Map<string, number>;
  private readonly MINING_TIME = 45000; // 45秒

  init(): void {
    this.mine = new Mine(1000);
    this.miningCooldown = new Map();
  }

  async dig(character: Character): Promise<MiningResult> {
    // 检查位置
    if (character.location !== Location.MINE) {
      return {
        success: false,
        message: '你不在矿场'
      };
    }

    // 检查冷却
    const lastMining = this.miningCooldown.get(character.id) || 0;
    const now = Date.now();
    
    if (now - lastMining < this.MINING_TIME) {
      return {
        success: false,
        message: '挖矿中，请稍候...'
      };
    }

    // 检查矿场资源
    if (!this.mine.canMine()) {
      return {
        success: false,
        message: '矿场资源已耗尽，请等待刷新'
      };
    }

    // 模拟挖矿时间
    await this.simulateMining(this.MINING_TIME);

    // 挖掘矿物
    const mineral = this.mine.mine();
    
    if (mineral) {
      character.inventory.add(mineral, 1);
      this.miningCooldown.set(character.id, now);
      
      const mineralConfig = MINERAL_CONFIGS[mineral];
      return {
        success: true,
        mineral,
        message: `挖到了 ${mineralConfig.name}！`
      };
    }

    return {
      success: false,
      message: '挖矿失败'
    };
  }

  private async simulateMining(duration: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, duration));
  }

  update(deltaTime: number): void {
    this.mine.update(Date.now());
  }

  getMineStatus(): { current: number; max: number; percentage: number } {
    return this.mine.getResourceStatus();
  }

  destroy(): void {
    this.miningCooldown.clear();
  }
}

interface MiningResult {
  success: boolean;
  mineral?: ItemType;
  message: string;
}
```

## 矿物配置数据

```typescript
interface MineralConfig {
  type: ItemType;
  name: string;
  rarity: Rarity;
  sellValue: number;
  description: string;
}

const MINERAL_CONFIGS: Record<ItemType, MineralConfig> = {
  [ItemType.MINERAL_COPPER]: {
    type: ItemType.MINERAL_COPPER,
    name: '铜矿',
    rarity: Rarity.COMMON,
    sellValue: 15,
    description: '常见的铜矿石'
  },
  [ItemType.MINERAL_IRON]: {
    type: ItemType.MINERAL_IRON,
    name: '铁矿',
    rarity: Rarity.UNCOMMON,
    sellValue: 30,
    description: '坚硬的铁矿石'
  },
  [ItemType.MINERAL_SILVER]: {
    type: ItemType.MINERAL_SILVER,
    name: '银矿',
    rarity: Rarity.RARE,
    sellValue: 60,
    description: '珍贵的银矿石'
  },
  [ItemType.MINERAL_GOLD]: {
    type: ItemType.MINERAL_GOLD,
    name: '金矿',
    rarity: Rarity.EPIC,
    sellValue: 150,
    description: '极为稀有的金矿石'
  }
};
```

## 资源管理策略

### 公共资源困境

所有角色共享同一个矿场资源池，产生公共资源博弈：
- 过度开采导致资源枯竭
- 需要等待资源刷新
- 角色间竞争挖矿时机

### 刷新机制

- **定时刷新**：每小时补充 100 资源
- **最大容量**：1000 资源
- **消耗速度**：每次挖矿消耗 1 资源

### 平衡计算

假设 10 个角色同时挖矿：
- 每小时每人最多挖：3600 / 45 = 80 次
- 总消耗：80 × 10 = 800 资源
- 补充量：100 资源
- 结果：资源逐渐枯竭，需要角色调整策略

## LLM 决策集成

### 决策上下文

```typescript
interface MiningDecisionContext {
  characterState: {
    money: number;
    location: string;
    mineralsInInventory: number;
  };
  mineState: {
    resourcesAvailable: number;
    resourcesPercentage: number;
    timeUntilRefresh: number;
  };
  competition: {
    minersNearby: number;
    estimatedWaitTime: number;
  };
}
```

### 决策示例

```json
{
  "action": "go_mining",
  "reasoning": "矿场资源充足（80%），现在去挖矿是好时机",
  "emotion": "motivated"
}
```

## 扩展功能

### 1. 私有矿场

```typescript
class PrivateMine extends Mine {
  owner: Character;
  
  // 角色可以购买私有矿场，不受公共资源限制
}
```

### 2. 挖矿工具

```typescript
interface PickAxe {
  efficiency: number; // 1.0 - 2.0
  durability: number;
  
  applyBonus(): { speedBonus: number; qualityBonus: number };
}
```

### 3. 矿脉系统

```typescript
class MineVein {
  type: ItemType;
  richness: number; // 影响该矿物的出现概率
  depletion: number; // 枯竭度
  
  extract(): ItemType | null;
}
```

### 4. 矿物加工

```typescript
class Smelter {
  process(rawMinerals: ItemType[], recipe: Recipe): ItemType;
}

// 例如：3个铜矿 → 1个铜锭（价值更高）
```

## 可视化

```typescript
class MineRenderer {
  renderMineStatus(mine: Mine, ctx: CanvasRenderingContext2D): void {
    const status = mine.getResourceStatus();
    
    // 绘制资源条
    this.drawResourceBar(status.percentage, ctx);
    
    // 显示数字
    ctx.fillText(
      `${status.current} / ${status.max}`,
      x, y
    );
  }
  
  renderMiners(characters: Character[], ctx: CanvasRenderingContext2D): void {
    // 显示正在挖矿的角色
  }
}
```

## 测试用例

1. **资源消耗测试**：验证挖矿正确消耗资源池
2. **资源刷新测试**：验证定时刷新机制
3. **概率测试**：验证各矿物出现频率
4. **竞争测试**：模拟多角色同时挖矿，观察资源枯竭情况

---

**最后更新**：2026-01-15
