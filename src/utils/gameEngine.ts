import type { Point } from './pathfinding';
import type { ErrorType } from './replayUtils';

/**
 * 商品信息
 */
export interface Product {
  /** 商品SKU唯一标识 */
  sku: string;
  /** 商品名称 */
  name: string;
  /** 商品分类 */
  category: string;
  /** 视觉标识颜色 */
  color: string;
  /** 视觉标识形状 */
  shape: string;
}

/**
 * 货位信息
 */
export interface Location {
  /** 货位ID */
  locationId: string;
  /** 所属货架ID */
  shelfId: string;
  /** 行号 */
  row: number;
  /** 列号 */
  col: number;
  /** 层级 */
  level: number;
  /** 地图网格坐标X */
  gridX: number;
  /** 地图网格坐标Y */
  gridY: number;
}

/**
 * 库存条目
 */
export interface StockItem {
  /** 库存ID */
  stockId: string;
  /** 商品SKU */
  sku: string;
  /** 所在货位ID */
  locationId: string;
  /** 库存数量 */
  quantity: number;
  /** 是否为临期品 */
  isNearExpiry: boolean;
  /** 过期日期（时间戳） */
  expiryDate?: number;
}

/**
 * 订单项
 */
export interface OrderItem {
  /** 订单项ID */
  itemId: string;
  /** 所属订单ID */
  orderId: string;
  /** 商品SKU */
  sku: string;
  /** 需求数量 */
  requiredQty: number;
  /** 已拣数量 */
  pickedQty: number;
  /** 是否已完成 */
  isPicked: boolean;
  /** 是否优先拣取临期品 */
  preferNearExpiry: boolean;
}

/**
 * 扫描判定结果
 */
export interface ScanResult {
  /** 是否扫描成功（在有效范围内） */
  success: boolean;
  /** 扫描到的货位ID（若在范围内） */
  locationId?: string;
  /** 玩家到目标货位的曼哈顿距离 */
  distance: number;
  /** 最大允许扫描距离 */
  maxDistance: number;
  /** 是否需要靠近 */
  needToMoveCloser: boolean;
}

/**
 * 商品正确性判定结果
 */
export interface PickValidationResult {
  /** 是否正确 */
  isValid: boolean;
  /** 错误类型（如有错误） */
  errorType?: ErrorType;
  /** 详细信息 */
  message: string;
  /** 是否涉及临期品 */
  involvesNearExpiry?: boolean;
  /** 是否正确优先拣取临期品 */
  nearExpiryCorrect?: boolean;
}

/**
 * 错拣分类结果
 */
export interface MisclassificationResult {
  /** 错误类型 */
  errorType: ErrorType;
  /** 错误描述 */
  description: string;
  /** 严重程度 (1-3, 3最严重) */
  severity: number;
}

/**
 * 补货干扰事件
 */
export interface RestockEvent {
  /** 事件ID */
  eventId: string;
  /** 触发时间（相对时间戳） */
  triggerTime: number;
  /** 锁定的货位ID列表 */
  lockedLocationIds: string[];
  /** 锁定持续时长（毫秒） */
  durationMs: number;
  /** 是否已通知玩家 */
  notified: boolean;
  /** 是否已解除锁定 */
  resolved: boolean;
}

/**
 * 扫描判定最大距离（曼哈顿距离）
 * 玩家必须在货位±1格范围内才能扫描
 */
export const SCAN_MAX_DISTANCE = 1;

/**
 * 补货干扰触发概率（每次操作的触发概率）
 */
export const RESTOCK_TRIGGER_PROBABILITY = 0.02;

/**
 * 补货干扰默认锁定时长（毫秒）
 */
export const RESTOCK_DEFAULT_DURATION_MS = 3000;

/**
 * 补货干扰每次锁定的货位数
 */
export const RESTOCK_LOCKED_LOCATIONS_COUNT = 2;

/**
 * 执行扫描判定
 * 判断玩家当前位置是否在目标货位的有效扫描范围内
 * 规则：玩家位置必须在货位±1格范围内（曼哈顿距离 <= SCAN_MAX_DISTANCE）
 *
 * @param playerPos - 玩家当前网格坐标
 * @param targetLocation - 目标货位信息（包含网格坐标）
 * @param maxDistance - 最大允许扫描距离（默认SCAN_MAX_DISTANCE）
 * @returns 扫描判定结果
 *
 * @example
 * ```ts
 * const result = validateScan(
 *   { x: 5, y: 3 },
 *   { locationId: 'A-01-03', gridX: 5, gridY: 4, ... }
 * );
 * ```
 */
export function validateScan(
  playerPos: Point,
  targetLocation: Pick<Location, 'locationId' | 'gridX' | 'gridY'>,
  maxDistance: number = SCAN_MAX_DISTANCE
): ScanResult {
  const distance =
    Math.abs(playerPos.x - targetLocation.gridX) +
    Math.abs(playerPos.y - targetLocation.gridY);

  const success = distance <= maxDistance;

  return {
    success,
    locationId: success ? targetLocation.locationId : undefined,
    distance,
    maxDistance,
    needToMoveCloser: !success,
  };
}

/**
 * 判定商品拣取是否正确
 * 对比SKU+数量+临期优先级进行综合判定
 *
 * @param orderItem - 订单中的目标项
 * @param pickedSku - 玩家实际拣取的商品SKU
 * @param pickedQty - 玩家实际拣取的数量
 * @param stockItem - 实际库存条目（含是否临期）
 * @param availableNearExpiryStock - 同SKU是否存在可拣的临期品库存
 * @returns 拣取验证结果
 */
export function validatePick(
  orderItem: OrderItem,
  pickedSku: string,
  pickedQty: number,
  stockItem: Pick<StockItem, 'sku' | 'isNearExpiry' | 'quantity'>,
  availableNearExpiryStock: boolean
): PickValidationResult {
  if (pickedSku !== orderItem.sku) {
    return {
      isValid: false,
      errorType: 'wrong_sku',
      message: `SKU不匹配：订单要求${orderItem.sku}，实际拣取${pickedSku}`,
      involvesNearExpiry: stockItem.isNearExpiry,
    };
  }

  const remainingQty = orderItem.requiredQty - orderItem.pickedQty;
  if (pickedQty <= 0 || pickedQty > remainingQty) {
    return {
      isValid: false,
      errorType: 'wrong_quantity',
      message: `数量错误：还需${remainingQty}件，实际拣取${pickedQty}件`,
    };
  }

  if (pickedQty > stockItem.quantity) {
    return {
      isValid: false,
      errorType: 'wrong_quantity',
      message: `库存不足：该货位仅剩${stockItem.quantity}件`,
    };
  }

  if (orderItem.preferNearExpiry && availableNearExpiryStock) {
    if (!stockItem.isNearExpiry) {
      return {
        isValid: false,
        errorType: 'wrong_sku',
        message: '应优先拣取临期品，已拣取普通品',
        involvesNearExpiry: true,
        nearExpiryCorrect: false,
      };
    }
    return {
      isValid: true,
      message: `正确拣取临期品：SKU=${pickedSku}，数量=${pickedQty}`,
      involvesNearExpiry: true,
      nearExpiryCorrect: true,
    };
  }

  return {
    isValid: true,
    message: `拣取正确：SKU=${pickedSku}，数量=${pickedQty}`,
    involvesNearExpiry: stockItem.isNearExpiry,
    nearExpiryCorrect: false,
  };
}

/**
 * 对错拣行为进行分类
 * 根据订单要求、玩家操作和库存上下文综合判定错误类型
 *
 * @param orderItem - 期望的订单项
 * @param actualSku - 实际拣取SKU
 * @param actualQty - 实际拣取数量
 * @param actualLocationId - 实际操作的货位ID
 * @param expectedLocationId - 期望的货位ID
 * @param expectedOrder - 期望的拣取顺序索引
 * @param actualOrder - 实际的拣取顺序索引
 * @returns 错拣分类结果
 */
export function classifyMispick(
  orderItem: OrderItem | null,
  actualSku: string | null,
  actualQty: number,
  actualLocationId: string | null,
  expectedLocationId: string | null,
  expectedOrder: number,
  actualOrder: number
): MisclassificationResult {
  if (!orderItem) {
    return {
      errorType: 'extra',
      description: `多拣商品：订单中无SKU=${actualSku}的需求`,
      severity: 2,
    };
  }

  if (expectedOrder !== actualOrder && actualOrder > expectedOrder) {
    return {
      errorType: 'wrong_order',
      description: '拣取顺序错误，应优先处理高优先级订单项',
      severity: 1,
    };
  }

  if (expectedLocationId && actualLocationId && actualLocationId !== expectedLocationId) {
    return {
      errorType: 'wrong_location',
      description: `货位错误：期望${expectedLocationId}，实际${actualLocationId}`,
      severity: 2,
    };
  }

  if (actualSku && actualSku !== orderItem.sku) {
    return {
      errorType: 'wrong_sku',
      description: `SKU错误：期望${orderItem.sku}，实际${actualSku}`,
      severity: 3,
    };
  }

  if (actualQty <= 0 || actualQty > orderItem.requiredQty - orderItem.pickedQty) {
    return {
      errorType: 'wrong_quantity',
      description: `数量错误：期望${orderItem.requiredQty - orderItem.pickedQty}件，实际${actualQty}件`,
      severity: 2,
    };
  }

  if (actualQty < orderItem.requiredQty - orderItem.pickedQty) {
    return {
      errorType: 'missed',
      description: `漏拣：还需拣取${orderItem.requiredQty - orderItem.pickedQty - actualQty}件`,
      severity: 3,
    };
  }

  return {
    errorType: 'wrong_sku',
    description: '未知拣取错误',
    severity: 2,
  };
}

/**
 * 生成补货干扰事件
 * 随机选择几个货位进行锁定，模拟仓库正在补货的场景
 *
 * @param allLocations - 所有可用货位列表
 * @param triggerTime - 触发时间（相对时间戳）
 * @param probabilityOverride - 覆盖默认触发概率（用于测试）
 * @returns 补货干扰事件（若触发），未触发则返回null
 */
export function generateRestockEvent(
  allLocations: Array<Pick<Location, 'locationId'>>,
  triggerTime: number,
  probabilityOverride?: number
): RestockEvent | null {
  const probability = probabilityOverride ?? RESTOCK_TRIGGER_PROBABILITY;

  if (Math.random() > probability) {
    return null;
  }

  if (allLocations.length === 0) {
    return null;
  }

  const lockCount = Math.min(RESTOCK_LOCKED_LOCATIONS_COUNT, allLocations.length);
  const shuffled = [...allLocations].sort(() => Math.random() - 0.5);
  const lockedIds = shuffled.slice(0, lockCount).map((loc) => loc.locationId);

  return {
    eventId: `restock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    triggerTime,
    lockedLocationIds: lockedIds,
    durationMs: RESTOCK_DEFAULT_DURATION_MS,
    notified: false,
    resolved: false,
  };
}

/**
 * 检查指定货位当前是否被补货锁定
 *
 * @param locationId - 待检查的货位ID
 * @param activeEvents - 当前活跃的补货事件列表
 * @param currentTime - 当前时间（相对时间戳）
 * @returns 是否被锁定
 */
export function isLocationLocked(
  locationId: string,
  activeEvents: RestockEvent[],
  currentTime: number
): boolean {
  return activeEvents.some((event) => {
    if (event.resolved) return false;
    const elapsed = currentTime - event.triggerTime;
    if (elapsed >= event.durationMs) return false;
    return event.lockedLocationIds.includes(locationId);
  });
}

/**
 * 检查并更新补货事件状态（解除过期锁定）
 *
 * @param events - 补货事件列表
 * @param currentTime - 当前时间（相对时间戳）
 * @returns 更新后的事件列表（过期事件标记为已解除）
 */
export function updateRestockEvents(
  events: RestockEvent[],
  currentTime: number
): RestockEvent[] {
  return events.map((event) => {
    if (event.resolved) return event;
    const elapsed = currentTime - event.triggerTime;
    if (elapsed >= event.durationMs) {
      return { ...event, resolved: true };
    }
    return event;
  });
}

/**
 * 检查订单中的漏拣项
 * 在关卡结束时检查是否有订单项未完成
 *
 * @param orderItems - 所有订单项列表
 * @returns 未完成（漏拣）的订单项列表
 */
export function findMissedItems(orderItems: OrderItem[]): OrderItem[] {
  return orderItems.filter((item) => !item.isPicked && item.pickedQty < item.requiredQty);
}

/**
 * 计算拣取准确率
 *
 * @param totalPicks - 总拣取操作次数
 * @param correctPicks - 正确拣取次数
 * @returns 准确率 (0-1)
 */
export function calculatePickAccuracy(
  totalPicks: number,
  correctPicks: number
): number {
  if (totalPicks <= 0) return 1;
  return Math.max(0, Math.min(1, correctPicks / totalPicks));
}
