import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  Lock,
  Star,
  ChevronLeft,
  AlertTriangle,
  Clock,
  Package,
  Zap,
  Merge,
  Sparkles,
  TrendingDown,
  X,
  ArrowUpRight,
  AlertOctagon,
  ShoppingBag,
  TimerReset,
} from 'lucide-react'
import { useGameStore } from '@/store/useGameStore'
import { usePlayerStore } from '@/store/usePlayerStore'
import { useScoreStore } from '@/store/useScoreStore'
import WarehouseMap from '@/components/WarehouseMap'
import OrderPanel from '@/components/OrderPanel'
import OperationPanel from '@/components/OperationPanel'
import GameNotification, { GameEventNotification } from '@/components/GameNotification'
import LevelResultModal, { LevelResultData, GradeRank, ScoreDetailItem } from '@/components/LevelResultModal'
import {
  TIMED_LEVELS,
  LOCATIONS,
  SHELVES,
  STOCK_ITEMS,
  PRODUCTS,
  START_POSITION,
  CHECKOUT_POSITION,
  GAME_CONFIG,
  getLocationById,
  getStockByLocation,
  getStockBySku,
  getShelfById,
  type Location as MockLocation,
} from '@/data/mockData'
import type {
  Order,
  OrderItem,
  Position,
  Score as ScoreType,
  GameSession,
  RaceCondition,
  OrderType,
} from '@/types'
import { findPath, calculatePathScore, type GridNode, type Point } from '@/utils/pathfinding'

const generateId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

function buildGrid(): GridNode[][] {
  const cols = 20
  const rows = 15
  const grid: GridNode[][] = []
  for (let y = 0; y < rows; y++) {
    const row: GridNode[] = []
    for (let x = 0; x < cols; x++) {
      let isObstacle = false
      for (const shelf of SHELVES) {
        if (
          x >= shelf.posX &&
          x < shelf.posX + shelf.width &&
          y >= shelf.posY &&
          y < shelf.posY + shelf.height
        ) {
          isObstacle = true
          break
        }
      }
      row.push({ x, y, isObstacle })
    }
    grid.push(row)
  }
  return grid
}

function findAdjacentAisle(targetLoc: MockLocation, grid: GridNode[][]): Point | null {
  const tx = Math.round(targetLoc.posX)
  const ty = Math.round(targetLoc.posY)
  const candidates: Point[] = [
    { x: tx - 1, y: ty },
    { x: tx + 1, y: ty },
    { x: tx, y: ty - 1 },
    { x: tx, y: ty + 1 },
    { x: tx - 1, y: ty - 1 },
    { x: tx + 1, y: ty + 1 },
    { x: tx + 1, y: ty - 1 },
    { x: tx - 1, y: ty + 1 },
  ]
  for (const c of candidates) {
    if (c.x >= 0 && c.x < 20 && c.y >= 0 && c.y < 15 && !grid[c.y][c.x].isObstacle) {
      return c
    }
  }
  return null
}

function calcGrade(score: number, maxScore: number): GradeRank {
  const ratio = score / maxScore
  if (ratio >= 0.95) return 'S'
  if (ratio >= 0.85) return 'A'
  if (ratio >= 0.7) return 'B'
  if (ratio >= 0.5) return 'C'
  return 'D'
}

function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

function getOrderAreaCodes(orderItems: OrderItem[]): Set<string> {
  const codes = new Set<string>()
  for (const oi of orderItems) {
    const stocks = getStockBySku(oi.sku)
    for (const st of stocks) {
      const loc = getLocationById(st.locationId)
      if (loc) {
        const shelf = getShelfById(loc.shelfId)
        if (shelf) codes.add(shelf.areaCode)
      }
    }
  }
  return codes
}

export default function TimedLevel() {
  const navigate = useNavigate()

  const [selectedLevelId, setSelectedLevelId] = useState<number>(1)
  const [gameStarted, setGameStarted] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [resultData, setResultData] = useState<LevelResultData | null>(null)
  const [notifications, setNotifications] = useState<GameEventNotification[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [isPicking, setIsPicking] = useState(false)
  const [scanResult, setScanResult] = useState<{
    success: boolean
    message: string
    scannedSku?: string
    expectedSku?: string
    quantity?: number
    isNearExpiry?: boolean
  } | null>(null)
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)
  const [playerPath, setPlayerPath] = useState<Position[]>([{ ...START_POSITION }])
  const [lockedLocations, setLockedLocations] = useState<Set<string>>(new Set())
  const [nearExpiryBonus, setNearExpiryBonus] = useState(0)
  const [eventBonus, setEventBonus] = useState(0)
  const [feedbackFlash, setFeedbackFlash] = useState<'success' | 'error' | null>(null)
  const [mergeBonus, setMergeBonus] = useState(0)
  const [mergeHints, setMergeHints] = useState<string[][]>([])
  const [completedOrdersCount, setCompletedOrdersCount] = useState(0)

  const animFrameRef = useRef<number | null>(null)
  const targetPosRef = useRef<Position | null>(null)
  const lastMoveLogRef = useRef<number>(0)
  const eventTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const raceConditionTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const gameEventsRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const unlockedLevels = usePlayerStore((s) => s.unlockedTimedLevels)
  const bestScores = usePlayerStore((s) => s.bestScores)
  const unlockLevel = usePlayerStore((s) => s.unlockLevel)
  const updateBestScore = usePlayerStore((s) => s.updateBestScore)
  const addTrainingTime = usePlayerStore((s) => s.addTrainingTime)
  const playerId = usePlayerStore((s) => s.playerId)
  const nickname = usePlayerStore((s) => s.nickname)
  const addScoreRecord = useScoreStore((s) => s.addScoreRecord)

  const gameState = useGameStore()
  const grid = useMemo(() => buildGrid(), [])

  const currentLevel = TIMED_LEVELS.find((l) => l.levelId === selectedLevelId) ?? TIMED_LEVELS[0]

  const sortedOrders = useMemo(() => {
    return [...gameState.orders].sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority
      return 0
    })
  }, [gameState.orders])

  const targetLocations = useMemo(() => {
    const result: string[] = []
    const remainingItems = gameState.orderItems.filter((oi) => !oi.picked)
    for (const item of remainingItems) {
      const stocks = getStockBySku(item.sku)
      if (stocks.length > 0) {
        result.push(stocks[0].locationId)
      }
    }
    return Array.from(new Set(result))
  }, [gameState.orderItems])

  const currentItem = useMemo(() => {
    const orderItems = gameState.orderItems.filter(
      (oi) => oi.orderId === gameState.currentOrderId && !oi.picked
    )
    return orderItems[0] ?? null
  }, [gameState.orderItems, gameState.currentOrderId])

  const totalItems = gameState.orderItems.length
  const completedItems = gameState.orderItems.filter((oi) => oi.picked).length

  const accuracy = useMemo(() => {
    const logs = gameState.operationLogs.filter((l) => l.action === 'pick' || l.action === 'scan')
    if (logs.length === 0) return 100
    const correct = logs.filter((l) => l.isCorrect).length
    return (correct / logs.length) * 100
  }, [gameState.operationLogs])

  const remainingMs = Math.max(0, (gameState.timeLimitMs ?? 0) - gameState.elapsedMs)
  const remainingSec = Math.ceil(remainingMs / 1000)
  const isUrgentTime = remainingSec <= 10 && remainingSec > 0
  const timeProgress = gameState.timeLimitMs
    ? Math.max(0, 1 - gameState.elapsedMs / gameState.timeLimitMs)
    : 0

  const pushNotification = useCallback(
    (type: GameEventNotification['type'], message: string) => {
      const evt: GameEventNotification = {
        id: generateId('notif'),
        type,
        message,
        timestamp: Date.now(),
      }
      setNotifications((prev) => [evt, ...prev])
    },
    []
  )

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const showFeedback = useCallback((type: 'success' | 'error') => {
    setFeedbackFlash(type)
    setTimeout(() => setFeedbackFlash(null), 400)
  }, [])

  const generateTimedOrders = useCallback((levelId: number) => {
    const level = TIMED_LEVELS.find((l) => l.levelId === levelId)
    if (!level) return { orders: [], orderItems: [] }

    const random = seededRandom(levelId * 1000 + Date.now() % 1000)
    const orders: Order[] = []
    const orderItems: OrderItem[] = []

    const itemsPerOrder = Math.ceil(level.totalSkuCount / level.orderCount)
    let skuPool = [...PRODUCTS]
    if (skuPool.length < level.totalSkuCount) skuPool = [...PRODUCTS, ...PRODUCTS]

    for (let oi = 0; oi < level.orderCount; oi++) {
      const orderId = generateId('ord')
      const priority: number = random() < 0.2 ? 4 : random() < 0.4 ? 3 : 2
      const type: OrderType = priority >= 4 ? 'urgent' : random() < 0.3 ? 'batch' : 'normal'

      orders.push({
        orderId,
        priority,
        type,
        createdAt: new Date().toISOString(),
      })

      const itemCount = Math.min(
        itemsPerOrder,
        level.minOrderItems + Math.floor(random() * (level.maxOrderItems - level.minOrderItems + 1))
      )
      for (let ii = 0; ii < itemCount; ii++) {
        if (skuPool.length === 0) skuPool = [...PRODUCTS]
        const idx = Math.floor(random() * skuPool.length)
        const product = skuPool.splice(idx, 1)[0]
        const requiredQty = Math.floor(random() * 3) + 1
        orderItems.push({
          itemId: generateId('item'),
          orderId,
          sku: product.sku,
          requiredQty,
          picked: false,
          pickedQty: 0,
        })
      }
    }

    return { orders, orderItems }
  }, [])

  const detectMergeHints = useCallback(() => {
    const activeOrders = gameState.orders.filter((o) => {
      const items = gameState.orderItems.filter((oi) => oi.orderId === o.orderId)
      return items.some((oi) => !oi.picked)
    })
    if (activeOrders.length < 2) {
      setMergeHints([])
      return
    }
    const hints: string[][] = []
    const seen = new Set<string>()
    for (let i = 0; i < activeOrders.length; i++) {
      for (let j = i + 1; j < activeOrders.length; j++) {
        const o1 = activeOrders[i]
        const o2 = activeOrders[j]
        const items1 = gameState.orderItems.filter((oi) => oi.orderId === o1.orderId && !oi.picked)
        const items2 = gameState.orderItems.filter((oi) => oi.orderId === o2.orderId && !oi.picked)
        if (items1.length === 0 || items2.length === 0) continue
        const areas1 = getOrderAreaCodes(items1)
        const areas2 = getOrderAreaCodes(items2)
        const common = [...areas1].filter((a) => areas2.has(a))
        if (common.length >= 1) {
          const key = [o1.orderId, o2.orderId].sort().join('|')
          if (!seen.has(key)) {
            seen.add(key)
            hints.push([o1.orderId, o2.orderId])
            if (hints.length >= 3) break
          }
        }
      }
      if (hints.length >= 3) break
    }
    setMergeHints(hints)
  }, [gameState.orders, gameState.orderItems])

  const initializeForLevel = useCallback(
    (levelId: number) => {
      const level = TIMED_LEVELS.find((l) => l.levelId === levelId)
      if (!level) return
      const { orders, orderItems } = generateTimedOrders(levelId)
      useGameStore.getState().setLevel('timed', levelId, level.timeLimitSec * 1000)
      useGameStore.getState().setOrders(orders, orderItems)
      useGameStore.getState().setStocks([...STOCK_ITEMS])
    },
    [generateTimedOrders]
  )

  const handleStartGame = useCallback(() => {
    initializeForLevel(selectedLevelId)
    useGameStore.getState().startGame()
    setGameStarted(true)
    setPlayerPath([{ ...START_POSITION }])
    setNotifications([])
    setScanResult(null)
    setSelectedLocationId(null)
    setLockedLocations(new Set())
    setNearExpiryBonus(0)
    setEventBonus(0)
    setMergeBonus(0)
    setCompletedOrdersCount(0)
    setShowResult(false)
    setResultData(null)
  }, [selectedLevelId, initializeForLevel])

  const handleLevelSelect = useCallback(
    (levelId: number) => {
      if (!unlockedLevels.includes(levelId)) return
      setSelectedLevelId(levelId)
      if (gameStarted) {
        useGameStore.getState().resetGame()
        setGameStarted(false)
        setShowResult(false)
        setPlayerPath([{ ...START_POSITION }])
      }
    },
    [unlockedLevels, gameStarted]
  )

  const smoothMoveTo = useCallback(
    (target: Position, cb?: () => void) => {
      targetPosRef.current = { ...target }
      const moveSpeed = 0.06

      const animate = () => {
        const state = useGameStore.getState()
        if (state.isPaused || state.isEnded) {
          animFrameRef.current = null
          return
        }
        const cur = state.playerPosition
        const tgt = targetPosRef.current
        if (!tgt) {
          animFrameRef.current = null
          return
        }
        const dx = tgt.x - cur.x
        const dy = tgt.y - cur.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < 0.01) {
          useGameStore.getState().moveTo({ x: tgt.x, y: tgt.y })
          targetPosRef.current = null
          animFrameRef.current = null
          cb?.()
          return
        }

        const stepX = (dx / dist) * Math.min(moveSpeed, dist)
        const stepY = (dy / dist) * Math.min(moveSpeed, dist)
        const nextPos = { x: cur.x + stepX, y: cur.y + stepY }
        useGameStore.getState().moveTo(nextPos)

        const now = Date.now()
        if (now - lastMoveLogRef.current > 150) {
          lastMoveLogRef.current = now
          setPlayerPath((prev) => {
            const last = prev[prev.length - 1]
            if (!last || Math.abs(last.x - nextPos.x) > 0.15 || Math.abs(last.y - nextPos.y) > 0.15) {
              return [...prev, { ...nextPos }]
            }
            return prev
          })
          useGameStore
            .getState()
            .addOperationLog('move', `x:${nextPos.x.toFixed(1)},y:${nextPos.y.toFixed(1)}`, true)
        }

        animFrameRef.current = requestAnimationFrame(animate)
      }
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = requestAnimationFrame(animate)
    },
    []
  )

  const handleKeyStepMove = useCallback(
    (dir: 'up' | 'down' | 'left' | 'right') => {
      const state = useGameStore.getState()
      if (state.isPaused || state.isEnded || !state.isStarted) return

      const step = 1
      const cur = state.playerPosition
      const rx = Math.round(cur.x)
      const ry = Math.round(cur.y)
      let nx = rx
      let ny = ry
      switch (dir) {
        case 'up':
          ny -= step
          break
        case 'down':
          ny += step
          break
        case 'left':
          nx -= step
          break
        case 'right':
          nx += step
          break
      }
      if (nx < 0 || nx >= 20 || ny < 0 || ny >= 15) return
      if (grid[ny][nx].isObstacle) return
      smoothMoveTo({ x: nx, y: ny })
    },
    [grid, smoothMoveTo]
  )

  const handleLocationClick = useCallback(
    (locationId: string) => {
      const state = useGameStore.getState()
      if (state.isPaused || state.isEnded || !state.isStarted) return
      if (lockedLocations.has(locationId)) {
        pushNotification('warning', `货位 ${locationId} 正在补货中，请稍后`)
        return
      }
      const loc = getLocationById(locationId)
      if (!loc) return
      setSelectedLocationId(locationId)
      setScanResult(null)
      const target = findAdjacentAisle(loc, grid)
      if (!target) {
        pushNotification('error', '无法到达该货位附近')
        return
      }
      const start = {
        x: Math.round(state.playerPosition.x),
        y: Math.round(state.playerPosition.y),
      }
      const pathResult = findPath(grid, start, target)
      if (!pathResult.found || pathResult.path.length < 2) {
        smoothMoveTo({ x: target.x, y: target.y })
        return
      }
      let i = 1
      const walkNext = () => {
        if (i >= pathResult.path.length) return
        const p = pathResult.path[i]
        i++
        smoothMoveTo({ x: p.x, y: p.y }, walkNext)
      }
      walkNext()
    },
    [grid, lockedLocations, pushNotification, smoothMoveTo]
  )

  const triggerRaceCondition = useCallback(() => {
    const chance = currentLevel.eventProbability
    if (chance <= 0) return
    const rand = Math.random()
    if (rand > Math.min(0.3, Math.max(0.1, chance))) return

    const candidateLocs = LOCATIONS.filter(
      (l) => !lockedLocations.has(l.locationId) && targetLocations.includes(l.locationId)
    )
    if (candidateLocs.length === 0) return
    const loc = candidateLocs[Math.floor(Math.random() * candidateLocs.length)]

    const condId = generateId('rc')
    const condition: RaceCondition = {
      conditionId: condId,
      type: 'restock',
      affectedLocationId: loc.locationId,
      startTime: Date.now(),
      durationMs: GAME_CONFIG.eventLockDurationMs,
      resolved: false,
    }
    useGameStore.getState().addRaceCondition(condition)

    setLockedLocations((prev) => {
      const next = new Set(prev)
      next.add(loc.locationId)
      return next
    })
    pushNotification(
      'restock',
      `⚠️ 货位 ${loc.locationId} 正在补货，临时锁定 ${GAME_CONFIG.eventLockDurationMs / 1000} 秒`
    )

    const timer = setTimeout(() => {
      useGameStore.getState().resolveRaceCondition(condId)
      setLockedLocations((prev) => {
        const next = new Set(prev)
        next.delete(loc.locationId)
        return next
      })
      pushNotification('success', `货位 ${loc.locationId} 补货完成，已解锁`)
      setEventBonus((prev) => prev + GAME_CONFIG.eventHandleBonus)
      raceConditionTimersRef.current.delete(condId)
    }, GAME_CONFIG.eventLockDurationMs)
    raceConditionTimersRef.current.set(condId, timer)
  }, [currentLevel.eventProbability, lockedLocations, targetLocations, pushNotification])

  const triggerGameEvent = useCallback(() => {
    const state = useGameStore.getState()
    if (state.isPaused || state.isEnded || !state.isStarted) return
    const chance = currentLevel.eventProbability
    if (chance <= 0 || Math.random() > Math.min(0.25, chance * 0.8)) return

    const eventType = Math.random()
    if (eventType < 0.45) {
      if (state.orders.length === 0) return
      const unpicked = state.orderItems.filter((oi) => !oi.picked)
      if (unpicked.length === 0) return
      const victim = unpicked[Math.floor(Math.random() * unpicked.length)]
      useGameStore.setState((prev) => ({
        orderItems: prev.orderItems.map((oi) =>
          oi.itemId === victim.itemId ? { ...oi, picked: true, pickedQty: 0 } : oi
        ),
      }))
      const product = PRODUCTS.find((p) => p.sku === victim.sku)
      pushNotification(
        'warning',
        `📋 订单变更：${product?.name || victim.sku} 客户已取消该商品`
      )
      state.addEvent('order_updated', `商品 ${victim.sku} 被取消`, { itemId: victim.itemId })
    } else if (eventType < 0.85) {
      const random = seededRandom(Date.now() % 10000)
      const orderId = generateId('ord')
      const priority: number = 5
      const type: OrderType = 'urgent'
      const newOrder: Order = {
        orderId,
        priority,
        type,
        createdAt: new Date().toISOString(),
      }
      const itemCount = Math.max(1, Math.floor(random() * 3) + 1)
      const newItems: OrderItem[] = []
      for (let i = 0; i < itemCount; i++) {
        const p = PRODUCTS[Math.floor(random() * PRODUCTS.length)]
        newItems.push({
          itemId: generateId('item'),
          orderId,
          sku: p.sku,
          requiredQty: Math.floor(random() * 2) + 1,
          picked: false,
          pickedQty: 0,
        })
      }
      useGameStore.setState((prev) => ({
        orders: [...prev.orders, newOrder],
        orderItems: [...prev.orderItems, ...newItems],
      }))
      pushNotification(
        'warning',
        `⚡ 紧急插入订单 ${orderId.slice(-6)}：${itemCount} 件商品，请优先处理！`
      )
      state.addEvent('order_updated', `紧急订单插入 ${orderId}`, { orderId })
    } else {
      const pendingOrders = gameState.orders.filter((o) => {
        const items = gameState.orderItems.filter((oi) => oi.orderId === o.orderId)
        return items.some((oi) => !oi.picked)
      })
      for (const order of pendingOrders) {
        useGameStore.setState((prev) => {
          const items = prev.orderItems.filter((oi) => oi.orderId === order.orderId)
          if (items.every((oi) => oi.picked)) return prev
          return {
            orders: prev.orders.map((o) =>
              o.orderId === order.orderId ? { ...o, priority: Math.min(5, o.priority + 1) } : o
            ),
          }
        })
      }
      pushNotification('warning', '🔥 所有订单优先级提升！时间紧迫，请加速拣货')
      state.addEvent('milestone', '订单优先级整体提升')
    }
  }, [currentLevel.eventProbability, pushNotification, gameState.orders, gameState.orderItems])

  const handleScan = useCallback(() => {
    const state = useGameStore.getState()
    if (state.isPaused || state.isEnded || !state.isStarted) return
    setIsScanning(true)
    setScanResult(null)
    setTimeout(() => {
      const nearby = state.getNearbyLocation()
      if (!nearby) {
        const res = { success: false, message: '附近没有可扫描的货位，请靠近货架' }
        setScanResult(res)
        state.addOperationLog('scan', 'no_location', false, 'wrong_location')
        showFeedback('error')
        setIsScanning(false)
        return
      }
      if (lockedLocations.has(nearby.locationId)) {
        const res = { success: false, message: `货位 ${nearby.locationId} 正在补货中，无法扫描` }
        setScanResult(res)
        state.addOperationLog('scan', `locked:${nearby.locationId}`, false, 'wrong_location')
        showFeedback('error')
        setIsScanning(false)
        return
      }
      setSelectedLocationId(nearby.locationId)
      const result = state.scanLocation()
      setScanResult({
        success: result.success,
        message: result.message,
        scannedSku: result.scannedSku,
        quantity: result.quantity,
        isNearExpiry: result.isNearExpiry,
        expectedSku: currentItem?.sku,
      })
      if (result.success) {
        showFeedback('success')
      } else {
        showFeedback('error')
      }
      setIsScanning(false)
      triggerRaceCondition()
    }, GAME_CONFIG.scanAnimationMs)
  }, [lockedLocations, currentItem, showFeedback, triggerRaceCondition])

  const handlePick = useCallback(
    (qty: number) => {
      const state = useGameStore.getState()
      if (state.isPaused || state.isEnded || !state.isStarted) return
      if (!scanResult?.success) return
      setIsPicking(true)
      setTimeout(() => {
        const prevCurrentOrderId = state.currentOrderId
        const result = state.pickItem(qty)
        if (result.success) {
          const stock = getStockByLocation(result.scannedLocationId!)
          if (stock?.isNearExpiry) {
            setNearExpiryBonus((prev) => prev + GAME_CONFIG.nearExpiryBonus)
            pushNotification('success', `✅ 临期品优先拣取，+${GAME_CONFIG.nearExpiryBonus}分`)
          }
          pushNotification('success', `✅ 拣取成功: ${result.scannedSku} x${qty}`)
          showFeedback('success')

          const newState = useGameStore.getState()
          const prevOrderCompleted =
            prevCurrentOrderId &&
            newState.orderItems
              .filter((oi) => oi.orderId === prevCurrentOrderId)
              .every((oi) => oi.picked)
          if (prevOrderCompleted) {
            setCompletedOrdersCount((c) => c + 1)
          }
        } else {
          pushNotification('error', `❌ 拣取失败: ${result.message}`)
          showFeedback('error')
        }
        if (scanResult) {
          setScanResult({
            ...scanResult,
            message: result.message,
            success: result.success,
          })
        }
        setIsPicking(false)
      }, GAME_CONFIG.pickAnimationMs)
    },
    [scanResult, showFeedback, pushNotification]
  )

  const handleMergeOrders = useCallback(
    (orderIds: string[]) => {
      if (orderIds.length < 2) return
      const state = useGameStore.getState()
      const primaryId = state.currentOrderId || orderIds[0]
      const others = orderIds.filter((id) => id !== primaryId)

      let movedCount = 0
      useGameStore.setState((prev) => {
        const newItems = prev.orderItems.map((oi) => {
          if (others.includes(oi.orderId) && !oi.picked) {
            movedCount++
            return { ...oi, orderId: primaryId }
          }
          return oi
        })
        const newOrders = prev.orders.map((o) => {
          if (o.orderId === primaryId) {
            return { ...o, priority: Math.min(5, o.priority + 1), type: 'batch' as OrderType }
          }
          return o
        })
        return { orders: newOrders, orderItems: newItems }
      })

      setMergeBonus((prev) => prev + 30 * (orderIds.length - 1))
      pushNotification(
        'success',
        `🔀 合并成功：${orderIds.length} 个订单合并，+${30 * (orderIds.length - 1)}分`
      )
      setMergeHints((prev) => prev.filter((h) => !orderIds.every((id) => h.includes(id))))
      detectMergeHints()
    },
    [pushNotification, detectMergeHints]
  )

  const finalizeGame = useCallback(
    (completed: boolean) => {
      const state = useGameStore.getState()
      state.endGame(completed)

      const elapsedMs = state.elapsedMs > 0 ? state.elapsedMs : state.startTime ? Date.now() - state.startTime : 0
      const correctOps = state.operationLogs.filter((l) => l.isCorrect).length
      const totalOps = state.operationLogs.filter((l) => l.action === 'pick' || l.action === 'scan').length
      const finalAccuracy = totalOps > 0 ? (correctOps / totalOps) * 100 : 100

      let optimalLen = 0
      const remainingTargets: Point[] = targetLocations
        .map((lid) => getLocationById(lid))
        .filter(Boolean)
        .map((l) => findAdjacentAisle(l!, grid) ?? { x: 10, y: 13 })
      remainingTargets.push({ x: Math.round(CHECKOUT_POSITION.x), y: Math.round(CHECKOUT_POSITION.y) })
      if (remainingTargets.length > 0) {
        const start: Point = { x: Math.round(START_POSITION.x), y: Math.round(START_POSITION.y) }
        const all = [start, ...remainingTargets]
        for (let i = 0; i < all.length - 1; i++) {
          optimalLen += findPath(grid, all[i], all[i + 1]).pathLength
        }
      }
      const actualLen = playerPath.length
      const pathScoreVal = calculatePathScore(optimalLen, actualLen, GAME_CONFIG.maxPathScore)

      const timeLimitMs = state.timeLimitMs ?? currentLevel.timeLimitSec * 1000
      const finalRemainingMs = Math.max(0, timeLimitMs - elapsedMs)
      const timeBonusVal = Math.floor(finalRemainingMs / 1000) * 2

      const accuracyScoreVal = Math.round((finalAccuracy / 100) * GAME_CONFIG.maxAccuracyScore)
      const baseScoreVal = currentLevel.baseScore

      const wrongPicks = state.operationLogs.filter((l) => l.action === 'pick' && !l.isCorrect).length
      const wrongPenalty = wrongPicks * GAME_CONFIG.wrongPickPenalty

      const completedOrdersArr = state.orders.filter((o) =>
        state.orderItems.filter((oi) => oi.orderId === o.orderId).every((oi) => oi.picked)
      )
      const orderCompletionBonus = completedOrdersArr.length * 50

      const missedItems = state.orderItems.filter((oi) => !oi.picked).length
      const missPenalty = missedItems * GAME_CONFIG.missPickPenalty

      const totalScore = Math.max(
        0,
        baseScoreVal +
          timeBonusVal +
          accuracyScoreVal +
          pathScoreVal +
          nearExpiryBonus +
          eventBonus +
          mergeBonus +
          orderCompletionBonus -
          wrongPenalty -
          missPenalty
      )

      const maxPossibleScore =
        currentLevel.baseScore +
        currentLevel.timeLimitSec * 2 +
        GAME_CONFIG.maxAccuracyScore +
        GAME_CONFIG.maxPathScore +
        nearExpiryBonus +
        eventBonus +
        mergeBonus +
        state.orders.length * 50
      const grade = calcGrade(totalScore, maxPossibleScore)
      const stars = grade === 'S' ? 3 : grade === 'A' ? 3 : grade === 'B' ? 2 : grade === 'C' ? 1 : 0

      const bestKey = `timed-${selectedLevelId}`
      const prevBest = bestScores[bestKey] ?? 0
      const isNewBest = totalScore > prevBest

      const anyCompleted = completedOrdersArr.length > 0 || completedItems > 0
      if (completed || anyCompleted) {
        unlockLevel(selectedLevelId, 'timed')
      }
      if (isNewBest) {
        updateBestScore(bestKey, totalScore)
      }
      addTrainingTime(Math.round(elapsedMs / 60000))

      const scoreRecord: ScoreType = {
        scoreId: generateId('scr'),
        sessionId: state.sessionId,
        totalScore,
        accuracy: Number(finalAccuracy.toFixed(1)),
        timeBonus: timeBonusVal,
        pathScore: pathScoreVal,
        penaltyPoints: wrongPenalty + missPenalty,
        rank: 0,
        nearExpiryBonus,
        raceConditionBonus: eventBonus,
      }

      const session: GameSession = {
        sessionId: state.sessionId,
        playerId,
        levelType: 'timed',
        levelId: selectedLevelId,
        durationMs: elapsedMs,
        startTime: state.startTime ? new Date(state.startTime).toISOString() : new Date().toISOString(),
        endTime: new Date().toISOString(),
        status: completed ? 'completed' : anyCompleted ? 'completed' : 'failed',
      }
      addScoreRecord(scoreRecord, session, nickname)

      const details: ScoreDetailItem[] = [
        { id: 'base', label: '基础分', value: baseScoreVal, maxValue: currentLevel.baseScore, type: 'positive' },
        { id: 'order', label: '订单完成奖励', value: orderCompletionBonus, type: 'positive' },
        { id: 'time', label: '剩余时间奖励(×2)', value: timeBonusVal, maxValue: currentLevel.timeLimitSec * 2, type: 'positive' },
        { id: 'acc', label: '准确率得分', value: accuracyScoreVal, maxValue: GAME_CONFIG.maxAccuracyScore, type: 'positive' },
        { id: 'path', label: '路径规划分', value: pathScoreVal, maxValue: GAME_CONFIG.maxPathScore, type: 'positive' },
        { id: 'merge', label: '批量合并奖励', value: mergeBonus, type: 'positive' },
        { id: 'near', label: '临期品奖励', value: nearExpiryBonus, type: 'positive' },
        { id: 'event', label: '应急处理奖励', value: eventBonus, type: 'positive' },
        { id: 'wrong', label: '误操作扣分', value: wrongPenalty, type: 'negative' },
        { id: 'miss', label: '漏拣扣分', value: missPenalty, type: 'negative' },
      ]

      const unlocks: { id: string; title: string; description: string; icon: 'level' | 'achievement' | 'skin' }[] = []
      if (anyCompleted && selectedLevelId < TIMED_LEVELS.length && isNewBest) {
        unlocks.push({
          id: `lvl-${selectedLevelId + 1}`,
          title: `解锁关卡 ${selectedLevelId + 1}`,
          description: TIMED_LEVELS.find((l) => l.levelId === selectedLevelId + 1)?.name ?? '新限时关卡',
          icon: 'level',
        })
      }

      setResultData({
        totalScore,
        bestScore: Math.max(prevBest, totalScore),
        grade,
        accuracy: Number(finalAccuracy.toFixed(1)),
        timeMs: elapsedMs,
        baseScore: baseScoreVal,
        timeBonus: timeBonusVal,
        accuracyScore: accuracyScoreVal,
        pathScore: pathScoreVal,
        nearExpiryBonus,
        raceConditionBonus: eventBonus,
        penaltyPoints: wrongPenalty + missPenalty,
        details,
        stars,
        isNewBest,
        unlocks: unlocks.length > 0 ? unlocks : undefined,
      })
      setShowResult(true)
    },
    [
      currentLevel,
      targetLocations,
      grid,
      playerPath,
      nearExpiryBonus,
      eventBonus,
      mergeBonus,
      completedItems,
      selectedLevelId,
      bestScores,
      unlockLevel,
      updateBestScore,
      addTrainingTime,
      playerId,
      nickname,
      addScoreRecord,
    ]
  )

  useEffect(() => {
    if (!gameStarted) return

    const onKey = (e: KeyboardEvent) => {
      if (showResult) return
      const state = useGameStore.getState()
      if (state.isPaused || state.isEnded) return
      switch (e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          e.preventDefault()
          handleKeyStepMove('up')
          break
        case 's':
        case 'arrowdown':
          e.preventDefault()
          handleKeyStepMove('down')
          break
        case 'a':
        case 'arrowleft':
          e.preventDefault()
          handleKeyStepMove('left')
          break
        case 'd':
        case 'arrowright':
          e.preventDefault()
          handleKeyStepMove('right')
          break
        case ' ':
          e.preventDefault()
          if (!isScanning) handleScan()
          break
        case 'e':
          e.preventDefault()
          if (!isPicking && scanResult?.success) handlePick(1)
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [gameStarted, showResult, handleKeyStepMove, handleScan, handlePick, isScanning, isPicking, scanResult])

  useEffect(() => {
    if (!gameStarted || showResult) return
    let raf: number
    const tick = () => {
      const state = useGameStore.getState()
      if (!state.isPaused && !state.isEnded && state.startTime) {
        const now = Date.now()
        state.updateElapsedTime(now - state.startTime)
        if (state.timeLimitMs && state.elapsedMs >= state.timeLimitMs) {
          finalizeGame(false)
          return
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    eventTimerRef.current = setInterval(() => {
      const s = useGameStore.getState()
      if (s.isPaused || s.isEnded || !s.isStarted) return
      triggerRaceCondition()
    }, 6000)

    gameEventsRef.current = setInterval(() => {
      const s = useGameStore.getState()
      if (s.isPaused || s.isEnded || !s.isStarted) return
      triggerGameEvent()
    }, 12000)

    const mergeInterval = setInterval(() => {
      detectMergeHints()
    }, 2500)

    return () => {
      cancelAnimationFrame(raf)
      if (eventTimerRef.current) clearInterval(eventTimerRef.current)
      if (gameEventsRef.current) clearInterval(gameEventsRef.current)
      clearInterval(mergeInterval)
    }
  }, [gameStarted, showResult, finalizeGame, triggerRaceCondition, triggerGameEvent, detectMergeHints])

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (eventTimerRef.current) clearInterval(eventTimerRef.current)
      if (gameEventsRef.current) clearInterval(gameEventsRef.current)
      raceConditionTimersRef.current.forEach((t) => clearTimeout(t))
      raceConditionTimersRef.current.clear()
    }
  }, [])

  const selectedLocation = selectedLocationId ? getLocationById(selectedLocationId) ?? null : null
  const selectedStock = selectedLocationId ? getStockByLocation(selectedLocationId) ?? null : null

  const ordersForPanel = useMemo(() => {
    return sortedOrders.map((o) => {
      const items = gameState.orderItems
        .filter((oi) => oi.orderId === o.orderId)
        .map((oi) => {
          const stock = getStockBySku(oi.sku)[0]
          return {
            itemId: oi.itemId,
            sku: oi.sku,
            requiredQty: oi.requiredQty,
            pickedQty: oi.pickedQty ?? 0,
            isNearExpiry: stock?.isNearExpiry,
            completed: oi.picked,
            locationId: stock?.locationId,
          }
        })
      return {
        orderId: o.orderId,
        priority: o.priority,
        type: o.type as 'normal' | 'urgent' | 'batch',
        items,
      }
    })
  }, [sortedOrders, gameState.orderItems])

  const currentItemId = currentItem?.itemId ?? null
  const pickedQuantities = useMemo(() => {
    const map: Record<string, number> = {}
    gameState.orderItems.forEach((oi) => {
      map[oi.itemId] = oi.pickedQty ?? 0
    })
    return map
  }, [gameState.orderItems])

  const currentScore = useMemo(() => {
    const timeB = Math.floor(remainingMs / 1000) * 2
    const accS = Math.round((accuracy / 100) * GAME_CONFIG.maxAccuracyScore)
    const wrongPicks = gameState.operationLogs.filter((l) => l.action === 'pick' && !l.isCorrect).length
    const pen = wrongPicks * GAME_CONFIG.wrongPickPenalty
    const missed = gameState.orderItems.filter((oi) => !oi.picked).length * GAME_CONFIG.missPickPenalty
    const itemProgress = (completedItems / Math.max(1, totalItems)) * currentLevel.baseScore
    return Math.max(0, Math.round(itemProgress + timeB + accS + nearExpiryBonus + eventBonus + mergeBonus + completedOrdersCount * 50 - pen - missed))
  }, [
    remainingMs,
    accuracy,
    gameState.operationLogs,
    completedItems,
    totalItems,
    currentLevel.baseScore,
    nearExpiryBonus,
    eventBonus,
    mergeBonus,
    completedOrdersCount,
  ])

  const pathEfficiency = useMemo(() => {
    if (playerPath.length < 5) return 85
    let opt = 0
    const targets: Point[] = targetLocations
      .map((lid) => getLocationById(lid))
      .filter(Boolean)
      .map((l) => findAdjacentAisle(l!, grid) ?? { x: 10, y: 13 })
    targets.push({ x: Math.round(CHECKOUT_POSITION.x), y: Math.round(CHECKOUT_POSITION.y) })
    if (targets.length > 0) {
      const start: Point = { x: Math.round(START_POSITION.x), y: Math.round(START_POSITION.y) }
      const all = [start, ...targets]
      for (let i = 0; i < all.length - 1; i++) {
        opt += findPath(grid, all[i], all[i + 1]).pathLength
      }
    }
    const ratio = opt > 0 ? opt / playerPath.length : 0.85
    return Math.min(100, Math.round(ratio * 100))
  }, [playerPath.length, targetLocations, grid])

  const completionProgress = totalItems > 0 ? completedItems / totalItems : 0

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <AnimatePresence>
        {feedbackFlash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: feedbackFlash === 'success' ? 0.18 : 0.25 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'pointer-events-none fixed inset-0 z-[60]',
              feedbackFlash === 'success' ? 'bg-emerald-400' : 'bg-red-500'
            )}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {feedbackFlash === 'error' && (
          <motion.div
            initial={{ x: 0 }}
            animate={{ x: [-8, 8, -6, 6, -3, 3, 0] }}
            exit={{ x: 0 }}
            transition={{ duration: 0.35 }}
            className="fixed inset-0 pointer-events-none z-[59]"
          />
        )}
      </AnimatePresence>

      <div className="relative flex flex-col h-screen w-full">
        <div className="relative z-30 px-4 py-3 bg-warehouse-navy/95 backdrop-blur-md border-b border-warehouse-navyLight/50">
          <div className="flex items-center gap-4 max-w-[1800px] mx-auto">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-warehouse-navyLight/40 hover:bg-warehouse-navyLight/60 border border-warehouse-navyLight/50 text-gray-300 hover:text-white transition-colors text-sm shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
              主菜单
            </motion.button>

            <motion.div
              className={cn(
                'relative shrink-0 px-5 py-2.5 rounded-2xl border-2 flex items-center gap-3',
                isUrgentTime
                  ? 'bg-red-500/20 border-red-500/60 shadow-[0_0_25px_rgba(239,68,68,0.5)]'
                  : 'bg-warehouse-navyLight/30 border-warehouse-navyLight/50'
              )}
              animate={isUrgentTime ? { scale: [1, 1.03, 1, 1.03, 1] } : {}}
              transition={isUrgentTime ? { duration: 0.6, repeat: Infinity, ease: 'easeInOut' } : {}}
            >
              <div className="relative w-12 h-12 shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    className={cn(isUrgentTime ? 'text-red-900/60' : 'text-warehouse-navyLight')}
                  />
                  <motion.circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${timeProgress * 97.39} 97.39`}
                    className={cn(
                      isUrgentTime ? 'text-red-500' : remainingSec < 30 ? 'text-yellow-400' : 'text-emerald-400'
                    )}
                    initial={false}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <TimerReset
                    className={cn(
                      'w-5 h-5',
                      isUrgentTime ? 'text-red-400 animate-pulse' : remainingSec < 30 ? 'text-yellow-400' : 'text-emerald-400'
                    )}
                  />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium leading-none mb-1">
                  剩余时间
                </span>
                <motion.span
                  key={remainingSec}
                  initial={{ scale: 1.15 }}
                  animate={{ scale: 1 }}
                  className={cn(
                    'font-mono text-4xl font-black leading-none tracking-tight',
                    isUrgentTime
                      ? 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.7)] animate-pulse'
                      : remainingSec < 30
                      ? 'text-yellow-400'
                      : 'text-emerald-400'
                  )}
                >
                  {String(Math.floor(remainingSec / 60)).padStart(2, '0')}:
                  {String(remainingSec % 60).padStart(2, '0')}
                </motion.span>
              </div>
            </motion.div>

            <div className="flex-1 flex items-center gap-1.5 min-w-0 overflow-x-auto pb-1">
              {TIMED_LEVELS.map((lvl) => {
                const unlocked = unlockedLevels.includes(lvl.levelId)
                const active = selectedLevelId === lvl.levelId
                const best = bestScores[`timed-${lvl.levelId}`]

                return (
                  <motion.button
                    key={lvl.levelId}
                    whileHover={unlocked ? { scale: 1.04, y: -2 } : {}}
                    whileTap={unlocked ? { scale: 0.96 } : {}}
                    onClick={() => handleLevelSelect(lvl.levelId)}
                    disabled={!unlocked}
                    className={cn(
                      'relative flex flex-col items-center justify-center gap-0.5 px-2.5 py-2 rounded-lg shrink-0 min-w-[62px] border transition-all',
                      active
                        ? 'bg-gradient-to-b from-purple-500/30 to-purple-500/10 border-purple-500 shadow-[0_0_18px_rgba(168,85,247,0.35)] text-white'
                        : unlocked
                        ? 'bg-warehouse-navyLight/30 hover:bg-warehouse-navyLight/50 border-warehouse-navyLight/50 text-gray-200 hover:text-white'
                        : 'bg-warehouse-navyDark/50 border-warehouse-navyLight/20 text-gray-600 cursor-not-allowed'
                    )}
                  >
                    {!unlocked && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40 backdrop-blur-[1px]">
                        <Lock className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                    <span className={cn('text-[11px] font-semibold', active ? 'text-purple-300' : '')}>
                      T{lvl.levelId}
                    </span>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: Math.min(5, Math.ceil(lvl.orderCount / 2)) }).map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            'w-2.5 h-2.5',
                            i < Math.ceil(lvl.orderCount / 2) ? 'text-purple-400 fill-purple-400' : 'text-gray-600'
                          )}
                        />
                      ))}
                    </div>
                    {best !== undefined && (
                      <span className="text-[9px] font-mono text-emerald-400/90">{best.toLocaleString()}</span>
                    )}
                  </motion.button>
                )
              })}
            </div>

            {!gameStarted ? (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleStartGame}
                className="shrink-0 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-indigo-600 hover:to-purple-500 text-white font-bold shadow-lg shadow-purple-500/30 transition-all text-sm"
              >
                开始限时挑战
              </motion.button>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    useGameStore.getState().resetGame()
                    setGameStarted(false)
                    setPlayerPath([{ ...START_POSITION }])
                  }}
                  className="px-4 py-2 rounded-lg bg-warehouse-navyLight/40 hover:bg-warehouse-navyLight/60 border border-warehouse-navyLight/50 text-gray-300 hover:text-white text-sm font-medium transition-colors"
                >
                  重置
                </motion.button>
              </div>
            )}
          </div>

          <div className="max-w-[1800px] mx-auto mt-2 flex items-center gap-3 px-1">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Zap className="w-3.5 h-3.5 text-purple-400" />
              <span className="font-semibold text-gray-200">{currentLevel.name}</span>
              <span className="text-gray-600">·</span>
              <span>{currentLevel.description}</span>
            </div>
            <div className="ml-auto flex items-center gap-4 text-[11px] text-gray-500 font-mono">
              <span>
                订单: <span className="text-white">{sortedOrders.length}</span>
              </span>
              <span>
                SKU: <span className="text-white">{currentLevel.totalSkuCount}</span>
              </span>
              <span>
                事件率: <span className="text-yellow-400">{Math.round(currentLevel.eventProbability * 100)}%</span>
              </span>
              <span>
                基准: <span className="text-purple-400">{currentLevel.baseScore}</span>
              </span>
            </div>
          </div>

          {gameStarted && (
            <div className="max-w-[1800px] mx-auto mt-2 flex items-center gap-4 px-1">
              <div className="flex-1 flex items-center gap-2">
                <TrendingDown className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <div className="flex-1 h-2.5 rounded-full bg-warehouse-navyLight/40 overflow-hidden relative">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${completionProgress * 100}%` }}
                    transition={{ duration: 0.4 }}
                  />
                  <div
                    className={cn(
                      'absolute inset-y-0 bg-gradient-to-r from-red-500/40 to-yellow-500/30 rounded-full',
                      isUrgentTime ? 'animate-pulse' : ''
                    )}
                    style={{ left: 0, width: `${timeProgress * 100}%`, opacity: 0.35 }}
                  />
                </div>
                <div className="flex items-center gap-3 text-[10px] font-mono shrink-0">
                  <span className="text-emerald-400 font-bold">
                    {Math.round(completionProgress * 100)}% 完成
                  </span>
                  <span className={cn('font-bold', isUrgentTime ? 'text-red-500' : 'text-gray-400')}>
                    {Math.round(timeProgress * 100)}% 时间
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <ShoppingBag className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-gray-400">已完成:</span>
                <span className="font-bold text-white font-mono">{completedOrdersCount}</span>
                <span className="text-gray-600">/ {sortedOrders.length} 单</span>
              </div>
            </div>
          )}
        </div>

        {gameStarted && sortedOrders.length > 1 && (
          <div className="absolute top-[148px] right-4 z-30 flex flex-col gap-1.5 max-w-[220px]">
            <AnimatePresence>
              {sortedOrders.slice(0, 8).map((order, idx) => {
                const items = gameState.orderItems.filter((oi) => oi.orderId === order.orderId)
                const allDone = items.length > 0 && items.every((i) => i.picked)
                const remain = items.filter((i) => !i.picked).length
                const isCurrent = order.orderId === gameState.currentOrderId
                const hintMatch = mergeHints.find((h) => h.includes(order.orderId))

                return (
                  <motion.div
                    key={order.orderId}
                    layout
                    initial={{ opacity: 0, x: 30, scale: 0.95 }}
                    animate={{
                      opacity: allDone ? 0.4 : 1,
                      x: idx * 3,
                      scale: 1 - idx * 0.015,
                      y: idx * 2,
                    }}
                    exit={{ opacity: 0, x: 30, scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 30, delay: idx * 0.03 }}
                    className={cn(
                      'relative rounded-xl border-2 px-2.5 py-2 shadow-lg backdrop-blur-md',
                      allDone
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : isCurrent
                        ? 'bg-gradient-to-br from-purple-500/25 to-indigo-500/15 border-purple-400/60 shadow-[0_0_14px_rgba(168,85,247,0.4)]'
                        : order.priority >= 4
                        ? 'bg-gradient-to-br from-red-500/20 to-orange-500/10 border-red-500/50'
                        : 'bg-warehouse-navy/80 border-warehouse-navyLight/50'
                    )}
                    style={{ zIndex: 50 - idx }}
                  >
                    {hintMatch && (
                      <div className="absolute -left-1.5 -top-1.5">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-5 h-5 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white shadow-md border border-white/30"
                          title="可合并"
                        >
                          <Merge className="w-3 h-3" />
                        </motion.div>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-1.5 mb-1">
                      <div className="flex items-center gap-1 min-w-0">
                        {order.type === 'urgent' && (
                          <AlertOctagon className="w-3 h-3 text-red-400 shrink-0 animate-pulse" />
                        )}
                        {order.type === 'batch' && (
                          <Sparkles className="w-3 h-3 text-cyan-400 shrink-0" />
                        )}
                        <span className="font-mono text-[10px] font-bold text-white truncate">
                          #{order.orderId.slice(-5)}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {Array.from({ length: Math.min(5, order.priority) }).map((_, i) => (
                          <ArrowUpRight
                            key={i}
                            className={cn(
                              'w-2.5 h-2.5',
                              i < order.priority ? 'text-yellow-400' : 'text-gray-700'
                            )}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[9px] font-mono">
                      <span className={cn(allDone ? 'text-emerald-400' : 'text-gray-400')}>
                        {remain === 0 ? '已完成' : `剩${remain}件`}
                      </span>
                      <span
                        className={cn(
                          'font-bold',
                          allDone
                            ? 'text-emerald-400'
                            : isCurrent
                            ? 'text-purple-300'
                            : 'text-gray-400'
                        )}
                      >
                        {items.filter((i) => i.picked).length}/{items.length}
                      </span>
                    </div>
                    <div className="mt-1 h-1 rounded-full bg-black/30 overflow-hidden">
                      <motion.div
                        className={cn(
                          'h-full rounded-full',
                          allDone
                            ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                            : 'bg-gradient-to-r from-purple-400 to-indigo-500'
                        )}
                        initial={{ width: 0 }}
                        animate={{
                          width: items.length > 0
                            ? `${(items.filter((i) => i.picked).length / items.length) * 100}%`
                            : '0%',
                        }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>

            <AnimatePresence>
              {mergeHints.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="mt-2 space-y-1.5"
                >
                  {mergeHints.map((hint, idx) => (
                    <motion.button
                      key={hint.join('|')}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.08, type: 'spring', stiffness: 300 }}
                      whileHover={{ scale: 1.03, y: -1 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleMergeOrders(hint)}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-400/50 hover:border-cyan-400 hover:from-cyan-500/30 hover:to-blue-500/30 transition-all group"
                    >
                      <div className="w-7 h-7 shrink-0 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white shadow-md">
                        <GitMerge className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="text-[10px] font-bold text-cyan-300 mb-0.5 flex items-center gap-1">
                          建议合并拣货
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-400/20 text-cyan-200">+{hint.length * 30}分</span>
                        </div>
                        <div className="text-[9px] text-gray-400 font-mono truncate">
                          #{hint.map((h) => h.slice(-3)).join(' · #')}
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-cyan-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <div className="flex-1 flex flex-row overflow-hidden p-3 gap-3">
          <div className="relative flex-[7] min-w-0 rounded-2xl overflow-hidden border border-warehouse-navyLight/40 shadow-warehouse bg-warehouse-navyDark/50">
            <WarehouseMap
              playerPosition={gameState.playerPosition}
              targetLocations={targetLocations.filter((l) => !lockedLocations.has(l))}
              selectedLocationId={selectedLocationId}
              shelves={SHELVES}
              locations={LOCATIONS}
              stockItems={STOCK_ITEMS}
              showPath={playerPath.length > 1}
              playerPath={playerPath}
              onLocationClick={handleLocationClick}
            />

            {gameStarted && (
              <HUD
                timeMs={remainingMs <= 0 ? 0 : (currentLevel.timeLimitSec * 1000) - remainingMs}
                accuracy={accuracy}
                score={currentScore}
                pathEfficiency={pathEfficiency}
                levelName={currentLevel.name}
                totalItems={totalItems}
                completedItems={completedItems}
              />
            )}

            {!gameStarted && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/55 backdrop-blur-sm z-20">
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="text-center max-w-md px-8"
                >
                  <div className="text-5xl mb-4">⏱️</div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    {currentLevel.name}
                  </h2>
                  <p className="text-gray-300 mb-6 text-sm leading-relaxed">
                    {currentLevel.description}
                  </p>
                  <div className="grid grid-cols-3 gap-2 mb-6 text-left">
                    <div className="rounded-lg bg-warehouse-navy/80 border border-warehouse-navyLight/40 p-3">
                      <div className="text-[10px] text-gray-400 mb-1">订单数</div>
                      <div className="text-xl font-bold text-white font-mono">{currentLevel.orderCount}</div>
                    </div>
                    <div className="rounded-lg bg-warehouse-navy/80 border border-warehouse-navyLight/40 p-3">
                      <div className="text-[10px] text-gray-400 mb-1">时间限制</div>
                      <div className="text-xl font-bold text-red-400 font-mono animate-pulse">
                        {Math.floor(currentLevel.timeLimitSec / 60)}:
                        {String(currentLevel.timeLimitSec % 60).padStart(2, '0')}
                      </div>
                    </div>
                    <div className="rounded-lg bg-warehouse-navy/80 border border-warehouse-navyLight/40 p-3">
                      <div className="text-[10px] text-gray-400 mb-1">难度</div>
                      <div className="flex items-center gap-0.5 mt-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              'w-3 h-3',
                              i < currentLevel.difficulty ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 space-y-1 mb-6 text-left rounded-lg bg-red-500/10 border border-red-500/30 p-3">
                    <p className="text-red-300 font-bold mb-2">⚠️ 限时关特殊规则</p>
                    <p><span className="text-yellow-400 font-semibold">剩余时间×2</span> 转换奖励分</p>
                    <p><span className="text-cyan-400 font-semibold">合并同区订单</span> 每单+30分</p>
                    <p><span className="text-red-400 font-semibold">未完成item</span> 漏拣扣分每件50</p>
                    <p><span className="text-purple-400 font-semibold">随机事件</span> 订单取消/紧急插入</p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleStartGame}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold text-lg shadow-lg shadow-red-500/30 transition-all"
                  >
                    开始限时挑战
                  </motion.button>
                </motion.div>
              </div>
            )}

            {lockedLocations.size > 0 && gameStarted && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-4 left-4 z-30"
              >
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/20 border border-blue-500/40 backdrop-blur-md">
                  <AlertTriangle className="w-4 h-4 text-blue-400 animate-pulse" />
                  <span className="text-xs text-blue-200 font-medium">
                    {lockedLocations.size} 个货位补货中
                  </span>
                </div>
              </motion.div>
            )}

            {mergedCount > 0 && gameStarted && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-4 right-4 z-30"
              >
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/40 backdrop-blur-md">
                  <GitMerge className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs text-cyan-200 font-medium">
                    已合并 {mergedCount} 单 (+{mergedCount * 30}分)
                  </span>
                </div>
              </motion.div>
            )}
          </div>

          <div className="flex-[3] min-w-[340px] max-w-[460px] flex flex-col gap-3">
            <div className="flex-1 min-h-0 overflow-hidden">
              <OrderPanel
                orders={ordersForPanel}
                currentOrderId={gameState.currentOrderId}
                currentItemId={currentItemId}
                pickedQuantities={pickedQuantities}
                stockItems={STOCK_ITEMS}
              />
            </div>
            <div className="flex-[1.2] min-h-[420px] overflow-hidden">
              <OperationPanel
                selectedLocation={selectedLocation}
                stockInfo={selectedStock}
                currentOrderItem={
                  currentItem
                    ? {
                        itemId: currentItem.itemId,
                        sku: currentItem.sku,
                        requiredQty: currentItem.requiredQty,
                      }
                    : null
                }
                toteItems={gameState.toteItems.map((t) => ({
                  sku: t.sku,
                  quantity: t.quantity,
                  locationId: t.locationId,
                }))}
                toteCapacity={gameState.toteCapacity}
                isScanning={isScanning}
                isPicking={isPicking}
                scanResult={scanResult}
                onScan={handleScan}
                onPick={handlePick}
              />
            </div>
          </div>
        </div>
      </div>

      <GameNotification
        events={notifications}
        onDismiss={dismissNotification}
        autoDismissMs={4500}
      />

      <LevelResultModal
        open={showResult}
        result={resultData}
        onViewReplay={() => {
          if (gameState.sessionId) navigate(`/review/${gameState.sessionId}`)
        }}
        onPlayAgain={() => {
          setShowResult(false)
          setResultData(null)
          handleStartGame()
        }}
        onBackToMenu={() => navigate('/')}
      />
    </div>
  )
}
