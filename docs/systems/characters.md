# 人物系统设计文档

## 系统概述

人物系统是 Sonacatworld 的核心，定义了 AI 居民的属性、状态和行为。每个 AI 都是一个独立的智能体，拥有自己的属性、库存、记忆和决策能力。

---

## 核心属性

### 基础属性

```typescript
interface Character {
  // 身份信息
  id: string;
  name: string;
  avatar: string;
  
  // 核心属性
  hunger: number;        // 饥饿值 (0-100)
  money: number;         // 金钱
  age: number;           // 年龄（游戏天数）
  
  // 状态信息
  position: Position;
  currentAction?: Action;
  
  // 库存系统
  inventory: Inventory;
  
  // AI相关
  personality: Personality;
  memory: Memory;
  relationships: Map<string, Relationship>;
}
```

---

## 属性详解

### 1. 饥饿值 (Hunger)

#### 基本设定

```typescript
interface HungerSystem {
  current: number;       // 当前饥饿值
  max: number;           // 最大值：100
  min: number;           // 最小值：0
  decayRate: number;     // 下降速率（每游戏小时）
  criticalThreshold: number; // 危急阈值：20
}

const DEFAULT_HUNGER = {
  current: 100,
  max: 100,
  min: 0,
  decayRate: 2,          // 每游戏小时减少2点
  criticalThreshold: 20
};
```

#### 变化规律

```typescript
function updateHunger(character: Character, deltaTime: number): void {
  const hoursElapsed = deltaTime / GAME_HOUR;
  
  // 自然下降
  character.hunger = Math.max(
    character.hunger - (character.hungerSystem.decayRate * hoursElapsed),
    0
  );
  
  // 检查状态
  if (character.hunger <= character.hungerSystem.criticalThreshold) {
    eventBus.emit('character_hungry', { character });
  }
  
  if (character.hunger === 0) {
    eventBus.emit('character_starving', { character });
  }
}
```

#### 影响

- **正常 (60-100)**: 无影响
- **饥饿 (30-60)**: AI优先考虑获取食物
- **非常饥饿 (0-30)**: AI强制觅食，放弃其他活动
- **饿死 (0)**: 可选：角色死亡或强制进食

#### 恢复方式

```typescript
function eatFood(character: Character, food: Food): void {
  character.hunger = Math.min(
    character.hunger + food.hungerRestore,
    character.hungerSystem.max
  );
  
  character.inventory.remove(food.id, 1);
  eventBus.emit('character_ate', { character, food });
}
```

---

### 2. 金钱 (Money)

#### 基本设定

```typescript
interface MoneySystem {
  current: number;       // 当前金钱
  totalEarned: number;   // 累计收入
  totalSpent: number;    // 累计支出
}

const DEFAULT_MONEY = {
  current: 100,          // 初始金钱：100金
  totalEarned: 100,
  totalSpent: 0
};
```

#### 获取方式

- 出售农作物
- 出售鱼类
- 出售矿物
- 礼堂活动奖励（可选）
- 任务奖励（可选）

#### 消费方式

- 购买种子
- 购买食物
- 购买工具/装备（可选）
- 升级农田（可选）

#### 交易记录

```typescript
interface MoneyTransaction {
  id: string;
  characterId: string;
  type: 'income' | 'expense';
  amount: number;
  reason: string;
  timestamp: GameTime;
}

function addMoney(
  character: Character,
  amount: number,
  reason: string
): void {
  character.money += amount;
  character.moneySystem.totalEarned += amount;
  
  recordTransaction({
    characterId: character.id,
    type: 'income',
    amount,
    reason,
    timestamp: gameTime.current
  });
  
  eventBus.emit('money_earned', { character, amount, reason });
}

function spendMoney(
  character: Character,
  amount: number,
  reason: string
): boolean {
  if (character.money < amount) {
    return false; // 金钱不足
  }
  
  character.money -= amount;
  character.moneySystem.totalSpent += amount;
  
  recordTransaction({
    characterId: character.id,
    type: 'expense',
    amount,
    reason,
    timestamp: gameTime.current
  });
  
  eventBus.emit('money_spent', { character, amount, reason });
  return true;
}
```

---

### 3. 年龄 (Age)

#### 计算方式

```typescript
interface AgeSystem {
  days: number;          // 游戏天数
  displayAge: number;    // 显示年龄
  birthTime: GameTime;   // 出生时间
}

function calculateAge(character: Character, currentTime: GameTime): number {
  const daysAlive = currentTime - character.ageSystem.birthTime;
  // 可选：游戏天数 → 年龄的转换
  // 例如：每30游戏天 = 1岁
  return Math.floor(daysAlive / 30);
}
```

#### 作用

- 显示游戏进度
- 统计信息
- 后续扩展：生命周期系统

---

## 位置与移动系统

### 位置数据

```typescript
interface Position {
  x: number;
  y: number;
  location?: LocationType; // 当前所在地点类型
}

enum LocationType {
  HOME = 'home',
  FARM = 'farm',
  SHOP = 'shop',
  FISHING_SPOT = 'fishing_spot',
  MINE = 'mine',
  HALL = 'hall',
  ROAD = 'road'
}
```

### 移动系统

```typescript
interface MovementSystem {
  speed: number;         // 移动速度
  target?: Position;     // 目标位置
  path?: Position[];     // 路径
}

function walkTo(character: Character, target: Position): void {
  character.currentAction = {
    type: 'walking',
    target,
    startTime: gameTime.current
  };
  
  character.movementSystem.target = target;
  character.movementSystem.path = calculatePath(
    character.position,
    target
  );
  
  eventBus.emit('character_walking', { character, target });
}

function updateMovement(character: Character, deltaTime: number): void {
  if (character.currentAction?.type !== 'walking') {
    return;
  }
  
  const distance = character.movementSystem.speed * deltaTime;
  const target = character.movementSystem.target!;
  
  // 移动角色
  moveTowards(character, target, distance);
  
  // 检查是否到达
  if (hasReached(character.position, target)) {
    character.position = target;
    character.currentAction = undefined;
    eventBus.emit('character_arrived', { character, target });
  }
}
```

---

## 库存系统

### 库存结构

```typescript
interface Inventory {
  items: Map<string, number>;  // 物品ID → 数量
  capacity: number;             // 最大容量
}

class InventoryManager {
  // 添加物品
  add(inventory: Inventory, itemId: string, quantity: number): boolean {
    const current = inventory.items.get(itemId) || 0;
    const total = this.getTotalItems(inventory);
    
    if (total + quantity > inventory.capacity) {
      return false; // 库存已满
    }
    
    inventory.items.set(itemId, current + quantity);
    return true;
  }
  
  // 移除物品
  remove(inventory: Inventory, itemId: string, quantity: number): boolean {
    const current = inventory.items.get(itemId) || 0;
    
    if (current < quantity) {
      return false; // 数量不足
    }
    
    if (current === quantity) {
      inventory.items.delete(itemId);
    } else {
      inventory.items.set(itemId, current - quantity);
    }
    
    return true;
  }
  
  // 检查是否拥有
  has(inventory: Inventory, itemId: string, quantity: number = 1): boolean {
    const current = inventory.items.get(itemId) || 0;
    return current >= quantity;
  }
  
  // 获取总物品数
  getTotalItems(inventory: Inventory): number {
    let total = 0;
    inventory.items.forEach(count => total += count);
    return total;
  }
}
```

---

## 行为系统

### 行为类型

```typescript
enum ActionType {
  // 基础行为
  IDLE = 'idle',
  WALKING = 'walking',
  SLEEPING = 'sleeping',
  
  // 生产行为
  FARMING = 'farming',
  FISHING = 'fishing',
  MINING = 'mining',
  
  // 经济行为
  BUYING = 'buying',
  SELLING = 'selling',
  EATING = 'eating',
  
  // 社交行为
  TALKING = 'talking',
  HALL_EVENT = 'hall_event'
}

interface Action {
  type: ActionType;
  startTime: GameTime;
  duration?: number;
  target?: any;        // 行为目标（位置、物品、角色等）
  metadata?: any;      // 额外数据
}
```

### 行为状态机

```typescript
class ActionStateMachine {
  private character: Character;
  private currentState: ActionType;
  
  transition(newAction: Action): boolean {
    // 检查是否可以切换
    if (!this.canTransition(this.currentState, newAction.type)) {
      return false;
    }
    
    // 结束当前行为
    this.endCurrentAction();
    
    // 开始新行为
    this.character.currentAction = newAction;
    this.currentState = newAction.type;
    
    eventBus.emit('action_changed', { character: this.character, newAction });
    return true;
  }
  
  canTransition(from: ActionType, to: ActionType): boolean {
    // 定义转换规则
    // 例如：睡觉时不能钓鱼
    if (from === ActionType.SLEEPING && to !== ActionType.IDLE) {
      return false;
    }
    
    return true;
  }
}
```

---

## 人格系统

### 人格定义

```typescript
interface Personality {
  name: string;
  traits: PersonalityTraits;
  goals: Goal[];
  preferences: Preferences;
}

interface PersonalityTraits {
  // 工作态度
  diligence: number;      // 勤劳度 (0-1)
  greed: number;          // 贪婪度 (0-1)
  
  // 社交倾向
  sociability: number;    // 社交性 (0-1)
  cooperation: number;    // 合作性 (0-1)
  
  // 冒险精神
  risktaking: number;     // 冒险性 (0-1)
  curiosity: number;      // 好奇心 (0-1)
  
  // 生活方式
  earlyBird: boolean;     // 早起
  nightOwl: boolean;      // 夜猫子
}

interface Goal {
  type: GoalType;
  priority: number;       // 优先级 (0-10)
  description: string;
}

enum GoalType {
  WEALTH = 'wealth',           // 积累财富
  SURVIVAL = 'survival',       // 生存
  SOCIAL = 'social',           // 社交
  EXPLORATION = 'exploration'  // 探索
}

interface Preferences {
  favoriteCrop?: string;
  favoriteActivity?: string;
  avoidedActivity?: string;
}
```

### 人格模板

```typescript
const PERSONALITY_TEMPLATES = {
  HARDWORKING_FARMER: {
    name: "勤劳农夫",
    traits: {
      diligence: 0.9,
      greed: 0.3,
      sociability: 0.4,
      cooperation: 0.7,
      risktaking: 0.2,
      curiosity: 0.3,
      earlyBird: true,
      nightOwl: false
    },
    goals: [
      { type: GoalType.WEALTH, priority: 8 },
      { type: GoalType.SURVIVAL, priority: 9 }
    ],
    preferences: {
      favoriteActivity: 'farming'
    }
  },
  
  SOCIAL_BUTTERFLY: {
    name: "社交达人",
    traits: {
      diligence: 0.5,
      greed: 0.2,
      sociability: 0.9,
      cooperation: 0.8,
      risktaking: 0.4,
      curiosity: 0.7,
      earlyBird: false,
      nightOwl: false
    },
    goals: [
      { type: GoalType.SOCIAL, priority: 10 },
      { type: GoalType.SURVIVAL, priority: 6 }
    ],
    preferences: {
      favoriteActivity: 'hall_event'
    }
  },
  
  FORTUNE_HUNTER: {
    name: "冒险者",
    traits: {
      diligence: 0.6,
      greed: 0.8,
      sociability: 0.5,
      cooperation: 0.4,
      risktaking: 0.9,
      curiosity: 0.8,
      earlyBird: true,
      nightOwl: true
    },
    goals: [
      { type: GoalType.WEALTH, priority: 10 },
      { type: GoalType.EXPLORATION, priority: 7 }
    ],
    preferences: {
      favoriteActivity: 'mining'
    }
  }
};
```

---

## 状态系统

### 生理状态

```typescript
enum PhysiologicalState {
  HEALTHY = 'healthy',
  HUNGRY = 'hungry',
  STARVING = 'starving',
  TIRED = 'tired',
  EXHAUSTED = 'exhausted'
}

function getPhysiologicalState(character: Character): PhysiologicalState {
  if (character.hunger === 0) {
    return PhysiologicalState.STARVING;
  } else if (character.hunger < 30) {
    return PhysiologicalState.HUNGRY;
  }
  
  // 可扩展：疲劳系统
  
  return PhysiologicalState.HEALTHY;
}
```

### 情绪状态（可选扩展）

```typescript
enum EmotionalState {
  HAPPY = 'happy',
  NEUTRAL = 'neutral',
  SAD = 'sad',
  ANGRY = 'angry',
  EXCITED = 'excited'
}

interface Mood {
  current: EmotionalState;
  happiness: number;    // 幸福度 (0-100)
  stress: number;       // 压力 (0-100)
}
```

---

## 数据持久化

### 保存数据

```typescript
interface CharacterData {
  id: string;
  name: string;
  hunger: number;
  money: number;
  age: number;
  position: Position;
  inventory: Map<string, number>;
  personality: Personality;
  relationships: Map<string, Relationship>;
  statistics: CharacterStatistics;
}

interface CharacterStatistics {
  totalMoneyEarned: number;
  totalMoneySpent: number;
  cropHarvested: number;
  fishCaught: number;
  mineralsFound: number;
  conversationsHad: number;
  hallEventsAttended: number;
}
```

---

## 事件系统

```typescript
enum CharacterEvent {
  HUNGRY = 'character_hungry',
  STARVING = 'character_starving',
  ATE = 'character_ate',
  MONEY_EARNED = 'money_earned',
  MONEY_SPENT = 'money_spent',
  ACTION_CHANGED = 'action_changed',
  ARRIVED = 'character_arrived',
  LEVEL_UP = 'character_level_up'
}
```

---

## UI 需求

### 角色信息面板

- **头像与名称**
- **核心属性**：
  - 饥饿值进度条
  - 金钱数量
  - 年龄显示
- **当前行为**：正在做什么
- **库存显示**：拥有的物品
- **关系网络**：与其他AI的关系

### 角色列表

- 所有AI居民列表
- 快速查看状态
- 点击查看详情

---

## 测试用例

```typescript
describe('Character System', () => {
  test('饥饿值应该随时间下降', () => {
    // 准备：角色饥饿值100
    // 执行：推进时间1小时
    // 验证：饥饿值下降2
  });
  
  test('进食应该恢复饥饿值', () => {
    // 准备：角色饥饿值50
    // 执行：吃恢复20的食物
    // 验证：饥饿值变为70
  });
  
  test('库存应该正确添加和移除物品', () => {
    // 测试add/remove/has方法
  });
  
  test('金钱交易应该正确记录', () => {
    // 测试赚钱和花钱
  });
});
```

---

## 总结

人物系统是 Sonacatworld 的基础，定义了：

✅ **核心属性**: 饥饿、金钱、年龄  
✅ **行为系统**: 丰富的行为类型和状态机  
✅ **人格系统**: 多样化的AI人格  
✅ **库存管理**: 完整的物品管理  

通过精心设计的人物系统，每个AI都能展现出独特的个性和行为模式，形成真实感的虚拟社会。
