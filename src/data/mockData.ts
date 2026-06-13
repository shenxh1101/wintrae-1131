export type Category = '日用品' | '电子产品' | '食品' | '服装'
export type Shape = 'circle' | 'square' | 'triangle' | 'diamond' | 'rectangle' | 'hexagon'

export interface Product {
  sku: string
  name: string
  category: Category
  color: string
  shape: Shape
  defaultQty: number
}

export interface Shelf {
  shelfId: string
  rowCount: number
  colCount: number
  levelCount: number
  posX: number
  posY: number
  width: number
  height: number
  areaCode: string
}

export interface Location {
  locationId: string
  shelfId: string
  row: number
  col: number
  level: number
  posX: number
  posY: number
}

export interface StockItem {
  stockId: string
  sku: string
  locationId: string
  quantity: number
  isNearExpiry: boolean
  expiryDate: string
}

export interface TutorialStep {
  stepId: number
  title: string
  description: string
  hint: string
  targetType: 'move' | 'scan' | 'pick' | 'place' | 'complete'
  targetLocationId?: string
  targetSku?: string
  targetQuantity?: number
}

export interface OrderItemConfig {
  sku: string
  requiredQty: number
}

export interface OrderLevelConfig {
  levelId: number
  name: string
  description: string
  skuCount: number
  orderItems: OrderItemConfig[]
  timeLimitSec: number
  baseScore: number
  requireNearExpiry?: boolean
}

export interface TimedLevelConfig {
  levelId: number
  name: string
  description: string
  timeLimitSec: number
  orderCount: number
  totalSkuCount: number
  baseScore: number
  eventProbability: number
  minOrderItems: number
  maxOrderItems: number
}

export const PRODUCTS: Product[] = [
  { sku: 'DAILY-001', name: '洗衣液 2L', category: '日用品', color: '#3B82F6', shape: 'rectangle', defaultQty: 20 },
  { sku: 'DAILY-002', name: '洗洁精 500ml', category: '日用品', color: '#10B981', shape: 'circle', defaultQty: 35 },
  { sku: 'DAILY-003', name: '牙膏 120g', category: '日用品', color: '#F59E0B', shape: 'rectangle', defaultQty: 50 },
  { sku: 'DAILY-004', name: '洗发水 400ml', category: '日用品', color: '#EF4444', shape: 'rectangle', defaultQty: 25 },
  { sku: 'DAILY-005', name: '肥皂 100g', category: '日用品', color: '#8B5CF6', shape: 'square', defaultQty: 60 },
  { sku: 'DAILY-006', name: '纸巾 3层10包', category: '日用品', color: '#EC4899', shape: 'square', defaultQty: 40 },
  { sku: 'DAILY-007', name: '垃圾袋 50只装', category: '日用品', color: '#06B6D4', shape: 'hexagon', defaultQty: 45 },
  { sku: 'DAILY-008', name: '保鲜膜 30m', category: '日用品', color: '#F97316', shape: 'circle', defaultQty: 30 },

  { sku: 'ELEC-001', name: '蓝牙耳机', category: '电子产品', color: '#1F2937', shape: 'circle', defaultQty: 15 },
  { sku: 'ELEC-002', name: '充电宝 20000mAh', category: '电子产品', color: '#6366F1', shape: 'rectangle', defaultQty: 18 },
  { sku: 'ELEC-003', name: 'USB数据线 1m', category: '电子产品', color: '#FFFFFF', shape: 'rectangle', defaultQty: 80 },
  { sku: 'ELEC-004', name: '无线充电器', category: '电子产品', color: '#E5E7EB', shape: 'circle', defaultQty: 22 },
  { sku: 'ELEC-005', name: '智能手表', category: '电子产品', color: '#111827', shape: 'square', defaultQty: 12 },
  { sku: 'ELEC-006', name: '便携音箱', category: '电子产品', color: '#374151', shape: 'hexagon', defaultQty: 16 },
  { sku: 'ELEC-007', name: '鼠标 无线', category: '电子产品', color: '#1E3A5F', shape: 'diamond', defaultQty: 28 },
  { sku: 'ELEC-008', name: '键盘 机械', category: '电子产品', color: '#4B5563', shape: 'rectangle', defaultQty: 10 },

  { sku: 'FOOD-001', name: '方便面 5连包', category: '食品', color: '#DC2626', shape: 'square', defaultQty: 55 },
  { sku: 'FOOD-002', name: '饼干 巧克力味', category: '食品', color: '#78350F', shape: 'circle', defaultQty: 42 },
  { sku: 'FOOD-003', name: '矿泉水 550mlx6', category: '食品', color: '#60A5FA', shape: 'hexagon', defaultQty: 70 },
  { sku: 'FOOD-004', name: '薯片 原味', category: '食品', color: '#FBBF24', shape: 'triangle', defaultQty: 38 },
  { sku: 'FOOD-005', name: '牛奶 250mlx12', category: '食品', color: '#FEF3C7', shape: 'rectangle', defaultQty: 32 },
  { sku: 'FOOD-006', name: '巧克力 100g', category: '食品', color: '#713F12', shape: 'rectangle', defaultQty: 48 },
  { sku: 'FOOD-007', name: '坚果混合装', category: '食品', color: '#A16207', shape: 'diamond', defaultQty: 25 },

  { sku: 'CLOTH-001', name: 'T恤 纯棉', category: '服装', color: '#FEFCE8', shape: 'square', defaultQty: 20 },
  { sku: 'CLOTH-002', name: '牛仔裤 直筒', category: '服装', color: '#1E40AF', shape: 'rectangle', defaultQty: 15 },
  { sku: 'CLOTH-003', name: '卫衣 连帽', category: '服装', color: '#7C2D12', shape: 'square', defaultQty: 18 },
  { sku: 'CLOTH-004', name: '运动袜 3双装', category: '服装', color: '#F87171', shape: 'triangle', defaultQty: 50 },
  { sku: 'CLOTH-005', name: '外套 防风', category: '服装', color: '#0F766E', shape: 'hexagon', defaultQty: 12 },
  { sku: 'CLOTH-006', name: '短裤 运动', category: '服装', color: '#15803D', shape: 'rectangle', defaultQty: 22 }
]

const GRID_WIDTH = 20
const GRID_HEIGHT = 15
const SHELF_ROWS = 6
const SHELF_LEVELS = 5
const SHELF_COLS = 8

export const SHELVES: Shelf[] = [
  {
    shelfId: 'SHELF-A',
    rowCount: 1,
    colCount: SHELF_COLS,
    levelCount: SHELF_LEVELS,
    posX: 2,
    posY: 2,
    width: 5,
    height: 2,
    areaCode: 'A区'
  },
  {
    shelfId: 'SHELF-B',
    rowCount: 1,
    colCount: SHELF_COLS,
    levelCount: SHELF_LEVELS,
    posX: 8,
    posY: 2,
    width: 5,
    height: 2,
    areaCode: 'A区'
  },
  {
    shelfId: 'SHELF-C',
    rowCount: 1,
    colCount: SHELF_COLS,
    levelCount: SHELF_LEVELS,
    posX: 14,
    posY: 2,
    width: 5,
    height: 2,
    areaCode: 'B区'
  },
  {
    shelfId: 'SHELF-D',
    rowCount: 1,
    colCount: SHELF_COLS,
    levelCount: SHELF_LEVELS,
    posX: 2,
    posY: 8,
    width: 5,
    height: 2,
    areaCode: 'C区'
  },
  {
    shelfId: 'SHELF-E',
    rowCount: 1,
    colCount: SHELF_COLS,
    levelCount: SHELF_LEVELS,
    posX: 8,
    posY: 8,
    width: 5,
    height: 2,
    areaCode: 'C区'
  },
  {
    shelfId: 'SHELF-F',
    rowCount: 1,
    colCount: SHELF_COLS,
    levelCount: SHELF_LEVELS,
    posX: 14,
    posY: 8,
    width: 5,
    height: 2,
    areaCode: 'D区'
  }
]

export const LOCATIONS: Location[] = (() => {
  const locations: Location[] = []
  SHELVES.forEach((shelf) => {
    for (let level = 1; level <= shelf.levelCount; level++) {
      for (let col = 1; col <= shelf.colCount; col++) {
        const colOffset = (col - 1) * (shelf.width / shelf.colCount)
        const levelOffset = (level - 1) * (shelf.height / shelf.levelCount)
        locations.push({
          locationId: `${shelf.shelfId}-L${level}-C${String(col).padStart(2, '0')}`,
          shelfId: shelf.shelfId,
          row: 1,
          col,
          level,
          posX: Number((shelf.posX + colOffset + 0.3).toFixed(1)),
          posY: Number((shelf.posY + levelOffset + 0.2).toFixed(1))
        })
      }
    }
  })
  return locations
})()

export const START_POSITION = { x: 10, y: 13 }
export const CHECKOUT_POSITION = { x: 18, y: 13 }
export const GRID_CONFIG = { width: GRID_WIDTH, height: GRID_HEIGHT }

function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

export const STOCK_ITEMS: StockItem[] = (() => {
  const random = seededRandom(42)
  const stocks: StockItem[] = []
  let stockIndex = 1

  LOCATIONS.forEach((location, locIdx) => {
    const productIndex = Math.floor(random() * PRODUCTS.length)
    const product = PRODUCTS[productIndex]
    const quantity = Math.floor(random() * 20) + 5
    
    const totalLocations = LOCATIONS.length
    const nearExpiryCount = Math.floor(totalLocations * 0.08)
    const nearExpiryThreshold = nearExpiryCount / totalLocations
    const isNearExpiry = random() < nearExpiryThreshold

    const today = new Date('2026-06-14')
    const expiryDate = new Date(today)
    if (isNearExpiry) {
      expiryDate.setDate(today.getDate() + Math.floor(random() * 7) + 1)
    } else {
      expiryDate.setDate(today.getDate() + Math.floor(random() * 180) + 30)
    }

    stocks.push({
      stockId: `STK-${String(stockIndex++).padStart(4, '0')}`,
      sku: product.sku,
      locationId: location.locationId,
      quantity,
      isNearExpiry,
      expiryDate: expiryDate.toISOString().split('T')[0]
    })
  })

  return stocks
})()

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    stepId: 1,
    title: '熟悉仓库布局',
    description: '欢迎来到拣货训练仓库！首先，让我们熟悉一下仓库布局。你现在位于仓库入口处（蓝色标记）。请移动到A区货架旁，靠近第一个货位。',
    hint: '使用 WASD 键或方向键移动角色，走到 A区货架 附近',
    targetType: 'move',
    targetLocationId: 'SHELF-A-L1-C01'
  },
  {
    stepId: 2,
    title: '认识货位编码',
    description: '很好！你已经到达第一个货位。每个货位都有唯一编码，格式为：货架编号-层数-列号。例如 SHELF-A-L1-C01 表示A货架1层第1列。请扫描这个货位。',
    hint: '站在货位附近时，按空格键或点击"扫描"按钮查看货位信息',
    targetType: 'scan',
    targetLocationId: 'SHELF-A-L1-C01'
  },
  {
    stepId: 3,
    title: '拣取商品',
    description: '货位信息已显示。现在让我们练习拣货。假设订单需要这个货位上的商品。请确认商品SKU和数量后，将商品放入周转箱。',
    hint: '确认SKU匹配后，按 P 键或点击"拣货"按钮放入周转箱，数量取1件',
    targetType: 'pick',
    targetLocationId: 'SHELF-A-L1-C01',
    targetQuantity: 1
  },
  {
    stepId: 4,
    title: '前往收银台',
    description: '做得好！商品已放入周转箱。拣货完成后，你需要前往收银台（右下角绿色标记）进行结算。请移动到收银台位置。',
    hint: '移动到右下角的绿色收银台区域完成订单',
    targetType: 'move',
    targetLocationId: undefined
  },
  {
    stepId: 5,
    title: '完成结算',
    description: '你已到达收银台！现在确认订单中的所有商品都已拣取正确，然后提交结算完成整个拣货流程。恭喜你完成教学关！',
    hint: '点击"结算"按钮提交订单，完成训练',
    targetType: 'complete'
  }
]

function getRandomProducts(count: number, seed: number, requireNearExpiry: boolean = false): OrderItemConfig[] {
  const random = seededRandom(seed)
  const items: OrderItemConfig[] = []
  const usedSkus = new Set<string>()

  let nearExpirySkus: string[] = []
  if (requireNearExpiry) {
    nearExpirySkus = STOCK_ITEMS.filter(s => s.isNearExpiry).map(s => s.sku)
  }

  for (let i = 0; i < count; i++) {
    let product: Product
    if (requireNearExpiry && i === 0 && nearExpirySkus.length > 0) {
      const sku = nearExpirySkus[Math.floor(random() * nearExpirySkus.length)]
      product = PRODUCTS.find(p => p.sku === sku)!
    } else {
      do {
        product = PRODUCTS[Math.floor(random() * PRODUCTS.length)]
      } while (usedSkus.has(product.sku) && usedSkus.size < PRODUCTS.length)
    }
    usedSkus.add(product.sku)
    items.push({
      sku: product.sku,
      requiredQty: Math.floor(random() * 3) + 1
    })
  }
  return items
}

export const ORDER_LEVELS: OrderLevelConfig[] = [
  {
    levelId: 1,
    name: '新手入门',
    description: '拣选3种简单商品，熟悉基础操作流程',
    skuCount: 3,
    orderItems: getRandomProducts(3, 101),
    timeLimitSec: 300,
    baseScore: 200
  },
  {
    levelId: 2,
    name: '初级拣货',
    description: '拣选5种商品，练习货位查找效率',
    skuCount: 5,
    orderItems: getRandomProducts(5, 102),
    timeLimitSec: 360,
    baseScore: 250
  },
  {
    levelId: 3,
    name: '进阶训练',
    description: '拣选7种商品，注意不同货架区域',
    skuCount: 7,
    orderItems: getRandomProducts(7, 103),
    timeLimitSec: 420,
    baseScore: 300
  },
  {
    levelId: 4,
    name: '临期识别',
    description: '必须优先拣选临期商品（红色标识）',
    skuCount: 8,
    orderItems: getRandomProducts(8, 104, true),
    timeLimitSec: 480,
    baseScore: 350,
    requireNearExpiry: true
  },
  {
    levelId: 5,
    name: '多货架挑战',
    description: '跨越4个不同区域拣选10种商品',
    skuCount: 10,
    orderItems: getRandomProducts(10, 105),
    timeLimitSec: 540,
    baseScore: 400
  },
  {
    levelId: 6,
    name: '效率提升',
    description: '12种商品，优化路径减少往返',
    skuCount: 12,
    orderItems: getRandomProducts(12, 106),
    timeLimitSec: 600,
    baseScore: 450
  },
  {
    levelId: 7,
    name: '专业拣货',
    description: '15种商品混合，含临期品优先级处理',
    skuCount: 15,
    orderItems: getRandomProducts(15, 107, true),
    timeLimitSec: 660,
    baseScore: 500,
    requireNearExpiry: true
  },
  {
    levelId: 8,
    name: '高难度挑战',
    description: '18种商品，严格时间限制',
    skuCount: 18,
    orderItems: getRandomProducts(18, 108),
    timeLimitSec: 720,
    baseScore: 550
  },
  {
    levelId: 9,
    name: '专家模式',
    description: '22种商品，全仓库覆盖',
    skuCount: 22,
    orderItems: getRandomProducts(22, 109),
    timeLimitSec: 780,
    baseScore: 600
  },
  {
    levelId: 10,
    name: '终极考验',
    description: '25种商品极限挑战，含多临期品',
    skuCount: 25,
    orderItems: getRandomProducts(25, 110, true),
    timeLimitSec: 840,
    baseScore: 700,
    requireNearExpiry: true
  }
]

export const TIMED_LEVELS: TimedLevelConfig[] = [
  {
    levelId: 1,
    name: '热身限时',
    description: '3分钟内完成2个订单，适应时间压力',
    timeLimitSec: 180,
    orderCount: 2,
    totalSkuCount: 6,
    baseScore: 300,
    eventProbability: 0,
    minOrderItems: 2,
    maxOrderItems: 4
  },
  {
    levelId: 2,
    name: '进阶限时',
    description: '5分钟内完成3个订单，开始出现补货事件',
    timeLimitSec: 300,
    orderCount: 3,
    totalSkuCount: 12,
    baseScore: 450,
    eventProbability: 0.1,
    minOrderItems: 3,
    maxOrderItems: 5
  },
  {
    levelId: 3,
    name: '标准限时',
    description: '7分钟内完成4个订单，合理规划拣货顺序',
    timeLimitSec: 420,
    orderCount: 4,
    totalSkuCount: 18,
    baseScore: 550,
    eventProbability: 0.15,
    minOrderItems: 3,
    maxOrderItems: 6
  },
  {
    levelId: 4,
    name: '高压限时',
    description: '8分钟内完成5个订单，高频补货事件',
    timeLimitSec: 480,
    orderCount: 5,
    totalSkuCount: 25,
    baseScore: 650,
    eventProbability: 0.2,
    minOrderItems: 4,
    maxOrderItems: 7
  },
  {
    levelId: 5,
    name: '专业限时',
    description: '10分钟内完成6个订单，超高强度训练',
    timeLimitSec: 600,
    orderCount: 6,
    totalSkuCount: 32,
    baseScore: 750,
    eventProbability: 0.25,
    minOrderItems: 4,
    maxOrderItems: 8
  },
  {
    levelId: 6,
    name: '极限限时',
    description: '12分钟内完成8个订单，挑战生理极限',
    timeLimitSec: 720,
    orderCount: 8,
    totalSkuCount: 42,
    baseScore: 900,
    eventProbability: 0.3,
    minOrderItems: 4,
    maxOrderItems: 9
  }
]

export const GAME_CONFIG = {
  moveSpeedMs: 200,
  scanDistance: 1.5,
  scanAnimationMs: 800,
  pickAnimationMs: 500,
  baseCompleteScore: 200,
  maxTimeBonus: 200,
  maxAccuracyScore: 300,
  maxPathScore: 200,
  nearExpiryBonus: 20,
  wrongPickPenalty: 30,
  missPickPenalty: 50,
  eventHandleBonus: 15,
  eventLockDurationMs: 3000
}

export function getProductBySku(sku: string): Product | undefined {
  return PRODUCTS.find(p => p.sku === sku)
}

export function getLocationById(locationId: string): Location | undefined {
  return LOCATIONS.find(l => l.locationId === locationId)
}

export function getShelfById(shelfId: string): Shelf | undefined {
  return SHELVES.find(s => s.shelfId === shelfId)
}

export function getStockByLocation(locationId: string): StockItem | undefined {
  return STOCK_ITEMS.find(s => s.locationId === locationId)
}

export function getStockBySku(sku: string): StockItem[] {
  return STOCK_ITEMS.filter(s => s.sku === sku)
}

export function getNearExpiryStockBySku(sku: string): StockItem[] {
  return STOCK_ITEMS.filter(s => s.sku === sku && s.isNearExpiry)
}
