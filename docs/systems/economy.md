# 经济系统设计文档

## 系统概述

经济系统是 Sonacatworld 的核心支柱之一，以**杂货铺**作为唯一的交易中心，构建了一个完整的生产-消费-交易循环。本系统管理所有的物品交易、价格体系和经济平衡。

---

## 核心组件

### 1. 杂货铺 (General Store)

#### 功能定位
- 小镇**唯一交易中心**
- 所有买卖行为必须在此进行
- 连接生产者(AI)与消费者(AI)

#### 交易类型

**购买 (Buy)**
- AI 使用金钱购买物品
- 可购买：食物、种子

**出售 (Sell)**
- AI 出售物品换取金钱
- 可出售：农作物、鱼类、矿物

---

## 物品体系

### 物品分类

#### 1. 农作物 (Crops)

| 物品名称 | 类型 | 基础售价 | 饥饿恢复 | 获取方式 |
|---------|------|---------|---------|---------|
| 小麦 | 农作物 | 30金 | 15 | 种植 |
| 大米 | 农作物 | 40金 | 20 | 种植 |
| 萝卜 | 农作物 | 20金 | 10 | 种植 |
| 甜菜 | 农作物 | 50金 | 25 | 种植 |

#### 2. 种子 (Seeds)

| 物品名称 | 类型 | 基础价格 | 生长周期 | 产出 |
|---------|------|---------|---------|------|
| 小麦种子 | 种子 | 10金 | 3天 | 小麦 |
| 大米种子 | 种子 | 15金 | 4天 | 大米 |
| 萝卜种子 | 种子 | 5金 | 2天 | 萝卜 |
| 甜菜种子 | 种子 | 20金 | 5天 | 甜菜 |

#### 3. 鱼类 (Fish)

| 物品名称 | 稀有度 | 基础售价 | 饥饿恢复 | 获取方式 |
|---------|--------|---------|---------|---------|
| 普通鱼 | 普通 | 15金 | 10 | 钓鱼 |
| 稀有鱼 | 稀有 | 30金 | 15 | 钓鱼 |
| 珍稀鱼 | 珍稀 | 60金 | 20 | 钓鱼 |
| 史诗鱼 | 史诗 | 120金 | 30 | 钓鱼 |
| 传说鱼 | 传说 | 300金 | 50 | 钓鱼 |

#### 4. 矿物 (Minerals)

| 物品名称 | 稀有度 | 基础售价 | 获取方式 |
|---------|--------|---------|---------|
| 铜矿 | 普通 | 20金 | 挖矿 |
| 铁矿 | 稀有 | 50金 | 挖矿 |
| 银矿 | 珍稀 | 100金 | 挖矿 |
| 金矿 | 史诗 | 250金 | 挖矿 |

**注意**: 矿物不能食用，仅能出售

---

## 价格系统

### 基础价格

每种物品都有**基础价格**，这是交易的基准值。

### 购买价格

```typescript
buyPrice = basePrice * buyMultiplier
// buyMultiplier = 1.0 (当前版本)
```

### 出售价格

```typescript
sellPrice = basePrice * sellMultiplier
// sellMultiplier = 1.0 (当前版本)
```

### 动态价格系统 (未来扩展)

#### 供需影响
```typescript
price = basePrice * (1 + demandFactor - supplyFactor)
```

- **需求因子**: 根据AI购买频率计算
- **供给因子**: 根据市场存量计算

#### 稀有度加成
```typescript
rarityMultiplier = {
  common: 1.0,
  rare: 1.5,
  veryRare: 2.5,
  epic: 5.0,
  legendary: 10.0
}
```

#### 季节性波动
- 特定季节某些作物价格上涨
- 节日活动影响需求

---

## 交易系统设计

### 数据结构

```typescript
// 物品定义
interface Item {
  id: string;
  name: string;
  type: ItemType; // 'crop' | 'seed' | 'fish' | 'mineral'
  basePrice: number;
  hungerRestore?: number; // 可选，食物才有
  rarity?: RarityLevel; // 可选
}

// 交易记录
interface Transaction {
  id: string;
  characterId: string;
  type: 'buy' | 'sell';
  item: Item;
  quantity: number;
  totalPrice: number;
  timestamp: GameTime;
}

// 杂货铺状态
interface ShopState {
  inventory: Map<string, number>; // 商店库存
  transactions: Transaction[]; // 交易历史
}
```

### 交易流程

#### 购买流程
```
1. AI决策购买物品
   ↓
2. 检查金钱是否足够
   ↓
3. 计算购买价格
   ↓
4. 扣除金钱
   ↓
5. 增加物品到库存
   ↓
6. 记录交易
   ↓
7. 触发事件
```

#### 出售流程
```
1. AI决策出售物品
   ↓
2. 检查是否拥有物品
   ↓
3. 计算出售价格
   ↓
4. 移除物品
   ↓
5. 增加金钱
   ↓
6. 记录交易
   ↓
7. 触发事件
```

### 验证机制

```typescript
class TradingValidator {
  // 验证购买合法性
  canBuy(character: Character, item: Item, quantity: number): boolean {
    const totalPrice = item.basePrice * quantity;
    return character.money >= totalPrice;
  }
  
  // 验证出售合法性
  canSell(character: Character, item: Item, quantity: number): boolean {
    const owned = character.inventory.get(item.id) || 0;
    return owned >= quantity;
  }
}
```

---

## 经济平衡设计

### 收益分析

#### 农业
- **投入**: 种子成本 + 时间成本
- **产出**: 作物售价
- **利润**: 售价 - 种子成本
- **周期**: 2-5天

**示例：小麦**
- 种子成本: 10金
- 生长时间: 3天
- 售价: 30金
- 利润: 20金
- 日均收益: 6.67金/天

#### 钓鱼
- **投入**: 时间成本
- **产出**: 鱼类售价（期望值）
- **周期**: 即时

**期望收益计算**
```
期望售价 = Σ(鱼类售价 × 捕获概率)
= 15×0.5 + 30×0.3 + 60×0.15 + 120×0.04 + 300×0.01
= 7.5 + 9 + 9 + 4.8 + 3
= 33.3金/次
```

#### 挖矿
- **投入**: 时间成本
- **产出**: 矿物售价（期望值）
- **周期**: 即时

**期望收益计算**
```
期望售价 = Σ(矿物售价 × 获取概率)
= 20×0.5 + 50×0.3 + 100×0.15 + 250×0.05
= 10 + 15 + 15 + 12.5
= 52.5金/次
```

### 平衡策略

1. **时间平衡**: 
   - 农业：长期投资，稳定收益
   - 钓鱼：中等收益，即时回报
   - 挖矿：高收益，资源竞争

2. **风险回报**:
   - 农业：低风险，确定收益
   - 钓鱼：中风险，运气因素
   - 挖矿：高风险，资源池限制

3. **策略多样性**:
   - 勤劳农夫：专注农业
   - 赌徒型：追求钓鱼/挖矿高收益
   - 平衡型：多种方式组合

---

## AI 经济决策

### 决策因素

```typescript
interface EconomicDecision {
  // 当前状态
  hunger: number;
  money: number;
  inventory: Item[];
  
  // 决策选项
  buyFood: boolean;
  buySeed: boolean;
  sellItem: boolean;
  
  // 优先级
  priority: 'survival' | 'accumulation' | 'investment';
}
```

### 决策示例

#### 场景1：低饥饿+低金钱
```
决策：紧急生存模式
1. 如果有食物 → 进食
2. 如果有可卖物品 → 出售换钱 → 购买食物
3. 如果都没有 → 去钓鱼（快速获取食物）
```

#### 场景2：正常饥饿+充足金钱
```
决策：发展模式
1. 购买种子 → 种植
2. 参与挖矿 → 积累财富
3. 社交活动
```

#### 场景3：充足饥饿+低金钱
```
决策：赚钱模式
1. 收获成熟作物 → 出售
2. 钓鱼/挖矿 → 出售
3. 不购买食物，延迟消费
```

---

## 数据持久化

### 保存数据

```typescript
interface EconomyData {
  shopState: ShopState;
  transactions: Transaction[];
  priceHistory: PriceRecord[];
  characterMoney: Map<string, number>;
  characterInventory: Map<string, Item[]>;
}
```

### 统计数据

```typescript
interface EconomyStats {
  totalTransactions: number;
  totalMoneyCirculated: number;
  mostTradedItem: Item;
  richestCharacter: Character;
  averageWealth: number;
}
```

---

## 事件系统

### 经济事件

```typescript
enum EconomyEvent {
  ITEM_BOUGHT = 'item_bought',
  ITEM_SOLD = 'item_sold',
  PRICE_CHANGED = 'price_changed',
  SHORTAGE = 'shortage', // 物品短缺
  SURPLUS = 'surplus',   // 物品过剩
}
```

### 事件监听

```typescript
economySystem.on(EconomyEvent.ITEM_BOUGHT, (event) => {
  // 更新统计
  // 触发UI更新
  // 影响价格（如果启用动态价格）
});
```

---

## UI 设计需求

### 杂货铺界面

- **商品列表**: 显示所有可购买物品及价格
- **库存显示**: 显示AI当前拥有的物品
- **金钱显示**: 当前金钱数量
- **交易按钮**: 购买/出售操作
- **交易历史**: 最近的交易记录

### 物品信息

- 物品图标
- 物品名称
- 物品描述
- 价格
- 效果（饥饿恢复值）

---

## 测试用例

### 单元测试

```typescript
describe('TradingSystem', () => {
  test('应该成功购买物品当金钱足够', () => {
    // ...
  });
  
  test('应该失败购买物品当金钱不足', () => {
    // ...
  });
  
  test('应该正确计算交易价格', () => {
    // ...
  });
  
  test('应该正确更新库存', () => {
    // ...
  });
});
```

### 集成测试

```typescript
describe('Economy Integration', () => {
  test('完整购买流程', () => {
    // 1. AI有足够金钱
    // 2. 执行购买
    // 3. 验证金钱减少
    // 4. 验证库存增加
    // 5. 验证交易记录
  });
  
  test('完整出售流程', () => {
    // ...
  });
});
```

---

## 未来扩展

### 1. 动态价格系统
- 实现供需关系影响价格
- 季节性价格波动
- 特殊事件影响价格

### 2. 市场系统
- AI之间可以直接交易
- 拍卖系统
- 委托交易

### 3. 信用系统
- 赊账功能
- 贷款系统
- 信用评分

### 4. 经济数据可视化
- 价格曲线图
- 交易量统计
- 财富分布图

---

## 总结

经济系统是 Sonacatworld 的重要基础设施，通过杂货铺连接了所有生产和消费活动。系统设计遵循以下原则：

✅ **简单明确**: 单一交易中心，清晰的价格体系  
✅ **平衡性**: 多种获利方式，各有优劣  
✅ **可扩展**: 预留动态价格等高级功能接口  
✅ **AI友好**: 决策逻辑清晰，易于LLM理解  

通过精心设计的经济系统，AI居民能够做出合理的经济决策，形成真实感的虚拟经济生态。
