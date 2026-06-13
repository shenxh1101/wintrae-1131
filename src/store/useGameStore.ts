import { create } from 'zustand'
import type {
  Position,
  StockItem,
  Order,
  OrderItem,
  OperationLog,
  GameEvent,
  RaceCondition,
  LevelType,
  ScanResult,
  ErrorType,
  ActionType
} from '../types'
import {
  START_POSITION,
  CHECKOUT_POSITION,
  GAME_CONFIG,
  LOCATIONS,
  getStockByLocation,
  getProductBySku
} from '../data/mockData'
import type { Location as MockLocation } from '../data/mockData'

interface ToteItem {
  sku: string
  quantity: number
  locationId: string
  isNearExpiry: boolean
}

interface GameState {
  sessionId: string
  levelType: LevelType
  levelId: number
  playerPosition: Position
  targetLocationId: string | null
  orders: Order[]
  orderItems: OrderItem[]
  currentOrderId: string | null
  currentOrderIndex: number
  currentItemIndex: number
  stocks: StockItem[]
  toteItems: ToteItem[]
  toteCapacity: number
  operationLogs: OperationLog[]
  eventList: GameEvent[]
  raceConditions: RaceCondition[]
  isPaused: boolean
  isStarted: boolean
  isEnded: boolean
  startTime: number | null
  elapsedMs: number
  timeLimitMs: number | null
  tutorialStepIndex: number
  tutorialCompleted: boolean
  setLevel: (levelType: LevelType, levelId: number, timeLimitMs?: number) => void
  setOrders: (orders: Order[], orderItems: OrderItem[]) => void
  setStocks: (stocks: StockItem[]) => void
  startGame: () => void
  pauseGame: () => void
  resumeGame: () => void
  endGame: (completed: boolean) => void
  resetGame: () => void
  moveTo: (position: Position) => void
  moveStep: (direction: 'up' | 'down' | 'left' | 'right') => void
  setTargetLocation: (locationId: string | null) => void
  scanLocation: () => ScanResult
  pickItem: (quantity?: number) => ScanResult
  placeItemAtCheckout: () => { success: boolean; completedOrderId?: string; message: string }
  addOperationLog: (action: ActionType, payload: string, isCorrect: boolean, errorType?: ErrorType) => void
  addEvent: (type: GameEvent['type'], message: string, data?: Record<string, unknown>) => void
  addRaceCondition: (condition: RaceCondition) => void
  resolveRaceCondition: (conditionId: string) => void
  updateElapsedTime: (ms: number) => void
  nextTutorialStep: () => void
  setTutorialStepIndex: (index: number) => void
  getCurrentOrder: () => Order | null
  getCurrentOrderItems: () => OrderItem[]
  getCurrentItem: () => OrderItem | null
  getNearbyLocation: () => MockLocation | null
  getToteTotalQuantity: () => number
  isAtCheckout: () => boolean
  isAllOrdersCompleted: () => boolean
}

const generateId = (prefix: string): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const createInitialState = (): Omit<GameState, never> => ({
  sessionId: '',
  levelType: 'tutorial',
  levelId: 1,
  playerPosition: { ...START_POSITION },
  targetLocationId: null,
  orders: [],
  orderItems: [],
  currentOrderId: null,
  currentOrderIndex: 0,
  currentItemIndex: 0,
  stocks: [],
  toteItems: [],
  toteCapacity: 20,
  operationLogs: [],
  eventList: [],
  raceConditions: [],
  isPaused: false,
  isStarted: false,
  isEnded: false,
  startTime: null,
  elapsedMs: 0,
  timeLimitMs: null,
  tutorialStepIndex: 0,
  tutorialCompleted: false
})

const calculateDistance = (p1: Position, p2: Position): number => {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2))
}

export const useGameStore = create<GameState>()((set, get) => ({
  ...createInitialState(),

  setLevel: (levelType: LevelType, levelId: number, timeLimitMs?: number) => {
    set({
      levelType,
      levelId,
      timeLimitMs: timeLimitMs ?? null
    })
  },

  setOrders: (orders: Order[], orderItems: OrderItem[]) => {
    const firstOrderId = orders.length > 0 ? orders[0].orderId : null
    set({
      orders,
      orderItems,
      currentOrderId: firstOrderId,
      currentOrderIndex: 0,
      currentItemIndex: 0
    })
  },

  setStocks: (stocks: StockItem[]) => {
    set({ stocks })
  },

  startGame: () => {
    const state = get()
    set({
      sessionId: generateId('sess'),
      isStarted: true,
      isPaused: false,
      isEnded: false,
      startTime: Date.now(),
      elapsedMs: 0,
      playerPosition: { ...START_POSITION },
      targetLocationId: null,
      toteItems: [],
      operationLogs: [],
      eventList: [],
      raceConditions: [],
      tutorialStepIndex: 0,
      tutorialCompleted: false,
      currentOrderIndex: 0,
      currentItemIndex: 0,
      currentOrderId: state.orders.length > 0 ? state.orders[0].orderId : null
    })
  },

  pauseGame: () => {
    set({ isPaused: true })
  },

  resumeGame: () => {
    set({ isPaused: false })
  },

  endGame: (completed: boolean) => {
    set({
      isEnded: true,
      isPaused: false
    })
    get().addEvent(
      'milestone',
      completed ? '游戏完成！' : '游戏结束'
    )
  },

  resetGame: () => {
    set(createInitialState())
  },

  moveTo: (position: Position) => {
    const state = get()
    if (state.isPaused || state.isEnded || !state.isStarted) return
    set({ playerPosition: { ...position } })
  },

  moveStep: (direction: 'up' | 'down' | 'left' | 'right') => {
    const state = get()
    if (state.isPaused || state.isEnded || !state.isStarted) return

    const step = 0.5
    const newPos = { ...state.playerPosition }
    switch (direction) {
      case 'up':
        newPos.y = Math.max(0, newPos.y - step)
        break
      case 'down':
        newPos.y = Math.min(15, newPos.y + step)
        break
      case 'left':
        newPos.x = Math.max(0, newPos.x - step)
        break
      case 'right':
        newPos.x = Math.min(20, newPos.x + step)
        break
    }
    set({ playerPosition: newPos })
  },

  setTargetLocation: (locationId: string | null) => {
    set({ targetLocationId: locationId })
  },

  scanLocation: (): ScanResult => {
    const state = get()
    if (state.isPaused || state.isEnded || !state.isStarted) {
      return { success: false, message: '游戏未进行中' }
    }

    const nearbyLocation = state.getNearbyLocation()
    if (!nearbyLocation) {
      get().addOperationLog('scan', 'no_location', false, 'wrong_location')
      return { success: false, message: '附近没有可扫描的货位' }
    }

    const stock = getStockByLocation(nearbyLocation.locationId)
    const product = stock ? getProductBySku(stock.sku) : undefined

    get().addOperationLog('scan', nearbyLocation.locationId, true)

    return {
      success: true,
      scannedSku: stock?.sku,
      scannedLocationId: nearbyLocation.locationId,
      quantity: stock?.quantity,
      isNearExpiry: stock?.isNearExpiry,
      message: `扫描成功: ${nearbyLocation.locationId}${product ? ` - ${product.name}` : ''}`
    }
  },

  pickItem: (quantity: number = 1): ScanResult => {
    const state = get()
    if (state.isPaused || state.isEnded || !state.isStarted) {
      return { success: false, message: '游戏未进行中' }
    }

    const nearbyLocation = state.getNearbyLocation()
    if (!nearbyLocation) {
      get().addOperationLog('pick', 'no_location', false, 'wrong_location')
      return { success: false, errorType: 'wrong_location', message: '附近没有货位' }
    }

    const stock = getStockByLocation(nearbyLocation.locationId)
    if (!stock || stock.quantity < quantity) {
      get().addOperationLog('pick', nearbyLocation.locationId, false, 'wrong_qty')
      return { success: false, errorType: 'wrong_qty', message: '库存不足' }
    }

    const currentItem = state.getCurrentItem()
    const expectedSku = currentItem?.sku
    const expectedLocationId = currentItem
      ? state.stocks.find(s => s.sku === expectedSku)?.locationId
      : null

    if (expectedSku && stock.sku !== expectedSku) {
      get().addOperationLog('pick', `${nearbyLocation.locationId}:${stock.sku}`, false, 'wrong_sku')
      return {
        success: false,
        errorType: 'wrong_sku',
        scannedSku: stock.sku,
        expectedSku,
        message: `SKU不匹配: 期望 ${expectedSku}, 实际 ${stock.sku}`
      }
    }

    if (expectedLocationId && nearbyLocation.locationId !== expectedLocationId) {
      get().addOperationLog('pick', `${nearbyLocation.locationId}:${stock.sku}`, false, 'wrong_location')
      return {
        success: false,
        errorType: 'wrong_location',
        scannedLocationId: nearbyLocation.locationId,
        expectedLocationId,
        message: `货位不匹配: 期望 ${expectedLocationId}, 实际 ${nearbyLocation.locationId}`
      }
    }

    if (state.getToteTotalQuantity() + quantity > state.toteCapacity) {
      get().addOperationLog('pick', 'tote_full', false, 'wrong_qty')
      return { success: false, errorType: 'wrong_qty', message: '周转箱已满' }
    }

    set(prevState => {
      const newStocks = prevState.stocks.map(s =>
        s.locationId === nearbyLocation.locationId
          ? { ...s, quantity: s.quantity - quantity }
          : s
      )

      const existingToteIndex = prevState.toteItems.findIndex(
        t => t.sku === stock.sku && t.locationId === nearbyLocation.locationId
      )

      let newToteItems: ToteItem[]
      if (existingToteIndex >= 0) {
        newToteItems = prevState.toteItems.map((t, i) =>
          i === existingToteIndex
            ? { ...t, quantity: t.quantity + quantity }
            : t
        )
      } else {
        newToteItems = [
          ...prevState.toteItems,
          {
            sku: stock.sku,
            quantity,
            locationId: nearbyLocation.locationId,
            isNearExpiry: stock.isNearExpiry
          }
        ]
      }

      let newOrderItems = prevState.orderItems
      let newCurrentItemIndex = prevState.currentItemIndex
      let newCurrentOrderIndex = prevState.currentOrderIndex
      let newCurrentOrderId = prevState.currentOrderId

      if (currentItem) {
        newOrderItems = prevState.orderItems.map(item =>
          item.itemId === currentItem.itemId
            ? { ...item, picked: true, pickedQty: (item.pickedQty ?? 0) + quantity }
            : item
        )

        const currentOrderItems = newOrderItems.filter(
          oi => oi.orderId === prevState.currentOrderId
        )
        const nextUnpickedIdx = currentOrderItems.findIndex(oi => !oi.picked)
        const allCurrentPicked = nextUnpickedIdx === -1

        if (allCurrentPicked) {
          const hasNextOrder = prevState.currentOrderIndex < prevState.orders.length - 1
          if (hasNextOrder) {
            newCurrentOrderIndex = prevState.currentOrderIndex + 1
            newCurrentOrderId = prevState.orders[newCurrentOrderIndex].orderId
            newCurrentItemIndex = 0
          } else {
            newCurrentItemIndex = 0
          }
        } else {
          newCurrentItemIndex = nextUnpickedIdx
        }
      }

      return {
        stocks: newStocks,
        toteItems: newToteItems,
        orderItems: newOrderItems,
        currentItemIndex: newCurrentItemIndex,
        currentOrderIndex: newCurrentOrderIndex,
        currentOrderId: newCurrentOrderId
      }
    })

    get().addOperationLog(
      'pick',
      `${nearbyLocation.locationId}:${stock.sku}x${quantity}`,
      true
    )

    return {
      success: true,
      scannedSku: stock.sku,
      scannedLocationId: nearbyLocation.locationId,
      quantity,
      isNearExpiry: stock.isNearExpiry,
      message: `拣取成功: ${stock.sku} x${quantity}`
    }
  },

  placeItemAtCheckout: () => {
    const state = get()
    if (state.isPaused || state.isEnded || !state.isStarted) {
      return { success: false, message: '游戏未进行中' }
    }

    if (!state.isAtCheckout()) {
      get().addOperationLog('place', 'not_at_checkout', false)
      return { success: false, message: '请先前往收银台' }
    }

    const currentOrder = state.getCurrentOrder()
    if (!currentOrder) {
      return { success: false, message: '没有待结算的订单' }
    }

    const currentOrderItems = state.getCurrentOrderItems()
    const pickedItems = currentOrderItems.filter(oi => oi.picked)

    if (pickedItems.length < currentOrderItems.length) {
      get().addOperationLog('place', `order_${currentOrder.orderId}_incomplete`, false, 'missed_pick')
      return { success: false, message: '订单还有未拣取的商品' }
    }

    set(prevState => {
      const remainingOrders = prevState.orders.filter(o => o.orderId !== currentOrder.orderId)
      const nextOrderId = remainingOrders.length > 0 ? remainingOrders[0].orderId : null

      return {
        toteItems: [],
        currentOrderId: nextOrderId,
        currentOrderIndex: remainingOrders.length > 0 ? prevState.currentOrderIndex : prevState.orders.length,
        currentItemIndex: 0
      }
    })

    get().addOperationLog(
      'place',
      `order_${currentOrder.orderId}_completed`,
      true
    )

    get().addEvent('milestone', `订单 ${currentOrder.orderId} 结算完成!`)

    if (get().isAllOrdersCompleted()) {
      get().endGame(true)
    }

    return {
      success: true,
      completedOrderId: currentOrder.orderId,
      message: `订单 ${currentOrder.orderId} 结算完成!`
    }
  },

  addOperationLog: (action: ActionType, payload: string, isCorrect: boolean, errorType?: ErrorType) => {
    const state = get()
    const log: OperationLog = {
      logId: generateId('log'),
      sessionId: state.sessionId,
      timestamp: Date.now(),
      action,
      payload,
      isCorrect,
      errorType,
      playerPosition: { ...state.playerPosition }
    }
    set(prevState => ({
      operationLogs: [...prevState.operationLogs, log]
    }))
  },

  addEvent: (type: GameEvent['type'], message: string, data?: Record<string, unknown>) => {
    const state = get()
    const event: GameEvent = {
      eventId: generateId('evt'),
      sessionId: state.sessionId,
      timestamp: Date.now(),
      type,
      message,
      data
    }
    set(prevState => ({
      eventList: [event, ...prevState.eventList].slice(0, 50)
    }))
  },

  addRaceCondition: (condition: RaceCondition) => {
    set(prevState => ({
      raceConditions: [...prevState.raceConditions, condition]
    }))
    get().addEvent('race_condition_start', `突发事件: ${condition.type}`, {
      conditionId: condition.conditionId,
      type: condition.type
    })
  },

  resolveRaceCondition: (conditionId: string) => {
    set(prevState => ({
      raceConditions: prevState.raceConditions.map(rc =>
        rc.conditionId === conditionId ? { ...rc, resolved: true } : rc
      )
    }))
    get().addEvent('race_condition_end', '事件已处理', { conditionId })
  },

  updateElapsedTime: (ms: number) => {
    set({ elapsedMs: ms })
  },

  nextTutorialStep: () => {
    set(prevState => {
      const nextIndex = prevState.tutorialStepIndex + 1
      if (nextIndex >= 5) {
        return {
          tutorialStepIndex: nextIndex,
          tutorialCompleted: true
        }
      }
      return { tutorialStepIndex: nextIndex }
    })
  },

  setTutorialStepIndex: (index: number) => {
    set({ tutorialStepIndex: index })
  },

  getCurrentOrder: (): Order | null => {
    const state = get()
    if (!state.currentOrderId) return null
    return state.orders.find(o => o.orderId === state.currentOrderId) ?? null
  },

  getCurrentOrderItems: (): OrderItem[] => {
    const state = get()
    if (!state.currentOrderId) return []
    return state.orderItems.filter(oi => oi.orderId === state.currentOrderId)
  },

  getCurrentItem: (): OrderItem | null => {
    const state = get()
    const items = state.getCurrentOrderItems()
    if (items.length === 0) return null
    const unpicked = items.findIndex(oi => !oi.picked)
    const idx = unpicked >= 0 ? unpicked : state.currentItemIndex
    return items[Math.min(idx, items.length - 1)] ?? null
  },

  getNearbyLocation: (): MockLocation | null => {
    const state = get()
    let nearest: MockLocation | null = null
    let nearestDist = Infinity

    for (const loc of LOCATIONS) {
      const locPos = { x: loc.posX, y: loc.posY }
      const dist = calculateDistance(state.playerPosition, locPos)
      if (dist < nearestDist && dist <= GAME_CONFIG.scanDistance) {
        nearestDist = dist
        nearest = loc
      }
    }

    return nearest
  },

  getToteTotalQuantity: (): number => {
    return get().toteItems.reduce((sum, item) => sum + item.quantity, 0)
  },

  isAtCheckout: (): boolean => {
    return calculateDistance(get().playerPosition, CHECKOUT_POSITION) <= 1.5
  },

  isAllOrdersCompleted: (): boolean => {
    const state = get()
    if (state.orders.length === 0) return false
    const allOrderIds = state.orders.map(o => o.orderId)
    return state.orderItems
      .filter(oi => allOrderIds.includes(oi.orderId))
      .every(oi => oi.picked)
  }
}))
