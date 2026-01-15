/**
 * 杂货铺类 - 处理所有商品交易
 */

export enum ItemType {
  // 作物
  CROP_WHEAT = 'crop_wheat',
  CROP_RICE = 'crop_rice',
  CROP_CARROT = 'crop_carrot',
  CROP_BEET = 'crop_beet',
  
  // 种子
  SEED_WHEAT = 'seed_wheat',
  SEED_RICE = 'seed_rice',
  SEED_CARROT = 'seed_carrot',
  SEED_BEET = 'seed_beet',
  
  // 鱼类
  FISH_COMMON = 'fish_common',
  FISH_RARE = 'fish_rare',
  FISH_SILVER = 'fish_silver',
  FISH_GOLDEN = 'fish_golden',
  FISH_LEGENDARY = 'fish_legendary',
  
  // 矿物
  MINERAL_COPPER = 'mineral_copper',
  MINERAL_IRON = 'mineral_iron',
  MINERAL_SILVER = 'mineral_silver',
  MINERAL_GOLD = 'mineral_gold',
}

interface TransactionResult {
  success: boolean;
  message: string;
  amount?: number;
}

export class Shop {
  private buyPrices: Map<ItemType, number>;
  private sellPrices: Map<ItemType, number>;
  private inventory: Map<ItemType, number>;

  constructor() {
    this.buyPrices = new Map();
    this.sellPrices = new Map();
    this.inventory = new Map();

    this.initializePrices();
  }

  /**
   * 初始化价格表
   */
  private initializePrices(): void {
    // 种子价格（角色购买）
    this.buyPrices.set(ItemType.SEED_WHEAT, 5);
    this.buyPrices.set(ItemType.SEED_RICE, 8);
    this.buyPrices.set(ItemType.SEED_CARROT, 3);
    this.buyPrices.set(ItemType.SEED_BEET, 6);

    // 作物收购价格（角色出售）
    this.sellPrices.set(ItemType.CROP_WHEAT, 15);
    this.sellPrices.set(ItemType.CROP_RICE, 25);
    this.sellPrices.set(ItemType.CROP_CARROT, 10);
    this.sellPrices.set(ItemType.CROP_BEET, 20);

    // 鱼类收购价格
    this.sellPrices.set(ItemType.FISH_COMMON, 8);
    this.sellPrices.set(ItemType.FISH_RARE, 20);
    this.sellPrices.set(ItemType.FISH_SILVER, 40);
    this.sellPrices.set(ItemType.FISH_GOLDEN, 80);
    this.sellPrices.set(ItemType.FISH_LEGENDARY, 200);

    // 矿物收购价格
    this.sellPrices.set(ItemType.MINERAL_COPPER, 15);
    this.sellPrices.set(ItemType.MINERAL_IRON, 30);
    this.sellPrices.set(ItemType.MINERAL_SILVER, 60);
    this.sellPrices.set(ItemType.MINERAL_GOLD, 150);
  }

  /**
   * 角色从商店购买物品
   */
  buy(itemType: ItemType, quantity: number, characterMoney: number): TransactionResult {
    const price = this.buyPrices.get(itemType);
    
    if (!price) {
      return {
        success: false,
        message: '该物品不可购买',
      };
    }

    const totalCost = price * quantity;
    
    if (characterMoney < totalCost) {
      return {
        success: false,
        message: `金钱不足。需要 ${totalCost} 金币，但只有 ${characterMoney} 金币`,
      };
    }

    return {
      success: true,
      message: `成功购买 ${quantity} 个物品`,
      amount: totalCost,
    };
  }

  /**
   * 角色向商店出售物品
   */
  sell(itemType: ItemType, quantity: number): TransactionResult {
    const price = this.sellPrices.get(itemType);
    
    if (!price) {
      return {
        success: false,
        message: '该物品不可出售',
      };
    }

    const totalEarning = price * quantity;

    // 更新商店库存（可选）
    const currentStock = this.inventory.get(itemType) || 0;
    this.inventory.set(itemType, currentStock + quantity);

    return {
      success: true,
      message: `成功出售 ${quantity} 个物品`,
      amount: totalEarning,
    };
  }

  /**
   * 获取物品的购买价格
   */
  getBuyPrice(itemType: ItemType): number | null {
    return this.buyPrices.get(itemType) || null;
  }

  /**
   * 获取物品的出售价格
   */
  getSellPrice(itemType: ItemType): number | null {
    return this.sellPrices.get(itemType) || null;
  }

  /**
   * 获取商店库存
   */
  getInventory(): Map<ItemType, number> {
    return new Map(this.inventory);
  }
}
