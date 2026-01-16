# 钓鱼系统设计文档

## 系统概述

钓鱼系统是 Sonacatworld 的核心生产系统之一，提供了一种即时获取食物和收入的方式。不同于农业需要等待生长，钓鱼可以立即获得成果，但结果具有随机性。

---

## 鱼类设计

### 鱼类种类

| 鱼类名称 | 英文名 | 稀有度 | 捕获概率 | 饥饿恢复 | 售价 |
|---------|--------|--------|----------|----------|------|
| 普通鱼 | Common Fish | 普通 | 50% | 10 | 15金 |
| 稀有鱼 | Rare Fish | 稀有 | 30% | 15 | 30金 |
| 珍稀鱼 | Very Rare Fish | 珍稀 | 15% | 20 | 60金 |
| 史诗鱼 | Epic Fish | 史诗 | 4% | 30 | 120金 |
| 传说鱼 | Legendary Fish | 传说 | 1% | 50 | 300金 |

### 鱼类数据结构

```typescript
interface Fish {
  id: string;
  name: string;
  rarity: RarityLevel;
  catchProbability: number;
  hungerRestore: number;
  sellPrice: number;
  description: string;
}

enum RarityLevel {
  COMMON = 'common',
  RARE = 'rare',
  VERY_RARE = 'very_rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary'
}
```

---

## 钓鱼机制

### 钓鱼点设计

```typescript
interface FishingSpot {
  id: string;
  name: string;
  position: Position;
  capacity: number; // 同时可容纳多少AI钓鱼
  fishPool: FishPool; // 鱼类资源池
  currentFishers: Set<string>; // 当前正在钓鱼的AI ID
}

interface FishPool {
  fishes: Fish[];
  probabilities: Map<string, number>; // 动态概率
  lastRefresh: GameTime;
}
```

#### 钓鱼点位置
- **河流钓鱼点**: 小镇旁的河流
- **湖泊钓鱼点**: 镇外的湖泊（可选）
- **海边钓鱼点**: 海岸线（可选扩展）

#### 容量限制
- 每个钓鱼点可同时容纳 **4-6名** AI
- 超出容量需要等待或选择其他钓鱼点

---

## 钓鱼流程

### 1. 前往钓鱼点

```typescript
// AI决策前往钓鱼
const decision = await aiAgent.decide({
  action: 'fish',
  context: {
    hunger: character.hunger,
    money: character.money,
    nearbySpots: findNearbyFishingSpots(character.position)
  }
});

// 移动到钓鱼点
if (decision.action === 'go_fishing') {
  character.walkTo(decision.fishingSpot);
}
```

### 2. 开始钓鱼

```typescript
function startFishing(
  character: Character,
  spot: FishingSpot
): FishingSession | null {
  // 1. 检查容量
  if (spot.currentFishers.size >= spot.capacity) {
    return null; // 钓鱼点已满
  }
  
  // 2. 创建钓鱼会话
  const session: FishingSession = {
    id: generateId(),
    characterId: character.id,
    spotId: spot.id,
    startTime: gameTime.current,
    duration: FISHING_DURATION, // 例如：5分钟游戏时间
    state: 'fishing'
  };
  
  // 3. 更新状态
  spot.currentFishers.add(character.id);
  character.currentAction = 'fishing';
  
  // 4. 触发事件
  eventBus.emit('fishing_started', { character, spot, session });
  
  return session;
}
```

### 3. 钓鱼过程

```typescript
interface FishingSession {
  id: string;
  characterId: string;
  spotId: string;
  startTime: GameTime;
  duration: number;
  state: 'fishing' | 'caught' | 'failed' | 'cancelled';
  result?: Fish;
}

// 更新钓鱼会话
function updateFishing(session: FishingSession, currentTime: GameTime): void {
  const elapsed = currentTime - session.startTime;
  
  if (elapsed >= session.duration) {
    // 钓鱼时间到，尝试捕获
    const fish = attemptCatch(session.spotId);
    
    if (fish) {
      session.state = 'caught';
      session.result = fish;
      eventBus.emit('fish_caught', { session, fish });
    } else {
      session.state = 'failed';
      eventBus.emit('fishing_failed', { session });
    }
    
    endFishing(session);
  }
}
```

### 4. 捕获计算

```typescript
function attemptCatch(spotId: string): Fish | null {
  const spot = getFishingSpot(spotId);
  const fishPool = spot.fishPool;
  
  // 生成随机数
  const roll = Math.random() * 100;
  
  let cumulativeProbability = 0;
  
  // 按稀有度从高到低检查
  for (const fish of fishPool.fishes.reverse()) {
    cumulativeProbability += fish.catchProbability;
    
    if (roll * 100 <= cumulativeProbability) {
      return fish;
    }
  }
  
  // 极小概率什么都没钓到
  return null;
}
```

### 5. 获得鱼类

```typescript
function endFishing(session: FishingSession): void {
  const character = getCharacter(session.characterId);
  const spot = getFishingSpot(session.spotId);
  
  // 1. 移除钓鱼者
  spot.currentFishers.delete(character.id);
  
  // 2. 如果成功捕获
  if (session.state === 'caught' && session.result) {
    character.inventory.add(session.result.id, 1);
    eventBus.emit('fish_obtained', { character, fish: session.result });
  }
  
  // 3. 清空当前行为
  character.currentAction = undefined;
}
```

### 6. 使用鱼类

#### 立即食用
```typescript
function eatFish(character: Character, fish: Fish): void {
  // 1. 消耗鱼
  character.inventory.remove(fish.id, 1);
  
  // 2. 恢复饥饿值
  character.hunger = Math.min(
    character.hunger + fish.hungerRestore,
    character.maxHunger
  );
  
  // 3. 触发事件
  eventBus.emit('fish_eaten', { character, fish });
}
```

#### 出售
```typescript
function sellFish(character: Character, fish: Fish, quantity: number): void {
  // 使用经济系统
  shop.sellItem(character, fish, quantity);
}
```

---

## 概率系统

### 基础概率

```typescript
const BASE_PROBABILITIES = {
  [RarityLevel.COMMON]: 0.50,      // 50%
  [RarityLevel.RARE]: 0.30,        // 30%
  [RarityLevel.VERY_RARE]: 0.15,   // 15%
  [RarityLevel.EPIC]: 0.04,        // 4%
  [RarityLevel.LEGENDARY]: 0.01    // 1%
};
```

### 动态概率（可选扩展）

```typescript
// 影响因素
interface ProbabilityModifiers {
  timeOfDay: number;      // 时间：早晨/傍晚提升概率
  weather: number;        // 天气：雨天提升概率
  crowding: number;       // 拥挤度：人越多概率越低
  luck: number;           // 运气值（角色属性）
}

function calculateDynamicProbability(
  baseProbability: number,
  modifiers: ProbabilityModifiers
): number {
  let probability = baseProbability;
  
  probability *= modifiers.timeOfDay;
  probability *= modifiers.weather;
  probability *= modifiers.crowding;
  probability *= modifiers.luck;
  
  return Math.min(probability, 1.0);
}
```

---

## AI 钓鱼决策

### 决策场景

#### 场景1：需要食物
```typescript
const prompt = `
你是${character.name}，当前状态：
- 饥饿值: ${character.hunger}/100（较低）
- 金钱: ${character.money}
- 钓鱼点距离: ${distance}

钓鱼预期收益：
- 平均饥饿恢复: ~15
- 平均售价: ~33金
- 时间成本: 5分钟

可选行为：
1. 去钓鱼（快速获取食物）
2. 去杂货铺购买食物（需要金钱）
3. 等待农作物成熟

请决策你的行为。
`;
```

#### 场景2：赚钱需求
```typescript
const prompt = `
你是${character.name}，当前状态：
- 饥饿值: ${character.hunger}/100（正常）
- 金钱: ${character.money}（较低）

钓鱼期望收益: ~33金/次
挖矿期望收益: ~52.5金/次
农业日均收益: ~6.67金/天

请决策最佳赚钱方式。
`;
```

#### 场景3：钓到稀有鱼
```typescript
const prompt = `
恭喜！你钓到了${fish.name}（${fish.rarity}）！

当前状态：
- 饥饿值: ${character.hunger}/100
- 金钱: ${character.money}
- 该鱼售价: ${fish.sellPrice}金
- 该鱼饥饿恢复: ${fish.hungerRestore}

请决策：
1. 立即食用
2. 保存到库存
3. 立即出售
`;
```

---

## 经济分析

### 期望收益计算

```typescript
// 期望饥饿恢复
const expectedHunger = 
  10 * 0.50 +    // 普通鱼
  15 * 0.30 +    // 稀有鱼
  20 * 0.15 +    // 珍稀鱼
  30 * 0.04 +    // 史诗鱼
  50 * 0.01;     // 传说鱼
// = 5 + 4.5 + 3 + 1.2 + 0.5 = 14.2

// 期望售价
const expectedPrice =
  15 * 0.50 +    // 普通鱼
  30 * 0.30 +    // 稀有鱼
  60 * 0.15 +    // 珍稀鱼
  120 * 0.04 +   // 史诗鱼
  300 * 0.01;    // 传说鱼
// = 7.5 + 9 + 9 + 4.8 + 3 = 33.3金
```

### 与其他系统对比

| 系统 | 时间投入 | 期望收益 | 风险 | 特点 |
|------|---------|---------|------|------|
| 钓鱼 | 5分钟 | 33.3金 | 低 | 即时、随机 |
| 挖矿 | 5分钟 | 52.5金 | 中 | 高收益、资源竞争 |
| 农业（萝卜） | 2天 | 15金 | 无 | 稳定、需等待 |

**钓鱼优势**：
- ✅ 即时回报，无需等待
- ✅ 同时获得食物和金钱选择
- ✅ 低风险

**钓鱼劣势**：
- ❌ 期望收益低于挖矿
- ❌ 随机性，不稳定
- ❌ 需要占用活动时间

---

## 高级功能（未来扩展）

### 1. 钓鱼技能系统

```typescript
interface FishingSkill {
  level: number;          // 1-10级
  experience: number;
  bonuses: {
    catchRate: number;    // 捕获率提升
    rarityBonus: number;  // 稀有鱼概率提升
    speedBonus: number;   // 钓鱼速度提升
  };
}
```

### 2. 钓鱼装备

```typescript
interface FishingRod {
  id: string;
  name: string;
  quality: 'basic' | 'advanced' | 'master';
  bonuses: {
    catchRate: number;
    rarityBonus: number;
  };
  price: number;
}

// 示例
const FISHING_RODS = [
  { name: '木钓竿', quality: 'basic', catchRate: 1.0, price: 0 },
  { name: '铁钓竿', quality: 'advanced', catchRate: 1.2, price: 500 },
  { name: '大师钓竿', quality: 'master', catchRate: 1.5, rarityBonus: 1.5, price: 2000 }
];
```

### 3. 鱼饵系统

```typescript
interface Bait {
  id: string;
  name: string;
  targetRarity: RarityLevel;
  bonusMultiplier: number;
  price: number;
}

// 使用鱼饵提升特定稀有度的捕获率
```

### 4. 钓鱼竞赛

```typescript
interface FishingContest {
  id: string;
  startTime: GameTime;
  duration: number;
  participants: Character[];
  prizes: {
    first: number;
    second: number;
    third: number;
  };
}

// 比谁钓到的鱼总价值最高
```

### 5. 天气影响

```typescript
enum Weather {
  SUNNY = 'sunny',      // 正常概率
  RAINY = 'rainy',      // 提升捕获率 1.2x
  STORMY = 'stormy',    // 无法钓鱼
  CLOUDY = 'cloudy'     // 稀有鱼概率提升 1.1x
}
```

---

## 数据持久化

```typescript
interface FishingData {
  characterCatches: Map<string, FishRecord[]>; // 每个AI的钓鱼记录
  spotStates: Map<string, FishingSpot>;        // 钓鱼点状态
  activeSessions: FishingSession[];             // 进行中的钓鱼
}

interface FishRecord {
  fishId: string;
  timestamp: GameTime;
  spot: string;
}
```

---

## 事件系统

```typescript
enum FishingEvent {
  FISHING_STARTED = 'fishing_started',
  FISH_CAUGHT = 'fish_caught',
  FISHING_FAILED = 'fishing_failed',
  FISH_EATEN = 'fish_eaten',
  FISH_SOLD = 'fish_sold',
  RARE_CATCH = 'rare_catch',      // 钓到稀有鱼
  LEGENDARY_CATCH = 'legendary_catch' // 钓到传说鱼
}

// 钓到传说鱼时的全局通知
fishingSystem.on(FishingEvent.LEGENDARY_CATCH, (event) => {
  broadcastMessage(`${event.character.name} 钓到了传说级的鱼！`);
});
```

---

## UI 设计需求

### 钓鱼界面

- **钓鱼点标记**: 地图上显示钓鱼点位置
- **容量显示**: 当前钓鱼人数 / 最大容量
- **钓鱼动画**: 钓鱼过程的视觉反馈
- **进度条**: 钓鱼剩余时间
- **结果展示**: 钓到的鱼类展示

### 鱼类图鉴

- 所有鱼类列表
- 鱼类图标和描述
- 捕获记录（是否钓到过）
- 稀有度标识

---

## 测试用例

```typescript
describe('Fishing System', () => {
  test('应该成功开始钓鱼', () => {
    // 准备：钓鱼点有空位
    // 执行：开始钓鱼
    // 验证：会话创建，AI状态更新
  });
  
  test('钓鱼点满时应该失败', () => {
    // 准备：钓鱼点已满
    // 执行：尝试钓鱼
    // 验证：返回null
  });
  
  test('应该按概率捕获鱼类', () => {
    // 执行：大量钓鱼尝试
    // 验证：概率分布符合预期
  });
  
  test('食用鱼应该恢复饥饿值', () => {
    // 准备：有鱼
    // 执行：食用
    // 验证：饥饿值增加
  });
});
```

---

## 总结

钓鱼系统为 Sonacatworld 提供了：

✅ **即时收益**: 无需等待的生产方式  
✅ **双重价值**: 既是食物又是商品  
✅ **运气要素**: 增加游戏趣味性  
✅ **社交场景**: 钓鱼点成为AI聚集地  

钓鱼系统与农业、挖矿相辅相成，为AI提供多样化的生存和发展路径。
