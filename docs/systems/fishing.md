# 钓鱼系统设计文档

## 系统概述

钓鱼系统是基于概率的资源获取系统，提供随机性收益和娱乐性，是角色获取食物和金钱的重要途径。

## 鱼类配置

| 鱼类 | 稀有度 | 概率 | 饥饿恢复 | 售价 | 期望价值 |
|------|--------|------|----------|------|----------|
| 普通鱼 | Common | 50% | 15 | 8 | 4.0 |
| 稀有鱼 | Rare | 30% | 25 | 20 | 6.0 |
| 银鱼 | Uncommon | 15% | 35 | 40 | 6.0 |
| 金鱼 | Epic | 4% | 50 | 80 | 3.2 |
| 传说之鱼 | Legendary | 1% | 80 | 200 | 2.0 |

**期望价值**：21.2 金币/次

## 核心机制

### 概率抽取算法

```typescript
class WeightedPool<T> {
  private items: Array<{ item: T; weight: number }>;
  private totalWeight: number;

  constructor() {
    this.items = [];
    this.totalWeight = 0;
  }

  add(item: T, weight: number): void {
    this.items.push({ item, weight });
    this.totalWeight += weight;
  }

  draw(): T {
    let random = Math.random() * this.totalWeight;
    
    for (const { item, weight } of this.items) {
      random -= weight;
      if (random <= 0) {
        return item;
      }
    }
    
    return this.items[this.items.length - 1].item;
  }
}
```

### FishingSystem 类

```typescript
class FishingSystem implements ISystem {
  private fishPool: WeightedPool<ItemType>;
  private fishingCooldown: Map<string, number>; // characterId -> timestamp
  private readonly FISHING_TIME = 30000; // 30秒

  init(): void {
    this.fishPool = new WeightedPool<ItemType>();
    this.fishPool.add(ItemType.FISH_COMMON, 50);
    this.fishPool.add(ItemType.FISH_RARE, 30);
    this.fishPool.add(ItemType.FISH_SILVER, 15);
    this.fishPool.add(ItemType.FISH_GOLDEN, 4);
    this.fishPool.add(ItemType.FISH_LEGENDARY, 1);
    
    this.fishingCooldown = new Map();
  }

  async fish(character: Character): Promise<FishingResult> {
    // 检查冷却
    const lastFishing = this.fishingCooldown.get(character.id) || 0;
    const now = Date.now();
    
    if (now - lastFishing < this.FISHING_TIME) {
      return {
        success: false,
        message: '钓鱼中，请稍候...'
      };
    }

    // 检查位置
    if (character.location !== Location.FISHING_SPOT) {
      return {
        success: false,
        message: '你不在钓鱼点'
      };
    }

    // 模拟钓鱼时间
    await this.simulateFishing(this.FISHING_TIME);

    // 抽取鱼类
    const fishType = this.fishPool.draw();
    character.inventory.add(fishType, 1);
    
    this.fishingCooldown.set(character.id, now);

    const fishConfig = FISH_CONFIGS[fishType];
    return {
      success: true,
      fish: fishType,
      message: `钓到了 ${fishConfig.name}！`
    };
  }

  private async simulateFishing(duration: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, duration));
  }

  update(deltaTime: number): void {
    // 钓鱼系统主要是事件驱动，不需要持续更新
  }

  destroy(): void {
    this.fishingCooldown.clear();
  }
}

interface FishingResult {
  success: boolean;
  fish?: ItemType;
  message: string;
}
```

## 鱼类配置数据

```typescript
interface FishConfig {
  type: ItemType;
  name: string;
  rarity: Rarity;
  hungerRestore: number;
  sellValue: number;
  description: string;
}

enum Rarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary'
}

const FISH_CONFIGS: Record<ItemType, FishConfig> = {
  [ItemType.FISH_COMMON]: {
    type: ItemType.FISH_COMMON,
    name: '普通鱼',
    rarity: Rarity.COMMON,
    hungerRestore: 15,
    sellValue: 8,
    description: '常见的淡水鱼'
  },
  [ItemType.FISH_RARE]: {
    type: ItemType.FISH_RARE,
    name: '稀有鱼',
    rarity: Rarity.RARE,
    hungerRestore: 25,
    sellValue: 20,
    description: '不太常见的美味鱼类'
  },
  [ItemType.FISH_SILVER]: {
    type: ItemType.FISH_SILVER,
    name: '银鱼',
    rarity: Rarity.UNCOMMON,
    hungerRestore: 35,
    sellValue: 40,
    description: '银光闪闪的珍贵鱼类'
  },
  [ItemType.FISH_GOLDEN]: {
    type: ItemType.FISH_GOLDEN,
    name: '金鱼',
    rarity: Rarity.EPIC,
    hungerRestore: 50,
    sellValue: 80,
    description: '金色的史诗鱼类'
  },
  [ItemType.FISH_LEGENDARY]: {
    type: ItemType.FISH_LEGENDARY,
    name: '传说之鱼',
    rarity: Rarity.LEGENDARY,
    hungerRestore: 80,
    sellValue: 200,
    description: '传说中的神秘巨鱼'
  }
};
```

## LLM 决策集成

### 决策上下文

```typescript
interface FishingDecisionContext {
  characterState: {
    hunger: number;
    money: number;
    location: string;
    fishInInventory: number;
  };
  fishingState: {
    isAvailable: boolean;
    cooldownRemaining: number;
  };
  recentCatches: Array<{
    fish: string;
    rarity: string;
  }>;
}
```

### 决策示例

```json
{
  "action": "go_fishing",
  "reasoning": "我的金钱不足，钓鱼可以快速获得收入",
  "emotion": "hopeful"
}
```

## 扩展功能

### 1. 技能系统

```typescript
class FishingSkill {
  level: number;
  experience: number;
  
  getBonusProbability(): number {
    // 等级越高，稀有鱼概率略微提升
    return this.level * 0.001; // 每级 0.1%
  }
}
```

### 2. 天气影响

```typescript
enum Weather {
  SUNNY,
  RAINY,
  STORMY
}

// 雨天提升稀有鱼概率
const weatherBonus = weather === Weather.RAINY ? 1.2 : 1.0;
```

### 3. 时间段影响

```typescript
// 早晨和傍晚钓鱼效果更好
const timeBonus = (hour >= 6 && hour <= 8) || (hour >= 17 && hour <= 19) ? 1.3 : 1.0;
```

### 4. 钓具系统

```typescript
interface FishingRod {
  quality: number; // 1.0 - 2.0
  durability: number;
  
  applyBonus(pool: WeightedPool<ItemType>): void;
}
```

## 测试用例

1. **概率测试**：运行 10000 次钓鱼，验证各鱼类出现频率接近配置概率
2. **冷却测试**：验证钓鱼冷却时间正确
3. **库存测试**：验证钓到的鱼正确添加到库存

---

**最后更新**：2026-01-15
