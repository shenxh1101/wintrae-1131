/**
 * 操作动作类型
 */
export type ActionType =
  /** 玩家移动 */
  | 'move'
  /** 扫描货位/商品 */
  | 'scan'
  /** 拣取商品 */
  | 'pick'
  /** 放入周转箱 */
  | 'place'
  /** 操作错误 */
  | 'error'
  /** 补货干扰事件 */
  | 'restock'
  /** 关卡开始 */
  | 'start'
  /** 关卡结束 */
  | 'end';

/**
 * 错拣类型
 */
export type ErrorType =
  /** 货位错误 */
  | 'wrong_location'
  /** SKU(商品)错误 */
  | 'wrong_sku'
  /** 数量错误 */
  | 'wrong_quantity'
  /** 顺序错误 */
  | 'wrong_order'
  /** 漏拣 */
  | 'missed'
  /** 多拣 */
  | 'extra';

/**
 * 单条操作日志记录
 */
export interface OperationLog {
  /** 日志唯一ID */
  logId: string;
  /** 所属会话ID */
  sessionId: string;
  /** 相对时间戳（毫秒，从关卡开始计时） */
  timestamp: number;
  /** 动作类型 */
  action: ActionType;
  /** 动作携带的附加数据（坐标/SKU/货位等） */
  payload: ActionPayload;
  /** 操作是否正确 */
  isCorrect: boolean;
  /** 若错误，错误类型 */
  errorType?: ErrorType;
  /** 错误描述信息 */
  errorMessage?: string;
}

/**
 * 动作负载数据结构
 */
export interface ActionPayload {
  /** 玩家位置X坐标 */
  playerX?: number;
  /** 玩家位置Y坐标 */
  playerY?: number;
  /** 目标位置X坐标（移动时） */
  targetX?: number;
  /** 目标位置Y坐标（移动时） */
  targetY?: number;
  /** 货位ID（扫描/拣取时） */
  locationId?: string;
  /** 商品SKU */
  sku?: string;
  /** 商品名称 */
  productName?: string;
  /** 操作数量 */
  quantity?: number;
  /** 所需数量（订单要求） */
  requiredQuantity?: number;
  /** 是否为临期品 */
  isNearExpiry?: boolean;
  /** 订单ID */
  orderId?: string;
  /** 补货干扰锁定的货位ID列表 */
  lockedLocations?: string[];
}

/**
 * 关键帧类型
 */
export type KeyframeType =
  /** 操作错误 */
  | 'error'
  /** 成功拣取 */
  | 'pick_success'
  /** 临期品正确拣取 */
  | 'near_expiry_pick'
  /** 补货干扰 */
  | 'restock_event'
  /** 开始/结束 */
  | 'milestone';

/**
 * 回放关键帧
 */
export interface Keyframe {
  /** 关键帧ID */
  keyframeId: string;
  /** 关联的操作日志索引 */
  logIndex: number;
  /** 关键帧类型 */
  type: KeyframeType;
  /** 关键帧时间戳 */
  timestamp: number;
  /** 关键帧标题 */
  title: string;
  /** 关键帧描述 */
  description?: string;
}

/**
 * 错误节点信息
 */
export interface ErrorNode {
  /** 关联的操作日志 */
  log: OperationLog;
  /** 错误类型 */
  errorType: ErrorType;
  /** 错误发生位置 */
  position: { x: number; y: number };
  /** 期望的正确值描述 */
  expected: string;
  /** 玩家实际操作描述 */
  actual: string;
  /** 建议/提示 */
  suggestion: string;
}

/**
 * 回放会话数据
 */
export interface ReplaySession {
  /** 会话ID */
  sessionId: string;
  /** 玩家昵称 */
  playerName: string;
  /** 关卡类型 */
  levelType: 'tutorial' | 'order' | 'timed';
  /** 关卡ID */
  levelId: number;
  /** 开始时间戳（绝对时间） */
  startTime: number;
  /** 结束时间戳（绝对时间） */
  endTime: number;
  /** 总时长（毫秒） */
  durationMs: number;
  /** 操作日志列表 */
  operations: OperationLog[];
  /** 关键帧列表 */
  keyframes: Keyframe[];
  /** 错误节点列表 */
  errorNodes: ErrorNode[];
}

/**
 * 回放控制状态
 */
export interface ReplayControlState {
  /** 是否正在播放 */
  isPlaying: boolean;
  /** 当前时间位置（毫秒） */
  currentTime: number;
  /** 播放速度倍率 (0.5 / 1 / 2) */
  playbackSpeed: 0.5 | 1 | 2;
  /** 当前操作日志索引 */
  currentLogIndex: number;
  /** 总时长（毫秒） */
  totalDuration: number;
}

/**
 * 生成唯一ID（简化版UUID）
 *
 * @returns 唯一字符串ID
 */
function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * 创建操作日志记录
 *
 * @param sessionId - 会话ID
 * @param timestamp - 相对时间戳（毫秒）
 * @param action - 动作类型
 * @param payload - 动作负载
 * @param isCorrect - 是否正确
 * @param errorType - 错误类型（可选）
 * @param errorMessage - 错误描述（可选）
 * @returns 操作日志对象
 */
export function createOperationLog(
  sessionId: string,
  timestamp: number,
  action: ActionType,
  payload: ActionPayload,
  isCorrect: boolean,
  errorType?: ErrorType,
  errorMessage?: string
): OperationLog {
  return {
    logId: generateId(),
    sessionId,
    timestamp,
    action,
    payload,
    isCorrect,
    errorType,
    errorMessage,
  };
}

/**
 * 将操作日志序列化为JSON字符串（用于本地存储）
 *
 * @param operations - 操作日志数组
 * @returns JSON字符串
 */
export function serializeOperations(operations: OperationLog[]): string {
  return JSON.stringify(operations, (key, value) => {
    return value;
  });
}

/**
 * 从JSON字符串反序列化为操作日志数组
 *
 * @param jsonString - 序列化后的JSON字符串
 * @returns 操作日志数组
 */
export function deserializeOperations(jsonString: string): OperationLog[] {
  try {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) return [];
    return parsed as OperationLog[];
  } catch {
    return [];
  }
}

/**
 * 从操作日志中提取关键帧
 * 关键帧包括：错误、成功拣取、临期品处理、补货事件、开始/结束等
 *
 * @param operations - 操作日志数组
 * @returns 关键帧数组
 */
export function extractKeyframes(operations: OperationLog[]): Keyframe[] {
  const keyframes: Keyframe[] = [];

  operations.forEach((log, index) => {
    switch (log.action) {
      case 'start':
        keyframes.push({
          keyframeId: generateId(),
          logIndex: index,
          type: 'milestone',
          timestamp: log.timestamp,
          title: '关卡开始',
          description: '玩家进入游戏场景',
        });
        break;

      case 'end':
        keyframes.push({
          keyframeId: generateId(),
          logIndex: index,
          type: 'milestone',
          timestamp: log.timestamp,
          title: '关卡结束',
          description: '玩家完成/退出关卡',
        });
        break;

      case 'pick':
        if (log.isCorrect) {
          if (log.payload.isNearExpiry) {
            keyframes.push({
              keyframeId: generateId(),
              logIndex: index,
              type: 'near_expiry_pick',
              timestamp: log.timestamp,
              title: '临期品正确拣取',
              description: `拣取SKU: ${log.payload.sku}, 货位: ${log.payload.locationId}`,
            });
          } else {
            keyframes.push({
              keyframeId: generateId(),
              logIndex: index,
              type: 'pick_success',
              timestamp: log.timestamp,
              title: '成功拣取商品',
              description: `SKU: ${log.payload.sku}, 数量: ${log.payload.quantity}`,
            });
          }
        }
        break;

      case 'error':
        keyframes.push({
          keyframeId: generateId(),
          logIndex: index,
          type: 'error',
          timestamp: log.timestamp,
          title: log.errorType ? formatErrorType(log.errorType) : '操作错误',
          description: log.errorMessage,
        });
        break;

      case 'restock':
        keyframes.push({
          keyframeId: generateId(),
          logIndex: index,
          type: 'restock_event',
          timestamp: log.timestamp,
          title: '补货干扰事件',
          description: `锁定货位数: ${log.payload.lockedLocations?.length ?? 0}`,
        });
        break;
    }
  });

  return keyframes;
}

/**
 * 识别所有错误节点并生成详细分析
 *
 * @param operations - 操作日志数组
 * @returns 错误节点数组，包含错误分析和建议
 */
export function identifyErrorNodes(operations: OperationLog[]): ErrorNode[] {
  const errorNodes: ErrorNode[] = [];

  operations.forEach((log) => {
    if (log.action === 'error' || (!log.isCorrect && log.errorType)) {
      const errorType = log.errorType ?? 'wrong_sku';
      const position = {
        x: log.payload.playerX ?? 0,
        y: log.payload.playerY ?? 0,
      };

      let expected = '';
      let actual = '';
      let suggestion = '';

      switch (errorType) {
        case 'wrong_location':
          expected = `货位: ${log.payload.locationId ?? '未知'}`;
          actual = '扫描了错误的货位';
          suggestion = '请仔细核对订单中的货位编码后再扫描';
          break;
        case 'wrong_sku':
          expected = `SKU: ${log.payload.sku ?? '未知'}`;
          actual = '拣取了错误的商品';
          suggestion = '请确认商品标签上的SKU编码与订单一致';
          break;
        case 'wrong_quantity':
          expected = `数量: ${log.payload.requiredQuantity ?? 0}`;
          actual = `数量: ${log.payload.quantity ?? 0}`;
          suggestion = '请按照订单要求的数量拣取，不要多拣或少拣';
          break;
        case 'wrong_order':
          expected = '按订单优先级顺序拣取';
          actual = '拣取顺序有误';
          suggestion = '优先处理高优先级订单，相同区域的订单可合并拣取';
          break;
        case 'missed':
          expected = `拣取SKU: ${log.payload.sku ?? '未知'}`;
          actual = '漏拣该商品';
          suggestion = '完成拣货后请逐项核对订单清单，确认无遗漏';
          break;
        case 'extra':
          expected = '订单中无此商品';
          actual = `多拣了SKU: ${log.payload.sku ?? '未知'}`;
          suggestion = '只拣取订单清单中列出的商品';
          break;
      }

      errorNodes.push({
        log,
        errorType,
        position,
        expected,
        actual,
        suggestion,
      });
    }
  });

  return errorNodes;
}

/**
 * 格式化错误类型为中文描述
 *
 * @param errorType - 错误类型枚举
 * @returns 中文错误描述
 */
export function formatErrorType(errorType: ErrorType): string {
  const map: Record<ErrorType, string> = {
    wrong_location: '货位错误',
    wrong_sku: 'SKU错误',
    wrong_quantity: '数量错误',
    wrong_order: '顺序错误',
    missed: '漏拣商品',
    extra: '多拣商品',
  };
  return map[errorType] ?? '未知错误';
}

/**
 * 根据当前播放时间查找对应的操作日志索引
 *
 * @param operations - 操作日志数组
 * @param currentTimeMs - 当前播放时间（毫秒）
 * @returns 对应的日志索引
 */
export function findLogIndexByTime(
  operations: OperationLog[],
  currentTimeMs: number
): number {
  if (operations.length === 0) return -1;
  if (currentTimeMs <= operations[0].timestamp) return 0;
  if (currentTimeMs >= operations[operations.length - 1].timestamp) {
    return operations.length - 1;
  }

  let left = 0;
  let right = operations.length - 1;
  while (left < right - 1) {
    const mid = Math.floor((left + right) / 2);
    if (operations[mid].timestamp <= currentTimeMs) {
      left = mid;
    } else {
      right = mid;
    }
  }
  return left;
}

/**
 * 获取指定时间范围内的操作日志
 *
 * @param operations - 操作日志数组
 * @param startTimeMs - 起始时间（毫秒）
 * @param endTimeMs - 结束时间（毫秒）
 * @returns 时间范围内的日志数组
 */
export function getOperationsInTimeRange(
  operations: OperationLog[],
  startTimeMs: number,
  endTimeMs: number
): OperationLog[] {
  return operations.filter(
    (log) => log.timestamp >= startTimeMs && log.timestamp <= endTimeMs
  );
}

/**
 * 统计各类错误的数量
 *
 * @param errorNodes - 错误节点数组
 * @returns 按错误类型统计的对象
 */
export function countErrorsByType(
  errorNodes: ErrorNode[]
): Record<ErrorType, number> {
  const counts: Record<ErrorType, number> = {
    wrong_location: 0,
    wrong_sku: 0,
    wrong_quantity: 0,
    wrong_order: 0,
    missed: 0,
    extra: 0,
  };

  errorNodes.forEach((node) => {
    counts[node.errorType] = (counts[node.errorType] ?? 0) + 1;
  });

  return counts;
}

/**
 * 从玩家移动操作中提取路径轨迹坐标
 *
 * @param operations - 操作日志数组
 * @returns 路径坐标点数组（按时间顺序）
 */
export function extractPlayerPath(
  operations: OperationLog[]
): Array<{ x: number; y: number; timestamp: number }> {
  const path: Array<{ x: number; y: number; timestamp: number }> = [];

  operations.forEach((log) => {
    if (log.action === 'move' && log.payload.targetX !== undefined && log.payload.targetY !== undefined) {
      path.push({
        x: log.payload.targetX,
        y: log.payload.targetY,
        timestamp: log.timestamp,
      });
    }
  });

  return path;
}
