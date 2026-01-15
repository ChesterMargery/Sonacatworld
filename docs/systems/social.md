# 社交系统设计文档

## 系统概述

社交系统是 Sonacatworld 的核心创新之一，通过礼堂活动和对话系统，让 AI 之间建立复杂的社交关系网络。系统包括对话系统、礼堂活动（狼人杀、剧本杀、讨论）和关系记忆网络。

---

## 对话系统

### 对话触发

```typescript
interface Conversation {
  id: string;
  participants: string[];      // 参与者ID
  initiator: string;           // 发起者ID
  topic?: string;              // 话题
  messages: Message[];         // 消息列表
  startTime: GameTime;
  endTime?: GameTime;
  state: ConversationState;
}

enum ConversationState {
  ACTIVE = 'active',
  PAUSED = 'paused',
  ENDED = 'ended'
}

interface Message {
  id: string;
  speakerId: string;
  content: string;
  timestamp: GameTime;
  emotion?: EmotionType;
}
```

### 对话流程

```typescript
class ConversationSystem {
  // 发起对话
  startConversation(
    initiator: Character,
    target: Character,
    topic?: string
  ): Conversation {
    const conversation: Conversation = {
      id: generateId(),
      participants: [initiator.id, target.id],
      initiator: initiator.id,
      topic,
      messages: [],
      startTime: gameTime.current,
      state: ConversationState.ACTIVE
    };
    
    // 更新角色状态
    initiator.currentAction = { type: 'talking', target: target.id };
    target.currentAction = { type: 'talking', target: initiator.id };
    
    // LLM 生成开场白
    const greeting = await this.generateGreeting(initiator, target, topic);
    this.addMessage(conversation, initiator.id, greeting);
    
    eventBus.emit('conversation_started', { conversation });
    return conversation;
  }
  
  // 生成回复
  async generateResponse(
    conversation: Conversation,
    speaker: Character,
    context: ConversationContext
  ): Promise<string> {
    const prompt = this.buildConversationPrompt(speaker, conversation, context);
    const response = await llmClient.request(prompt);
    
    this.addMessage(conversation, speaker.id, response);
    return response;
  }
  
  // 结束对话
  endConversation(conversation: Conversation): void {
    conversation.state = ConversationState.ENDED;
    conversation.endTime = gameTime.current;
    
    // 清除角色状态
    conversation.participants.forEach(id => {
      const character = getCharacter(id);
      character.currentAction = undefined;
    });
    
    // 更新关系
    this.updateRelationshipsFromConversation(conversation);
    
    eventBus.emit('conversation_ended', { conversation });
  }
}
```

### 对话 Prompt 构造

```typescript
function buildConversationPrompt(
  speaker: Character,
  conversation: Conversation,
  context: ConversationContext
): string {
  const other = conversation.participants.find(id => id !== speaker.id);
  const otherCharacter = getCharacter(other!);
  const relationship = speaker.relationships.get(other!);
  
  return `
你是${speaker.name}，人格：${speaker.personality.name}

对话对象：${otherCharacter.name}
你们的关系：
- 信任度：${relationship?.trust || 0.5}
- 友谊度：${relationship?.friendship || 0.5}
- 最近互动：${relationship?.recentInteractions.slice(-3).join(', ')}

对话历史：
${conversation.messages.slice(-5).map(m => 
  `${getCharacter(m.speakerId).name}: ${m.content}`
).join('\n')}

当前话题：${conversation.topic || '闲聊'}

请生成你的回复（1-2句话，自然对话风格）：
`;
}
```

---

## 礼堂活动系统

### 活动类型

```typescript
enum HallEventType {
  WEREWOLF = 'werewolf',         // 狼人杀
  MURDER_MYSTERY = 'murder_mystery', // 剧本杀
  DISCUSSION = 'discussion'       // 自由讨论
}

interface HallEvent {
  id: string;
  type: HallEventType;
  participants: Set<string>;     // 参与者ID
  maxParticipants: number;       // 最大人数
  minParticipants: number;       // 最小人数
  startTime: GameTime;
  state: EventState;
  metadata: any;                 // 活动特定数据
}

enum EventState {
  RECRUITING = 'recruiting',     // 招募中
  STARTING = 'starting',         // 准备开始
  IN_PROGRESS = 'in_progress',   // 进行中
  ENDED = 'ended'                // 已结束
}
```

### 活动管理器

```typescript
class HallEventManager {
  private activeEvents: Map<string, HallEvent>;
  
  // 创建活动
  createEvent(type: HallEventType, organizer: Character): HallEvent {
    const event: HallEvent = {
      id: generateId(),
      type,
      participants: new Set([organizer.id]),
      maxParticipants: this.getMaxParticipants(type),
      minParticipants: this.getMinParticipants(type),
      startTime: gameTime.current,
      state: EventState.RECRUITING,
      metadata: this.initEventMetadata(type)
    };
    
    this.activeEvents.set(event.id, event);
    eventBus.emit('hall_event_created', { event });
    
    return event;
  }
  
  // 加入活动
  joinEvent(character: Character, event: HallEvent): boolean {
    if (event.participants.size >= event.maxParticipants) {
      return false;
    }
    
    event.participants.add(character.id);
    character.currentAction = { type: 'hall_event', target: event.id };
    
    eventBus.emit('character_joined_event', { character, event });
    
    // 检查是否可以开始
    if (event.participants.size >= event.minParticipants) {
      this.tryStartEvent(event);
    }
    
    return true;
  }
  
  // 开始活动
  tryStartEvent(event: HallEvent): void {
    if (event.state !== EventState.RECRUITING) {
      return;
    }
    
    event.state = EventState.IN_PROGRESS;
    eventBus.emit('hall_event_started', { event });
    
    // 根据类型启动不同的活动逻辑
    switch (event.type) {
      case HallEventType.WEREWOLF:
        this.startWerewolf(event);
        break;
      case HallEventType.MURDER_MYSTERY:
        this.startMurderMystery(event);
        break;
      case HallEventType.DISCUSSION:
        this.startDiscussion(event);
        break;
    }
  }
}
```

---

## 狼人杀系统

### 游戏结构

```typescript
interface WerewolfGame {
  eventId: string;
  roles: Map<string, WerewolfRole>;  // 角色分配
  phase: GamePhase;                   // 当前阶段
  day: number;                        // 第几天
  alive: Set<string>;                 // 存活玩家
  dead: Set<string>;                  // 死亡玩家
  votes: Map<string, string>;         // 投票记录
  nightActions: Map<string, any>;     // 夜间行动
}

enum WerewolfRole {
  VILLAGER = 'villager',       // 村民
  WEREWOLF = 'werewolf',       // 狼人
  SEER = 'seer',               // 预言家
  WITCH = 'witch',             // 女巫
  HUNTER = 'hunter'            // 猎人
}

enum GamePhase {
  NIGHT = 'night',             // 夜晚
  DAY = 'day',                 // 白天讨论
  VOTE = 'vote'                // 投票
}
```

### 游戏流程

```typescript
class WerewolfGameManager {
  // 分配角色
  assignRoles(participants: Set<string>): Map<string, WerewolfRole> {
    const roles = new Map<string, WerewolfRole>();
    const players = Array.from(participants);
    
    // 根据人数分配角色
    // 例如：6人局 = 2狼人 + 1预言家 + 1女巫 + 2村民
    const config = this.getRoleConfig(players.length);
    
    // 随机分配
    shuffle(players);
    let index = 0;
    
    for (let i = 0; i < config.werewolves; i++) {
      roles.set(players[index++], WerewolfRole.WEREWOLF);
    }
    roles.set(players[index++], WerewolfRole.SEER);
    roles.set(players[index++], WerewolfRole.WITCH);
    
    while (index < players.length) {
      roles.set(players[index++], WerewolfRole.VILLAGER);
    }
    
    return roles;
  }
  
  // 夜晚阶段
  async processNight(game: WerewolfGame): Promise<void> {
    game.phase = GamePhase.NIGHT;
    
    // 狼人杀人
    const werewolves = this.getPlayersByRole(game, WerewolfRole.WEREWOLF);
    const target = await this.llmWerewolfKill(werewolves, game);
    game.nightActions.set('werewolf_kill', target);
    
    // 预言家查验
    const seer = this.getPlayersByRole(game, WerewolfRole.SEER)[0];
    if (seer && game.alive.has(seer)) {
      const checked = await this.llmSeerCheck(seer, game);
      game.nightActions.set('seer_check', checked);
    }
    
    // 女巫行动
    const witch = this.getPlayersByRole(game, WerewolfRole.WITCH)[0];
    if (witch && game.alive.has(witch)) {
      const witchAction = await this.llmWitchAction(witch, game, target);
      game.nightActions.set('witch_action', witchAction);
    }
    
    // 结算夜晚
    this.resolveNight(game);
  }
  
  // 白天讨论
  async processDay(game: WerewolfGame): Promise<void> {
    game.phase = GamePhase.DAY;
    game.day++;
    
    // 公布夜晚结果
    this.announceNightResult(game);
    
    // AI讨论
    const discussions = await this.llmDiscussion(game);
    
    // 记录讨论内容
    game.nightActions.set('discussions', discussions);
  }
  
  // 投票阶段
  async processVote(game: WerewolfGame): Promise<void> {
    game.phase = GamePhase.VOTE;
    
    // AI投票
    for (const playerId of game.alive) {
      const vote = await this.llmVote(playerId, game);
      game.votes.set(playerId, vote);
    }
    
    // 统计投票
    const eliminated = this.tallyVotes(game.votes);
    
    if (eliminated) {
      game.alive.delete(eliminated);
      game.dead.add(eliminated);
      
      // 猎人技能检查
      const eliminatedRole = game.roles.get(eliminated);
      if (eliminatedRole === WerewolfRole.HUNTER) {
        const hunterShot = await this.llmHunterShoot(eliminated, game);
        if (hunterShot) {
          game.alive.delete(hunterShot);
          game.dead.add(hunterShot);
        }
      }
    }
    
    // 检查胜利条件
    if (this.checkWinCondition(game)) {
      this.endGame(game);
    }
  }
}
```

### LLM 决策

```typescript
async function llmWerewolfKill(
  werewolves: string[],
  game: WerewolfGame
): Promise<string> {
  const prompt = `
你们是狼人阵营，当前存活玩家：
${Array.from(game.alive).map(id => getCharacter(id).name).join(', ')}

已知信息：
- 第${game.day}天夜晚
- 你们的狼人队友：${werewolves.map(id => getCharacter(id).name).join(', ')}

讨论并决定今晚杀死谁（返回玩家ID）：
`;

  const response = await llmClient.request(prompt);
  return parsePlayerIdFromResponse(response);
}
```

---

## 剧本杀系统

### 剧本结构

```typescript
interface MurderMysteryGame {
  eventId: string;
  script: Script;                    // 剧本
  roles: Map<string, ScriptRole>;    // 角色分配
  clues: Map<string, Clue[]>;        // 每个角色的线索
  timeline: Event[];                 // 事件时间线
  accusations: Map<string, string>;  // 指控记录
  phase: MysteryPhase;
}

enum MysteryPhase {
  INTRODUCTION = 'introduction',     // 剧本介绍
  SEARCH = 'search',                 // 搜证阶段
  DISCUSSION = 'discussion',         // 讨论阶段
  ACCUSATION = 'accusation',         // 指控阶段
  REVEAL = 'reveal'                  // 揭晓真相
}

interface Script {
  id: string;
  title: string;
  background: string;
  victim: string;
  murderer: string;
  roles: ScriptRole[];
  clues: Clue[];
}
```

---

## 自由讨论系统

### 讨论话题

```typescript
enum DiscussionTopic {
  DAILY_LIFE = 'daily_life',         // 日常生活
  ECONOMY = 'economy',               // 经济话题
  GOSSIP = 'gossip',                 // 八卦
  PLANS = 'plans',                   // 未来计划
  COMPLAINTS = 'complaints'          // 抱怨
}

interface DiscussionSession {
  eventId: string;
  topic: DiscussionTopic;
  speakers: string[];
  statements: Statement[];
}

interface Statement {
  speakerId: string;
  content: string;
  timestamp: GameTime;
  reactions: Map<string, Reaction>;  // 其他人的反应
}
```

---

## 关系记忆系统

### 关系数据结构

```typescript
interface Relationship {
  targetId: string;
  
  // 关系维度
  trust: number;         // 信任度 (0-1)
  friendship: number;    // 友谊度 (0-1)
  suspicion: number;     // 怀疑度 (0-1)
  hostility: number;     // 敌对度 (0-1)
  
  // 记忆
  memories: Memory[];
  recentInteractions: string[];
  
  // 统计
  totalInteractions: number;
  lastInteraction: GameTime;
}

interface Memory {
  event: string;
  type: MemoryType;
  timestamp: GameTime;
  impact: RelationshipImpact;
  description: string;
}

enum MemoryType {
  CONVERSATION = 'conversation',
  TRADE = 'trade',
  WEREWOLF = 'werewolf',
  COOPERATION = 'cooperation',
  CONFLICT = 'conflict'
}

interface RelationshipImpact {
  trust?: number;
  friendship?: number;
  suspicion?: number;
  hostility?: number;
}
```

### 关系更新

```typescript
class RelationshipManager {
  // 更新关系
  updateRelationship(
    from: Character,
    to: Character,
    memory: Memory
  ): void {
    let relationship = from.relationships.get(to.id);
    
    if (!relationship) {
      relationship = this.createRelationship(to.id);
      from.relationships.set(to.id, relationship);
    }
    
    // 应用影响
    if (memory.impact.trust) {
      relationship.trust = clamp(
        relationship.trust + memory.impact.trust,
        0, 1
      );
    }
    
    if (memory.impact.friendship) {
      relationship.friendship = clamp(
        relationship.friendship + memory.impact.friendship,
        0, 1
      );
    }
    
    // 记录记忆
    relationship.memories.push(memory);
    relationship.recentInteractions.push(memory.description);
    
    // 只保留最近N条互动记录
    if (relationship.recentInteractions.length > 10) {
      relationship.recentInteractions.shift();
    }
    
    relationship.totalInteractions++;
    relationship.lastInteraction = gameTime.current;
    
    eventBus.emit('relationship_updated', { from, to, relationship });
  }
  
  // 从对话更新关系
  updateFromConversation(conversation: Conversation): void {
    const [id1, id2] = conversation.participants;
    const char1 = getCharacter(id1);
    const char2 = getCharacter(id2);
    
    // 正面对话增加友谊和信任
    const memory: Memory = {
      event: '对话',
      type: MemoryType.CONVERSATION,
      timestamp: conversation.startTime,
      impact: {
        friendship: 0.05,
        trust: 0.02
      },
      description: `与${char2.name}进行了愉快的对话`
    };
    
    this.updateRelationship(char1, char2, memory);
    
    // 双向更新
    const memory2 = {
      ...memory,
      description: `与${char1.name}进行了愉快的对话`
    };
    this.updateRelationship(char2, char1, memory2);
  }
  
  // 从狼人杀更新关系
  updateFromWerewolf(game: WerewolfGame): void {
    // 被杀的人对狼人产生敌对
    // 合作的好人阵营增加信任
    // 互相怀疑降低信任
    // ... 复杂的关系更新逻辑
  }
}
```

---

## 数据持久化

```typescript
interface SocialData {
  conversations: Conversation[];
  hallEvents: HallEvent[];
  relationships: Map<string, Map<string, Relationship>>;
  socialStats: SocialStatistics;
}

interface SocialStatistics {
  totalConversations: number;
  totalHallEvents: number;
  werewolfGamesPlayed: number;
  mostSocialCharacter: string;
  strongestFriendship: [string, string];
  biggestRivalry: [string, string];
}
```

---

## 事件系统

```typescript
enum SocialEvent {
  CONVERSATION_STARTED = 'conversation_started',
  CONVERSATION_ENDED = 'conversation_ended',
  HALL_EVENT_CREATED = 'hall_event_created',
  HALL_EVENT_STARTED = 'hall_event_started',
  HALL_EVENT_ENDED = 'hall_event_ended',
  RELATIONSHIP_UPDATED = 'relationship_updated',
  FRIENDSHIP_FORMED = 'friendship_formed',
  RIVALRY_FORMED = 'rivalry_formed'
}
```

---

## UI 需求

### 对话界面
- 对话气泡显示
- 参与者头像
- 对话历史

### 礼堂界面
- 活动列表
- 参与者列表
- 加入/退出按钮
- 活动进度

### 关系网络
- 关系图可视化
- 节点：角色
- 边：关系强度和类型
- 颜色：友好/敌对

---

## 测试用例

```typescript
describe('Social System', () => {
  test('应该能发起对话', () => {
    // 测试对话创建
  });
  
  test('对话应该更新关系', () => {
    // 测试关系更新
  });
  
  test('狼人杀应该正确分配角色', () => {
    // 测试角色分配
  });
  
  test('关系记忆应该正确保存', () => {
    // 测试记忆系统
  });
});
```

---

## 总结

社交系统为 Sonacatworld 提供了：

✅ **对话系统**: LLM驱动的自然对话  
✅ **礼堂活动**: 狼人杀、剧本杀等复杂博弈  
✅ **关系网络**: 持久的记忆和关系  
✅ **社交影响**: 关系影响后续互动  

通过社交系统，AI之间能够建立真实感的人际关系，形成动态的社会网络。
