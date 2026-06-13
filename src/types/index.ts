export type LevelType = 'tutorial' | 'order' | 'timed';

export type OrderType = 'normal' | 'urgent' | 'batch';

export type ActionType = 'move' | 'scan' | 'pick' | 'place' | 'error';

export type ErrorType = 'wrong_location' | 'wrong_sku' | 'wrong_qty' | 'wrong_order' | 'missed_pick';

export type AbilityDimension = 'speed' | 'accuracy' | 'pathPlanning' | 'emergency';

export interface Position {
  x: number;
  y: number;
}

export interface PathNode {
  position: Position;
  g: number;
  h: number;
  f: number;
  parent: PathNode | null;
}

export interface RaceCondition {
  conditionId: string;
  type: 'restock' | 'order_change' | 'equipment_failure';
  affectedLocationId?: string;
  affectedOrderId?: string;
  startTime: number;
  durationMs: number;
  resolved: boolean;
}

export interface Product {
  sku: string;
  name: string;
  category: string;
  color: string;
  shape: string;
  defaultQty: number;
}

export interface Shelf {
  shelfId: string;
  rowCount: number;
  colCount: number;
  posX: number;
  posY: number;
  areaCode: string;
}

export interface Location {
  locationId: string;
  shelfId: string;
  row: number;
  col: number;
  level: number;
}

export interface StockItem {
  stockId: string;
  sku: string;
  locationId: string;
  quantity: number;
  isNearExpiry: boolean;
  expiryDate: string;
}

export interface Order {
  orderId: string;
  priority: number;
  type: OrderType;
  createdAt: string;
}

export interface OrderItem {
  itemId: string;
  orderId: string;
  sku: string;
  requiredQty: number;
  picked: boolean;
  pickedQty?: number;
}

export interface Player {
  playerId: string;
  nickname: string;
  createdAt: string;
}

export interface GameSession {
  sessionId: string;
  playerId: string;
  levelType: LevelType;
  levelId: number;
  durationMs: number;
  startTime: string;
  endTime?: string;
  status?: 'in_progress' | 'completed' | 'failed';
}

export interface OperationLog {
  logId: string;
  sessionId: string;
  timestamp: number;
  action: ActionType;
  payload: string;
  isCorrect: boolean;
  errorType?: ErrorType;
  playerPosition?: Position;
}

export interface Score {
  scoreId: string;
  sessionId: string;
  totalScore: number;
  accuracy: number;
  timeBonus: number;
  pathScore: number;
  penaltyPoints: number;
  rank: number;
  nearExpiryBonus?: number;
  raceConditionBonus?: number;
  operationLogs?: OperationLog[];
  playerPath?: Position[];
}

export interface Achievement {
  playerId: string;
  totalGames: number;
  totalTime: number;
  avgAccuracy: number;
  avgPathScore: number;
  unlockedLevels: string;
  bestScores?: Record<string, number>;
  abilityRadar?: Record<AbilityDimension, number>;
}

export interface TutorialStep {
  stepId: string;
  order: number;
  title: string;
  description: string;
  hint?: string;
  targetAction: ActionType;
  targetPayload?: string;
  completed: boolean;
  knowledgePopup?: {
    title: string;
    content: string;
    type: 'rule' | 'safety' | 'tip';
  };
}

export interface GameEvent {
  eventId: string;
  sessionId: string;
  timestamp: number;
  type: 'race_condition_start' | 'race_condition_end' | 'order_updated' | 'near_expiry_hint' | 'milestone';
  message: string;
  data?: Record<string, unknown>;
}

export interface ScanResult {
  success: boolean;
  scannedSku?: string;
  scannedLocationId?: string;
  expectedSku?: string;
  expectedLocationId?: string;
  quantity?: number;
  isNearExpiry?: boolean;
  errorType?: ErrorType;
  message: string;
}

export interface LevelConfig {
  levelId: number;
  type: LevelType;
  name: string;
  description: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  orderCount: number;
  itemCount: number;
  timeLimitMs?: number;
  raceConditionChance?: number;
  unlocked: boolean;
  bestScore?: number;
  stars?: number;
}

export interface WarehouseMap {
  width: number;
  height: number;
  gridSize: number;
  shelves: Shelf[];
  locations: Location[];
  blockedPositions: Position[];
  startPosition: Position;
}

export interface PickingState {
  sessionId: string;
  playerPosition: Position;
  currentOrderId: string | null;
  currentOrderIndex: number;
  currentItemIndex: number;
  orders: Order[];
  orderItems: OrderItem[];
  toteCapacity: number;
  toteItems: Array<{
    sku: string;
    quantity: number;
    locationId: string;
  }>;
  raceConditions: RaceCondition[];
  eventQueue: GameEvent[];
  isPaused: boolean;
  elapsedMs: number;
}

export interface ReviewData {
  sessionId: string;
  player: Player;
  session: GameSession;
  score: Score;
  operationLogs: OperationLog[];
  playerPath: Position[];
  optimalPath: Position[];
  errors: Array<{
    logId: string;
    timestamp: number;
    errorType: ErrorType;
    description: string;
  }>;
  missedItems: OrderItem[];
}

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  nickname: string;
  levelType: LevelType;
  levelId: number;
  totalScore: number;
  accuracy: number;
  durationMs: number;
  timestamp: string;
}

export interface AbilityRadar {
  speed: number;
  accuracy: number;
  pathPlanning: number;
  emergency: number;
}

export interface TrendPoint {
  date: string;
  value: number;
  levelId?: number;
}
