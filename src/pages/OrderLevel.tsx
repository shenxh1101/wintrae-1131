import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  Lock,
  Star,
  Check,
  ChevronLeft,
  AlertTriangle,
  Package,
} from 'lucide-react'
import { useGameStore } from '@/store/useGameStore'
import { usePlayerStore } from '@/store/usePlayerStore'
import { useScoreStore } from '@/store/useScoreStore'
import WarehouseMap from '@/components/WarehouseMap'
import HUD from '@/components/HUD'
import OrderPanel from '@/components/OrderPanel'
import OperationPanel from '@/components/OperationPanel'
import GameNotification, { GameEventNotification } from '@/components/GameNotification'
import LevelResultModal, { LevelResultData, GradeRank, ScoreDetailItem } from '@/components/LevelResultModal'
import {
  ORDER_LEVELS,
  TIMED_LEVELS,
  LOCATIONS,
  SHELVES,
  STOCK_ITEMS,
  START_POSITION,
  CHECKOUT_POSITION,
  GAME_CONFIG,
  getLocationById,
  getStockByLocation,
  getStockBySku,
  getProductBySku,
  type Location as MockLocation,
} from '@/data/mockData'
import type {
  Order,
  OrderItem,
  Position,
  Score as ScoreType,
  GameSession,
  RaceCondition,
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
    if (
      c.x >= 0 &&
      c.x < 20 &&
      c.y >= 0 &&
      c.y < 15 &&
      !grid[c.y][c.x].isObstacle
    ) {
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

export default function OrderLevel() {
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

  const animFrameRef = useRef<number | null>(null)
  const targetPosRef = useRef<Position | null>(null)
  const lastMoveLogRef = useRef<number>(0)
  const eventTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const raceConditionTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const unlockedLevels = usePlayerStore((s) => s.unlockedLevels)
  const bestScores = usePlayerStore((s) => s.bestScores)
  const unlockLevel = usePlayerStore((s) => s.unlockLevel)
  const checkAndUnlockTimedLevel = usePlayerStore((s) => s.checkAndUnlockTimedLevel)
  const updateBestScore = usePlayerStore((s) => s.updateBestScore)
  const addTrainingTime = usePlayerStore((s) => s.addTrainingTime)
  const updateAchievement = usePlayerStore((s) => s.updateAchievement)
  const updateAbilityRadar = usePlayerStore((s) => s.updateAbilityRadar)
  const achievement = usePlayerStore((s) => s.achievement)
  const playerId = usePlayerStore((s) => s.playerId)
  const nickname = usePlayerStore((s) => s.nickname)
  const addScoreRecord = useScoreStore((s) => s.addScoreRecord)

  const gameState = useGameStore()
  const grid = useMemo(() => buildGrid(), [])

  const currentLevel = ORDER_LEVELS.find((l) => l.levelId === selectedLevelId) ?? ORDER_LEVELS[0]

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

  const initializeOrdersForLevel = useCallback(
    (levelId: number) => {
      const level = ORDER_LEVELS.find((l) => l.levelId === levelId)
      if (!level) return

      const orderId = generateId('ord')
      const order: Order = {
        orderId,
        priority: 2,
        type: 'normal',
        createdAt: new Date().toISOString(),
      }

      const orderItems: OrderItem[] = level.orderItems.map((cfg) => {
        return {
          itemId: generateId('item'),
          orderId,
          sku: cfg.sku,
          requiredQty: cfg.requiredQty,
          picked: false,
          pickedQty: 0,
        }
      })

      useGameStore.getState().setLevel('order', levelId, level.timeLimitSec * 1000)
      useGameStore.getState().setOrders([order], orderItems)
      useGameStore.getState().setStocks([...STOCK_ITEMS])
    },
    []
  )

  const handleStartGame = useCallback(() => {
    initializeOrdersForLevel(selectedLevelId)
    useGameStore.getState().startGame()
    setGameStarted(true)
    setPlayerPath([{ ...START_POSITION }])
    setNotifications([])
    setScanResult(null)
    setSelectedLocationId(null)
    setLockedLocations(new Set())
    setNearExpiryBonus(0)
    setEventBonus(0)
    setShowResult(false)
    setResultData(null)
  }, [selectedLevelId, initializeOrdersForLevel])

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
      const stepMs = 16
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
          useGameStore.getState().addOperationLog('move', `x:${nextPos.x.toFixed(1)},y:${nextPos.y.toFixed(1)}`, true)
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
    const rand = Math.random()
    if (rand > 0.1) return

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

    pushNotification('restock', `⚠️ 货位 ${loc.locationId} 正在补货，临时锁定 ${GAME_CONFIG.eventLockDurationMs / 1000} 秒`)

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
  }, [lockedLocations, targetLocations, pushNotification])

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
        const result = state.pickItem(qty)
        if (result.success) {
          const stock = getStockByLocation(result.scannedLocationId!)
          if (stock?.isNearExpiry) {
            setNearExpiryBonus((prev) => prev + GAME_CONFIG.nearExpiryBonus)
            pushNotification('success', `✅ 临期品优先拣取，+${GAME_CONFIG.nearExpiryBonus}分`)
          }
          pushNotification('success', `✅ 拣取成功: ${result.scannedSku} x${qty}`)
          showFeedback('success')
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

        if (state.isAllOrdersCompleted()) {
          setTimeout(() => finalizeGame(true), 500)
        }
      }, GAME_CONFIG.pickAnimationMs)
    },
    [scanResult, showFeedback, pushNotification]
  )

  const finalizeGame = useCallback(
    (completed: boolean) => {
      const state = useGameStore.getState()
      state.endGame(completed)

      const elapsedMs = state.elapsedMs > 0 ? state.elapsedMs : (state.startTime ? Date.now() - state.startTime : 0)
      const correctOps = state.operationLogs.filter((l) => l.isCorrect).length
      const totalOps = state.operationLogs.filter((l) => l.action === 'pick' || l.action === 'scan').length
      const finalAccuracy = totalOps > 0 ? (correctOps / totalOps) * 100 : 100

      let optimalLen = 0
      const remainingTargets: Point[] = targetLocations
        .map((lid) => getLocationById(lid))
        .filter(Boolean)
        .map((l) => {
          const p = findAdjacentAisle(l!, grid)
          return p ?? { x: 10, y: 13 }
        })
      remainingTargets.push({ x: Math.round(CHECKOUT_POSITION.x), y: Math.round(CHECKOUT_POSITION.y) })
      if (remainingTargets.length > 0) {
        const start: Point = { x: Math.round(START_POSITION.x), y: Math.round(START_POSITION.y) }
        const all = [start, ...remainingTargets]
        for (let i = 0; i < all.length - 1; i++) {
          const r = findPath(grid, all[i], all[i + 1])
          optimalLen += r.pathLength
        }
      }
      const actualLen = playerPath.length
      const pathScoreVal = calculatePathScore(optimalLen, actualLen, GAME_CONFIG.maxPathScore)

      const timeLimitMs = state.timeLimitMs ?? currentLevel.timeLimitSec * 1000
      const remainingMs = Math.max(0, timeLimitMs - elapsedMs)
      const timeBonusVal = Math.min(
        GAME_CONFIG.maxTimeBonus,
        Math.round((remainingMs / timeLimitMs) * GAME_CONFIG.maxTimeBonus)
      )

      const accuracyScoreVal = Math.round((finalAccuracy / 100) * GAME_CONFIG.maxAccuracyScore)
      const baseScoreVal = currentLevel.baseScore

      const missedItems = state.orderItems.filter((oi) => !oi.picked).length
      const wrongPicksCount = state.operationLogs.filter(
        (l) => l.action === 'pick' && !l.isCorrect
      ).length
      const missPenaltyVal = missedItems * GAME_CONFIG.missPickPenalty
      const wrongPenaltyVal = wrongPicksCount * GAME_CONFIG.wrongPickPenalty

      const totalScore = Math.max(
        0,
        baseScoreVal + timeBonusVal + accuracyScoreVal + pathScoreVal + nearExpiryBonus + eventBonus - wrongPenaltyVal - missPenaltyVal
      )

      const maxPossibleScore =
        currentLevel.baseScore +
        GAME_CONFIG.maxTimeBonus +
        GAME_CONFIG.maxAccuracyScore +
        GAME_CONFIG.maxPathScore +
        nearExpiryBonus +
        eventBonus
      const grade = calcGrade(totalScore, maxPossibleScore)
      const stars = grade === 'S' ? 3 : grade === 'A' ? 3 : grade === 'B' ? 2 : grade === 'C' ? 1 : 0

      const bestKey = `order-${selectedLevelId}`
      const prevBest = bestScores[bestKey] ?? 0
      const isNewBest = totalScore > prevBest

      if (completed) {
        unlockLevel(selectedLevelId, 'order')
        checkAndUnlockTimedLevel()
      }
      if (isNewBest) {
        updateBestScore(bestKey, totalScore)
      }
      addTrainingTime(Math.round(elapsedMs / 60000))

      const newTotalGames = (achievement.totalGames ?? 0) + 1
      updateAchievement({ totalGames: newTotalGames })

      const speedValue = Math.min(100, Math.round((totalScore / (elapsedMs / 60000)) / 10))
      const accuracyValue = Math.round(finalAccuracy)
      const pathValue = Math.round(pathScoreVal)
      const emergencyValue = Math.min(100, Math.round(eventBonus > 0 ? 100 : 50))
      updateAbilityRadar('speed', speedValue)
      updateAbilityRadar('accuracy', accuracyValue)
      updateAbilityRadar('pathPlanning', pathValue)
      updateAbilityRadar('emergency', emergencyValue)

      const details: ScoreDetailItem[] = [
        { id: 'base', label: '基础分', value: baseScoreVal, maxValue: currentLevel.baseScore, type: 'positive' },
        { id: 'time', label: '时间奖励', value: timeBonusVal, maxValue: GAME_CONFIG.maxTimeBonus, type: 'positive' },
        { id: 'acc', label: '准确率得分', value: accuracyScoreVal, maxValue: GAME_CONFIG.maxAccuracyScore, type: 'positive' },
        { id: 'path', label: '路径规划分', value: pathScoreVal, maxValue: GAME_CONFIG.maxPathScore, type: 'positive' },
        { id: 'near', label: '临期品奖励', value: nearExpiryBonus, type: 'positive' },
        { id: 'event', label: '应急处理奖励', value: eventBonus, type: 'positive' },
        { id: 'wrong', label: '误操作扣分', value: wrongPenaltyVal, type: 'negative' },
        { id: 'miss', label: '漏拣扣分', value: missPenaltyVal, type: 'negative' },
      ]

      const scoreRecord: ScoreType = {
        scoreId: generateId('scr'),
        sessionId: state.sessionId,
        totalScore,
        accuracy: Number(finalAccuracy.toFixed(1)),
        timeBonus: timeBonusVal,
        pathScore: pathScoreVal,
        penaltyPoints: wrongPenaltyVal + missPenaltyVal,
        rank: 0,
        nearExpiryBonus,
        raceConditionBonus: eventBonus,
        operationLogs: [...state.operationLogs],
        playerPath: [...playerPath],
        scoreDetails: details,
        mergeBonus: 0,
        missPenalty: missPenaltyVal,
        wrongPenalty: wrongPenaltyVal,
        levelName: currentLevel.name,
        completed,
      }

      const session: GameSession = {
        sessionId: state.sessionId,
        playerId,
        levelType: 'order',
        levelId: selectedLevelId,
        durationMs: elapsedMs,
        startTime: state.startTime ? new Date(state.startTime).toISOString() : new Date().toISOString(),
        endTime: new Date().toISOString(),
        status: completed ? 'completed' : 'failed',
      }
      addScoreRecord(scoreRecord, session, nickname, currentLevel.name)

      const unlocks: { id: string; title: string; description: string; icon: 'level' | 'achievement' | 'skin' }[] = []
      if (completed && selectedLevelId === 3 && !usePlayerStore.getState().unlockedTimedLevels.includes(1)) {
        unlocks.push({
          id: 'timed-1',
          title: '解锁限时关 T1',
          description: TIMED_LEVELS.find((l) => l.levelId === 1)?.name ?? '新限时关卡',
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
        penaltyPoints: wrongPenaltyVal + missPenaltyVal,
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
      selectedLevelId,
      bestScores,
      unlockLevel,
      checkAndUnlockTimedLevel,
      updateBestScore,
      addTrainingTime,
      updateAchievement,
      updateAbilityRadar,
      achievement,
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
          if (!isPicking && scanResult?.success) {
            handlePick(1)
          }
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [gameStarted, showResult, handleKeyStepMove, handleScan, handlePick, isScanning, isPicking, scanResult])

  useEffect(() => {
    if (!gameStarted || showResult) return
    let raf: number
    let lastTick = Date.now()

    const tick = () => {
      const state = useGameStore.getState()
      if (!state.isPaused && !state.isEnded && state.startTime) {
        const now = Date.now()
        state.updateElapsedTime(now - state.startTime)

        if (state.timeLimitMs && state.elapsedMs >= state.timeLimitMs) {
          finalizeGame(state.isAllOrdersCompleted())
          return
        }
      }
      lastTick = Date.now()
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    eventTimerRef.current = setInterval(() => {
      const s = useGameStore.getState()
      if (s.isPaused || s.isEnded || !s.isStarted) return
      triggerRaceCondition()
    }, 8000)

    return () => {
      cancelAnimationFrame(raf)
      if (eventTimerRef.current) clearInterval(eventTimerRef.current)
    }
  }, [gameStarted, showResult, finalizeGame, triggerRaceCondition])

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (eventTimerRef.current) clearInterval(eventTimerRef.current)
      raceConditionTimersRef.current.forEach((t) => clearTimeout(t))
      raceConditionTimersRef.current.clear()
    }
  }, [])

  const selectedLocation = selectedLocationId ? getLocationById(selectedLocationId) ?? null : null
  const selectedStock = selectedLocationId ? getStockByLocation(selectedLocationId) ?? null : null

  const ordersForPanel = useMemo(() => {
    return gameState.orders.map((o) => {
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
  }, [gameState.orders, gameState.orderItems])

  const currentItemId = currentItem?.itemId ?? null
  const pickedQuantities = useMemo(() => {
    const map: Record<string, number> = {}
    gameState.orderItems.forEach((oi) => {
      map[oi.itemId] = oi.pickedQty ?? 0
    })
    return map
  }, [gameState.orderItems])

  const currentScore = useMemo(() => {
    const elapsedMs = gameState.elapsedMs
    const timeLimitMs = gameState.timeLimitMs ?? currentLevel.timeLimitSec * 1000
    const remainingMs = Math.max(0, timeLimitMs - elapsedMs)
    const timeB = Math.min(GAME_CONFIG.maxTimeBonus, Math.round((remainingMs / timeLimitMs) * GAME_CONFIG.maxTimeBonus))
    const accS = Math.round((accuracy / 100) * GAME_CONFIG.maxAccuracyScore)
    const wrongPicks = gameState.operationLogs.filter((l) => l.action === 'pick' && !l.isCorrect).length
    const pen = wrongPicks * GAME_CONFIG.wrongPickPenalty
    const itemProgress = (completedItems / Math.max(1, totalItems)) * currentLevel.baseScore
    return Math.max(0, Math.round(itemProgress + timeB + accS + nearExpiryBonus + eventBonus - pen))
  }, [gameState.elapsedMs, gameState.timeLimitMs, currentLevel.baseScore, accuracy, gameState.operationLogs, completedItems, totalItems, nearExpiryBonus, eventBonus])

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

            <div className="flex-1 flex items-center gap-1.5 min-w-0 overflow-x-auto pb-1">
              {ORDER_LEVELS.map((lvl) => {
                const unlocked = unlockedLevels.includes(lvl.levelId)
                const active = selectedLevelId === lvl.levelId
                const best = bestScores[`order-${lvl.levelId}`]
                const diffStars = lvl.levelId

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
                        ? 'bg-gradient-to-b from-warehouse-orange/30 to-warehouse-orange/10 border-warehouse-orange shadow-[0_0_18px_rgba(255,107,53,0.35)] text-white'
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
                    <span className={cn('text-[11px] font-semibold', active ? 'text-warehouse-orange' : '')}>
                      L{lvl.levelId}
                    </span>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: Math.min(5, Math.ceil(diffStars / 2)) }).map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            'w-2.5 h-2.5',
                            i < Math.ceil(diffStars / 2) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'
                          )}
                        />
                      ))}
                    </div>
                    {best !== undefined && (
                      <span className="text-[9px] font-mono text-emerald-400/90">
                        {best.toLocaleString()}
                      </span>
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
                className="shrink-0 px-5 py-2.5 rounded-xl bg-gradient-to-r from-warehouse-orange to-warehouse-orangeDark hover:from-warehouse-orangeDark hover:to-warehouse-orange text-white font-bold shadow-lg shadow-warehouse-orange/30 transition-all text-sm"
              >
                开始挑战
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
              <Package className="w-3.5 h-3.5 text-warehouse-orange" />
              <span className="font-semibold text-gray-200">{currentLevel.name}</span>
              <span className="text-gray-600">·</span>
              <span>{currentLevel.description}</span>
            </div>
            <div className="ml-auto flex items-center gap-4 text-[11px] text-gray-500 font-mono">
              <span>SKU: {currentLevel.skuCount}</span>
              <span>时限: {Math.floor(currentLevel.timeLimitSec / 60)}分{currentLevel.timeLimitSec % 60}秒</span>
              <span>基准: {currentLevel.baseScore}</span>
            </div>
          </div>
        </div>

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
                timeMs={gameState.elapsedMs}
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
                  <div className="text-5xl mb-4">📦</div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    {currentLevel.name}
                  </h2>
                  <p className="text-gray-300 mb-6 text-sm leading-relaxed">
                    {currentLevel.description}
                  </p>
                  <div className="grid grid-cols-3 gap-2 mb-6 text-left">
                    <div className="rounded-lg bg-warehouse-navy/80 border border-warehouse-navyLight/40 p-3">
                      <div className="text-[10px] text-gray-400 mb-1">商品数</div>
                      <div className="text-xl font-bold text-white font-mono">{currentLevel.skuCount}</div>
                    </div>
                    <div className="rounded-lg bg-warehouse-navy/80 border border-warehouse-navyLight/40 p-3">
                      <div className="text-[10px] text-gray-400 mb-1">时间限制</div>
                      <div className="text-xl font-bold text-white font-mono">
                        {Math.floor(currentLevel.timeLimitSec / 60)}:
                        {String(currentLevel.timeLimitSec % 60).padStart(2, '0')}
                      </div>
                    </div>
                    <div className="rounded-lg bg-warehouse-navy/80 border border-warehouse-navyLight/40 p-3">
                      <div className="text-[10px] text-gray-400 mb-1">基础分</div>
                      <div className="text-xl font-bold text-warehouse-orange font-mono">
                        {currentLevel.baseScore}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 space-y-1 mb-6">
                    <p><span className="text-warehouse-orange font-semibold">WASD / 方向键</span> 移动角色</p>
                    <p><span className="text-warehouse-orange font-semibold">空格键</span> 扫描货位</p>
                    <p><span className="text-warehouse-orange font-semibold">E键</span> 放入周转箱</p>
                    <p><span className="text-warehouse-orange font-semibold">点击货位</span> 自动移动并选中</p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleStartGame}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-warehouse-orange to-warehouse-orangeDark hover:from-warehouse-orangeDark hover:to-warehouse-orange text-white font-bold text-lg shadow-lg shadow-warehouse-orange/30 transition-all"
                  >
                    开始挑战
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
