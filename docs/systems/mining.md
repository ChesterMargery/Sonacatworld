# 挖矿系统设计文档

## 系统概述

挖矿系统是 Sonacatworld 的高风险高收益生产系统。与农业和钓鱼不同，挖矿获得的矿物仅能出售，不能食用，是纯粹的经济活动。系统采用**资源池机制**，所有AI共享有限的矿物资源，形成竞争关系。

---

## 矿物设计

### 矿物种类

| 矿物名称 | 英文名 | 稀有度 | 获取概率 | 售价 | 用途 |
|---------|--------|--------|----------|------|------|
| 铜矿 | Copper | 普通 | 50% | 20金 | 出售 |
| 铁矿 | Iron | 稀有 | 30% | 50金 | 出售 |
| 银矿 | Silver | 珍稀 | 15% | 100金 | 出售 |
| 金矿 | Gold | 史诗 | 5% | 250金 | 出售 |

### 矿物数据结构

```typescript
interface Mineral {
  id: string;
  name: string;
  rarity: RarityLevel;
  mineRate: number;     // 挖掘概率
  sellPrice: number;
  description: string;
}

enum RarityLevel {
  COMMON = 'common',
  RARE = 'rare',
  VERY_RARE = 'very_rare',
  EPIC = 'epic'
}
```

**重要特性**：矿物不能食用，没有 `hungerRestore` 属性。

---

## 矿场系统

### 矿场设计

```typescript
interface Mine {
  id: string;
  name: string;
  position: Position;
  capacity: number;           // 同时可容纳AI数量
  resourcePool: ResourcePool; // 共享资源池
  currentMiners: Set<string>; // 当前矿工AI ID
}

interface ResourcePool {
  minerals: Map<string, number>; // 矿物ID → 剩余数量
  totalCapacity: number;          // 资源池总容量
  refreshRate: number;            // 刷新速率（每天）
  lastRefresh: GameTime;
}
```

### 资源池机制

#### 初始资源配置

```typescript
const INITIAL_RESOURCE_POOL = {
  copper: 100,   // 铜矿：100单位
  iron: 60,      // 铁矿：60单位
  silver: 30,    // 银矿：30单位
  gold: 10       // 金矿：10单位
};

// 总容量：200单位
```

#### 资源刷新

```typescript
class ResourcePoolManager {
  refreshPool(pool: ResourcePool, currentTime: GameTime): void {
    const daysSinceRefresh = currentTime - pool.lastRefresh;
    
    if (daysSinceRefresh >= 1) {
      // 每天刷新一定比例的资源
      const refreshAmount = pool.totalCapacity * pool.refreshRate;
      
      // 按稀有度分配刷新量
      pool.minerals.set('copper', 
        Math.min(pool.minerals.get('copper')! + refreshAmount * 0.5, 100));
      pool.minerals.set('iron', 
        Math.min(pool.minerals.get('iron')! + refreshAmount * 0.3, 60));
      pool.minerals.set('silver', 
        Math.min(pool.minerals.get('silver')! + refreshAmount * 0.15, 30));
      pool.minerals.set('gold', 
        Math.min(pool.minerals.get('gold')! + refreshAmount * 0.05, 10));
      
      pool.lastRefresh = currentTime;
      
      eventBus.emit('resource_pool_refreshed', { pool });
    }
  }
}
```

---

## 挖矿流程

### 1. 前往矿场

```typescript
// AI决策挖矿
const decision = await aiAgent.decide({
  action: 'mine',
  context: {
    hunger: character.hunger,
    money: character.money,
    mineDistance: calculateDistance(character.position, mine.position),
    resourceAvailability: checkResourcePool(mine)
  }
});

// 移动到矿场
if (decision.action === 'go_mining') {
  character.walkTo(mine.position);
}
```

### 2. 开始挖矿

```typescript
function startMining(
  character: Character,
  mine: Mine
): MiningSession | null {
  // 1. 检查容量
  if (mine.currentMiners.size >= mine.capacity) {
    return null; // 矿场已满
  }
  
  // 2. 检查资源池
  if (getTotalResources(mine.resourcePool) === 0) {
    return null; // 资源耗尽
  }
  
  // 3. 创建挖矿会话
  const session: MiningSession = {
    id: generateId(),
    characterId: character.id,
    mineId: mine.id,
    startTime: gameTime.current,
    duration: MINING_DURATION, // 例如：10分钟游戏时间
    state: 'mining'
  };
  
  // 4. 更新状态
  mine.currentMiners.add(character.id);
  character.currentAction = 'mining';
  
  // 5. 触发事件
  eventBus.emit('mining_started', { character, mine, session });
  
  return session;
}
```

### 3. 挖矿过程

```typescript
interface MiningSession {
  id: string;
  characterId: string;
  mineId: string;
  startTime: GameTime;
  duration: number;
  state: 'mining' | 'found' | 'depleted' | 'cancelled';
  result?: Mineral;
}

function updateMining(session: MiningSession, currentTime: GameTime): void {
  const elapsed = currentTime - session.startTime;
  
  if (elapsed >= session.duration) {
    // 挖矿时间到，尝试获取矿物
    const mineral = attemptMine(session.mineId);
    
    if (mineral) {
      session.state = 'found';
      session.result = mineral;
      eventBus.emit('mineral_found', { session, mineral });
    } else {
      session.state = 'depleted';
      eventBus.emit('mining_depleted', { session });
    }
    
    endMining(session);
  }
}
```

### 4. 矿物获取计算

```typescript
function attemptMine(mineId: string): Mineral | null {
  const mine = getMine(mineId);
  const pool = mine.resourcePool;
  
  // 1. 检查资源池是否耗尽
  if (getTotalResources(pool) === 0) {
    return null;
  }
  
  // 2. 根据剩余资源动态计算概率
  const probabilities = calculateDynamicProbabilities(pool);
  
  // 3. 随机选择
  const roll = Math.random() * 100;
  let cumulative = 0;
  
  for (const [mineralId, probability] of probabilities) {
    cumulative += probability;
    
    if (roll * 100 <= cumulative) {
      const mineral = getMineralById(mineralId);
      
      // 4. 消耗资源池
      const remaining = pool.minerals.get(mineralId)!;
      if (remaining > 0) {
        pool.minerals.set(mineralId, remaining - 1);
        return mineral;
      }
    }
  }
  
  return null;
}

function calculateDynamicProbabilities(
  pool: ResourcePool
): Map<string, number> {
  const total = getTotalResources(pool);
  const probabilities = new Map<string, number>();
  
  // 根据剩余资源比例计算概率
  pool.minerals.forEach((count, mineralId) => {
    const mineral = getMineralById(mineralId);
    const baseProbability = mineral.mineRate;
    
    // 如果资源耗尽，概率为0
    if (count === 0) {
      probabilities.set(mineralId, 0);
    } else {
      // 资源越少，概率越低
      const scarcityFactor = count / (total * baseProbability);
      probabilities.set(mineralId, baseProbability * scarcityFactor);
    }
  });
  
  return probabilities;
}
```

### 5. 获得矿物

```typescript
function endMining(session: MiningSession): void {
  const character = getCharacter(session.characterId);
  const mine = getMine(session.mineId);
  
  // 1. 移除矿工
  mine.currentMiners.delete(character.id);
  
  // 2. 如果找到矿物
  if (session.state === 'found' && session.result) {
    character.inventory.add(session.result.id, 1);
    eventBus.emit('mineral_obtained', { character, mineral: session.result });
  }
  
  // 3. 清空当前行为
  character.currentAction = undefined;
}
```

### 6. 出售矿物

```typescript
function sellMineral(
  character: Character,
  mineral: Mineral,
  quantity: number
): void {
  // 矿物只能出售，使用经济系统
  shop.sellItem(character, mineral, quantity);
}
```

---

## 资源竞争机制

### 竞争场景

```
初始状态：矿场有100铜矿
AI_A 挖掘 → 获得1铜矿 → 剩余99铜矿
AI_B 挖掘 → 获得1铜矿 → 剩余98铜矿
...
多个AI同时挖掘 → 资源快速消耗
→ 后来者可能空手而归
```

### 策略影响

**早起的鸟儿有虫吃**
- 白天早期去挖矿，资源充足
- 下午/晚上去挖矿，可能资源耗尽

**信息不对称**
- AI不知道当前资源池剩余量
- 只能通过经验判断
- 增加决策不确定性

---

## AI 挖矿决策

### 决策场景

#### 场景1：评估挖矿收益

```typescript
const prompt = `
你是${character.name}，当前状态：
- 饥饿值: ${character.hunger}/100
- 金钱: ${character.money}
- 时间: ${currentTime}（早晨/下午/晚上）

挖矿信息：
- 矿场距离: ${distance}
- 期望收益: ~52.5金/次
- 时间成本: 10分钟
- 风险: 资源可能耗尽

其他选择：
- 钓鱼: ~33.3金/次，5分钟
- 农业: 长期投资

请决策是否去挖矿。
`;
```

#### 场景2：挖到稀有矿

```typescript
const prompt = `
太棒了！你挖到了${mineral.name}（${mineral.rarity}）！

矿物信息：
- 售价: ${mineral.sellPrice}金

当前金钱: ${character.money}

请决策：
1. 立即出售
2. 保存到库存，等待更好时机
`;
```

#### 场景3：资源耗尽

```typescript
const prompt = `
你来到矿场准备挖矿，但发现资源已被其他人挖空了。

当前状态：
- 金钱: ${character.money}
- 饥饿值: ${character.hunger}
- 浪费了移动时间

请决策下一步行动：
1. 等待资源刷新
2. 去钓鱼
3. 回家种田
`;
```

---

## 经济分析

### 期望收益计算

```typescript
// 假设资源池充足时的期望收益
const expectedRevenue =
  20 * 0.50 +    // 铜矿
  50 * 0.30 +    // 铁矿
  100 * 0.15 +   // 银矿
  250 * 0.05;    // 金矿
// = 10 + 15 + 15 + 12.5 = 52.5金
```

### 风险分析

#### 高收益风险
- **最佳情况**: 挖到金矿，获得250金
- **期望情况**: 平均52.5金
- **最差情况**: 资源耗尽，0收益 + 时间浪费

#### 时间效率

| 时段 | 资源状态 | 成功率 | 期望收益 |
|------|---------|--------|---------|
| 早晨 | 充足 | 95% | 49.9金 |
| 中午 | 中等 | 70% | 36.8金 |
| 下午 | 较少 | 40% | 21金 |
| 晚上 | 极少 | 10% | 5.3金 |

### 与其他系统对比

| 系统 | 期望收益 | 时间 | 风险 | 稳定性 |
|------|---------|------|------|--------|
| 挖矿 | 52.5金 | 10分钟 | 高 | 低 |
| 钓鱼 | 33.3金 | 5分钟 | 低 | 中 |
| 农业（萝卜） | 7.5金/天 | 2天 | 无 | 高 |

**挖矿优势**：
- ✅ 最高期望收益
- ✅ 纯经济价值，专注赚钱

**挖矿劣势**：
- ❌ 资源竞争，可能空手而归
- ❌ 不能恢复饥饿值
- ❌ 时间成本较高

---

## 高级功能（未来扩展）

### 1. 挖矿技能系统

```typescript
interface MiningSkill {
  level: number;
  experience: number;
  bonuses: {
    mineSpeed: number;    // 挖掘速度提升
    rarityBonus: number;  // 稀有矿概率提升
    efficiency: number;   // 每次挖掘可获得多个矿物
  };
}
```

### 2. 挖矿工具

```typescript
interface MiningTool {
  id: string;
  name: string;
  quality: 'wooden' | 'iron' | 'steel' | 'diamond';
  bonuses: {
    speed: number;
    rarityBonus: number;
  };
  durability: number; // 耐久度
  price: number;
}

const MINING_TOOLS = [
  { name: '木镐', quality: 'wooden', speed: 1.0, price: 0 },
  { name: '铁镐', quality: 'iron', speed: 1.3, price: 300 },
  { name: '钢镐', quality: 'steel', speed: 1.6, price: 800 },
  { name: '钻石镐', quality: 'diamond', speed: 2.0, rarityBonus: 1.5, price: 3000 }
];
```

### 3. 矿层系统

```typescript
interface MineLevel {
  depth: number;
  resourcePool: ResourcePool;
  difficulty: number; // 挖掘难度
  unlockRequirement: {
    skill: number;
    tool: string;
  };
}

// 深层矿产更稀有但需要技能和工具
```

### 4. 矿工工会

```typescript
interface MiningGuild {
  members: Set<string>;
  perks: {
    resourceInfoAccess: boolean; // 可查看资源池状态
    bonusRate: number;             // 挖掘加成
    exclusiveAreas: string[];      // 专属矿区
  };
  membershipFee: number;
}
```

### 5. 矿场事件

```typescript
enum MineEvent {
  CAVE_IN = 'cave_in',           // 塌方（暂时关闭）
  RICH_VEIN = 'rich_vein',       // 富矿脉（临时高产）
  MONSTER_ATTACK = 'monster',    // 怪物（需要击退）
}
```

---

## 数据持久化

```typescript
interface MiningData {
  mineStates: Map<string, Mine>;
  resourcePools: Map<string, ResourcePool>;
  activeSessions: MiningSession[];
  characterMiningRecords: Map<string, MineRecord[]>;
}

interface MineRecord {
  mineralId: string;
  timestamp: GameTime;
  mineId: string;
}
```

---

## 事件系统

```typescript
enum MiningEvent {
  MINING_STARTED = 'mining_started',
  MINERAL_FOUND = 'mineral_found',
  MINING_DEPLETED = 'mining_depleted',
  RARE_MINERAL = 'rare_mineral',
  RESOURCE_POOL_REFRESHED = 'resource_pool_refreshed',
  MINE_EXHAUSTED = 'mine_exhausted', // 资源池完全耗尽
}

// 发现稀有矿物时全局通知
miningSystem.on(MiningEvent.RARE_MINERAL, (event) => {
  if (event.mineral.rarity === 'epic') {
    broadcastMessage(`${event.character.name} 挖到了${event.mineral.name}！`);
  }
});
```

---

## UI 设计需求

### 矿场界面

- **矿场入口**: 地图上显示矿场位置
- **容量显示**: 当前矿工数 / 最大容量
- **资源状态**: 资源池剩余量（可选，取决于是否让玩家知道）
- **挖矿动画**: 挖掘过程视觉反馈
- **进度条**: 挖掘剩余时间
- **结果展示**: 获得的矿物展示

### 矿物图鉴

- 所有矿物列表
- 矿物图标和描述
- 挖掘记录
- 稀有度和价格

---

## 测试用例

```typescript
describe('Mining System', () => {
  test('应该成功开始挖矿', () => {
    // 准备：矿场有空位，资源池有资源
    // 执行：开始挖矿
    // 验证：会话创建，AI状态更新
  });
  
  test('资源耗尽时应该返回null', () => {
    // 准备：资源池为空
    // 执行：尝试挖矿
    // 验证：获得null
  });
  
  test('挖矿应该消耗资源池', () => {
    // 准备：资源池有100铜矿
    // 执行：挖矿获得铜矿
    // 验证：资源池减少到99
  });
  
  test('资源池应该定期刷新', () => {
    // 准备：资源池部分消耗
    // 执行：推进时间1天
    // 验证：资源池恢复
  });
});
```

---

## 总结

挖矿系统为 Sonacatworld 提供了：

✅ **高风险高收益**: 最高的期望收益，但有失败风险  
✅ **资源竞争**: AI之间的隐性竞争关系  
✅ **策略深度**: 需要考虑时机和风险  
✅ **纯经济导向**: 专注于财富积累  

挖矿系统与农业、钓鱼形成互补，为不同人格的AI提供了多样化的发展路径，同时通过资源池机制增加了系统的复杂性和趣味性。
