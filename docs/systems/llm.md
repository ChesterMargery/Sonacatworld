# LLM 多人格系统设计文档

## 系统概述

LLM 多人格系统是 AI 小镇的智能核心，通过单一大语言模型的多人格分裂，为每个角色提供独立的思考、决策和对话能力。

## 架构设计

### 核心理念

**单一模型，多重人格**
- 使用同一个 LLM API（GPT-4、Claude、本地模型等）
- 通过不同的 System Prompt 实现人格差异化
- 每个角色维护独立的对话上下文和记忆
- 异步并发调用，提高系统效率

### 系统组件

```
LLMEngine (调度引擎)
├── APIClient (API 客户端)
├── ContextManager (上下文管理器)
├── MemoryStore (记忆存储)
├── PromptBuilder (提示词构建器)
└── RequestQueue (请求队列)
```

## 核心实现

### LLMEngine 类

```typescript
class LLMEngine {
  private apiClient: LLMAPIClient;
  private contextManager: ContextManager;
  private requestQueue: RequestQueue;
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
    this.apiClient = new LLMAPIClient(config);
    this.contextManager = new ContextManager();
    this.requestQueue = new RequestQueue();
  }

  /**
   * 角色行为决策
   */
  async decide(character: Character, context: DecisionContext): Promise<Decision> {
    // 1. 获取角色上下文
    const charContext = this.contextManager.getContext(character.id);
    
    // 2. 构建决策提示词
    const prompt = this.buildDecisionPrompt(character, context, charContext);
    
    // 3. 调用 LLM
    const response = await this.requestQueue.enqueue({
      characterId: character.id,
      prompt,
      priority: this.calculatePriority(character, context)
    });
    
    // 4. 解析决策
    const decision = this.parseDecision(response);
    
    // 5. 更新上下文
    charContext.addDecision(decision);
    
    return decision;
  }

  /**
   * 角色对话生成
   */
  async chat(
    character: Character,
    message: string,
    target?: Character
  ): Promise<string> {
    const charContext = this.contextManager.getContext(character.id);
    
    // 构建对话提示词
    const prompt = this.buildChatPrompt(character, message, target, charContext);
    
    // 调用 LLM
    const response = await this.requestQueue.enqueue({
      characterId: character.id,
      prompt,
      priority: Priority.HIGH // 对话优先级较高
    });
    
    // 更新对话历史
    charContext.addMessage({
      role: 'user',
      content: message
    });
    charContext.addMessage({
      role: 'assistant',
      content: response
    });
    
    return response;
  }

  /**
   * 构建决策提示词
   */
  private buildDecisionPrompt(
    character: Character,
    context: DecisionContext,
    charContext: CharacterContext
  ): string {
    const builder = new PromptBuilder();
    
    // 1. 系统提示（人格设定）
    builder.addSystemPrompt(this.buildPersonalityPrompt(character));
    
    // 2. 角色当前状态
    builder.addSection('当前状态', this.formatCharacterState(context.characterState));
    
    // 3. 世界信息
    builder.addSection('世界信息', this.formatWorldState(context.worldState));
    
    // 4. 相关记忆
    const relevantMemories = charContext.retrieveRelevantMemories(
      `决策: ${context.availableActions.join(', ')}`
    );
    if (relevantMemories.length > 0) {
      builder.addSection('相关记忆', this.formatMemories(relevantMemories));
    }
    
    // 5. 可用行为
    builder.addSection('可用行为', context.availableActions.join('\n'));
    
    // 6. 决策请求
    builder.addSection(
      '任务',
      '基于你的人格、当前状态和可用行为，决定下一步要做什么。请以 JSON 格式回复：\n' +
      '{\n' +
      '  "action": "行为名称",\n' +
      '  "reasoning": "决策理由",\n' +
      '  "emotion": "当前情绪",\n' +
      '  "internalThought": "内心想法"\n' +
      '}'
    );
    
    return builder.build();
  }

  /**
   * 构建人格提示词
   */
  private buildPersonalityPrompt(character: Character): string {
    const p = character.personality;
    
    return `
你是 ${character.name}，一个生活在 AI 小镇的居民。

# 基础信息
- 年龄：${Math.floor(character.age)} 岁
- 性别：${character.gender}

# 人格特质
${p.getPersonalityPrompt()}

# 核心目标
${p.goals.map(g => `- ${g.description} (优先级: ${g.priority})`).join('\n')}

# 行为准则
- 你会基于自己的人格特质做出决策
- 你需要平衡生存需求（饥饿、金钱）和个人目标
- 你的决策应该符合你的性格和价值观
- 你会记住与他人的互动并影响未来的行为

请始终保持这个人格，做出符合这个角色的决策和对话。
`.trim();
  }

  /**
   * 构建对话提示词
   */
  private buildChatPrompt(
    character: Character,
    message: string,
    target: Character | undefined,
    charContext: CharacterContext
  ): string {
    const builder = new PromptBuilder();
    
    builder.addSystemPrompt(this.buildPersonalityPrompt(character));
    
    // 添加对话历史
    for (const msg of charContext.conversationHistory.slice(-10)) {
      builder.addMessage(msg.role, msg.content);
    }
    
    // 如果有对话目标，添加关系信息
    if (target) {
      const relationship = character.relationships.get(target.id);
      if (relationship) {
        builder.addSection(
          '关系信息',
          `你和 ${target.name} 的关系：${relationship.getStatus()}`
        );
      }
    }
    
    // 添加当前消息
    builder.addMessage('user', message);
    
    return builder.build();
  }

  private calculatePriority(character: Character, context: DecisionContext): Priority {
    // 紧急情况（饥饿低、金钱少）优先级高
    if (context.characterState.hunger < 20) return Priority.URGENT;
    if (context.characterState.money < 10) return Priority.HIGH;
    return Priority.NORMAL;
  }

  private parseDecision(response: string): Decision {
    try {
      const json = JSON.parse(response);
      return {
        action: json.action,
        reasoning: json.reasoning || '',
        emotion: json.emotion || 'neutral',
        internalThought: json.internalThought || ''
      };
    } catch (error) {
      // 如果解析失败，返回默认决策
      return {
        action: ActionType.WALK,
        reasoning: '解析错误，随机行走',
        emotion: 'confused',
        internalThought: '我不知道该做什么...'
      };
    }
  }
}
```

### LLMAPIClient 类

```typescript
class LLMAPIClient {
  private apiKey: string;
  private baseURL: string;
  private model: string;
  private requestsPerMinute: number;
  private rateLimiter: RateLimiter;

  constructor(config: LLMConfig) {
    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL;
    this.model = config.model;
    this.requestsPerMinute = config.requestsPerMinute || 60;
    this.rateLimiter = new RateLimiter(this.requestsPerMinute);
  }

  async complete(prompt: string, options?: CompletionOptions): Promise<string> {
    // 等待速率限制
    await this.rateLimiter.acquire();
    
    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: this.parsePrompt(prompt),
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 500
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
      
    } catch (error) {
      console.error('LLM API error:', error);
      throw error;
    }
  }

  private parsePrompt(prompt: string): Array<{role: string, content: string}> {
    // 解析提示词为消息格式
    // 简化实现，实际需要更复杂的解析逻辑
    return [
      { role: 'user', content: prompt }
    ];
  }
}

interface LLMConfig {
  apiKey: string;
  baseURL: string;
  model: string;
  requestsPerMinute?: number;
}

interface CompletionOptions {
  temperature?: number;
  maxTokens?: number;
}
```

### ContextManager 类

```typescript
class ContextManager {
  private contexts: Map<string, CharacterContext>;

  constructor() {
    this.contexts = new Map();
  }

  getContext(characterId: string): CharacterContext {
    if (!this.contexts.has(characterId)) {
      this.contexts.set(characterId, new CharacterContext(characterId));
    }
    return this.contexts.get(characterId)!;
  }

  updateContext(characterId: string, update: ContextUpdate): void {
    const context = this.getContext(characterId);
    context.update(update);
  }

  clearContext(characterId: string): void {
    this.contexts.delete(characterId);
  }
}

class CharacterContext {
  characterId: string;
  conversationHistory: Message[];
  shortTermMemory: Memory[];
  decisions: Decision[];
  private maxHistoryLength: number = 20;

  constructor(characterId: string) {
    this.characterId = characterId;
    this.conversationHistory = [];
    this.shortTermMemory = [];
    this.decisions = [];
  }

  addMessage(message: Message): void {
    this.conversationHistory.push(message);
    
    // 限制历史长度
    if (this.conversationHistory.length > this.maxHistoryLength) {
      this.conversationHistory.shift();
    }
  }

  addDecision(decision: Decision): void {
    this.decisions.push(decision);
    
    // 保留最近 10 个决策
    if (this.decisions.length > 10) {
      this.decisions.shift();
    }
  }

  retrieveRelevantMemories(query: string, limit: number = 5): Memory[] {
    // 简化版：返回最近的记忆
    // 实际应使用向量相似度搜索
    return this.shortTermMemory
      .sort((a, b) => b.importance - a.importance)
      .slice(0, limit);
  }

  update(update: ContextUpdate): void {
    if (update.newMemory) {
      this.shortTermMemory.push(update.newMemory);
    }
  }

  summarize(): string {
    // 生成上下文摘要（用于压缩长期记忆）
    const recentDecisions = this.decisions.slice(-5);
    const summary = `
最近的决策：
${recentDecisions.map(d => `- ${d.action}: ${d.reasoning}`).join('\n')}
`.trim();
    return summary;
  }
}

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ContextUpdate {
  newMemory?: Memory;
}
```

### RequestQueue 类

```typescript
class RequestQueue {
  private queue: PriorityQueue<LLMRequest>;
  private processing: boolean = false;

  constructor() {
    this.queue = new PriorityQueue<LLMRequest>((a, b) => 
      b.priority - a.priority
    );
  }

  async enqueue(request: LLMRequest): Promise<string> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        ...request,
        resolve,
        reject
      });
      
      if (!this.processing) {
        this.process();
      }
    });
  }

  private async process(): Promise<void> {
    this.processing = true;
    
    while (!this.queue.isEmpty()) {
      const request = this.queue.pop()!;
      
      try {
        // 实际 API 调用在这里
        const response = await this.executeRequest(request);
        request.resolve(response);
      } catch (error) {
        request.reject(error);
      }
    }
    
    this.processing = false;
  }

  private async executeRequest(request: LLMRequest): Promise<string> {
    // 这里会调用 LLMAPIClient
    // 为了简化，这里返回模拟响应
    return '{"action": "walk", "reasoning": "随便走走"}';
  }
}

interface LLMRequest {
  characterId: string;
  prompt: string;
  priority: Priority;
  resolve?: (value: string) => void;
  reject?: (error: any) => void;
}

enum Priority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  URGENT = 3
}
```

### PromptBuilder 工具类

```typescript
class PromptBuilder {
  private sections: string[] = [];
  private systemPrompt: string = '';

  addSystemPrompt(prompt: string): this {
    this.systemPrompt = prompt;
    return this;
  }

  addSection(title: string, content: string): this {
    this.sections.push(`# ${title}\n${content}`);
    return this;
  }

  addMessage(role: string, content: string): this {
    this.sections.push(`[${role}]: ${content}`);
    return this;
  }

  build(): string {
    const parts: string[] = [];
    
    if (this.systemPrompt) {
      parts.push(this.systemPrompt);
    }
    
    if (this.sections.length > 0) {
      parts.push(...this.sections);
    }
    
    return parts.join('\n\n');
  }
}
```

## 记忆系统

### MemoryStore 类

```typescript
class MemoryStore {
  private memories: Memory[] = [];
  private maxMemories: number = 100;

  add(memory: Memory): void {
    this.memories.push(memory);
    
    // 超过上限时，删除不重要的旧记忆
    if (this.memories.length > this.maxMemories) {
      this.cleanup();
    }
  }

  query(query: string, limit: number = 5): Memory[] {
    // 简化版：按重要性和时间排序
    return this.memories
      .sort((a, b) => {
        const importanceDiff = b.importance - a.importance;
        if (Math.abs(importanceDiff) > 0.1) return importanceDiff;
        return b.timestamp - a.timestamp;
      })
      .slice(0, limit);
  }

  private cleanup(): void {
    // 保留最重要的记忆
    this.memories.sort((a, b) => b.importance - a.importance);
    this.memories = this.memories.slice(0, this.maxMemories);
  }

  summarizeOldMemories(): string {
    // 使用 LLM 总结旧记忆（可选功能）
    const oldMemories = this.memories.filter(m => 
      Date.now() - m.timestamp > 3600000 // 1小时前的记忆
    );
    
    return oldMemories.map(m => m.content).join('; ');
  }
}
```

## 性能优化

### 1. 批处理

```typescript
class BatchProcessor {
  private batch: LLMRequest[] = [];
  private batchSize: number = 5;
  private batchTimeout: number = 1000;

  async addToBatch(request: LLMRequest): Promise<string> {
    this.batch.push(request);
    
    if (this.batch.length >= this.batchSize) {
      return this.processBatch();
    }
    
    // 设置超时
    setTimeout(() => {
      if (this.batch.length > 0) {
        this.processBatch();
      }
    }, this.batchTimeout);
    
    return new Promise(resolve => request.resolve = resolve);
  }

  private async processBatch(): Promise<string> {
    const batch = this.batch;
    this.batch = [];
    
    // 并发处理批次
    const results = await Promise.all(
      batch.map(req => this.processRequest(req))
    );
    
    return results[0]; // 简化返回
  }

  private async processRequest(request: LLMRequest): Promise<string> {
    // 实际处理
    return '';
  }
}
```

### 2. 缓存策略

```typescript
class DecisionCache {
  private cache: Map<string, CacheEntry>;
  private ttl: number = 60000; // 1分钟

  get(key: string): Decision | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.decision;
  }

  set(key: string, decision: Decision): void {
    this.cache.set(key, {
      decision,
      timestamp: Date.now()
    });
  }

  private generateKey(character: Character, context: DecisionContext): string {
    // 基于状态生成缓存键
    return `${character.id}_${context.characterState.hunger}_${context.characterState.location}`;
  }
}

interface CacheEntry {
  decision: Decision;
  timestamp: number;
}
```

## 测试策略

### 1. 单元测试

```typescript
describe('LLMEngine', () => {
  it('should generate valid decision', async () => {
    const engine = new LLMEngine(testConfig);
    const character = createTestCharacter();
    const context = createTestContext();
    
    const decision = await engine.decide(character, context);
    
    expect(decision).toHaveProperty('action');
    expect(decision).toHaveProperty('reasoning');
  });
});
```

### 2. 集成测试

- 测试多个角色并发决策
- 测试长对话的上下文维护
- 测试记忆检索的准确性

### 3. 性能测试

- 测试 API 调用速率限制
- 测试批处理效率
- 测试缓存命中率

## 扩展功能

1. **向量记忆检索**：使用嵌入向量和向量数据库
2. **情感追踪**：持续追踪角色情感状态
3. **多模型支持**：支持切换不同的 LLM 提供商
4. **本地模型**：集成本地运行的开源模型

---

**最后更新**：2026-01-15
