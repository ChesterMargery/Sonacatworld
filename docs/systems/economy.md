# 经济系统设计文档

## 系统概述

经济系统是 AI 小镇的核心约束系统，通过货币机制调节资源流动，驱动角色行为决策。杂货铺作为唯一的交易中心，连接生产、采集和消费环节。

## 核心组件

### 1. 杂货铺 (Shop)

#### 功能职责

- 充当所有物品的买卖中介
- 维护商品库存和价格体系
- 处理角色的购买和出售请求
- 记录交易历史

#### 商品分类

**农产品**
- 小麦、大米、萝卜、甜菜（成品）
- 小麦种子、大米种子、萝卜种子、甜菜种子

**渔获**
- 普通鱼、稀有鱼、银鱼、金鱼、传说之鱼

**矿物**
- 铜矿、铁矿、银矿、金矿

#### 价格体系

**静态价格（初始版本）**

| 物品 | 购买价格 | 出售价格 | 利润率 |
|------|----------|----------|--------|
| 小麦 | - | 15 | - |
| 大米 | - | 25 | - |
| 萝卜 | - | 10 | - |
| 甜菜 | - | 20 | - |
| 小麦种子 | 5 | - | - |
| 大米种子 | 8 | - | - |
| 萝卜种子 | 3 | - | - |
| 甜菜种子 | 6 | - | - |
| 普通鱼 | - | 8 | - |
| 稀有鱼 | - | 20 | - |
| 银鱼 | - | 40 | - |
| 金鱼 | - | 80 | - |
| 传说之鱼 | - | 200 | - |
| 铜矿 | - | 15 | - |
| 铁矿 | - | 30 | - |
| 银矿 | - | 60 | - |
| 金矿 | - | 150 | - |

**动态价格（可选扩展）**

```typescript
// 基于供需关系的价格调整
price = basePrice * (1 + demandFactor - supplyFactor)

// 示例：
// 如果很多角色出售小麦 → supplyFactor 高 → 价格下降
// 如果很多角色购买种子 → demandFactor 高 → 价格上升
```

#### 库存管理

**无限库存模式（初始版本）**
- 杂货铺可以无限购买角色的物品
- 杂货铺种子供应无限
- 简化经济模型，避免供应短缺

**有限库存模式（可选扩展）**
- 杂货铺设置最大库存容量
- 库存满时拒绝收购
- 种子库存有限，售罄需等待补货

## 交易流程

### 出售流程

```
1. 角色发起出售请求
   ↓
2. 检查角色库存是否有该物品
   ↓
3. 检查物品是否可出售
   ↓
4. 计算出售价格（数量 × 单价）
   ↓
5. 从角色库存移除物品
   ↓
6. 增加角色金钱
   ↓
7. 增加杂货铺库存（可选）
   ↓
8. 记录交易日志
   ↓
9. 触发经济事件（可用于动态定价）
```

### 购买流程

```
1. 角色发起购买请求
   ↓
2. 检查杂货铺是否有该物品
   ↓
3. 计算购买价格（数量 × 单价）
   ↓
4. 检查角色金钱是否足够
   ↓
5. 扣除角色金钱
   ↓
6. 增加角色库存
   ↓
7. 减少杂货铺库存（可选）
   ↓
8. 记录交易日志
   ↓
9. 触发经济事件
```

## 数据结构

### Shop 类

```typescript
class Shop {
  private inventory: Map<ItemType, number>;
  private prices: PriceTable;
  private transactionHistory: Transaction[];
  
  // 出售物品给杂货铺
  sell(character: Character, itemType: ItemType, quantity: number): TransactionResult {
    // 验证
    if (!character.inventory.has(itemType, quantity)) {
      return { success: false, message: "库存不足" };
    }
    
    const sellPrice = this.prices.getSellPrice(itemType);
    if (!sellPrice) {
      return { success: false, message: "该物品不可出售" };
    }
    
    // 执行交易
    const totalPrice = sellPrice * quantity;
    character.inventory.remove(itemType, quantity);
    character.money += totalPrice;
    this.inventory.set(itemType, (this.inventory.get(itemType) || 0) + quantity);
    
    // 记录
    this.recordTransaction({
      type: 'sell',
      character: character.id,
      item: itemType,
      quantity,
      price: totalPrice,
      timestamp: Date.now()
    });
    
    return { success: true, message: `成功出售 ${quantity} 个物品，获得 ${totalPrice} 金币` };
  }
  
  // 从杂货铺购买物品
  buy(character: Character, itemType: ItemType, quantity: number): TransactionResult {
    const buyPrice = this.prices.getBuyPrice(itemType);
    if (!buyPrice) {
      return { success: false, message: "该物品不可购买" };
    }
    
    const totalPrice = buyPrice * quantity;
    if (character.money < totalPrice) {
      return { success: false, message: "金钱不足" };
    }
    
    // 执行交易
    character.money -= totalPrice;
    character.inventory.add(itemType, quantity);
    
    // 记录
    this.recordTransaction({
      type: 'buy',
      character: character.id,
      item: itemType,
      quantity,
      price: totalPrice,
      timestamp: Date.now()
    });
    
    return { success: true, message: `成功购买 ${quantity} 个物品，花费 ${totalPrice} 金币` };
  }
}

interface PriceTable {
  buyPrices: Map<ItemType, number>;  // 角色购买价格
  sellPrices: Map<ItemType, number>; // 角色出售价格
  
  getBuyPrice(item: ItemType): number | null;
  getSellPrice(item: ItemType): number | null;
  updatePrice(item: ItemType, buyPrice?: number, sellPrice?: number): void;
}

interface Transaction {
  type: 'buy' | 'sell';
  character: string;
  item: ItemType;
  quantity: number;
  price: number;
  timestamp: number;
}

interface TransactionResult {
  success: boolean;
  message: string;
  data?: any;
}
```

## 经济平衡设计

### 收入来源

1. **农业收入**
   - 投资：种子成本
   - 收益：作物售价
   - 时间：生长周期
   - 利润率：(售价 - 种子成本) / 种子成本

   示例：
   - 小麦：投资 5，收益 15，利润 10，周期 5 分钟，时薪 120
   - 大米：投资 8，收益 25，利润 17，周期 8 分钟，时薪 127.5

2. **钓鱼收入**
   - 投资：时间（30 秒/次）
   - 收益：随机鱼类售价
   - 期望收益：Σ(概率 × 售价)
     - 50% × 8 + 30% × 20 + 15% × 40 + 4% × 80 + 1% × 200 = 21.2 金币
   - 时薪：21.2 × 120 = 2544（理论最大值，不考虑其他消耗）

3. **挖矿收入**
   - 投资：时间（45 秒/次）
   - 收益：随机矿物售价
   - 期望收益：50% × 15 + 35% × 30 + 12% × 60 + 3% × 150 = 25.5 金币
   - 时薪：25.5 × 80 = 2040

### 支出项目

1. **生存支出**
   - 饥饿消耗：0.5/分钟
   - 每小时需恢复：30 点饥饿值
   - 食物选择：
     - 萝卜：15 点 / 10 金币
     - 小麦：20 点 / 无法直接购买（需自己种植）
     - 鱼类：自己钓（时间成本）

2. **生产支出**
   - 种子购买：农业必需
   - 工具购买：可选扩展

### 平衡目标

1. **可持续性**：角色能够维持基本生存（赚钱速度 > 生存消耗）
2. **策略差异**：不同策略（专注钓鱼 vs 综合发展）有不同收益曲线
3. **时间价值**：快速回报（钓鱼）vs 延迟回报（农业）的权衡
4. **风险收益**：稳定收入（农业）vs 高风险高收益（钓稀有鱼）

## 扩展功能

### 1. 拍卖行系统

角色之间直接交易，设定自己的价格

```typescript
class AuctionHouse {
  listings: Listing[];
  
  createListing(seller: Character, item: ItemType, quantity: number, price: number): void;
  buyListing(buyer: Character, listingId: string): void;
  cancelListing(seller: Character, listingId: string): void;
}
```

### 2. 贷款系统

角色可以向银行借贷，带有利息

```typescript
class Bank {
  loan(character: Character, amount: number, duration: number): void;
  repay(character: Character, loanId: string): void;
  checkDefault(character: Character): void;
}
```

### 3. 投资系统

角色可以投资生产设施，获得被动收入

```typescript
class Investment {
  buyFarm(character: Character): void;
  buyMine(character: Character): void;
  collectIncome(character: Character): void;
}
```

## 监控指标

### 经济健康度指标

1. **总货币量**：所有角色持有的金钱总和
2. **货币流通速度**：单位时间内的交易次数
3. **贫富差距**：最富和最穷角色的金钱比例
4. **通货膨胀率**（动态价格模式）：价格随时间的变化率
5. **交易活跃度**：每小时交易量

### 分析工具

```typescript
class EconomyAnalyzer {
  getTotalMoney(): number;
  getWealthDistribution(): number[];
  getTransactionVolume(timeRange: number): number;
  getMostTradedItems(): Array<{item: ItemType, volume: number}>;
  getAverageIncome(): number;
}
```

## 测试用例

### 基础功能测试

1. **出售测试**
   - 角色成功出售拥有的物品
   - 角色尝试出售不拥有的物品（失败）
   - 出售后金钱正确增加

2. **购买测试**
   - 角色成功购买可购买的物品
   - 角色金钱不足时购买失败
   - 购买后库存正确增加，金钱正确减少

3. **价格测试**
   - 获取物品的正确价格
   - 不可交易物品返回 null

### 平衡性测试

1. **收支平衡**
   - 模拟角色纯农业策略的收益
   - 模拟角色纯钓鱼策略的收益
   - 验证角色能维持正收益

2. **经济循环**
   - 运行 100 个角色 24 小时（游戏时间）
   - 检查总货币量变化
   - 检查是否有角色破产

---

**最后更新**：2026-01-15
