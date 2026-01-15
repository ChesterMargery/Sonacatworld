# 社交系统设计文档

## 系统概述

社交系统是 AI 小镇的灵魂，通过对话、礼堂活动和关系网络，让 AI 角色形成复杂的社会互动和记忆。

## 核心组件

### 1. 对话系统

#### 基础对话

```typescript
class Conversation {
  id: string;
  participants: Character[];
  messages: Message[];
  context: ConversationContext;
  startTime: number;
  isActive: boolean;

  constructor(char1: Character, char2: Character, context?: ConversationContext) {
    this.id = generateId();
    this.participants = [char1, char2];
    this.messages = [];
    this.context = context || { topic: 'casual', mood: 'neutral' };
    this.startTime = Date.now();
    this.isActive = true;
  }

  async addMessage(speaker: Character, content: string): Promise<void> {
    const message: Message = {
      speaker: speaker.id,
      content,
      timestamp: Date.now(),
      emotion: this.detectEmotion(content)
    };
    
    this.messages.push(message);
    
    // 更新参与者的记忆
    for (const participant of this.participants) {
      if (participant.id !== speaker.id) {
        participant.memory.add({
          type: MemoryType.CONVERSATION,
          content: `${speaker.name} 说：${content}`,
          timestamp: Date.now(),
          importance: this.calculateImportance(message)
        });
      }
    }
  }

  private detectEmotion(content: string): Emotion {
    // 简单情感检测（可以使用 LLM 或情感分析 API）
    if (content.includes('！') || content.includes('太好了')) return Emotion.EXCITED;
    if (content.includes('...') || content.includes('唉')) return Emotion.SAD;
    return Emotion.NEUTRAL;
  }

  private calculateImportance(message: Message): number {
    // 基于内容和情感计算重要性
    let importance = 0.3; // 基础重要性
    
    if (message.emotion !== Emotion.NEUTRAL) importance += 0.2;
    if (message.content.length > 50) importance += 0.1;
    
    return Math.min(1, importance);
  }

  end(): void {
    this.isActive = false;
    
    // 更新参与者关系
    if (this.participants.length === 2) {
      const [char1, char2] = this.participants;
      
      const event: SocialEvent = {
        type: SocialEventType.FRIENDLY_CHAT,
        participants: [char1.id, char2.id],
        impact: 0.05,
        description: '进行了友好的对话'
      };
      
      char1.relationships.get(char2.id)?.update(event);
      char2.relationships.get(char1.id)?.update(event);
    }
  }
}

interface Message {
  speaker: string;
  content: string;
  timestamp: number;
  emotion: Emotion;
}

enum Emotion {
  HAPPY = 'happy',
  SAD = 'sad',
  ANGRY = 'angry',
  EXCITED = 'excited',
  NEUTRAL = 'neutral',
  FEARFUL = 'fearful'
}

interface ConversationContext {
  topic: string;
  mood: string;
  location?: string;
}
```

### 2. 礼堂系统

#### HallEvent 基类

```typescript
abstract class HallEvent {
  id: string;
  type: HallEventType;
  participants: Character[];
  state: EventState;
  startTime: number;
  results: EventResult[];

  constructor(type: HallEventType, participants: Character[]) {
    this.id = generateId();
    this.type = type;
    this.participants = participants;
    this.state = EventState.WAITING;
    this.startTime = 0;
    this.results = [];
  }

  abstract canStart(): boolean;
  abstract start(): Promise<void>;
  abstract update(): Promise<void>;
  abstract end(): Promise<void>;
}

enum HallEventType {
  WEREWOLF = 'werewolf',
  MYSTERY = 'mystery',
  DISCUSSION = 'discussion'
}

enum EventState {
  WAITING = 'waiting',
  ACTIVE = 'active',
  FINISHED = 'finished'
}

interface EventResult {
  characterId: string;
  outcome: string;
  relationshipChanges: Map<string, number>;
  memoryImpact: number;
}
```

#### 狼人杀实现

```typescript
class WerewolfGame extends HallEvent {
  private roles: Map<string, WerewolfRole>;
  private phase: GamePhase;
  private dayCount: number;
  private alivePlayers: Set<string>;

  constructor(participants: Character[]) {
    super(HallEventType.WEREWOLF, participants);
    this.roles = new Map();
    this.phase = GamePhase.NIGHT;
    this.dayCount = 0;
    this.alivePlayers = new Set(participants.map(p => p.id));
  }

  canStart(): boolean {
    return this.participants.length >= 6 && this.participants.length <= 12;
  }

  async start(): Promise<void> {
    this.state = EventState.ACTIVE;
    this.startTime = Date.now();
    
    // 分配角色
    this.assignRoles();
    
    // 通知每个玩家他们的角色
    for (const participant of this.participants) {
      const role = this.roles.get(participant.id)!;
      participant.memory.add({
        type: MemoryType.EVENT,
        content: `你在狼人杀中的角色是：${role}`,
        timestamp: Date.now(),
        importance: 0.9
      });
    }
  }

  private assignRoles(): void {
    const count = this.participants.length;
    const werewolfCount = Math.floor(count / 3);
    
    const rolePool: WerewolfRole[] = [
      ...Array(werewolfCount).fill(WerewolfRole.WEREWOLF),
      WerewolfRole.SEER,
      WerewolfRole.WITCH,
      ...Array(count - werewolfCount - 2).fill(WerewolfRole.VILLAGER)
    ];
    
    shuffle(rolePool);
    
    this.participants.forEach((participant, index) => {
      this.roles.set(participant.id, rolePool[index]);
    });
  }

  async update(): Promise<void> {
    if (this.phase === GamePhase.NIGHT) {
      await this.nightPhase();
      this.phase = GamePhase.DAY;
    } else {
      await this.dayPhase();
      this.phase = GamePhase.NIGHT;
      this.dayCount++;
    }
    
    // 检查胜利条件
    if (this.checkWinCondition()) {
      await this.end();
    }
  }

  private async nightPhase(): Promise<void> {
    // 狼人行动
    const werewolves = this.getAlivePlayersWithRole(WerewolfRole.WEREWOLF);
    if (werewolves.length > 0) {
      const target = await this.llmDecideKill(werewolves);
      if (target) {
        this.alivePlayers.delete(target.id);
        this.recordDeath(target, '被狼人杀害');
      }
    }
    
    // 预言家行动
    const seer = this.getAlivePlayersWithRole(WerewolfRole.SEER)[0];
    if (seer) {
      const target = await this.llmDecideCheck(seer);
      // 告知预言家结果
    }
  }

  private async dayPhase(): Promise<void> {
    // LLM 驱动的讨论阶段
    const discussions = await this.llmGroupDiscussion();
    
    // 投票阶段
    const votes = await this.llmVote();
    const eliminated = this.countVotes(votes);
    
    if (eliminated) {
      this.alivePlayers.delete(eliminated.id);
      this.recordDeath(eliminated, '被投票放逐');
    }
  }

  private async llmDecideKill(werewolves: Character[]): Promise<Character | null> {
    // 使用 LLM 让狼人团队决定杀谁
    // 返回目标角色
    return null; // 实现略
  }

  private async llmGroupDiscussion(): Promise<string[]> {
    // 使用 LLM 生成每个玩家的发言
    // 返回发言列表
    return []; // 实现略
  }

  private async llmVote(): Promise<Map<string, string>> {
    // 使用 LLM 让每个玩家投票
    // 返回 voterId -> targetId 的映射
    return new Map(); // 实现略
  }

  private checkWinCondition(): boolean {
    const aliveWerewolves = this.getAlivePlayersWithRole(WerewolfRole.WEREWOLF);
    const aliveVillagers = Array.from(this.alivePlayers).filter(id => 
      this.roles.get(id) !== WerewolfRole.WEREWOLF
    );
    
    // 狼人全灭或狼人数 >= 村民数
    return aliveWerewolves.length === 0 || aliveWerewolves.length >= aliveVillagers.length;
  }

  private recordDeath(character: Character, cause: string): void {
    for (const participant of this.participants) {
      if (participant.isAlive) {
        participant.memory.add({
          type: MemoryType.EVENT,
          content: `${character.name} ${cause}`,
          timestamp: Date.now(),
          importance: 0.8
        });
      }
    }
  }

  async end(): Promise<void> {
    this.state = EventState.FINISHED;
    
    // 更新关系（基于游戏中的互动）
    this.updateRelationships();
    
    // 记录结果
    const winners = this.determineWinners();
    for (const participant of this.participants) {
      const won = winners.includes(participant.id);
      participant.memory.add({
        type: MemoryType.EVENT,
        content: won ? '在狼人杀中获胜' : '在狼人杀中失败',
        timestamp: Date.now(),
        importance: 0.9
      });
    }
  }

  private getAlivePlayersWithRole(role: WerewolfRole): Character[] {
    return this.participants.filter(p => 
      this.alivePlayers.has(p.id) && this.roles.get(p.id) === role
    );
  }

  private updateRelationships(): void {
    // 基于游戏互动更新角色间关系
    // 例如：背叛、合作、信任、怀疑
  }

  private determineWinners(): string[] {
    const aliveWerewolves = this.getAlivePlayersWithRole(WerewolfRole.WEREWOLF);
    
    if (aliveWerewolves.length === 0) {
      // 村民阵营胜利
      return Array.from(this.alivePlayers).filter(id => 
        this.roles.get(id) !== WerewolfRole.WEREWOLF
      );
    } else {
      // 狼人阵营胜利
      return aliveWerewolves.map(w => w.id);
    }
  }
}

enum WerewolfRole {
  WEREWOLF = 'werewolf',
  VILLAGER = 'villager',
  SEER = 'seer',
  WITCH = 'witch',
  HUNTER = 'hunter'
}

enum GamePhase {
  NIGHT = 'night',
  DAY = 'day'
}
```

#### 剧本杀实现（简化版）

```typescript
class MysteryGame extends HallEvent {
  private scenario: MysteryScenario;
  private clues: Map<string, Clue[]>;
  private discoveries: Map<string, string[]>;

  async start(): Promise<void> {
    this.state = EventState.ACTIVE;
    
    // 分配角色和剧本
    this.assignScenario();
    
    // 给每个玩家初始信息
    for (const participant of this.participants) {
      const role = this.scenario.roles.find(r => r.characterId === participant.id)!;
      participant.memory.add({
        type: MemoryType.EVENT,
        content: `剧本杀角色：${role.name}\n背景：${role.background}`,
        timestamp: Date.now(),
        importance: 0.9
      });
    }
  }

  private assignScenario(): void {
    // 分配剧本角色和线索
  }
  
  // ... 其他实现
}

interface MysteryScenario {
  title: string;
  story: string;
  roles: MysteryRole[];
  truth: string;
}

interface MysteryRole {
  characterId: string;
  name: string;
  background: string;
  secrets: string[];
  objectives: string[];
}

interface Clue {
  id: string;
  content: string;
  importance: number;
}
```

### 3. SocialSystem 管理

```typescript
class SocialSystem implements ISystem {
  private conversations: Map<string, Conversation>;
  private hallEvents: Map<string, HallEvent>;
  private eventSchedule: EventSchedule;

  init(): void {
    this.conversations = new Map();
    this.hallEvents = new Map();
    this.eventSchedule = new EventSchedule();
  }

  update(deltaTime: number): void {
    // 更新活动的礼堂事件
    for (const event of this.hallEvents.values()) {
      if (event.state === EventState.ACTIVE) {
        event.update();
      }
    }
    
    // 检查是否有新事件需要开始
    this.eventSchedule.check();
  }

  startConversation(char1: Character, char2: Character, context?: ConversationContext): Conversation {
    const conversation = new Conversation(char1, char2, context);
    this.conversations.set(conversation.id, conversation);
    
    // 建立关系（如果尚未存在）
    if (!char1.relationships.has(char2.id)) {
      char1.relationships.set(char2.id, new Relationship(char2.id));
    }
    if (!char2.relationships.has(char1.id)) {
      char2.relationships.set(char1.id, new Relationship(char1.id));
    }
    
    return conversation;
  }

  endConversation(conversationId: string): void {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      conversation.end();
      this.conversations.delete(conversationId);
    }
  }

  createHallEvent(type: HallEventType, participants: Character[]): HallEvent {
    let event: HallEvent;
    
    switch (type) {
      case HallEventType.WEREWOLF:
        event = new WerewolfGame(participants);
        break;
      case HallEventType.MYSTERY:
        event = new MysteryGame(participants);
        break;
      default:
        throw new Error(`Unknown hall event type: ${type}`);
    }
    
    this.hallEvents.set(event.id, event);
    return event;
  }

  updateRelationship(char1: Character, char2: Character, event: SocialEvent): void {
    const rel1 = char1.relationships.get(char2.id);
    const rel2 = char2.relationships.get(char1.id);
    
    rel1?.update(event);
    rel2?.update(event);
  }

  destroy(): void {
    this.conversations.clear();
    this.hallEvents.clear();
  }
}

class EventSchedule {
  private scheduledEvents: ScheduledEvent[];

  check(): void {
    const now = Date.now();
    const dueEvents = this.scheduledEvents.filter(e => e.startTime <= now);
    
    for (const event of dueEvents) {
      event.execute();
    }
    
    this.scheduledEvents = this.scheduledEvents.filter(e => e.startTime > now);
  }

  schedule(event: ScheduledEvent): void {
    this.scheduledEvents.push(event);
  }
}

interface ScheduledEvent {
  startTime: number;
  execute(): void;
}
```

## LLM 集成

### 对话生成

```typescript
async function generateDialogue(
  character: Character,
  conversation: Conversation,
  llmEngine: LLMEngine
): Promise<string> {
  const context = {
    personality: character.personality.getPersonalityPrompt(),
    currentState: character.getState(),
    conversationHistory: conversation.messages,
    relationship: character.relationships.get(
      conversation.participants.find(p => p.id !== character.id)!.id
    )
  };
  
  const response = await llmEngine.chat(character, 
    `基于当前对话生成你的回复`,
    context
  );
  
  return response;
}
```

## 扩展功能

1. **群聊系统**：多人同时对话
2. **表情系统**：非语言交流
3. **礼物系统**：赠送物品影响关系
4. **声望系统**：社区内的地位和影响力

## 测试用例

1. **对话测试**：验证对话正确创建和记录
2. **关系测试**：验证社交事件影响关系
3. **狼人杀测试**：验证游戏流程和胜利条件

---

**最后更新**：2026-01-15
