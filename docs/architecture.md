# Sonacatworld 技术架构文档

## 架构概述

Sonacatworld 采用**前后分离**的技术架构，前端使用 WebGPU 进行渲染与并行计算，后端使用 LLM 进行多智能体决策。本项目的核心特点是**不使用传统游戏引擎**，完全基于现代 Web 技术栈构建。

---

## 技术栈选型

### 前端技术
- **WebGPU**: 现代图形API，用于渲染与GPU并行计算
- **TypeScript**: 强类型语言，提供完整的类型安全
- **Vite**: 现代构建工具，快速开发体验

### AI决策层
- **在线LLM服务**: 
  - OpenAI GPT-4
  - Anthropic Claude
  - 其他兼容服务
- **多人格Prompt**: 单一模型分裂为多个独立人格

### 数据存储
- **浏览器端**: localStorage / IndexedDB
- **可选云端**: 后续扩展支持

### 开发工具
- **ESLint**: 代码质量检查
- **Prettier**: 代码格式化
- **Vitest**: 单元测试框架

---

## 系统架构分层

```
┌─────────────────────────────────────────────────────────┐
│                    表现层 (Presentation)                 │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  WebGPU渲染  │  │   UI组件     │  │  用户输入    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│                    应用层 (Application)                  │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  游戏循环    │  │  事件管理    │  │  状态管理    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│                    核心层 (Core)                         │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  时间系统    │  │  人物系统    │  │  经济系统    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  位置系统    │  │  库存系统    │  │  关系系统    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│                   功能模块层 (Modules)                   │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  农业系统    │  │  钓鱼系统    │  │  挖矿系统    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  社交系统    │  │  对话系统    │  │  礼堂系统    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│                   AI决策层 (AI Engine)                   │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  LLM接口     │  │  Prompt管理  │  │  决策引擎    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  记忆管理    │  │  上下文管理  │  │  行为解析    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 核心模块设计

### 1. WebGPU 渲染模块

#### 设计目标
- 不使用游戏引擎
- 基于 WebGPU 原生 API
- 支持基础 2D/3D 渲染

#### 技术实现

```typescript
// WebGPU 渲染器结构
class WebGPURenderer {
  private device: GPUDevice;
  private context: GPUCanvasContext;
  private pipeline: GPURenderPipeline;
  
  async init(): Promise<void>;
  render(scene: Scene): void;
  update(deltaTime: number): void;
}
```

#### 渲染流程
1. **初始化**: 获取 WebGPU 设备和上下文
2. **创建管线**: 设置渲染管线和着色器
3. **渲染循环**: 每帧更新和绘制场景
4. **资源管理**: 纹理、缓冲区等资源管理

#### GPU 并行计算
- 使用 Compute Shader 进行批量计算
- 路径查找、碰撞检测等计算密集任务
- 多 AI 状态批量更新

---

### 2. LLM 决策引擎

#### 架构设计

```
[AI Agent] → [决策请求] → [Prompt构造器]
                              ↓
                         [LLM API]
                              ↓
                         [结果解析器]
                              ↓
                         [行为执行器]
```

#### 核心组件

**Prompt 构造器**
```typescript
class PromptBuilder {
  buildSystemPrompt(character: Character): string;
  buildContextPrompt(state: GameState): string;
  buildActionPrompt(availableActions: Action[]): string;
}
```

**LLM 客户端**
```typescript
class LLMClient {
  async requestDecision(
    prompt: string,
    character: Character
  ): Promise<Decision>;
  
  async batchRequest(
    requests: DecisionRequest[]
  ): Promise<Decision[]>;
}
```

**决策解析器**
```typescript
class DecisionParser {
  parse(llmResponse: string): Decision;
  validate(decision: Decision): boolean;
}
```

#### 异步调用策略

**时间切片**
- 每个游戏帧只处理部分 AI 决策
- 避免同时大量调用 API
- 使用优先级队列管理

**缓存机制**
- 常见场景决策缓存
- 相似状态结果复用
- 减少 API 调用成本

**批处理**
- 合并多个 AI 的决策请求
- 单次 API 调用返回多个结果
- 提高效率降低成本

---

### 3. 多人格系统

#### 人格隔离

每个 AI Agent 维护独立的：
- **系统 Prompt**: 人格设定
- **对话历史**: 最近 N 条对话
- **行为记录**: 最近 M 个行为
- **关系网络**: 与其他 AI 的关系
- **物品库存**: 拥有的物品

#### 上下文管理

```typescript
class AgentContext {
  personality: PersonalityProfile;
  conversationHistory: Conversation[];
  behaviorHistory: Behavior[];
  relationships: Map<AgentID, Relationship>;
  inventory: Item[];
  
  buildPrompt(): string;
  updateHistory(event: Event): void;
  pruneHistory(): void; // 记忆压缩
}
```

#### 记忆压缩策略

**重要性评分**
- 根据事件类型评分
- 情感强度影响保留
- 时间衰减机制

**摘要生成**
- 长期记忆转换为摘要
- 保留关键信息
- 减少 Prompt 长度

---

### 4. 时间系统

#### 时间模型

```typescript
class TimeSystem {
  private currentTime: GameTime;
  private timeScale: number; // 游戏时间/现实时间
  
  update(deltaTime: number): void;
  getCurrentHour(): number;
  getCurrentDay(): number;
  isNight(): boolean;
  
  // 事件调度
  schedule(event: Event, time: GameTime): void;
  checkScheduledEvents(): Event[];
}
```

#### 时间影响

- **作物生长**: 按游戏时间计算成熟度
- **资源刷新**: 每日定时刷新
- **AI 行为**: 白天/夜晚行为差异
- **事件触发**: 定时活动安排

---

### 5. 状态管理系统

#### 全局状态

```typescript
interface GameState {
  time: GameTime;
  characters: Map<CharacterID, Character>;
  economy: EconomyState;
  resources: ResourceState;
  events: Event[];
}
```

#### 状态更新流程

```
[用户输入 / AI决策] → [动作验证]
                         ↓
                    [状态变更]
                         ↓
                    [事件触发]
                         ↓
                    [UI更新]
```

#### 事务性更新

```typescript
class StateManager {
  beginTransaction(): Transaction;
  commit(transaction: Transaction): void;
  rollback(transaction: Transaction): void;
  
  // 确保状态一致性
  validateState(): boolean;
}
```

---

### 6. 经济系统架构

#### 交易系统

```typescript
class TradingSystem {
  private shop: Shop;
  private priceCalculator: PriceCalculator;
  
  buyItem(
    character: Character,
    item: Item,
    quantity: number
  ): Transaction;
  
  sellItem(
    character: Character,
    item: Item,
    quantity: number
  ): Transaction;
  
  calculatePrice(item: Item): number;
}
```

#### 价格系统

**基础价格**
- 每种物品固定基础价格

**动态价格** (可选扩展)
- 供需关系影响
- 稀有度加成
- 季节性波动

---

### 7. 社交系统架构

#### 关系图数据结构

```typescript
class RelationshipGraph {
  private adjacencyList: Map<AgentID, Map<AgentID, Relationship>>;
  
  addRelationship(
    from: AgentID,
    to: AgentID,
    type: RelationType,
    strength: number
  ): void;
  
  getRelationship(from: AgentID, to: AgentID): Relationship;
  updateRelationship(from: AgentID, to: AgentID, delta: number): void;
  
  // 关系传播算法
  propagateRelationship(event: SocialEvent): void;
}
```

#### 对话系统

```typescript
class ConversationSystem {
  startConversation(
    initiator: Character,
    target: Character,
    topic?: string
  ): Conversation;
  
  generateResponse(
    character: Character,
    message: string,
    context: Conversation
  ): Promise<string>;
  
  endConversation(conversation: Conversation): void;
}
```

---

### 8. 礼堂活动系统

#### 活动管理器

```typescript
class HallEventManager {
  private activeEvents: Map<EventID, HallEvent>;
  
  scheduleEvent(event: HallEvent, time: GameTime): void;
  startEvent(eventType: EventType): HallEvent;
  joinEvent(character: Character, event: HallEvent): boolean;
  updateEvent(event: HallEvent, deltaTime: number): void;
  endEvent(event: HallEvent): EventResult;
}
```

#### 狼人杀实现

```typescript
class WerewolfGame extends HallEvent {
  private roles: Map<Character, Role>;
  private phase: GamePhase; // Night / Day / Discussion / Vote
  
  assignRoles(): void;
  processNightAction(character: Character, action: Action): void;
  processDayDiscussion(message: string, speaker: Character): void;
  processVote(voter: Character, target: Character): void;
  checkWinCondition(): WinCondition;
}
```

---

## 数据流设计

### 游戏主循环

```typescript
class GameLoop {
  private lastTime: number = 0;
  
  update(currentTime: number): void {
    const deltaTime = currentTime - this.lastTime;
    
    // 1. 更新时间系统
    this.timeSystem.update(deltaTime);
    
    // 2. 处理输入
    this.inputManager.process();
    
    // 3. 更新 AI 决策（异步）
    this.aiEngine.updateDecisions();
    
    // 4. 更新游戏逻辑
    this.updateSystems(deltaTime);
    
    // 5. 渲染
    this.renderer.render();
    
    this.lastTime = currentTime;
    requestAnimationFrame((t) => this.update(t));
  }
}
```

### AI 决策流

```
每个时间步 (Tick):
  1. 筛选需要决策的 AI (状态空闲 + 决策冷却结束)
  2. 收集 AI 当前状态
  3. 构造决策 Prompt
  4. 异步调用 LLM API
  5. 解析返回结果
  6. 验证行为合法性
  7. 执行行为
  8. 更新 AI 状态
  9. 触发相关事件
```

---

## 性能优化策略

### 1. 渲染优化

**批量渲染**
- 合并相同类型的物体
- 减少 Draw Call

**视锥裁剪**
- 只渲染可见区域
- 减少GPU负担

**LOD (Level of Detail)**
- 远处物体使用简化模型
- 动态调整细节等级

### 2. AI 决策优化

**决策频率控制**
- 非关键 AI 降低决策频率
- 关键时刻提高决策频率

**决策缓存**
- 缓存常见场景决策
- 相似状态复用结果

**批量处理**
- 合并多个 AI 的决策请求
- 减少 API 调用次数

### 3. 内存优化

**对象池**
- 复用频繁创建的对象
- 减少 GC 压力

**记忆压缩**
- 定期清理过期记忆
- 摘要长期记忆

**资源加载**
- 按需加载资源
- 卸载不使用的资源

---

## 安全性设计

### 1. LLM 输出验证

**结构化验证**
- 确保返回 JSON 格式正确
- 验证字段完整性

**行为合法性检查**
- 验证行为在允许列表中
- 检查资源是否足够
- 防止非法操作

### 2. 状态一致性

**事务性更新**
- 使用事务确保状态一致
- 失败时回滚

**并发控制**
- 资源锁机制
- 避免竞态条件

### 3. 数据持久化

**本地存储**
- 定期自动保存
- 支持手动保存

**数据校验**
- 加载时验证数据完整性
- 损坏数据恢复机制

---

## 可扩展性设计

### 1. 模块化架构

- 每个系统独立模块
- 清晰的接口定义
- 低耦合高内聚

### 2. 插件系统 (未来)

- 支持自定义系统扩展
- 事件总线机制
- 热插拔功能模块

### 3. 多 LLM 支持

```typescript
interface LLMProvider {
  request(prompt: string): Promise<string>;
  batchRequest(prompts: string[]): Promise<string[]>;
}

class OpenAIProvider implements LLMProvider { }
class ClaudeProvider implements LLMProvider { }
class LocalLLMProvider implements LLMProvider { }
```

---

## 开发规范

### 1. 代码风格

- 使用 ESLint 和 Prettier
- 严格 TypeScript 模式
- 完整的类型定义

### 2. 文件组织

```
src/
├── core/          # 核心系统
├── systems/       # 功能模块
├── webgpu/        # 渲染层
├── utils/         # 工具函数
└── types/         # 类型定义
```

### 3. 命名规范

- **类名**: PascalCase
- **函数/变量**: camelCase
- **常量**: UPPER_SNAKE_CASE
- **接口**: I 前缀 (可选)

---

## 测试策略

### 1. 单元测试

- 核心逻辑单元测试
- 使用 Vitest 框架
- 目标覆盖率 > 70%

### 2. 集成测试

- 系统间集成测试
- 模拟 LLM 响应
- 验证数据流正确性

### 3. 端到端测试

- 完整游戏流程测试
- 用户场景模拟
- 性能基准测试

---

## 部署方案

### 1. 开发环境

- Vite 开发服务器
- 热模块替换 (HMR)
- 快速迭代

### 2. 生产构建

- TypeScript 编译
- Vite 打包优化
- 资源压缩

### 3. 部署平台

- **静态托管**: Vercel, Netlify, GitHub Pages
- **CDN**: CloudFlare CDN
- **域名**: 自定义域名

---

## 技术挑战与解决方案

### 1. WebGPU 兼容性

**挑战**: 浏览器支持不完全  
**方案**: 
- 提供 WebGL 降级方案
- 检测浏览器能力
- 提示用户升级浏览器

### 2. LLM API 限流

**挑战**: API 调用频率限制  
**方案**:
- 请求队列管理
- 指数退避重试
- 优雅降级 (使用缓存决策)

### 3. 状态同步

**挑战**: 多 AI 异步决策可能冲突  
**方案**:
- 事务性状态更新
- 乐观锁机制
- 冲突检测与重试

---

## 总结

Sonacatworld 的技术架构基于以下核心理念：

✅ **现代 Web 技术**: WebGPU + TypeScript  
✅ **AI 驱动**: LLM 多智能体决策  
✅ **模块化设计**: 清晰的分层架构  
✅ **高性能**: GPU 并行计算 + 优化策略  
✅ **可扩展**: 插件化系统设计  

通过精心设计的架构，我们能够在浏览器中实现一个复杂的多智能体社会模拟系统，展现 AI 技术在游戏开发中的无限可能。
