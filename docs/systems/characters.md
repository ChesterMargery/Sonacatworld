# 人物系统设计文档

## 系统概述

人物系统是 AI 小镇的核心，每个角色都是一个独立的 AI 智能体，拥有属性、库存、人格、记忆和社交关系。

## 核心属性

### Character 类

```typescript
class Character {
  // ========== 基础信息 ==========
  id: string;
  name: string;
  age: number; // 初始 18-25，游戏 1 小时 = 1 岁
  gender: 'male' | 'female' | 'other';
  
  // ========== 生存属性 ==========
  hunger: number; // 0-100，每分钟 -0.5
  money: number; // 初始 100
  health: number; // 0-100 (可选，当前版本可能不使用)
  
  // ========== 状态 ==========
  location: Location;
  currentAction: Action | null;
  isAlive: boolean;
  
  // ========== 子系统 ==========
  inventory: Inventory;
  personality: Personality;
  memory: MemoryStore;
  relationships: Map<string, Relationship>;
  
  // ========== 方法 ==========
  
  constructor(name: string, config: CharacterConfig) {
    this.id = generateId();
    this.name = name;
    this.age = randomInt(18, 25);
    this.gender = config.gender;
    
    this.hunger = 100;
    this.money = 100;
    this.health = 100;
    
    this.location = Location.HOME;
    this.currentAction = null;
    this.isAlive = true;
    
    this.inventory = new Inventory();
    this.personality = new Personality(config.personalityTraits);
    this.memory = new MemoryStore();
    this.relationships = new Map();
  }
  
  update(deltaTime: number): void {
    // 更新饥饿值
    this.updateHunger(deltaTime);
    
    // 更新年龄（基于游戏时间）
    this.updateAge(deltaTime);
    
    // 检查生存状态
    this.checkSurvival();
  }
  
  private updateHunger(deltaTime: number): void {
    // 每分钟下降 0.5
    const hungerDecay = 0.5 * (deltaTime / 60000);
    this.hunger = Math.max(0, this.hunger - hungerDecay);
  }
  
  private updateAge(deltaTime: number): void {
    // 1 小时游戏时间 = 1 岁
    const ageIncrement = deltaTime / 3600000;
    this.age += ageIncrement;
  }
  
  private checkSurvival(): void {
    if (this.hunger <= 0) {
      this.isAlive = false;
      // 触发死亡事件
    }
  }
  
  eat(item: Item): EatResult {
    if (!item.hungerRestore) {
      return { success: false, message: '该物品不可食用' };
    }
    
    if (!this.inventory.has(item.type, 1)) {
      return { success: false, message: '库存中没有该物品' };
    }
    
    this.inventory.remove(item.type, 1);
    this.hunger = Math.min(100, this.hunger + item.hungerRestore);
    
    return {
      success: true,
      message: `吃了 ${item.name}，恢复了 ${item.hungerRestore} 点饥饿值`,
      hungerRestored: item.hungerRestore
    };
  }
  
  move(newLocation: Location): MoveResult {
    if (this.location === newLocation) {
      return { success: false, message: '已经在该位置' };
    }
    
    const oldLocation = this.location;
    this.location = newLocation;
    
    return {
      success: true,
      message: `从 ${oldLocation} 移动到 ${newLocation}`,
      from: oldLocation,
      to: newLocation
    };
  }
  
  getState(): CharacterState {
    return {
      id: this.id,
      name: this.name,
      age: Math.floor(this.age),
      hunger: this.hunger,
      money: this.money,
      location: this.location,
      isAlive: this.isAlive,
      inventorySize: this.inventory.getSize()
    };
  }
  
  getHealthStatus(): HealthStatus {
    if (this.hunger <= 20) return HealthStatus.STARVING;
    if (this.hunger <= 50) return HealthStatus.HUNGRY;
    if (this.hunger <= 80) return HealthStatus.SATISFIED;
    return HealthStatus.FULL;
  }
  
  getWealthStatus(): WealthStatus {
    if (this.money >= 500) return WealthStatus.RICH;
    if (this.money >= 200) return WealthStatus.COMFORTABLE;
    if (this.money >= 50) return WealthStatus.MODERATE;
    return WealthStatus.POOR;
  }
}

interface CharacterConfig {
  gender: 'male' | 'female' | 'other';
  personalityTraits?: PersonalityTraits;
}

interface EatResult {
  success: boolean;
  message: string;
  hungerRestored?: number;
}

interface MoveResult {
  success: boolean;
  message: string;
  from?: Location;
  to?: Location;
}

enum HealthStatus {
  FULL = 'full',
  SATISFIED = 'satisfied',
  HUNGRY = 'hungry',
  STARVING = 'starving'
}

enum WealthStatus {
  RICH = 'rich',
  COMFORTABLE = 'comfortable',
  MODERATE = 'moderate',
  POOR = 'poor'
}

enum Location {
  HOME = 'home',
  SHOP = 'shop',
  FARM = 'farm',
  FISHING_SPOT = 'fishing_spot',
  MINE = 'mine',
  HALL = 'hall',
  STREET = 'street'
}
```

### Inventory 类

```typescript
class Inventory {
  private items: Map<ItemType, number>;
  private maxSlots: number;

  constructor(maxSlots: number = 50) {
    this.items = new Map();
    this.maxSlots = maxSlots;
  }

  add(itemType: ItemType, quantity: number): boolean {
    const current = this.items.get(itemType) || 0;
    this.items.set(itemType, current + quantity);
    return true;
  }

  remove(itemType: ItemType, quantity: number): boolean {
    const current = this.items.get(itemType) || 0;
    
    if (current < quantity) {
      return false;
    }
    
    const remaining = current - quantity;
    if (remaining === 0) {
      this.items.delete(itemType);
    } else {
      this.items.set(itemType, remaining);
    }
    
    return true;
  }

  has(itemType: ItemType, quantity: number = 1): boolean {
    const current = this.items.get(itemType) || 0;
    return current >= quantity;
  }

  getQuantity(itemType: ItemType): number {
    return this.items.get(itemType) || 0;
  }

  getSize(): number {
    return this.items.size;
  }

  getAll(): Map<ItemType, number> {
    return new Map(this.items);
  }

  clear(): void {
    this.items.clear();
  }
}
```

### Personality 类

```typescript
class Personality {
  traits: PersonalityTraits;
  goals: Goal[];
  values: Map<string, number>;

  constructor(traits?: Partial<PersonalityTraits>) {
    this.traits = {
      greed: traits?.greed ?? random(0, 1),
      social: traits?.social ?? random(0, 1),
      hardworking: traits?.hardworking ?? random(0, 1),
      adventurous: traits?.adventurous ?? random(0, 1),
      cautious: traits?.cautious ?? random(0, 1),
      competitive: traits?.competitive ?? random(0, 1)
    };
    
    this.goals = this.generateGoals();
    this.values = new Map();
  }

  private generateGoals(): Goal[] {
    const goals: Goal[] = [];
    
    if (this.traits.greed > 0.6) {
      goals.push({
        type: GoalType.EARN_MONEY,
        target: 1000,
        priority: 0.9,
        description: '赚取 1000 金币'
      });
    }
    
    if (this.traits.social > 0.6) {
      goals.push({
        type: GoalType.MAKE_FRIENDS,
        target: 5,
        priority: 0.8,
        description: '结交 5 个朋友'
      });
    }
    
    // ... 更多目标生成逻辑
    
    return goals;
  }

  getPersonalityPrompt(): string {
    const traits = [];
    
    if (this.traits.greed > 0.7) traits.push('非常重视金钱');
    else if (this.traits.greed < 0.3) traits.push('不太在乎金钱');
    
    if (this.traits.social > 0.7) traits.push('外向且喜欢社交');
    else if (this.traits.social < 0.3) traits.push('内向且喜欢独处');
    
    if (this.traits.hardworking > 0.7) traits.push('勤劳肯干');
    else if (this.traits.hardworking < 0.3) traits.push('懒惰随性');
    
    return `你是一个${traits.join('、')}的人。`;
  }
}

interface PersonalityTraits {
  greed: number; // 0-1，对金钱的重视程度
  social: number; // 0-1，社交倾向
  hardworking: number; // 0-1，勤劳程度
  adventurous: number; // 0-1，冒险精神
  cautious: number; // 0-1，谨慎程度
  competitive: number; // 0-1，竞争性
}

interface Goal {
  type: GoalType;
  target: number;
  priority: number;
  description: string;
  progress?: number;
}

enum GoalType {
  EARN_MONEY = 'earn_money',
  MAKE_FRIENDS = 'make_friends',
  GATHER_RESOURCES = 'gather_resources',
  SOCIAL_STATUS = 'social_status',
  SURVIVAL = 'survival'
}
```

### Relationship 类

```typescript
class Relationship {
  targetId: string;
  trust: number; // -1 到 1
  affection: number; // -1 到 1
  interactions: number;
  lastInteraction: number;
  relationshipType: RelationshipType;
  memories: SharedMemory[];

  constructor(targetId: string) {
    this.targetId = targetId;
    this.trust = 0;
    this.affection = 0;
    this.interactions = 0;
    this.lastInteraction = 0;
    this.relationshipType = RelationshipType.STRANGER;
    this.memories = [];
  }

  update(event: SocialEvent): void {
    this.interactions++;
    this.lastInteraction = Date.now();
    
    // 根据事件类型更新信任和好感
    switch (event.type) {
      case SocialEventType.FRIENDLY_CHAT:
        this.trust += 0.05;
        this.affection += 0.05;
        break;
      case SocialEventType.BETRAYAL:
        this.trust -= 0.3;
        this.affection -= 0.2;
        break;
      case SocialEventType.COOPERATION:
        this.trust += 0.1;
        break;
      // ... 更多事件类型
    }
    
    // 限制范围
    this.trust = clamp(this.trust, -1, 1);
    this.affection = clamp(this.affection, -1, 1);
    
    // 更新关系类型
    this.updateRelationshipType();
    
    // 添加记忆
    this.memories.push({
      event: event.type,
      timestamp: Date.now(),
      impact: event.impact
    });
  }

  private updateRelationshipType(): void {
    if (this.trust > 0.7 && this.affection > 0.7) {
      this.relationshipType = RelationshipType.CLOSE_FRIEND;
    } else if (this.trust > 0.3 || this.affection > 0.3) {
      this.relationshipType = RelationshipType.FRIEND;
    } else if (this.trust < -0.3 || this.affection < -0.3) {
      this.relationshipType = RelationshipType.ENEMY;
    } else if (this.interactions > 5) {
      this.relationshipType = RelationshipType.ACQUAINTANCE;
    }
  }

  getStatus(): string {
    return `${this.relationshipType} (信任: ${this.trust.toFixed(2)}, 好感: ${this.affection.toFixed(2)})`;
  }
}

enum RelationshipType {
  STRANGER = 'stranger',
  ACQUAINTANCE = 'acquaintance',
  FRIEND = 'friend',
  CLOSE_FRIEND = 'close_friend',
  ENEMY = 'enemy'
}

interface SharedMemory {
  event: SocialEventType;
  timestamp: number;
  impact: number;
}

interface SocialEvent {
  type: SocialEventType;
  participants: string[];
  impact: number;
  description: string;
}

enum SocialEventType {
  FRIENDLY_CHAT = 'friendly_chat',
  COOPERATION = 'cooperation',
  BETRAYAL = 'betrayal',
  ARGUMENT = 'argument',
  GIFT_EXCHANGE = 'gift_exchange',
  WEREWOLF_GAME = 'werewolf_game'
}
```

## CharacterSystem 管理

```typescript
class CharacterSystem implements ISystem {
  private characters: Map<string, Character>;

  init(): void {
    this.characters = new Map();
  }

  update(deltaTime: number): void {
    for (const character of this.characters.values()) {
      if (character.isAlive) {
        character.update(deltaTime);
      }
    }
  }

  createCharacter(name: string, config: CharacterConfig): Character {
    const character = new Character(name, config);
    this.characters.set(character.id, character);
    return character;
  }

  getCharacter(id: string): Character | undefined {
    return this.characters.get(id);
  }

  getAllCharacters(): Character[] {
    return Array.from(this.characters.values());
  }

  getAliveCharacters(): Character[] {
    return this.getAllCharacters().filter(c => c.isAlive);
  }

  getCharactersAt(location: Location): Character[] {
    return this.getAllCharacters().filter(c => c.location === location);
  }

  removeCharacter(id: string): boolean {
    return this.characters.delete(id);
  }

  destroy(): void {
    this.characters.clear();
  }
}
```

## 扩展功能

### 1. 技能系统

```typescript
class Skill {
  name: string;
  level: number;
  experience: number;
  
  gainExperience(amount: number): void;
  getBonus(): number;
}

// 角色添加技能
character.skills = new Map<SkillType, Skill>();
```

### 2. 状态效果系统

```typescript
interface StatusEffect {
  type: EffectType;
  duration: number;
  intensity: number;
  
  apply(character: Character): void;
  remove(character: Character): void;
}

enum EffectType {
  POISONED,
  BLESSED,
  TIRED,
  ENERGIZED
}
```

### 3. 成就系统

```typescript
interface Achievement {
  id: string;
  name: string;
  description: string;
  condition: (character: Character) => boolean;
  reward: Reward;
}
```

## 测试用例

1. **属性更新测试**：验证饥饿值和年龄正确更新
2. **生存测试**：验证饥饿值为 0 时角色死亡
3. **库存测试**：验证物品添加、移除、查询
4. **关系测试**：验证社交事件正确更新关系

---

**最后更新**：2026-01-15
