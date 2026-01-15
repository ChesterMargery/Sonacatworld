# LLM 多人格系统设计文档

## 系统概述

LLM 多人格系统是 Sonacatworld 的AI核心，通过单一大语言模型的 Prompt 工程，为每个 AI 居民创建独立的人格、记忆和决策能力。本系统实现了真正的多智能体异步决策。

---

## 核心理念

### 单一模型，多人格分裂

```
         [在线 LLM 服务]
               │
    ┌──────────┼──────────┐
    │          │          │
    ▼          ▼          ▼
[人格A]    [人格B]    [人格C]
 独立       独立       独立
 上下文     上下文     上下文
```

**关键特性**：
- 使用同一个 LLM API
- 每个 AI 有独立的系统 Prompt
- 独立的对话历史和记忆
- 异步并发调用

---

## 人格 Prompt 系统

### Prompt 结构

```typescript
interface AIPrompt {
  system: string;          // 系统 Prompt（人格定义）
  context: string;         // 当前上下文（状态信息）
  history: string;         // 历史记录
  task: string;            // 当前任务/问题
}

class PromptBuilder {
  buildFullPrompt(character: Character, task: string): string {
    return `
${this.buildSystemPrompt(character)}

${this.buildContextPrompt(character)}

${this.buildHistoryPrompt(character)}

${task}
`;
  }
}
```

### 系统 Prompt（人格定义）

```typescript
function buildSystemPrompt(character: Character): string {
  const personality = character.personality;
  
  return `
# 角色身份
你是 ${character.name}，一个生活在小镇的居民。

# 人格特质
- 工作态度：${personality.traits.diligence > 0.7 ? '勤劳' : '懒散'}
- 社交倾向：${personality.traits.sociability > 0.7 ? '外向' : '内向'}
- 冒险精神：${personality.traits.risktaking > 0.7 ? '冒险' : '保守'}
- 生活方式：${personality.traits.earlyBird ? '早起' : ''}${personality.traits.nightOwl ? '夜猫子' : ''}

# 人生目标
${personality.goals.map(g => `- ${g.description} (优先级: ${g.priority}/10)`).join('\n')}

# 偏好
- 喜欢的活动：${personality.preferences.favoriteActivity}
- 喜欢的作物：${personality.preferences.favoriteCrop || '无特别偏好'}

# 行为准则
1. 根据你的人格特质做出符合角色的决策
2. 优先考虑高优先级的目标
3. 保持角色一致性
4. 考虑当前状态（饥饿、金钱等）做出合理决策
5. 记住与其他居民的关系，这会影响你的互动

# 重要提示
- 你的回复将被解析为 JSON 格式
- 始终保持角色扮演
- 做出符合人格的决策
`;
}
```

### 上下文 Prompt（当前状态）

```typescript
function buildContextPrompt(character: Character): string {
  return `
# 当前状态
- 饥饿值：${character.hunger}/100 ${character.hunger < 30 ? '(非常饥饿！)' : ''}
- 金钱：${character.money} 金
- 年龄：${character.age} 天
- 位置：${character.position.location}

# 库存
${Array.from(character.inventory.items.entries())
  .map(([itemId, count]) => `- ${getItem(itemId).name} x${count}`)
  .join('\n') || '(空)'}

# 当前时间
- 游戏时间：第 ${gameTime.day} 天，${gameTime.hour}:00
- 时段：${getTimeOfDay(gameTime.hour)} (白天/夜晚)
`;
}
```

### 历史 Prompt（记忆）

```typescript
function buildHistoryPrompt(character: Character): string {
  // 最近的行为
  const recentActions = character.actionHistory.slice(-5);
  
  // 最近的对话
  const recentConversations = character.conversationHistory.slice(-3);
  
  // 重要关系
  const importantRelationships = Array.from(character.relationships.entries())
    .filter(([_, rel]) => rel.friendship > 0.6 || rel.hostility > 0.6)
    .slice(0, 5);
  
  return `
# 最近行为
${recentActions.map(a => `- ${a.description}`).join('\n') || '(无记录)'}

# 最近对话
${recentConversations.map(c => `- 与${c.partner}对话：${c.summary}`).join('\n') || '(无记录)'}

# 重要关系
${importantRelationships.map(([id, rel]) => {
  const other = getCharacter(id);
  return `- ${other.name}: 友谊度${rel.friendship.toFixed(2)}, 信任度${rel.trust.toFixed(2)}`;
}).join('\n') || '(暂无特别关系)'}
`;
}
```

---

## 决策引擎

### 决策请求

```typescript
interface DecisionRequest {
  characterId: string;
  type: DecisionType;
  context: any;
}

enum DecisionType {
  NEXT_ACTION = 'next_action',       // 下一步做什么
  CONVERSATION = 'conversation',     // 对话回复
  TRADE = 'trade',                   // 交易决策
  HALL_EVENT = 'hall_event',         // 活动决策
  VOTE = 'vote'                      // 投票决策
}

interface DecisionResponse {
  action: string;
  reasoning?: string;
  parameters?: any;
}
```

### 行为决策

```typescript
async function decideNextAction(character: Character): Promise<DecisionResponse> {
  const prompt = buildFullPrompt(character, `
# 任务：决定下一步行动

## 可选行为
1. go_farming - 去农田种植或收获
2. go_fishing - 去钓鱼
3. go_mining - 去挖矿
4. go_shopping - 去杂货铺买卖
5. go_hall - 去礼堂参加活动
6. talk_to_someone - 与其他居民对话
7. eat_food - 进食
8. sleep - 睡觉
9. idle - 休息/闲逛

## 决策要素
- 考虑你的饥饿值（是否需要获取食物？）
- 考虑你的金钱（是否需要赚钱？）
- 考虑游戏时间（夜晚应该睡觉）
- 考虑你的人格目标
- 考虑你的偏好

## 回复格式（必须是有效的 JSON）
{
  "action": "行为名称",
  "reasoning": "你的决策理由（1-2句话）",
  "parameters": {
    // 行为需要的参数，例如：
    // "target": "角色ID",
    // "item": "物品ID",
    // "quantity": 1
  }
}

请做出决策：
`);
  
  const response = await llmClient.request(prompt);
  return JSON.parse(response);
}
```

### 对话决策

```typescript
async function decideConversationResponse(
  character: Character,
  conversation: Conversation,
  lastMessage: Message
): Promise<string> {
  const prompt = buildFullPrompt(character, `
# 任务：回复对话

## 对话情境
对方：${getCharacter(lastMessage.speakerId).name}
对方说：「${lastMessage.content}」

## 你与对方的关系
${buildRelationshipContext(character, lastMessage.speakerId)}

## 要求
- 回复应该符合你的人格
- 考虑你与对方的关系
- 1-2句话，自然对话风格
- 不要使用 JSON 格式，直接回复对话内容

请回复：
`);
  
  const response = await llmClient.request(prompt);
  return response.trim();
}
```

---

## LLM 客户端

### 客户端接口

```typescript
interface LLMClient {
  request(prompt: string, options?: LLMOptions): Promise<string>;
  batchRequest(prompts: string[]): Promise<string[]>;
}

interface LLMOptions {
  temperature?: number;      // 0-1，创造性
  maxTokens?: number;        // 最大生成长度
  model?: string;            // 模型选择
  timeout?: number;          // 超时时间
}
```

### OpenAI 实现

```typescript
class OpenAIClient implements LLMClient {
  private apiKey: string;
  private endpoint: string;
  
  async request(prompt: string, options?: LLMOptions): Promise<string> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: options?.model || 'gpt-4',
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens || 500
      })
    });
    
    const data = await response.json();
    return data.choices[0].message.content;
  }
  
  async batchRequest(prompts: string[]): Promise<string[]> {
    // 并发请求
    const promises = prompts.map(prompt => this.request(prompt));
    return Promise.all(promises);
  }
}
```

---

## 异步调用系统

### 决策队列

```typescript
class DecisionQueue {
  private queue: DecisionRequest[] = [];
  private processing: Set<string> = new Set();
  private concurrency: number = 5; // 最大并发数
  
  // 添加决策请求
  enqueue(request: DecisionRequest): void {
    this.queue.push(request);
  }
  
  // 处理队列
  async processQueue(): Promise<void> {
    while (this.queue.length > 0 && this.processing.size < this.concurrency) {
      const request = this.queue.shift()!;
      
      // 避免重复处理
      if (this.processing.has(request.characterId)) {
        continue;
      }
      
      this.processing.add(request.characterId);
      
      // 异步处理
      this.processRequest(request)
        .then(response => {
          this.handleResponse(request, response);
        })
        .catch(error => {
          this.handleError(request, error);
        })
        .finally(() => {
          this.processing.delete(request.characterId);
        });
    }
  }
  
  private async processRequest(request: DecisionRequest): Promise<DecisionResponse> {
    const character = getCharacter(request.characterId);
    
    switch (request.type) {
      case DecisionType.NEXT_ACTION:
        return await decideNextAction(character);
      case DecisionType.CONVERSATION:
        const response = await decideConversationResponse(
          character,
          request.context.conversation,
          request.context.lastMessage
        );
        return { action: 'respond', parameters: { message: response } };
      // ... 其他类型
      default:
        throw new Error(`Unknown decision type: ${request.type}`);
    }
  }
}
```

### 调度器

```typescript
class AIScheduler {
  private queue: DecisionQueue;
  private cooldowns: Map<string, number> = new Map();
  private decisionInterval: number = 60; // 每60秒决策一次（游戏时间）
  
  // 更新调度
  update(currentTime: GameTime): void {
    const characters = getAllCharacters();
    
    for (const character of characters) {
      // 检查是否需要决策
      if (this.shouldDecide(character, currentTime)) {
        this.queue.enqueue({
          characterId: character.id,
          type: DecisionType.NEXT_ACTION,
          context: {}
        });
        
        this.cooldowns.set(character.id, currentTime + this.decisionInterval);
      }
    }
    
    // 处理队列
    this.queue.processQueue();
  }
  
  private shouldDecide(character: Character, currentTime: GameTime): boolean {
    // 如果正在执行行为，不决策
    if (character.currentAction) {
      return false;
    }
    
    // 检查冷却时间
    const cooldown = this.cooldowns.get(character.id) || 0;
    if (currentTime < cooldown) {
      return false;
    }
    
    return true;
  }
}
```

---

## 上下文管理

### 上下文压缩

```typescript
class ContextManager {
  private maxContextLength: number = 2000; // 最大上下文字符数
  
  // 构建压缩的上下文
  buildCompressedContext(character: Character): string {
    const system = buildSystemPrompt(character);
    const context = buildContextPrompt(character);
    const history = this.compressHistory(character);
    
    return `${system}\n\n${context}\n\n${history}`;
  }
  
  // 压缩历史
  private compressHistory(character: Character): string {
    // 策略1：只保留最近N条记录
    const recentActions = character.actionHistory.slice(-3);
    const recentConversations = character.conversationHistory.slice(-2);
    
    // 策略2：摘要长期记忆
    const summary = this.summarizeLongTermMemory(character);
    
    return `
# 近期活动
${recentActions.map(a => `- ${a.description}`).join('\n')}

# 近期对话
${recentConversations.map(c => `- 与${c.partner}：${c.summary}`).join('\n')}

# 长期记忆摘要
${summary}
`;
  }
  
  // 摘要长期记忆
  private summarizeLongTermMemory(character: Character): string {
    // 提取关键记忆
    const keyMemories = character.memories
      .filter(m => m.importance > 0.7)
      .slice(0, 5);
    
    return keyMemories.map(m => `- ${m.description}`).join('\n');
  }
}
```

### 记忆管理

```typescript
interface Memory {
  id: string;
  type: MemoryType;
  content: string;
  timestamp: GameTime;
  importance: number;     // 0-1，重要性
  relatedCharacters: string[];
}

class MemoryManager {
  // 添加记忆
  addMemory(character: Character, memory: Memory): void {
    character.memories.push(memory);
    
    // 定期清理不重要的旧记忆
    this.pruneMemories(character);
  }
  
  // 清理记忆
  private pruneMemories(character: Character): void {
    const maxMemories = 100;
    
    if (character.memories.length > maxMemories) {
      // 按重要性和时间排序
      character.memories.sort((a, b) => {
        const scoreA = a.importance + (1 / (gameTime.current - a.timestamp + 1));
        const scoreB = b.importance + (1 / (gameTime.current - b.timestamp + 1));
        return scoreB - scoreA;
      });
      
      // 保留前N个重要记忆
      character.memories = character.memories.slice(0, maxMemories);
    }
  }
  
  // 检索相关记忆
  retrieveRelevantMemories(
    character: Character,
    context: string,
    limit: number = 5
  ): Memory[] {
    // 简单实现：返回最近的重要记忆
    return character.memories
      .filter(m => m.importance > 0.5)
      .slice(-limit);
    
    // 高级实现：使用语义搜索
    // return semanticSearch(character.memories, context, limit);
  }
}
```

---

## 成本优化

### 缓存系统

```typescript
class DecisionCache {
  private cache: Map<string, CachedDecision> = new Map();
  
  // 生成缓存键
  private getCacheKey(character: Character, context: any): string {
    return `${character.id}_${character.hunger}_${character.money}_${context.type}`;
  }
  
  // 获取缓存
  get(character: Character, context: any): DecisionResponse | null {
    const key = this.getCacheKey(character, context);
    const cached = this.cache.get(key);
    
    if (cached && gameTime.current - cached.timestamp < 300) {
      return cached.decision;
    }
    
    return null;
  }
  
  // 设置缓存
  set(character: Character, context: any, decision: DecisionResponse): void {
    const key = this.getCacheKey(character, context);
    this.cache.set(key, {
      decision,
      timestamp: gameTime.current
    });
  }
}
```

### 批处理

```typescript
class BatchProcessor {
  private pendingRequests: Map<string, DecisionRequest[]> = new Map();
  private batchInterval: number = 5000; // 5秒批处理一次
  
  // 添加到批处理
  addToBatch(request: DecisionRequest): void {
    const batch = this.pendingRequests.get(request.type) || [];
    batch.push(request);
    this.pendingRequests.set(request.type, batch);
  }
  
  // 处理批次
  async processBatch(): Promise<void> {
    for (const [type, requests] of this.pendingRequests.entries()) {
      if (requests.length === 0) continue;
      
      // 构建批量 Prompt
      const prompts = requests.map(req => {
        const character = getCharacter(req.characterId);
        return buildDecisionPrompt(character, req);
      });
      
      // 批量调用 LLM
      const responses = await llmClient.batchRequest(prompts);
      
      // 处理响应
      requests.forEach((req, index) => {
        this.handleResponse(req, JSON.parse(responses[index]));
      });
      
      // 清空批次
      this.pendingRequests.set(type, []);
    }
  }
}
```

---

## 错误处理

### 降级策略

```typescript
class LLMFallbackSystem {
  async requestWithFallback(
    prompt: string,
    character: Character
  ): Promise<string> {
    try {
      // 尝试主 LLM
      return await llmClient.request(prompt);
    } catch (error) {
      console.error('LLM request failed:', error);
      
      // 降级到简单规则
      return this.ruleBasedFallback(character);
    }
  }
  
  private ruleBasedFallback(character: Character): string {
    // 基于规则的简单决策
    if (character.hunger < 30) {
      return JSON.stringify({
        action: 'eat_food',
        reasoning: '饥饿值过低，需要进食'
      });
    }
    
    if (character.money < 20) {
      return JSON.stringify({
        action: 'go_fishing',
        reasoning: '金钱不足，去钓鱼赚钱'
      });
    }
    
    // 默认行为
    return JSON.stringify({
      action: 'idle',
      reasoning: '休息一下'
    });
  }
}
```

---

## 数据持久化

```typescript
interface AIData {
  characterId: string;
  memories: Memory[];
  actionHistory: Action[];
  conversationHistory: ConversationSummary[];
  decisionStats: {
    totalDecisions: number;
    avgResponseTime: number;
    cacheHitRate: number;
  };
}
```

---

## 测试用例

```typescript
describe('LLM System', () => {
  test('应该正确构建 Prompt', () => {
    // 测试 Prompt 构建
  });
  
  test('应该异步处理多个决策', () => {
    // 测试异步决策
  });
  
  test('应该正确压缩上下文', () => {
    // 测试上下文压缩
  });
  
  test('错误时应该使用降级策略', () => {
    // 测试降级
  });
});
```

---

## 总结

LLM 多人格系统是 Sonacatworld 的智能核心，提供了：

✅ **独立人格**: 每个AI有独特的人格和决策风格  
✅ **上下文管理**: 高效的记忆和历史管理  
✅ **异步调用**: 支持大量AI并发决策  
✅ **成本优化**: 缓存和批处理降低成本  
✅ **容错能力**: 降级策略确保系统可用性  

通过精心设计的LLM系统，AI能够展现真正的智能和个性。
