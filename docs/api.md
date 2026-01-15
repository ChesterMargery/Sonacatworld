# API 设计文档

## 概述

本文档定义了 Sonacatworld 系统的核心 API 接口设计。所有模块通过清晰定义的接口进行交互，确保系统的模块化和可维护性。

---

## 核心系统 API

### 时间系统 API

```typescript
interface TimeSystem {
  // 获取当前游戏时间
  getCurrentTime(): GameTime;
  
  // 获取当前游戏日
  getCurrentDay(): number;
  
  // 获取当前小时
  getCurrentHour(): number;
  
  // 检查是否为夜晚
  isNight(): boolean;
  
  // 推进时间
  advance(deltaTime: number): void;
  
  // 调度事件
  scheduleEvent(event: Event, time: GameTime): string;
  
  // 取消事件
  cancelEvent(eventId: string): boolean;
}

interface GameTime {
  day: number;
  hour: number;
  minute: number;
  totalMinutes: number;
}
```

### 角色系统 API

```typescript
interface CharacterSystem {
  // 创建角色
  createCharacter(config: CharacterConfig): Character;
  
  // 获取角色
  getCharacter(id: string): Character | null;
  
  // 获取所有角色
  getAllCharacters(): Character[];
  
  // 更新角色状态
  updateCharacter(id: string, updates: Partial<Character>): void;
  
  // 删除角色
  deleteCharacter(id: string): boolean;
  
  // 角色移动
  moveCharacter(id: string, target: Position): void;
  
  // 角色进食
  feedCharacter(id: string, foodId: string): boolean;
}

interface CharacterConfig {
  name: string;
  personality: Personality;
  initialMoney?: number;
  initialHunger?: number;
  position?: Position;
}
```

---

## 经济系统 API

### 商店 API

```typescript
interface ShopSystem {
  // 购买物品
  buyItem(
    characterId: string,
    itemId: string,
    quantity: number
  ): Transaction | null;
  
  // 出售物品
  sellItem(
    characterId: string,
    itemId: string,
    quantity: number
  ): Transaction | null;
  
  // 获取物品价格
  getPrice(itemId: string, type: 'buy' | 'sell'): number;
  
  // 获取商店库存
  getInventory(): Map<string, number>;
  
  // 获取交易历史
  getTransactions(characterId?: string): Transaction[];
}

interface Transaction {
  id: string;
  characterId: string;
  type: 'buy' | 'sell';
  itemId: string;
  quantity: number;
  totalPrice: number;
  timestamp: GameTime;
}
```

### 物品 API

```typescript
interface ItemSystem {
  // 获取物品信息
  getItem(id: string): Item | null;
  
  // 获取所有物品
  getAllItems(): Item[];
  
  // 按类型获取物品
  getItemsByType(type: ItemType): Item[];
  
  // 创建物品（管理员）
  createItem(config: ItemConfig): Item;
}

interface Item {
  id: string;
  name: string;
  type: ItemType;
  description: string;
  basePrice: number;
  hungerRestore?: number;
  metadata?: any;
}

enum ItemType {
  CROP = 'crop',
  SEED = 'seed',
  FISH = 'fish',
  MINERAL = 'mineral',
  TOOL = 'tool'
}
```

---

## 生产系统 API

### 农业 API

```typescript
interface FarmingSystem {
  // 种植作物
  plant(
    characterId: string,
    plotId: string,
    seedId: string
  ): boolean;
  
  // 收获作物
  harvest(characterId: string, plotId: string): Item | null;
  
  // 获取农田信息
  getPlot(plotId: string): FarmPlot | null;
  
  // 获取角色的所有农田
  getCharacterPlots(characterId: string): FarmPlot[];
  
  // 更新作物生长
  updateGrowth(deltaTime: number): void;
  
  // 检查是否可以收获
  canHarvest(plotId: string): boolean;
}

interface FarmPlot {
  id: string;
  ownerId: string;
  position: Position;
  state: PlotState;
  crop?: PlantedCrop;
}
```

### 钓鱼 API

```typescript
interface FishingSystem {
  // 开始钓鱼
  startFishing(
    characterId: string,
    spotId: string
  ): FishingSession | null;
  
  // 结束钓鱼
  endFishing(sessionId: string): Fish | null;
  
  // 获取钓鱼点信息
  getSpot(spotId: string): FishingSpot | null;
  
  // 获取所有钓鱼点
  getAllSpots(): FishingSpot[];
  
  // 更新钓鱼会话
  updateSessions(deltaTime: number): void;
}

interface FishingSession {
  id: string;
  characterId: string;
  spotId: string;
  startTime: GameTime;
  duration: number;
  state: 'fishing' | 'caught' | 'failed';
  result?: Fish;
}
```

### 挖矿 API

```typescript
interface MiningSystem {
  // 开始挖矿
  startMining(
    characterId: string,
    mineId: string
  ): MiningSession | null;
  
  // 结束挖矿
  endMining(sessionId: string): Mineral | null;
  
  // 获取矿场信息
  getMine(mineId: string): Mine | null;
  
  // 获取资源池状态
  getResourcePool(mineId: string): ResourcePool;
  
  // 刷新资源池
  refreshResourcePool(mineId: string): void;
  
  // 更新挖矿会话
  updateSessions(deltaTime: number): void;
}

interface MiningSession {
  id: string;
  characterId: string;
  mineId: string;
  startTime: GameTime;
  duration: number;
  state: 'mining' | 'found' | 'depleted';
  result?: Mineral;
}
```

---

## 社交系统 API

### 对话 API

```typescript
interface ConversationSystem {
  // 发起对话
  startConversation(
    initiatorId: string,
    targetId: string,
    topic?: string
  ): Conversation;
  
  // 发送消息
  sendMessage(
    conversationId: string,
    speakerId: string,
    content: string
  ): Message;
  
  // 结束对话
  endConversation(conversationId: string): void;
  
  // 获取对话
  getConversation(id: string): Conversation | null;
  
  // 获取角色的对话历史
  getCharacterConversations(characterId: string): Conversation[];
}

interface Conversation {
  id: string;
  participants: string[];
  messages: Message[];
  startTime: GameTime;
  endTime?: GameTime;
  state: ConversationState;
}
```

### 关系 API

```typescript
interface RelationshipSystem {
  // 获取关系
  getRelationship(fromId: string, toId: string): Relationship | null;
  
  // 更新关系
  updateRelationship(
    fromId: string,
    toId: string,
    impact: RelationshipImpact
  ): void;
  
  // 添加记忆
  addMemory(
    characterId: string,
    memory: Memory
  ): void;
  
  // 获取关系网络
  getRelationshipGraph(characterId: string): RelationshipGraph;
}

interface Relationship {
  targetId: string;
  trust: number;
  friendship: number;
  suspicion: number;
  hostility: number;
  memories: Memory[];
}
```

### 礼堂活动 API

```typescript
interface HallEventSystem {
  // 创建活动
  createEvent(
    type: HallEventType,
    organizerId: string
  ): HallEvent;
  
  // 加入活动
  joinEvent(eventId: string, characterId: string): boolean;
  
  // 离开活动
  leaveEvent(eventId: string, characterId: string): boolean;
  
  // 开始活动
  startEvent(eventId: string): void;
  
  // 结束活动
  endEvent(eventId: string): EventResult;
  
  // 获取活动
  getEvent(id: string): HallEvent | null;
  
  // 获取进行中的活动
  getActiveEvents(): HallEvent[];
}

interface HallEvent {
  id: string;
  type: HallEventType;
  participants: Set<string>;
  state: EventState;
  startTime: GameTime;
  metadata: any;
}
```

---

## AI 系统 API

### LLM 客户端 API

```typescript
interface LLMClient {
  // 单次请求
  request(prompt: string, options?: LLMOptions): Promise<string>;
  
  // 批量请求
  batchRequest(prompts: string[]): Promise<string[]>;
  
  // 流式请求
  streamRequest(
    prompt: string,
    onChunk: (chunk: string) => void
  ): Promise<void>;
}

interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
  timeout?: number;
}
```

### 决策引擎 API

```typescript
interface DecisionEngine {
  // 请求决策
  requestDecision(
    characterId: string,
    type: DecisionType,
    context: any
  ): Promise<DecisionResponse>;
  
  // 批量决策
  batchDecisions(
    requests: DecisionRequest[]
  ): Promise<DecisionResponse[]>;
  
  // 取消决策
  cancelDecision(characterId: string): void;
}

interface DecisionRequest {
  characterId: string;
  type: DecisionType;
  context: any;
}

interface DecisionResponse {
  action: string;
  reasoning?: string;
  parameters?: any;
}
```

### Prompt 构建器 API

```typescript
interface PromptBuilder {
  // 构建完整 Prompt
  buildFullPrompt(character: Character, task: string): string;
  
  // 构建系统 Prompt
  buildSystemPrompt(character: Character): string;
  
  // 构建上下文 Prompt
  buildContextPrompt(character: Character): string;
  
  // 构建历史 Prompt
  buildHistoryPrompt(character: Character): string;
}
```

---

## 渲染系统 API

### WebGPU 渲染器 API

```typescript
interface WebGPURenderer {
  // 初始化
  init(canvas: HTMLCanvasElement): Promise<void>;
  
  // 渲染帧
  render(scene: Scene): void;
  
  // 更新
  update(deltaTime: number): void;
  
  // 调整大小
  resize(width: number, height: number): void;
  
  // 清理
  dispose(): void;
}

interface Scene {
  characters: RenderableCharacter[];
  buildings: RenderableBuilding[];
  terrain: Terrain;
  camera: Camera;
}
```

---

## 事件系统 API

### 事件总线 API

```typescript
interface EventBus {
  // 监听事件
  on(event: string, handler: EventHandler): void;
  
  // 取消监听
  off(event: string, handler: EventHandler): void;
  
  // 触发事件
  emit(event: string, data: any): void;
  
  // 一次性监听
  once(event: string, handler: EventHandler): void;
}

type EventHandler = (data: any) => void;
```

### 系统事件

```typescript
enum SystemEvent {
  // 时间事件
  TIME_ADVANCED = 'time:advanced',
  DAY_CHANGED = 'time:day_changed',
  
  // 角色事件
  CHARACTER_HUNGRY = 'character:hungry',
  CHARACTER_ATE = 'character:ate',
  CHARACTER_MOVED = 'character:moved',
  
  // 经济事件
  ITEM_BOUGHT = 'economy:item_bought',
  ITEM_SOLD = 'economy:item_sold',
  
  // 生产事件
  CROP_PLANTED = 'farming:crop_planted',
  CROP_HARVESTED = 'farming:crop_harvested',
  FISH_CAUGHT = 'fishing:fish_caught',
  MINERAL_FOUND = 'mining:mineral_found',
  
  // 社交事件
  CONVERSATION_STARTED = 'social:conversation_started',
  HALL_EVENT_CREATED = 'social:hall_event_created',
  RELATIONSHIP_UPDATED = 'social:relationship_updated'
}
```

---

## 数据持久化 API

### 存储 API

```typescript
interface StorageSystem {
  // 保存游戏
  saveGame(slot: number): Promise<void>;
  
  // 加载游戏
  loadGame(slot: number): Promise<GameData>;
  
  // 删除存档
  deleteSave(slot: number): Promise<void>;
  
  // 获取存档列表
  getSaveList(): Promise<SaveInfo[]>;
  
  // 导出数据
  exportData(): Promise<Blob>;
  
  // 导入数据
  importData(data: Blob): Promise<void>;
}

interface GameData {
  version: string;
  timestamp: number;
  gameTime: GameTime;
  characters: CharacterData[];
  economy: EconomyData;
  world: WorldData;
}

interface SaveInfo {
  slot: number;
  timestamp: number;
  gameDay: number;
  characterCount: number;
}
```

---

## 工具函数 API

### 数学工具

```typescript
interface MathUtils {
  // 限制数值范围
  clamp(value: number, min: number, max: number): number;
  
  // 线性插值
  lerp(a: number, b: number, t: number): number;
  
  // 距离计算
  distance(a: Position, b: Position): number;
  
  // 随机数
  random(min: number, max: number): number;
  
  // 随机选择
  randomChoice<T>(array: T[]): T;
}
```

### 字符串工具

```typescript
interface StringUtils {
  // 生成唯一 ID
  generateId(prefix?: string): string;
  
  // 格式化时间
  formatTime(time: GameTime): string;
  
  // 格式化金钱
  formatMoney(amount: number): string;
}
```

---

## 错误处理

### 错误类型

```typescript
enum ErrorCode {
  // 通用错误
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INVALID_PARAMETER = 'INVALID_PARAMETER',
  
  // 角色错误
  CHARACTER_NOT_FOUND = 'CHARACTER_NOT_FOUND',
  CHARACTER_BUSY = 'CHARACTER_BUSY',
  
  // 经济错误
  INSUFFICIENT_MONEY = 'INSUFFICIENT_MONEY',
  ITEM_NOT_FOUND = 'ITEM_NOT_FOUND',
  INVENTORY_FULL = 'INVENTORY_FULL',
  
  // 生产错误
  PLOT_OCCUPIED = 'PLOT_OCCUPIED',
  RESOURCE_DEPLETED = 'RESOURCE_DEPLETED',
  SPOT_FULL = 'SPOT_FULL',
  
  // AI 错误
  LLM_REQUEST_FAILED = 'LLM_REQUEST_FAILED',
  DECISION_TIMEOUT = 'DECISION_TIMEOUT'
}

class GameError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public data?: any
  ) {
    super(message);
    this.name = 'GameError';
  }
}
```

---

## 使用示例

### 完整游戏流程示例

```typescript
// 初始化系统
const gameEngine = new GameEngine();
await gameEngine.init();

// 创建角色
const alice = characterSystem.createCharacter({
  name: 'Alice',
  personality: PERSONALITY_TEMPLATES.HARDWORKING_FARMER
});

const bob = characterSystem.createCharacter({
  name: 'Bob',
  personality: PERSONALITY_TEMPLATES.SOCIAL_BUTTERFLY
});

// Alice 购买种子并种植
const transaction = shopSystem.buyItem(alice.id, 'wheat_seed', 2);
if (transaction) {
  const plots = farmingSystem.getCharacterPlots(alice.id);
  farmingSystem.plant(alice.id, plots[0].id, 'wheat_seed');
}

// Bob 去钓鱼
const spots = fishingSystem.getAllSpots();
const session = fishingSystem.startFishing(bob.id, spots[0].id);

// 推进游戏时间
gameEngine.update(60); // 1小时游戏时间

// Alice 和 Bob 对话
const conversation = conversationSystem.startConversation(
  alice.id,
  bob.id,
  '今天天气不错'
);

// AI 自动决策
const decision = await decisionEngine.requestDecision(
  alice.id,
  DecisionType.NEXT_ACTION,
  {}
);

// 执行决策
gameEngine.executeDecision(alice.id, decision);

// 保存游戏
await storageSystem.saveGame(1);
```

---

## API 版本控制

### 版本号规范

采用语义化版本（Semantic Versioning）：

```
主版本号.次版本号.修订号 (MAJOR.MINOR.PATCH)
```

- **主版本号**：不兼容的 API 修改
- **次版本号**：向下兼容的功能新增
- **修订号**：向下兼容的问题修正

当前版本：`0.1.0`

---

## 总结

本 API 设计文档定义了 Sonacatworld 的核心接口，提供了：

✅ **模块化设计**: 清晰的系统边界  
✅ **类型安全**: 完整的 TypeScript 类型定义  
✅ **易于扩展**: 灵活的接口设计  
✅ **一致性**: 统一的命名和错误处理  

通过遵循本 API 设计，可以确保系统的可维护性和可扩展性。
