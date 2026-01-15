/**
 * 角色类 - AI 小镇的核心智能体
 */

export enum Location {
  HOME = 'home',
  SHOP = 'shop',
  FARM = 'farm',
  FISHING_SPOT = 'fishing_spot',
  MINE = 'mine',
  HALL = 'hall',
  STREET = 'street',
}

interface CharacterConfig {
  name: string;
  gender?: 'male' | 'female' | 'other';
  initialMoney?: number;
  initialHunger?: number;
}

export class Character {
  // 基础信息
  id: string;
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';

  // 生存属性
  hunger: number; // 0-100
  money: number;

  // 状态
  location: Location;
  isAlive: boolean;

  // 库存（简化版）
  inventory: Map<string, number>;

  constructor(config: CharacterConfig) {
    this.id = this.generateId();
    this.name = config.name;
    this.age = this.randomAge();
    this.gender = config.gender || 'other';

    this.hunger = config.initialHunger ?? 100;
    this.money = config.initialMoney ?? 100;

    this.location = Location.HOME;
    this.isAlive = true;

    this.inventory = new Map();

    console.log(`角色创建: ${this.name} (ID: ${this.id})`);
  }

  /**
   * 更新角色状态
   */
  update(deltaTime: number): void {
    if (!this.isAlive) return;

    // 更新饥饿值（每分钟下降 0.5）
    const hungerDecay = 0.5 * (deltaTime / 60000);
    this.hunger = Math.max(0, this.hunger - hungerDecay);

    // 更新年龄（1小时游戏时间 = 1岁）
    const ageIncrement = deltaTime / 3600000;
    this.age += ageIncrement;

    // 检查生存状态
    if (this.hunger <= 0) {
      this.die('饥饿');
    }
  }

  /**
   * 移动到新位置
   */
  moveTo(newLocation: Location): void {
    if (this.location === newLocation) {
      console.log(`${this.name} 已经在 ${newLocation}`);
      return;
    }

    console.log(`${this.name} 从 ${this.location} 移动到 ${newLocation}`);
    this.location = newLocation;
  }

  /**
   * 吃东西恢复饥饿值
   */
  eat(hungerRestore: number): void {
    this.hunger = Math.min(100, this.hunger + hungerRestore);
    console.log(`${this.name} 进食，恢复了 ${hungerRestore} 点饥饿值`);
  }

  /**
   * 获得金钱
   */
  earnMoney(amount: number): void {
    this.money += amount;
    console.log(`${this.name} 获得 ${amount} 金币`);
  }

  /**
   * 花费金钱
   */
  spendMoney(amount: number): boolean {
    if (this.money < amount) {
      console.log(`${this.name} 金钱不足`);
      return false;
    }

    this.money -= amount;
    console.log(`${this.name} 花费 ${amount} 金币`);
    return true;
  }

  /**
   * 添加物品到库存
   */
  addItem(itemType: string, quantity: number): void {
    const current = this.inventory.get(itemType) || 0;
    this.inventory.set(itemType, current + quantity);
  }

  /**
   * 从库存移除物品
   */
  removeItem(itemType: string, quantity: number): boolean {
    const current = this.inventory.get(itemType) || 0;
    
    if (current < quantity) {
      return false;
    }

    const remaining = current - quantity;
    if (remaining === 0) {
      this.inventory.delete(itemType);
    } else {
      this.inventory.set(itemType, remaining);
    }

    return true;
  }

  /**
   * 检查是否拥有物品
   */
  hasItem(itemType: string, quantity: number = 1): boolean {
    const current = this.inventory.get(itemType) || 0;
    return current >= quantity;
  }

  /**
   * 角色死亡
   */
  private die(cause: string): void {
    this.isAlive = false;
    console.log(`💀 ${this.name} 因${cause}而死亡`);
  }

  /**
   * 获取角色状态信息
   */
  getStatus(): string {
    return `${this.name} - 年龄: ${Math.floor(this.age)}, 饥饿: ${this.hunger.toFixed(1)}, 金钱: ${this.money}, 位置: ${this.location}`;
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `char_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 随机初始年龄（18-25岁）
   */
  private randomAge(): number {
    return 18 + Math.random() * 7;
  }
}
