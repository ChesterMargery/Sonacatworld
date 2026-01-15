# AI 小镇 - 技术架构文档

## 系统架构概览

AI 小镇采用前后端分离的架构设计，前端使用 WebGPU 进行高性能渲染和计算，后端通过 LLM API 提供智能决策能力。

```
┌─────────────────────────────────────────────────────────────┐
│                        用户界面层                              │
│                  (WebGPU Canvas + UI)                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────┐
│                     应用层 (TypeScript)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Game Core   │  │   Systems    │  │  LLM Engine  │      │
│  │   Engine     │  │   Manager    │  │   Manager    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────┐
│                       系统层                                  │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐   │
│  │ Economy│ │Farming │ │Fishing │ │ Mining │ │Character│  │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘   │
│  ┌────────┐ ┌────────┐                                     │
│  │ Social │ │  LLM   │                                     │
│  └────────┘ └────────┘                                     │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────┐
│                    渲染与计算层                               │
│              (WebGPU + Compute Shaders)                      │
└─────────────────────────────────────────────────────────────┘
```

## 模块架构

### 1. 核心引擎 (Core Engine)

**Game.ts** - 游戏主控制器
- 职责：
  - 游戏循环管理（requestAnimationFrame）
  - 全局时间管理（游戏时间与真实时间映射）
  - 系统初始化和协调
  - 事件总线管理

```typescript
class Game {
  private systems: SystemManager;
  private renderer: Renderer;
  private llmEngine: LLMEngine;
  private gameTime: GameTime;
  
  init(): void;
  update(deltaTime: number): void;
  render(): void;
  start(): void;
  pause(): void;
}
```

**GameTime.ts** - 时间管理系统
- 真实时间到游戏时间的转换
- 时间加速/减速控制
- 时间事件触发（每小时、每天等）

**EventBus.ts** - 事件系统
- 发布/订阅模式
- 系统间解耦通信
- 事件类型：
  - 角色事件（移动、行为执行）
  - 经济事件（交易完成、价格变动）
  - 社交事件（对话开始、关系改变）

### 2. 系统管理器 (Systems Manager)

**SystemManager.ts**
- 管理所有游戏系统
- 系统注册和生命周期管理
- 系统更新顺序控制

```typescript
class SystemManager {
  private systems: Map<string, ISystem>;
  
  register(name: string, system: ISystem): void;
  update(deltaTime: number): void;
  getSystem<T>(name: string): T;
}

interface ISystem {
  init(): void;
  update(deltaTime: number): void;
  destroy(): void;
}
```

### 3. 经济系统 (Economy System)

**Shop.ts** - 杂货铺
```typescript
class Shop {
  private inventory: Map<ItemType, number>;
  private prices: Map<ItemType, number>;
  
  buy(character: Character, item: ItemType, quantity: number): boolean;
  sell(character: Character, item: ItemType, quantity: number): boolean;
  getPrice(item: ItemType): number;
  updatePrices(): void; // 动态定价（可选）
}
```

**Item.ts** - 物品基类
```typescript
interface Item {
  id: string;
  name: string;
  type: ItemType;
  value: number; // 基础价值
  hungerRestore?: number; // 食物恢复饥饿值
}

enum ItemType {
  CROP_WHEAT,
  CROP_RICE,
  CROP_CARROT,
  CROP_BEET,
  FISH_COMMON,
  FISH_RARE,
  FISH_SILVER,
  FISH_GOLDEN,
  FISH_LEGENDARY,
  MINERAL_COPPER,
  MINERAL_IRON,
  MINERAL_SILVER,
  MINERAL_GOLD,
  SEED_WHEAT,
  SEED_RICE,
  SEED_CARROT,
  SEED_BEET
}
```

### 4. 农业系统 (Farming System)

**FarmingSystem.ts**
```typescript
class FarmingSystem implements ISystem {
  private farms: Map<string, Farm>;
  
  plantSeed(character: Character, seedType: ItemType): boolean;
  harvest(character: Character, farmId: string): Item[];
  update(deltaTime: number): void; // 更新作物生长
}

class Farm {
  id: string;
  owner: Character;
  plots: FarmPlot[];
}

class FarmPlot {
  crop?: Crop;
  plantedAt?: number;
  
  plant(seedType: ItemType): void;
  canHarvest(): boolean;
  harvest(): Item;
}

interface Crop {
  type: ItemType;
  growthTime: number; // 毫秒
  hungerRestore: number;
  sellValue: number;
}
```

### 5. 钓鱼系统 (Fishing System)

**FishingSystem.ts**
```typescript
class FishingSystem implements ISystem {
  private fishPool: WeightedPool<ItemType>;
  
  fish(character: Character): Promise<Item>;
  private rollFish(): ItemType; // 基于概率抽取
}

class WeightedPool<T> {
  private items: Array<{item: T, weight: number}>;
  
  add(item: T, weight: number): void;
  draw(): T;
}
```

### 6. 挖矿系统 (Mining System)

**MiningSystem.ts**
```typescript
class MiningSystem implements ISystem {
  private mine: Mine;
  
  dig(character: Character): Promise<Item | null>;
  refresh(): void; // 刷新矿场资源
}

class Mine {
  private resourcePool: WeightedPool<ItemType>;
  private currentResources: number;
  private maxResources: number;
  
  canMine(): boolean;
  consumeResource(): void;
  replenish(amount: number): void;
}
```

### 7. 角色系统 (Character System)

**Character.ts** - 角色核心类
```typescript
class Character {
  // 基础信息
  id: string;
  name: string;
  age: number;
  
  // 属性
  hunger: number; // 0-100
  money: number;
  
  // 库存
  inventory: Inventory;
  
  // 位置
  location: Location;
  
  // 人格
  personality: Personality;
  
  // 记忆
  memory: Memory;
  
  // 关系
  relationships: Map<string, Relationship>;
  
  // 方法
  eat(item: Item): void;
  move(location: Location): void;
  updateHunger(deltaTime: number): void;
}

class Inventory {
  private items: Map<ItemType, number>;
  
  add(item: ItemType, quantity: number): void;
  remove(item: ItemType, quantity: number): boolean;
  has(item: ItemType, quantity: number): boolean;
  getQuantity(item: ItemType): number;
}
```

**Personality.ts** - 人格系统
```typescript
interface Personality {
  traits: {
    greed: number; // 0-1, 对金钱的重视程度
    social: number; // 0-1, 社交倾向
    hardworking: number; // 0-1, 勤劳程度
    adventurous: number; // 0-1, 冒险精神
  };
  goals: Goal[];
  preferences: Map<string, number>;
}

interface Goal {
  type: GoalType;
  target: number;
  priority: number;
  description: string;
}

enum GoalType {
  EARN_MONEY,
  MAKE_FRIENDS,
  GATHER_RESOURCES,
  SOCIAL_STATUS
}
```

### 8. 行为系统 (Behavior System)

**BehaviorSystem.ts**
```typescript
class BehaviorSystem implements ISystem {
  executeAction(character: Character, action: Action): Promise<void>;
}

interface Action {
  type: ActionType;
  target?: any;
  duration: number;
  
  canExecute(character: Character): boolean;
  execute(character: Character): Promise<ActionResult>;
}

enum ActionType {
  SLEEP,
  WAKE_UP,
  EAT,
  WALK,
  PLANT,
  HARVEST,
  FISH,
  MINE,
  BUY,
  SELL,
  TALK,
  JOIN_HALL_EVENT
}

interface ActionResult {
  success: boolean;
  message: string;
  effects: Effect[];
}
```

### 9. 社交系统 (Social System)

**SocialSystem.ts**
```typescript
class SocialSystem implements ISystem {
  private hallEvents: HallEvent[];
  
  startConversation(char1: Character, char2: Character): Conversation;
  updateRelationship(char1: Character, char2: Character, delta: number): void;
  createHallEvent(type: HallEventType): HallEvent;
}

class Relationship {
  trust: number; // -1 to 1
  interactions: number;
  lastInteraction?: string;
  
  update(event: SocialEvent): void;
}

interface HallEvent {
  type: HallEventType;
  participants: Character[];
  state: 'waiting' | 'active' | 'finished';
  
  start(): void;
  update(): void;
  end(): void;
}

enum HallEventType {
  WEREWOLF,
  MYSTERY,
  DISCUSSION
}
```

### 10. LLM 系统 (LLM System)

**LLMEngine.ts** - LLM 调度引擎
```typescript
class LLMEngine {
  private apiClient: LLMAPIClient;
  private contextManager: ContextManager;
  private requestQueue: RequestQueue;
  
  async decide(character: Character, context: DecisionContext): Promise<Decision>;
  async chat(character: Character, message: string, target?: Character): Promise<string>;
}

interface DecisionContext {
  characterState: CharacterState;
  worldState: WorldState;
  recentEvents: Event[];
  availableActions: ActionType[];
}

interface CharacterState {
  hunger: number;
  money: number;
  location: string;
  inventory: Record<ItemType, number>;
  time: string;
}

interface WorldState {
  shopPrices: Record<ItemType, number>;
  nearbyCharacters: string[];
  weather: string;
  timeOfDay: string;
}

interface Decision {
  action: ActionType;
  reasoning: string;
  emotion: string;
  internalThought: string;
}
```

**ContextManager.ts** - 上下文管理
```typescript
class ContextManager {
  private contexts: Map<string, CharacterContext>;
  
  getContext(characterId: string): CharacterContext;
  updateContext(characterId: string, newInfo: any): void;
  buildPrompt(character: Character, context: DecisionContext): string;
}

class CharacterContext {
  systemPrompt: string; // 人格设定
  conversationHistory: Message[];
  shortTermMemory: Memory[];
  longTermMemory: Memory[];
  
  addMessage(message: Message): void;
  summarize(): string;
  retrieveRelevantMemories(query: string): Memory[];
}
```

**Memory.ts** - 记忆系统
```typescript
interface Memory {
  id: string;
  timestamp: number;
  type: MemoryType;
  content: string;
  importance: number;
  embedding?: number[]; // 向量嵌入（用于检索）
}

enum MemoryType {
  EVENT,
  CONVERSATION,
  RELATIONSHIP_CHANGE,
  ACHIEVEMENT,
  CONFLICT
}

class MemoryStore {
  private memories: Memory[];
  
  add(memory: Memory): void;
  query(query: string, limit: number): Memory[];
  summarizeOldMemories(): void; // 压缩旧记忆
}
```

### 11. WebGPU 渲染层

**Renderer.ts** - 渲染器
```typescript
class Renderer {
  private device: GPUDevice;
  private context: GPUCanvasContext;
  private pipeline: GPURenderPipeline;
  
  async init(canvas: HTMLCanvasElement): Promise<void>;
  render(scene: Scene): void;
  renderCharacter(character: Character): void;
  renderLocation(location: Location): void;
}

class ComputeEngine {
  private device: GPUDevice;
  private computePipeline: GPUComputePipeline;
  
  // 使用 compute shader 进行并行计算
  updateCharacterStates(characters: Character[]): Promise<void>;
  simulateEconomy(transactions: Transaction[]): Promise<void>;
}
```

## 数据流设计

### 游戏循环数据流

```
1. Input → EventBus
2. EventBus → Systems (update)
3. Systems → Character State Changes
4. Character State → LLM Decision Request
5. LLM Response → Action Execution
6. Action Execution → World State Update
7. World State → Renderer
8. Renderer → Display
```

### LLM 决策流程

```
1. Character需要决策 (定时或事件触发)
   ↓
2. 收集DecisionContext (状态+世界+记忆)
   ↓
3. ContextManager构建Prompt
   ↓
4. LLMEngine发送API请求
   ↓
5. 接收Decision响应
   ↓
6. BehaviorSystem执行Action
   ↓
7. 更新角色状态和记忆
   ↓
8. 触发相关事件
```

### 社交互动数据流

```
角色A发起对话
   ↓
SocialSystem创建Conversation
   ↓
LLM为A生成发言
   ↓
发言传递给角色B
   ↓
LLM为B生成回应
   ↓
更新双方关系和记忆
   ↓
对话继续或结束
```

## 模块依赖关系

```
Game (核心)
├── SystemManager
│   ├── EconomySystem
│   │   └── Shop
│   ├── FarmingSystem
│   ├── FishingSystem
│   ├── MiningSystem
│   ├── CharacterSystem
│   │   └── Character
│   │       ├── Inventory
│   │       ├── Personality
│   │       └── Memory
│   ├── BehaviorSystem
│   └── SocialSystem
│       └── HallEvent
├── LLMEngine
│   ├── APIClient
│   ├── ContextManager
│   └── MemoryStore
└── Renderer
    ├── WebGPU Device
    └── ComputeEngine

工具模块 (Utils)
├── WeightedPool
├── EventBus
├── GameTime
└── Logger
```

## 性能优化策略

### 1. LLM 调用优化

- **批处理**：合并多个角色的决策请求
- **缓存**：缓存常见决策模式
- **优先级队列**：重要决策优先处理
- **异步调用**：非阻塞式 API 请求

### 2. WebGPU 计算优化

- **Compute Shaders**：
  - 批量更新角色饥饿值
  - 并行计算作物生长进度
  - 资源池抽取算法
- **渲染优化**：
  - 实例化渲染（多个相同对象）
  - 视锥剔除
  - LOD（细节层次）

### 3. 内存管理

- **对象池**：重用频繁创建的对象
- **记忆压缩**：定期总结和压缩旧记忆
- **懒加载**：按需加载资源

### 4. 状态同步

- **差分更新**：只传递变化的状态
- **帧限制**：控制更新频率
- **脏标记**：标记需要更新的对象

## 可扩展性设计

### 1. 模块化

所有系统实现 `ISystem` 接口，可独立开发和测试

### 2. 配置驱动

```typescript
interface GameConfig {
  economy: EconomyConfig;
  farming: FarmingConfig;
  fishing: FishingConfig;
  mining: MiningConfig;
  characters: CharacterConfig;
  llm: LLMConfig;
}
```

### 3. 插件系统（未来扩展）

```typescript
interface Plugin {
  name: string;
  init(game: Game): void;
  registerSystems(): ISystem[];
  registerActions(): Action[];
}
```

## 技术栈总结

| 层级 | 技术 | 用途 |
|------|------|------|
| 语言 | TypeScript | 类型安全的应用开发 |
| 构建 | Vite | 快速开发和构建 |
| 渲染 | WebGPU | 高性能图形渲染 |
| 计算 | WebGPU Compute | GPU 并行计算 |
| AI | LLM API | 智能决策 |
| 测试 | Vitest | 单元测试 |
| 状态 | 自定义 | 集中式状态管理 |

## 开发工具链

- **代码质量**：ESLint, Prettier
- **版本控制**：Git
- **包管理**：npm
- **开发服务器**：Vite Dev Server
- **调试**：Chrome DevTools, WebGPU Inspector

---

**最后更新**：2026-01-15
