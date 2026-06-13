import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Download, AlertTriangle, XCircle, Package, ListOrdered,
  Play, Pause, SkipBack, SkipForward, Bookmark, BarChart3, Target,
  Clock, CheckCircle2, XSquare, TrendingUp, Lightbulb, Gauge,
  MapPin, Zap, Brain, ShieldAlert, Coins, MinusCircle, PlusCircle, Home
} from 'lucide-react'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { cn } from '@/lib/utils'
import { useScoreStore } from '@/store/useScoreStore'
import { SHELVES, LOCATIONS, getProductBySku } from '@/data/mockData'
import {
  identifyErrorNodes,
  extractKeyframes,
  serializeOperations,
  formatErrorType,
  countErrorsByType,
  extractPlayerPath,
  type OperationLog,
  type ErrorNode,
  type Keyframe,
  type ErrorType as ReplayErrorType
} from '@/utils/replayUtils'
import {
  convertScoreRecordToReviewData,
  type ReviewSessionData,
} from '@/utils/reviewDataConverter'
import type { Position } from '@/types'

const CELL_SIZE = 32
const GRID_WIDTH = 20
const GRID_HEIGHT = 15
const SVG_WIDTH = GRID_WIDTH * CELL_SIZE
const SVG_HEIGHT = GRID_HEIGHT * CELL_SIZE

const AREA_COLORS: Record<string, string> = {
  'A区': '#3B82F6',
  'B区': '#8B5CF6',
  'C区': '#10B981',
  'D区': '#F59E0B',
}

type TabType = 'errors' | 'replay' | 'analysis' | 'score'

interface ReviewMapProps {
  type: 'player' | 'optimal'
  path: Position[]
  errorMarkers?: { x: number; y: number; errorType: ReplayErrorType }[]
  orderSequence?: { locationId: string; order: number }[]
  highlightPos?: Position | null
  playerAnimPos?: Position
}

function ReviewMap({ type, path, errorMarkers = [], orderSequence = [], highlightPos, playerAnimPos }: ReviewMapProps) {
  const lineColor = type === 'player' ? '#FF6B35' : '#10B981'
  const lineGlowId = type === 'player' ? 'playerLineGlow' : 'optimalLineGlow'

  const pathD = useMemo(() => {
    if (path.length < 2) return ''
    return path
      .map((p, i) => {
        const x = p.x * CELL_SIZE + CELL_SIZE / 2
        const y = p.y * CELL_SIZE + CELL_SIZE / 2
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
      })
      .join(' ')
  }, [path])

  const locationMap = useMemo(() => {
    const map = new Map<string, typeof LOCATIONS[0]>()
    LOCATIONS.forEach(loc => map.set(loc.locationId, loc))
    return map
  }, [])

  const displayPlayerPos = playerAnimPos ?? (path.length > 0 ? path[path.length - 1] : { x: 10, y: 13 })

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-warehouse-navyDark rounded-xl overflow-hidden border border-warehouse-navyLight/50">
      <div className="absolute top-2 left-3 z-10 flex items-center gap-2">
        <div className={cn(
          'w-2 h-2 rounded-full',
          type === 'player' ? 'bg-warehouse-orange animate-pulse' : 'bg-warehouse-success animate-pulse'
        )} />
        <span className="text-xs font-semibold text-white/80">
          {type === 'player' ? '玩家实际路径' : '系统最优路径'}
        </span>
      </div>
      <svg
        width={SVG_WIDTH}
        height={SVG_HEIGHT}
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className="block max-w-full max-h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <pattern id={`grid-${type}`} width={CELL_SIZE} height={CELL_SIZE} patternUnits="userSpaceOnUse">
            <path
              d={`M ${CELL_SIZE} 0 L 0 0 0 ${CELL_SIZE}`}
              fill="none"
              stroke="rgba(107, 114, 128, 0.12)"
              strokeWidth="1"
            />
          </pattern>
          <filter id={lineGlowId}>
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id={`errPulse-${type}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#EF4444" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`playGlow-${type}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.6" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width={SVG_WIDTH} height={SVG_HEIGHT} fill={`url(#grid-${type})`} />

        {SHELVES.map(shelf => {
          const areaColor = AREA_COLORS[shelf.areaCode] || '#6B7280'
          return (
            <g key={shelf.shelfId}>
              <rect
                x={shelf.posX * CELL_SIZE}
                y={shelf.posY * CELL_SIZE}
                width={shelf.width * CELL_SIZE}
                height={shelf.height * CELL_SIZE}
                fill="#1F2937"
                stroke={areaColor}
                strokeWidth="1.5"
                rx="3"
                opacity="0.85"
              />
              <text
                x={shelf.posX * CELL_SIZE + 6}
                y={shelf.posY * CELL_SIZE + 14}
                fill={areaColor}
                fontSize="9"
                fontWeight="bold"
                fontFamily="monospace"
                opacity="0.7"
              >
                {shelf.shelfId.replace('SHELF-', '')}
              </text>
            </g>
          )
        })}

        {pathD && (
          <>
            <path
              d={pathD}
              fill="none"
              stroke={lineColor}
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.2"
            />
            <motion.path
              d={pathD}
              fill="none"
              stroke={lineColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter={`url(#${lineGlowId})`}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
            />
            {path.map((p, i) => (
              <circle
                key={`pt-${i}`}
                cx={p.x * CELL_SIZE + CELL_SIZE / 2}
                cy={p.y * CELL_SIZE + CELL_SIZE / 2}
                r="2"
                fill={lineColor}
                opacity={0.5}
              />
            ))}
          </>
        )}

        {orderSequence.map(item => {
          const loc = locationMap.get(item.locationId)
          if (!loc) return null
          const cx = loc.posX * CELL_SIZE + CELL_SIZE / 2
          const cy = loc.posY * CELL_SIZE + CELL_SIZE / 2
          return (
            <g key={`seq-${item.locationId}`}>
              <circle cx={cx} cy={cy} r="11" fill={lineColor} stroke="#fff" strokeWidth="1.5" />
              <text
                x={cx}
                y={cy + 1}
                fill="#fff"
                fontSize="10"
                fontWeight="bold"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {item.order}
              </text>
            </g>
          )
        })}

        {errorMarkers.map((m, i) => {
          const cx = m.x * CELL_SIZE + CELL_SIZE / 2
          const cy = m.y * CELL_SIZE + CELL_SIZE / 2
          return (
            <g key={`err-${i}`}>
              <motion.circle
                cx={cx}
                cy={cy}
                r="16"
                fill={`url(#errPulse-${type})`}
                animate={{ r: [10, 22, 10], opacity: [0.7, 0.1, 0.7] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              />
              <circle cx={cx} cy={cy} r="8" fill="#EF4444" stroke="#fff" strokeWidth="2" />
              <text
                x={cx}
                y={cy + 1}
                fill="#fff"
                fontSize="9"
                fontWeight="bold"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                !
              </text>
            </g>
          )
        })}

        {highlightPos && (
          <motion.rect
            x={highlightPos.x * CELL_SIZE - 2}
            y={highlightPos.y * CELL_SIZE - 2}
            width={CELL_SIZE + 4}
            height={CELL_SIZE + 4}
            fill="none"
            stroke="#FBBF24"
            strokeWidth="3"
            rx="4"
            initial={{ scale: 1.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          />
        )}

        <g>
          <rect
            x={18 * CELL_SIZE}
            y={13 * CELL_SIZE}
            width={CELL_SIZE}
            height={CELL_SIZE}
            fill="rgba(16, 185, 129, 0.15)"
            stroke="#10B981"
            strokeWidth="1.5"
            strokeDasharray="3 2"
            rx="3"
          />
          <text
            x={18 * CELL_SIZE + CELL_SIZE / 2}
            y={13 * CELL_SIZE + CELL_SIZE / 2 + 3}
            fill="#10B981"
            fontSize="8"
            textAnchor="middle"
            fontWeight="bold"
          >
            收银台
          </text>
        </g>

        {type === 'player' && (
          <g
            style={{
              transform: `translate(${displayPlayerPos.x * CELL_SIZE + CELL_SIZE / 2}px, ${displayPlayerPos.y * CELL_SIZE + CELL_SIZE / 2}px)`,
            }}
          >
            <motion.circle
              r={CELL_SIZE * 0.7}
              fill={`url(#playGlow-${type})`}
              animate={{ r: [CELL_SIZE * 0.55, CELL_SIZE * 0.85, CELL_SIZE * 0.55] }}
              transition={{ duration: 1.8, repeat: Infinity }}
            />
            <motion.circle
              r={CELL_SIZE * 0.28}
              fill={lineColor}
              stroke="#fff"
              strokeWidth="2"
            />
          </g>
        )}
      </svg>
    </div>
  )
}

const ERROR_CATEGORY_INFO: Record<ReplayErrorType, { label: string; icon: typeof AlertTriangle; color: string; bg: string }> = {
  wrong_sku: { label: '错拣', icon: XCircle, color: 'text-rose-400', bg: 'bg-rose-500/15 border-rose-500/30' },
  wrong_location: { label: '货位错误', icon: MapPin, color: 'text-orange-400', bg: 'bg-orange-500/15 border-orange-500/30' },
  wrong_quantity: { label: '数量错误', icon: Package, color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/30' },
  wrong_order: { label: '顺序错误', icon: ListOrdered, color: 'text-violet-400', bg: 'bg-violet-500/15 border-violet-500/30' },
  missed: { label: '漏拣', icon: XSquare, color: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30' },
  extra: { label: '多拣', icon: Package, color: 'text-pink-400', bg: 'bg-pink-500/15 border-pink-500/30' },
}

const PIE_COLORS = ['#F43F5E', '#F97316', '#EAB308', '#8B5CF6', '#EF4444', '#EC4899']

const SCORE_DETAIL_ITEMS = [
  { key: 'baseScore', label: '基础完成分', icon: CheckCircle2, type: 'positive' as const, color: 'text-emerald-400' },
  { key: 'timeBonus', label: '时间奖励', icon: Clock, type: 'positive' as const, color: 'text-sky-400' },
  { key: 'accuracyScore', label: '准确率得分', icon: Target, type: 'positive' as const, color: 'text-blue-400' },
  { key: 'pathScore', label: '路径规划分', icon: MapPin, type: 'positive' as const, color: 'text-indigo-400' },
  { key: 'mergeBonus', label: '合并订单奖励', icon: Package, type: 'positive' as const, color: 'text-purple-400' },
  { key: 'nearExpiryBonus', label: '临期品奖励', icon: Zap, type: 'positive' as const, color: 'text-amber-400' },
  { key: 'restockBonus', label: '补货事件奖励', icon: ShieldAlert, type: 'positive' as const, color: 'text-violet-400' },
  { key: 'wrongPickPenalty', label: '错拣扣分', icon: XCircle, type: 'negative' as const, color: 'text-rose-400' },
  { key: 'missedPickPenalty', label: '漏拣扣分', icon: XSquare, type: 'negative' as const, color: 'text-red-400' },
] as const

export default function ReviewPage() {
  const { sessionId = 'last' } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const getSessionRecord = useScoreStore((s) => s.getSessionRecord)
  const scoreRecords = useScoreStore((s) => s.scoreRecords)

  const [activeTab, setActiveTab] = useState<TabType>('errors')
  const [data, setData] = useState<ReviewSessionData | null>(null)
  const [errorNodes, setErrorNodes] = useState<ErrorNode[]>([])
  const [keyframes, setKeyframes] = useState<Keyframe[]>([])
  const [highlightErrorPos, setHighlightErrorPos] = useState<Position | null>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [playSpeed, setPlaySpeed] = useState<0.5 | 1 | 2>(1)
  const [playTime, setPlayTime] = useState(0)
  const [currentLogIdx, setCurrentLogIdx] = useState(0)
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const record = getSessionRecord(sessionId)
    if (!record) {
      setData(null)
      return
    }

    const reviewData = convertScoreRecordToReviewData(record)
    if (!reviewData) {
      setData(null)
      return
    }

    setData(reviewData)
    const nodes = identifyErrorNodes(reviewData.operations)
    const frames = extractKeyframes(reviewData.operations)
    setErrorNodes(nodes)
    setKeyframes(frames)
    setPlayTime(0)
    setCurrentLogIdx(0)
    setIsPlaying(false)
  }, [sessionId, getSessionRecord])

  useEffect(() => {
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current)
    }
  }, [])

  useEffect(() => {
    if (!data) return
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        setPlayTime(prev => {
          const next = prev + 500 * playSpeed
          if (next >= data.durationMs) {
            setIsPlaying(false)
            return data.durationMs
          }
          return next
        })
      }, 100)
    } else {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current)
    }
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current)
    }
  }, [isPlaying, playSpeed, data])

  useEffect(() => {
    if (!data) return
    const logs = data.operations
    let idx = 0
    for (let i = 0; i < logs.length; i++) {
      if (logs[i].timestamp <= playTime) idx = i
    }
    setCurrentLogIdx(idx)
  }, [playTime, data])

  const animatedPlayerPos = useMemo(() => {
    if (!data) return { x: 10, y: 13 }
    const pts = extractPlayerPath(data.operations)
    if (pts.length === 0) return { x: 10, y: 13 }
    let idx = 0
    for (let i = 0; i < pts.length; i++) {
      if (pts[i].timestamp <= playTime) idx = i
    }
    return { x: pts[idx].x, y: pts[idx].y }
  }, [data, playTime])

  const errorCounts = useMemo(() => {
    if (!data) return {} as Record<ReplayErrorType, number>
    const nodes = identifyErrorNodes(data.operations)
    return countErrorsByType(nodes)
  }, [data])

  const pieData = useMemo(() => {
    return Object.entries(errorCounts)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({
        name: ERROR_CATEGORY_INFO[k as ReplayErrorType]?.label || k,
        value: v,
      }))
  }, [errorCounts])

  const pathScore = useMemo(() => {
    if (!data) return { score: 0, diff: 0, eff: 0 }
    const diff = data.playerPath.length - data.optimalPath.length
    const eff = Math.min(100, Math.round((data.optimalPath.length / Math.max(1, data.playerPath.length)) * 100))
    return { score: data.abilityScores.pathPlanning, diff, eff }
  }, [data])

  const improvementTips = useMemo(() => {
    const tips: { title: string; detail: string; icon: typeof Lightbulb }[] = []
    if (data && data.abilityScores.pathPlanning < 75) {
      tips.push({
        title: '优化拣货路径',
        detail: '尝试按区域划分拣货顺序，同区域的订单合并处理，减少跨区往返。可参考最优路径的顺序编号。',
        icon: Target,
      })
    }
    const hasWrongSku = (errorCounts.wrong_sku || 0) > 0
    const hasWrongQty = (errorCounts.wrong_quantity || 0) > 0
    if (hasWrongSku || hasWrongQty) {
      tips.push({
        title: '提高拣货准确率',
        detail: '扫描时仔细核对 SKU 编码和商品名称，确认数量与订单一致后再放入周转箱。',
        icon: CheckCircle2,
      })
    }
    if ((errorCounts.missed || 0) > 0) {
      tips.push({
        title: '避免商品漏拣',
        detail: '完成每个区域后快速核对订单清单，收银台结算前再次逐项检查确保无遗漏。',
        icon: ListOrdered,
      })
    }
    if (data && data.abilityScores.time < 70 && tips.length < 3) {
      tips.push({
        title: '提升操作速度',
        detail: '熟练货位编码规则，减少查找时间；移动时沿通道直线行走，避免频繁停顿。',
        icon: Zap,
      })
    }
    if (tips.length === 0) {
      tips.push({
        title: '挑战更高难度',
        detail: '当前表现优秀！可以尝试挑战更高难度关卡，锻炼更复杂的多订单合并拣货能力。',
        icon: TrendingUp,
      })
    }
    return tips.slice(0, 3)
  }, [data, errorCounts])

  const scoreBreakdownCalc = useMemo(() => {
    if (!data) return { totalPositive: 0, totalPenalty: 0, penaltyPct: 0 }
    const sb = data.scoreBreakdown
    const totalPositive = sb.baseScore + sb.timeBonus + sb.accuracyScore + sb.pathScore + sb.mergeBonus + sb.nearExpiryBonus + sb.restockBonus
    const totalPenalty = sb.wrongPickPenalty + sb.missedPickPenalty
    const totalBase = sb.baseScore + sb.timeBonus + sb.accuracyScore + sb.pathScore
    const penaltyPct = Math.min(100, (totalPenalty / Math.max(1, totalBase)) * 100)
    return { totalPositive, totalPenalty, penaltyPct }
  }, [data])

  const formatMs = (ms: number) => {
    const totalSec = Math.floor(ms / 1000)
    const m = Math.floor(totalSec / 60)
    const s = totalSec % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  const handleExportReport = () => {
    if (!data) return
    const report = {
      sessionId: data.sessionId,
      levelName: data.levelName,
      generatedAt: new Date().toISOString(),
      score: data.score,
      accuracy: data.accuracy,
      durationMs: data.durationMs,
      abilityScores: data.abilityScores,
      scoreBreakdown: data.scoreBreakdown,
      errors: errorNodes.map(n => ({
        type: formatErrorType(n.errorType),
        position: n.position,
        expected: n.expected,
        actual: n.actual,
        suggestion: n.suggestion,
      })),
      operationsSerialized: serializeOperations(data.operations),
    }
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `review-report-${data.sessionId}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const jumpToKeyframe = (kf: Keyframe) => {
    setPlayTime(kf.timestamp)
    setIsPlaying(false)
  }

  const stepForward = () => {
    if (!data) return
    const nextIdx = Math.min(currentLogIdx + 1, data.operations.length - 1)
    setCurrentLogIdx(nextIdx)
    setPlayTime(data.operations[nextIdx].timestamp)
  }

  const stepBackward = () => {
    if (!data) return
    const prevIdx = Math.max(currentLogIdx - 1, 0)
    setCurrentLogIdx(prevIdx)
    setPlayTime(data.operations[prevIdx].timestamp)
  }

  const handleBack = () => {
    navigate('/')
  }

  const handleBackToList = () => {
    navigate('/')
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-warehouse-navyDark">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          {scoreRecords.length === 0 ? (
            <>
              <XCircle size={48} className="mx-auto mb-4 text-warehouse-danger/70" />
              <div className="text-white text-xl mb-2">暂无复盘记录</div>
              <div className="text-white/50 text-sm mb-6">完成一局游戏后即可查看复盘数据</div>
              <button
                onClick={handleBack}
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-warehouse-orange hover:bg-warehouse-orangeDark text-white font-medium transition-all mx-auto"
              >
                <Home size={18} />
                返回主菜单
              </button>
            </>
          ) : (
            <>
              <div className="text-white text-xl mb-2">加载复盘数据中...</div>
              <div className="text-white/50 text-sm">sessionId: {sessionId}</div>
            </>
          )}
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-warehouse-navyDark via-warehouse-navy to-warehouse-navyDark text-white p-4 md:p-6">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center gap-3 mb-4"
      >
        <div className="flex items-center gap-2">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-warehouse-navyLight/60 hover:bg-warehouse-navyLight border border-white/10 transition-all"
          >
            <Home size={18} />
            <span className="text-sm">主菜单</span>
          </button>
          {sessionId !== 'last' && (
            <button
              onClick={handleBackToList}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-warehouse-navyLight/60 hover:bg-warehouse-navyLight border border-white/10 transition-all"
            >
              <ArrowLeft size={18} />
              <span className="text-sm">返回</span>
            </button>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold truncate">{data.levelName}</h1>
            <span className="text-xs px-2 py-1 rounded bg-warehouse-navyLight/60 text-white/70 border border-white/10 font-mono">
              {data.sessionId}
            </span>
            <span className="text-xs px-2 py-1 rounded bg-warehouse-orange/20 text-warehouse-orange border border-warehouse-orange/30">
              用时 {formatMs(data.durationMs)}
            </span>
            <span className="text-xs px-2 py-1 rounded bg-white/5 text-white/60 border border-white/10">
              {data.nickname}
            </span>
          </div>
        </div>
        <button
          onClick={handleExportReport}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-warehouse-orange to-warehouse-orangeDark hover:shadow-glow-orange transition-all font-medium text-sm"
        >
          <Download size={16} />
          导出报告
        </button>
      </motion.header>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4 mb-4 bg-warehouse-navy/40 rounded-2xl p-4 border border-white/5"
        style={{ minHeight: '40vh' }}
      >
        <div className="min-h-[320px] lg:min-h-0">
          <ReviewMap
            type="player"
            path={data.playerPath}
            errorMarkers={data.errorPositions}
            highlightPos={highlightErrorPos}
            playerAnimPos={activeTab === 'replay' ? animatedPlayerPos : undefined}
          />
        </div>

        <div className="flex lg:flex-col items-center justify-center gap-4 py-2 lg:py-0 px-4 lg:px-2 min-w-[140px]">
          <div className="text-center">
            <div className="text-xs text-white/50 mb-1">路径评分</div>
            <motion.div
              key={pathScore.score}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={cn(
                'text-4xl font-bold',
                pathScore.score >= 80 ? 'text-warehouse-success' : pathScore.score >= 60 ? 'text-warehouse-warning' : 'text-warehouse-danger'
              )}
            >
              {pathScore.score}
            </motion.div>
            <div className="text-xs text-white/40 mt-0.5">/ 100</div>
          </div>
          <div className="h-px lg:h-12 w-12 lg:w-px bg-white/10" />
          <div className="text-center">
            <div className="text-xs text-white/50 mb-1">步数差异</div>
            <div className={cn(
              'text-2xl font-bold',
              pathScore.diff <= 5 ? 'text-warehouse-success' : pathScore.diff <= 15 ? 'text-warehouse-warning' : 'text-warehouse-danger'
            )}>
              +{pathScore.diff}
            </div>
            <div className="text-xs text-white/40 mt-0.5">步</div>
          </div>
          <div className="h-px lg:h-12 w-12 lg:w-px bg-white/10" />
          <div className="text-center">
            <div className="text-xs text-white/50 mb-1">路径效率</div>
            <div className={cn(
              'text-2xl font-bold',
              pathScore.eff >= 80 ? 'text-warehouse-success' : pathScore.eff >= 60 ? 'text-warehouse-warning' : 'text-warehouse-danger'
            )}>
              {pathScore.eff}%
            </div>
            <div className="w-20 h-1.5 rounded-full bg-white/10 mt-2 overflow-hidden mx-auto">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pathScore.eff}%` }}
                transition={{ duration: 1, delay: 0.3 }}
                className={cn(
                  'h-full rounded-full',
                  pathScore.eff >= 80 ? 'bg-warehouse-success' : pathScore.eff >= 60 ? 'bg-warehouse-warning' : 'bg-warehouse-danger'
                )}
              />
            </div>
          </div>
        </div>

        <div className="min-h-[320px] lg:min-h-0">
          <ReviewMap
            type="optimal"
            path={data.optimalPath}
            orderSequence={data.optimalOrderSequence}
            highlightPos={highlightErrorPos}
          />
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-warehouse-navy/40 rounded-2xl border border-white/5 overflow-hidden"
        style={{ minHeight: '52vh' }}
      >
        <div className="flex border-b border-white/10 px-2 md:px-4 overflow-x-auto">
          {(
            [
              { key: 'errors', label: '错误列表', icon: AlertTriangle },
              { key: 'replay', label: '操作回放', icon: Play },
              { key: 'analysis', label: '综合分析', icon: BarChart3 },
              { key: 'score', label: '分数明细', icon: Coins },
            ] as const
          ).map(tab => {
            const Icon = tab.icon
            const active = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all whitespace-nowrap',
                  active ? 'text-warehouse-orange' : 'text-white/60 hover:text-white/90'
                )}
              >
                <Icon size={16} />
                {tab.label}
                {tab.key === 'errors' && errorNodes.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs rounded bg-warehouse-danger/80 text-white font-bold">
                    {errorNodes.length}
                  </span>
                )}
                {active && (
                  <motion.div
                    layoutId="review-tab-underline"
                    className="absolute left-2 right-2 bottom-0 h-0.5 bg-warehouse-orange rounded-full"
                  />
                )}
              </button>
            )
          })}
        </div>

        <div className="p-4 md:p-6">
          <AnimatePresence mode="wait">
            {activeTab === 'errors' && (
              <motion.div
                key="errors"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {(Object.keys(ERROR_CATEGORY_INFO) as ReplayErrorType[]).map(et => {
                    const info = ERROR_CATEGORY_INFO[et]
                    const count = errorCounts[et] || 0
                    const Icon = info.icon
                    return (
                      <motion.div
                        key={et}
                        whileHover={{ scale: 1.03 }}
                        className={cn(
                          'rounded-xl p-3 border transition-all',
                          count > 0 ? info.bg : 'bg-white/5 border-white/5 opacity-60'
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Icon size={18} className={info.color} />
                          {count > 0 && (
                            <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-white/10">
                              {count}
                            </span>
                          )}
                        </div>
                        <div className={cn('text-lg font-bold', count > 0 ? info.color : 'text-white/30')}>
                          {count}
                        </div>
                        <div className="text-xs text-white/60 mt-0.5">{info.label}</div>
                      </motion.div>
                    )
                  })}
                </div>

                <div className="rounded-xl border border-white/10 overflow-hidden bg-warehouse-navyDark/50">
                  <div className="px-4 py-2.5 bg-white/5 border-b border-white/5 text-sm font-semibold flex items-center gap-2">
                    <AlertTriangle size={16} className="text-warehouse-danger" />
                    错误明细 ({errorNodes.length})
                  </div>
                  {errorNodes.length === 0 ? (
                    <div className="p-10 text-center text-white/40">
                      <CheckCircle2 size={40} className="mx-auto mb-2 text-warehouse-success/70" />
                      <div>太棒了！没有发现任何错误</div>
                    </div>
                  ) : (
                    <div className="max-h-[360px] overflow-y-auto divide-y divide-white/5">
                      {errorNodes.map((node, i) => {
                        const info = ERROR_CATEGORY_INFO[node.errorType] || ERROR_CATEGORY_INFO.wrong_sku
                        const Icon = info.icon
                        const time = formatMs(node.log.timestamp)
                        return (
                          <motion.div
                            key={node.log.logId}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                            whileHover={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
                            onClick={() => setHighlightErrorPos(node.position)}
                            className="px-4 py-3 cursor-pointer transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              <div className={cn(
                                'flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center',
                                info.bg,
                                'border',
                              )}>
                                <Icon size={17} className={info.color} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <span className="text-xs text-white/40 font-mono">@{time}</span>
                                  <span className={cn('text-sm font-semibold', info.color)}>{info.label}</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                  <div className="rounded-md bg-warehouse-success/10 border border-warehouse-success/20 p-2">
                                    <div className="text-warehouse-success/70 mb-0.5">期望</div>
                                    <div className="text-warehouse-success font-medium">{node.expected || '-'}</div>
                                  </div>
                                  <div className="rounded-md bg-warehouse-danger/10 border border-warehouse-danger/20 p-2">
                                    <div className="text-warehouse-danger/70 mb-0.5">实际</div>
                                    <div className="text-warehouse-danger font-medium">{node.actual || '-'}</div>
                                  </div>
                                </div>
                                <div className="mt-2 flex items-start gap-1.5 text-xs text-white/55">
                                  <Lightbulb size={13} className="mt-0.5 flex-shrink-0 text-warehouse-warning" />
                                  <span>{node.suggestion}</span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'replay' && (
              <motion.div
                key="replay"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                <div className="rounded-xl border border-white/10 bg-warehouse-navyDark/50 overflow-hidden">
                  <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-white/5">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={stepBackward}
                        className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors border border-white/10"
                      >
                        <SkipBack size={16} />
                      </button>
                      <button
                        onClick={() => setIsPlaying(p => !p)}
                        className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center transition-all border',
                          isPlaying
                            ? 'bg-warehouse-orange hover:bg-warehouse-orangeDark border-warehouse-orange/40 shadow-glow-orange'
                            : 'bg-white/5 hover:bg-white/10 border-white/10'
                        )}
                      >
                        {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                      </button>
                      <button
                        onClick={stepForward}
                        className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors border border-white/10"
                      >
                        <SkipForward size={16} />
                      </button>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 border border-white/10">
                      {([0.5, 1, 2] as const).map(sp => (
                        <button
                          key={sp}
                          onClick={() => setPlaySpeed(sp)}
                          className={cn(
                            'px-2 py-0.5 text-xs rounded-md font-medium transition-colors',
                            playSpeed === sp ? 'bg-warehouse-orange/80 text-white' : 'text-white/60 hover:text-white'
                          )}
                        >
                          {sp}x
                        </button>
                      ))}
                    </div>
                    <div className="flex-1 min-w-[180px] flex items-center gap-3">
                      <span className="text-xs text-white/50 font-mono w-12 text-right">{formatMs(playTime)}</span>
                      <input
                        type="range"
                        min={0}
                        max={data.durationMs}
                        value={playTime}
                        onChange={e => {
                          setPlayTime(Number(e.target.value))
                          setIsPlaying(false)
                        }}
                        className="flex-1 accent-warehouse-orange"
                      />
                      <span className="text-xs text-white/50 font-mono w-12">{formatMs(data.durationMs)}</span>
                    </div>
                    <div className="text-xs text-white/50 font-mono">
                      帧 {currentLogIdx + 1}/{data.operations.length}
                    </div>
                  </div>

                  <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2 overflow-x-auto">
                    <span className="text-xs text-white/50 flex-shrink-0 mr-2">
                      <Bookmark size={13} className="inline mr-1" />
                      书签:
                    </span>
                    {keyframes.length === 0 ? (
                      <span className="text-xs text-white/30">无关键帧</span>
                    ) : (
                      keyframes.map(kf => {
                        const style: Record<typeof kf.type, { label: string; cls: string }> = {
                          error: { label: '错误', cls: 'bg-rose-500/20 text-rose-400 border-rose-500/30 hover:bg-rose-500/30' },
                          pick_success: { label: '成功拣取', cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30' },
                          near_expiry_pick: { label: '临期品', cls: 'bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30' },
                          restock_event: { label: '补货', cls: 'bg-violet-500/20 text-violet-400 border-violet-500/30 hover:bg-violet-500/30' },
                          milestone: { label: '里程碑', cls: 'bg-sky-500/20 text-sky-400 border-sky-500/30 hover:bg-sky-500/30' },
                        }
                        const s = style[kf.type]
                        return (
                          <button
                            key={kf.keyframeId}
                            onClick={() => jumpToKeyframe(kf)}
                            className={cn(
                              'flex-shrink-0 px-2 py-1 text-xs rounded-md border transition-colors',
                              s.cls,
                              playTime >= kf.timestamp && 'ring-2 ring-white/40'
                            )}
                          >
                            {s.label} @{formatMs(kf.timestamp)}
                          </button>
                        )
                      })
                    )}
                  </div>

                  <div className="p-3 text-xs text-white/55 max-h-44 overflow-y-auto font-mono bg-black/20">
                    {data.operations.slice(Math.max(0, currentLogIdx - 3), currentLogIdx + 4).map((log, idx) => {
                      const realIdx = Math.max(0, currentLogIdx - 3) + idx
                      const isCurrent = realIdx === currentLogIdx
                      return (
                        <div
                          key={log.logId}
                          className={cn(
                            'py-1 px-2 rounded mb-0.5 transition-colors',
                            isCurrent ? 'bg-warehouse-orange/20 text-white' : 'hover:bg-white/5'
                          )}
                        >
                          <span className="text-white/40 mr-2">[{formatMs(log.timestamp)}]</span>
                          <span className={cn(
                            'px-1.5 py-0.5 rounded mr-2',
                            log.action === 'error' ? 'bg-warehouse-danger/30 text-warehouse-danger' :
                            log.action === 'pick' ? 'bg-warehouse-success/30 text-warehouse-success' :
                            log.action === 'restock' ? 'bg-violet-500/30 text-violet-400' :
                            log.action === 'scan' ? 'bg-sky-500/30 text-sky-400' :
                            'bg-white/10 text-white/70'
                          )}>
                            {log.action.toUpperCase()}
                          </span>
                          <span className="text-white/80">
                            {log.errorMessage || (log.payload.locationId ?? `(${log.payload.playerX},${log.payload.playerY})`)}
                          </span>
                          {!log.isCorrect && <span className="ml-2 text-warehouse-danger">✗</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'analysis' && (
              <motion.div
                key="analysis"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="space-y-5"
              >
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {(
                    [
                      { key: 'time', label: '时间效率', score: data.abilityScores.time, icon: Clock, desc: '完成速度与时间利用' },
                      { key: 'accuracy', label: '准确率', score: data.abilityScores.accuracy, icon: Target, desc: '正确操作占比' },
                      { key: 'pathPlanning', label: '路径规划', score: data.abilityScores.pathPlanning, icon: MapPin, desc: '最优路径匹配度' },
                      { key: 'emergency', label: '应急处理', score: data.abilityScores.emergency, icon: ShieldAlert, desc: '补货干扰应对' },
                    ] as const
                  ).map(item => {
                    const Icon = item.icon
                    const color = item.score >= 80 ? 'text-warehouse-success' : item.score >= 60 ? 'text-warehouse-warning' : 'text-warehouse-danger'
                    const barColor = item.score >= 80 ? 'bg-warehouse-success' : item.score >= 60 ? 'bg-warehouse-warning' : 'bg-warehouse-danger'
                    return (
                      <motion.div
                        key={item.key}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ scale: 1.02 }}
                        className="rounded-xl p-4 bg-white/5 border border-white/10"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Icon size={16} className="text-white/60" />
                            <span className="text-sm font-medium">{item.label}</span>
                          </div>
                          <span className={cn('text-lg font-bold', color)}>{item.score}</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden mb-2">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${item.score}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className={cn('h-full rounded-full', barColor)}
                          />
                        </div>
                        <div className="text-[11px] text-white/45">{item.desc}</div>
                      </motion.div>
                    )
                  })}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="rounded-xl p-4 bg-white/5 border border-white/10">
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Brain size={16} className="text-violet-400" />
                      错误类型占比
                    </h3>
                    {pieData.length === 0 ? (
                      <div className="h-56 flex items-center justify-center text-white/40 text-sm">
                        <CheckCircle2 size={28} className="mr-2 text-warehouse-success/70" />
                        暂无错误数据
                      </div>
                    ) : (
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={45}
                              outerRadius={75}
                              paddingAngle={3}
                              dataKey="value"
                              animationBegin={0}
                              animationDuration={800}
                            >
                              {pieData.map((_, i) => (
                                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="rgba(255,255,255,0.08)" strokeWidth={2} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#1E3A5F',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                fontSize: '12px',
                              }}
                            />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl p-4 bg-white/5 border border-white/10">
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Clock size={16} className="text-sky-400" />
                      拣货时间分布（秒）
                    </h3>
                    {data.itemPickTimes.length === 0 ? (
                      <div className="h-56 flex items-center justify-center text-white/40 text-sm">
                        暂无拣货时间数据
                      </div>
                    ) : (
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={data.itemPickTimes} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                            <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} />
                            <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#1E3A5F',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                fontSize: '12px',
                              }}
                            />
                            <Bar
                              dataKey="time"
                              name="耗时(秒)"
                              fill="#3B82F6"
                              radius={[4, 4, 0, 0]}
                              animationBegin={0}
                              animationDuration={800}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-xl p-4 bg-gradient-to-br from-warehouse-orange/10 to-amber-500/5 border border-warehouse-orange/20">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Lightbulb size={16} className="text-warehouse-orange" />
                    改进建议
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {improvementTips.map((tip, i) => {
                      const Icon = tip.icon
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 + i * 0.1 }}
                          className="rounded-lg p-3 bg-warehouse-navyDark/60 border border-white/5"
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className="w-7 h-7 rounded-md bg-warehouse-orange/20 flex items-center justify-center">
                              <Icon size={14} className="text-warehouse-orange" />
                            </div>
                            <span className="text-sm font-medium">{i + 1}. {tip.title}</span>
                          </div>
                          <p className="text-xs text-white/55 leading-relaxed">{tip.detail}</p>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'score' && (
              <motion.div
                key="score"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div className="text-center mb-6">
                  <div className="text-xs text-white/50 mb-2">最终得分</div>
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, type: 'spring' }}
                    className={cn(
                      'text-6xl font-bold mb-2',
                      data.score >= 850 ? 'text-warehouse-success' : data.score >= 700 ? 'text-sky-400' : data.score >= 550 ? 'text-warehouse-warning' : 'text-warehouse-danger'
                    )}
                  >
                    {data.score}
                  </motion.div>
                  <div className="text-white/40 text-sm">准确率 {data.accuracy.toFixed(1)}%</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Coins size={16} className="text-amber-400" />
                      得分明细
                    </h3>
                    <div className="space-y-2">
                      {SCORE_DETAIL_ITEMS.map(item => {
                        const value = data.scoreBreakdown[item.key]
                        if (value === 0 && (item.key === 'mergeBonus')) return null
                        const Icon = item.icon
                        const isPositive = item.type === 'positive'

                        return (
                          <motion.div
                            key={item.key}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                'w-8 h-8 rounded-lg flex items-center justify-center',
                                isPositive ? 'bg-emerald-500/20' : 'bg-rose-500/20'
                              )}>
                                {isPositive
                                  ? <PlusCircle size={14} className="text-emerald-400" />
                                  : <MinusCircle size={14} className="text-rose-400" />
                                }
                              </div>
                              <div className="flex items-center gap-2">
                                <Icon size={14} className="text-white/50" />
                                <span className="text-sm">{item.label}</span>
                              </div>
                            </div>
                            <div className={cn(
                              'text-lg font-bold font-mono',
                              isPositive ? 'text-emerald-400' : 'text-rose-400'
                            )}>
                              {isPositive ? '+' : '-'}{Math.abs(value)}
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-xl p-4 bg-white/5 border border-white/10">
                      <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                        <Gauge size={16} className="text-warehouse-orange" />
                        分数构成
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-white/60">奖励分</span>
                            <span className="text-emerald-400 font-mono">
                              +{scoreBreakdownCalc.totalPositive}
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: '100%' }}
                              transition={{ duration: 0.8 }}
                              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-white/60">扣分项</span>
                            <span className="text-rose-400 font-mono">
                              -{scoreBreakdownCalc.totalPenalty}
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${scoreBreakdownCalc.penaltyPct}%` }}
                              transition={{ duration: 0.8, delay: 0.2 }}
                              className="h-full bg-gradient-to-r from-rose-500 to-rose-400 rounded-full"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl p-4 bg-gradient-to-br from-warehouse-orange/10 to-amber-500/5 border border-warehouse-orange/20">
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <TrendingUp size={16} className="text-warehouse-orange" />
                        能力雷达
                      </h3>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center justify-between p-2 rounded bg-white/5">
                          <span className="text-white/60">时间效率</span>
                          <span className={cn(
                            'font-bold',
                            data.abilityScores.time >= 80 ? 'text-emerald-400' : data.abilityScores.time >= 60 ? 'text-amber-400' : 'text-rose-400'
                          )}>
                            {data.abilityScores.time}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded bg-white/5">
                          <span className="text-white/60">准确率</span>
                          <span className={cn(
                            'font-bold',
                            data.abilityScores.accuracy >= 80 ? 'text-emerald-400' : data.abilityScores.accuracy >= 60 ? 'text-amber-400' : 'text-rose-400'
                          )}>
                            {data.abilityScores.accuracy}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded bg-white/5">
                          <span className="text-white/60">路径规划</span>
                          <span className={cn(
                            'font-bold',
                            data.abilityScores.pathPlanning >= 80 ? 'text-emerald-400' : data.abilityScores.pathPlanning >= 60 ? 'text-amber-400' : 'text-rose-400'
                          )}>
                            {data.abilityScores.pathPlanning}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded bg-white/5">
                          <span className="text-white/60">应急处理</span>
                          <span className={cn(
                            'font-bold',
                            data.abilityScores.emergency >= 80 ? 'text-emerald-400' : data.abilityScores.emergency >= 60 ? 'text-amber-400' : 'text-rose-400'
                          )}>
                            {data.abilityScores.emergency}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 overflow-hidden bg-warehouse-navyDark/50">
                  <div className="px-4 py-3 bg-white/5 border-b border-white/5 text-sm font-semibold flex items-center gap-2">
                    <BarChart3 size={16} className="text-violet-400" />
                    分数计算规则
                  </div>
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-white/60">
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                        <div>
                          <span className="text-white/80 font-medium">基础完成分:</span> 完成关卡基础奖励 200 分
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-1.5 flex-shrink-0" />
                        <div>
                          <span className="text-white/80 font-medium">时间奖励:</span> 提前完成最多奖励 200 分
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                        <div>
                          <span className="text-white/80 font-medium">准确率得分:</span> 正确操作占比 × 300 分
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
                        <div>
                          <span className="text-white/80 font-medium">路径规划分:</span> 最优路径/实际路径 × 200 分
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                        <div>
                          <span className="text-white/80 font-medium">临期品奖励:</span> 正确拣取临期品每次 +20 分
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-1.5 flex-shrink-0" />
                        <div>
                          <span className="text-white/80 font-medium">补货事件奖励:</span> 成功处理补货干扰每次 +15 分
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 flex-shrink-0" />
                        <div>
                          <span className="text-white/80 font-medium">错拣扣分:</span> 每次错误操作 -30 分
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                        <div>
                          <span className="text-white/80 font-medium">漏拣扣分:</span> 每件漏拣商品 -50 分
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.section>
    </div>
  )
}