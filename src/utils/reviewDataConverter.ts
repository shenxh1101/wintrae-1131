import type { Score, OperationLog as ScoreOperationLog, Position, ScoreRecord } from '../types'
import {
  type OperationLog,
  type ActionPayload,
  type ErrorType,
  identifyErrorNodes,
  countErrorsByType,
} from './replayUtils'
import { findPath, type GridNode } from './pathfinding'
import { SHELVES, getLocationById, ORDER_LEVELS, TIMED_LEVELS, START_POSITION, CHECKOUT_POSITION } from '../data/mockData'
import type { Location as MockLocation } from '../data/mockData'

export interface ReviewSessionData {
  sessionId: string
  levelName: string
  levelId: number
  levelType: 'tutorial' | 'order' | 'timed'
  durationMs: number
  score: number
  accuracy: number
  operations: OperationLog[]
  playerPath: Position[]
  optimalPath: Position[]
  optimalOrderSequence: { locationId: string; order: number }[]
  errorPositions: { x: number; y: number; errorType: ErrorType }[]
  itemPickTimes: { name: string; time: number }[]
  abilityScores: {
    time: number
    accuracy: number
    pathPlanning: number
    emergency: number
  }
  scoreBreakdown: {
    baseScore: number
    timeBonus: number
    accuracyScore: number
    pathScore: number
    mergeBonus: number
    nearExpiryBonus: number
    restockBonus: number
    wrongPickPenalty: number
    missedPickPenalty: number
  }
  timestamp: string
  nickname: string
}

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

function findAdjacentAisle(targetLoc: MockLocation, grid: GridNode[][]): { x: number; y: number } | null {
  const tx = Math.round(targetLoc.posX)
  const ty = Math.round(targetLoc.posY)
  const candidates = [
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

function parsePayload(payload: string | ActionPayload): ActionPayload {
  if (typeof payload === 'string') {
    const result: ActionPayload = {}
    const str = payload

    if (str.startsWith('x:') && str.includes(',y:')) {
      const parts = str.split(',')
      for (const part of parts) {
        const [key, value] = part.split(':')
        if (key === 'x') result.playerX = parseFloat(value)
        if (key === 'y') result.playerY = parseFloat(value)
      }
    } else if (str.startsWith('locked:')) {
      result.locationId = str.replace('locked:', '')
    } else if (str.includes(':')) {
      const parts = str.split(':')
      result.locationId = parts[0]
      result.sku = parts[1]
    } else if (str === 'no_location') {
      result.locationId = 'unknown'
    } else if (str.startsWith('LOC-') || str.startsWith('SHELF-')) {
      result.locationId = str
    }
    return result
  }
  return payload as ActionPayload
}

function convertOperationLogs(logs: ScoreOperationLog[]): OperationLog[] {
  return logs.map(log => {
    const payload = parsePayload(log.payload)

    if (log.playerPosition) {
      payload.playerX = log.playerPosition.x
      payload.playerY = log.playerPosition.y
    }

    let errorType: ErrorType | undefined
    if (log.errorType) {
      const etMap: Record<string, ErrorType> = {
        'wrong_location': 'wrong_location',
        'wrong_sku': 'wrong_sku',
        'wrong_qty': 'wrong_quantity',
        'wrong_order': 'wrong_order',
        'missed_pick': 'missed',
      }
      errorType = etMap[log.errorType]
    }

    return {
      logId: log.logId,
      sessionId: log.sessionId,
      timestamp: log.timestamp,
      action: log.action as OperationLog['action'],
      payload,
      isCorrect: log.isCorrect,
      errorType,
      errorMessage: undefined,
    }
  })
}

function computeOptimalPath(targetLocations: string[]): {
  path: Position[]
  sequence: { locationId: string; order: number }[]
} {
  const grid = buildGrid()
  const path: Position[] = [{ ...START_POSITION }]
  const sequence: { locationId: string; order: number }[] = []

  let currentPos = { ...START_POSITION }

  targetLocations.forEach((locId, idx) => {
    const loc = getLocationById(locId)
    if (!loc) return

    const aisle = findAdjacentAisle(loc, grid)
    if (!aisle) return

    const segment = findPath(grid, currentPos, aisle)
    if (segment.length > 0) {
      path.push(...segment.slice(1))
    }

    path.push({ x: Math.floor(loc.posX), y: Math.floor(loc.posY) })
    sequence.push({ locationId: locId, order: idx + 1 })
    currentPos = { x: Math.floor(loc.posX), y: Math.floor(loc.posY) }
  })

  const checkout = findPath(grid, currentPos, CHECKOUT_POSITION)
  if (checkout.length > 0) {
    path.push(...checkout.slice(1))
  }

  return { path, sequence }
}

function extractTargetLocations(operations: OperationLog[]): string[] {
  const locations = new Set<string>()
  operations.forEach(log => {
    if (log.action === 'scan' && log.payload.locationId && log.isCorrect) {
      locations.add(log.payload.locationId)
    }
    if (log.action === 'pick' && log.payload.locationId && log.isCorrect) {
      locations.add(log.payload.locationId)
    }
  })
  return Array.from(locations)
}

function extractItemPickTimes(operations: OperationLog[]): { name: string; time: number }[] {
  const items: { name: string; time: number }[] = []
  let lastPickTime = 0

  operations.forEach(log => {
    if (log.action === 'pick' && log.isCorrect) {
      const timeDiff = log.timestamp - lastPickTime
      lastPickTime = log.timestamp
      const name = log.payload.productName || log.payload.sku || '未知商品'
      items.push({
        name: name.slice(0, 6),
        time: Math.round(timeDiff / 1000),
      })
    }
  })

  return items
}

function calculateScoreBreakdown(
  score: Score,
  operations: OperationLog[]
): ReviewSessionData['scoreBreakdown'] {
  const errorNodes = identifyErrorNodes(operations)
  const errorCounts = countErrorsByType(errorNodes)

  const wrongPickPenalty = (errorCounts.wrong_sku || 0) * 30 +
    (errorCounts.wrong_quantity || 0) * 30 +
    (errorCounts.wrong_location || 0) * 30
  const missedPickPenalty = (errorCounts.missed || 0) * 50

  const accuracyScore = Math.round((score.accuracy / 100) * 300)
  const baseScore = 200

  return {
    baseScore,
    timeBonus: score.timeBonus || 0,
    accuracyScore,
    pathScore: score.pathScore || 0,
    mergeBonus: 0,
    nearExpiryBonus: score.nearExpiryBonus || 0,
    restockBonus: score.raceConditionBonus || 0,
    wrongPickPenalty,
    missedPickPenalty,
  }
}

function calculateAbilityScores(
  score: Score,
  operations: OperationLog[],
  playerPath: Position[],
  optimalPath: Position[]
): ReviewSessionData['abilityScores'] {
  const pathEff = optimalPath.length > 0 && playerPath.length > 0
    ? Math.min(100, Math.round((optimalPath.length / Math.max(1, playerPath.length)) * 100))
    : 0

  const emergencyBase = score.raceConditionBonus ? 100 : 50

  return {
    time: score.timeBonus ? Math.min(100, Math.round(score.timeBonus / 2)) : 0,
    accuracy: Math.round(score.accuracy),
    pathPlanning: pathEff,
    emergency: emergencyBase,
  }
}

function extractPlayerPathFromOperations(operations: OperationLog[]): Position[] {
  const path: Position[] = [{ ...START_POSITION }]
  operations.forEach(log => {
    if (log.action === 'move' && log.payload.playerX !== undefined && log.payload.playerY !== undefined) {
      path.push({
        x: Math.floor(log.payload.playerX),
        y: Math.floor(log.payload.playerY),
      })
    }
  })
  return path
}

export function convertScoreRecordToReviewData(record: ScoreRecord): ReviewSessionData | null {
  const { score, session, nickname, timestamp, levelName } = record

  if (!score.operationLogs || score.operationLogs.length === 0) {
    return null
  }

  const operations = convertOperationLogs(score.operationLogs)

  const playerPath = score.playerPath || extractPlayerPathFromOperations(operations)

  const targetLocations = extractTargetLocations(operations)
  const { path: optimalPath, sequence: optimalOrderSequence } = computeOptimalPath(targetLocations)

  const errorNodes = identifyErrorNodes(operations)
  const errorPositions = errorNodes.map(node => ({
    x: node.position.x,
    y: node.position.y,
    errorType: node.errorType,
  }))

  const itemPickTimes = extractItemPickTimes(operations)

  const scoreBreakdown = calculateScoreBreakdown(score, operations)

  const abilityScores = calculateAbilityScores(score, operations, playerPath, optimalPath)

  return {
    sessionId: session.sessionId,
    levelName,
    levelId: session.levelId,
    levelType: session.levelType,
    durationMs: session.durationMs,
    score: score.totalScore,
    accuracy: score.accuracy,
    operations,
    playerPath,
    optimalPath,
    optimalOrderSequence,
    errorPositions,
    itemPickTimes,
    abilityScores,
    scoreBreakdown,
    timestamp,
    nickname,
  }
}

export function getLevelName(levelType: string, levelId: number): string {
  if (levelType === 'order') {
    return ORDER_LEVELS.find(l => l.levelId === levelId)?.name || `订单训练关 ${levelId}`
  }
  if (levelType === 'timed') {
    return TIMED_LEVELS.find(l => l.levelId === levelId)?.name || `限时挑战关 ${levelId}`
  }
  if (levelType === 'tutorial') {
    return '新手教程'
  }
  return `关卡 ${levelId}`
}
