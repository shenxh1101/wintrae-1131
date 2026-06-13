import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Check, X, Info, Keyboard, Box, ScanLine, ShoppingCart, Hand, Home,
  ChevronRight, Lightbulb, Sparkles, Trophy, MapPin, Package
} from 'lucide-react'
import WarehouseMap from '@/components/WarehouseMap'
import { useGameStore } from '@/store/useGameStore'
import { usePlayerStore } from '@/store/usePlayerStore'
import { useScoreStore } from '@/store/useScoreStore'
import {
  TUTORIAL_STEPS, SHELVES, LOCATIONS, STOCK_ITEMS,
  getLocationById, getStockByLocation, getProductBySku
} from '@/data/mockData'
import type { Order, OrderItem, Score, GameSession } from '@/types'
import { cn, generateId } from '@/lib/utils'

interface KnowledgePopupProps {
  open: boolean
  title: string
  content: string
  type: 'rule' | 'tip' | 'safety'
  onClose: () => void
  stepNumber: number
}

function KnowledgePopup({ open, title, content, type, onClose, stepNumber }: KnowledgePopupProps) {
  const typeConfig = {
    rule: {
      icon: <Info className="w-6 h-6" />,
      gradient: 'from-blue-500 to-cyan-500',
      bg: 'from-blue-500/20 to-cyan-500/20',
      border: 'border-blue-400/40',
      text: 'text-blue-300',
      label: '知识库 · 规则'
    },
    tip: {
      icon: <Lightbulb className="w-6 h-6" />,
      gradient: 'from-yellow-500 to-orange-500',
      bg: 'from-yellow-500/20 to-orange-500/20',
      border: 'border-yellow-400/40',
      text: 'text-yellow-300',
      label: '小贴士'
    },
    safety: {
      icon: <Info className="w-6 h-6" />,
      gradient: 'from-red-500 to-pink-500',
      bg: 'from-red-500/20 to-pink-500/20',
      border: 'border-red-400/40',
      text: 'text-red-300',
      label: '安全提示'
    }
  }
  const cfg = typeConfig[type]

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 30, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 250, damping: 25 }}
            className="relative w-full max-w-lg"
          >
            <div className={cn(
              'rounded-2xl border-2 bg-gradient-to-br from-warehouse-navyDark to-warehouse-navy overflow-hidden',
              cfg.border
            )}>
              <div className="h-1 bg-gradient-to-r" style={{
                backgroundImage: `linear-gradient(to right, var(--tw-gradient-stops))`,
                background: type === 'rule'
                  ? 'linear-gradient(90deg, #3B82F6, #22D3EE)'
                  : type === 'tip'
                  ? 'linear-gradient(90deg, #EAB308, #F97316)'
                  : 'linear-gradient(90deg, #EF4444, #EC4899)'
              }} />

              <div className="p-6">
                <div className="flex items-start gap-4 mb-5">
                  <div className={cn(
                    'w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-gradient-to-br',
                    cfg.gradient,
                    'text-white shadow-lg'
                  )}>
                    {cfg.icon}
                  </div>
                  <div className="flex-1">
                    <div className={cn('text-xs font-bold mb-1 tracking-wider uppercase', cfg.text)}>
                      步骤 {stepNumber}/5 · {cfg.label}
                    </div>
                    <h3 className="text-xl font-bold text-white">{title}</h3>
                  </div>
                </div>

                <div className={cn(
                  'p-4 rounded-xl border bg-gradient-to-br',
                  cfg.border,
                  cfg.bg,
                  'mb-6'
                )}>
                  <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-line">
                    {content}
                  </p>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  className={cn(
                    'w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2',
                    'bg-gradient-to-r shadow-lg transition-all',
                    cfg.gradient,
                    'hover:shadow-xl'
                  )}
                  style={{
                    backgroundImage: type === 'rule'
                      ? 'linear-gradient(90deg, #3B82F6, #22D3EE)'
                      : type === 'tip'
                      ? 'linear-gradient(90deg, #EAB308, #F97316)'
                      : 'linear-gradient(90deg, #EF4444, #EC4899)',
                    boxShadow: type === 'rule'
                      ? '0 8px 24px -8px rgba(59, 130, 246, 0.5)'
                      : type === 'tip'
                      ? '0 8px 24px -8px rgba(234, 179, 8, 0.5)'
                      : '0 8px 24px -8px rgba(239, 68, 68, 0.5)'
                  }}
                >
                  <Check className="w-5 h-5" />
                  我知道了
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface StepIndicatorProps {
  currentStep: number
  totalSteps: number
}

function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: totalSteps }).map((_, idx) => {
        const stepNum = idx + 1
        const isCompleted = idx < currentStep
        const isCurrent = idx === currentStep
        const step = TUTORIAL_STEPS[idx]

        return (
          <div key={idx} className="flex items-center gap-3">
            <motion.div
              initial={false}
              animate={{
                scale: isCurrent ? [1, 1.08, 1] : 1,
              }}
              transition={{ duration: 0.8, repeat: isCurrent ? Infinity : 0 }}
              className={cn(
                'relative w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-all duration-300',
                isCompleted
                  ? 'bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/30'
                  : isCurrent
                  ? 'bg-gradient-to-br from-indigo-500 to-cyan-500 text-white shadow-lg shadow-indigo-500/40'
                  : 'bg-gray-800 text-gray-500 border-2 border-gray-700'
              )}
              style={isCurrent ? {
                boxShadow: '0 0 0 3px rgba(99, 102, 241, 0.15), 0 0 20px rgba(99, 102, 241, 0.4)'
              } : undefined}
            >
              {isCompleted ? (
                <motion.div
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <Check className="w-5 h-5" />
                </motion.div>
              ) : (
                stepNum
              )}
              {isCurrent && (
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-cyan-400"
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.8, 0, 0.8],
                  }}
                  transition={{
                    duration: 1.8,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              )}
            </motion.div>
            <div className="flex-1 min-w-0">
              <div className={cn(
                'text-xs font-bold uppercase tracking-wider mb-0.5',
                isCurrent ? 'text-cyan-400' : isCompleted ? 'text-emerald-400' : 'text-gray-500'
              )}>
                步骤 {stepNum}
              </div>
              <div className={cn(
                'text-sm font-semibold truncate',
                isCurrent ? 'text-white' : isCompleted ? 'text-gray-300' : 'text-gray-500'
              )}>
                {step?.title ?? `第${stepNum}步`}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

interface KeyboardHintProps {
  keys: Array<'W' | 'A' | 'S' | 'D' | 'SPACE' | 'P' | 'ENTER' | 'ESC'>
  label: string
}

function KeyboardKey({ children, highlight = false }: { children: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={cn(
      'inline-flex items-center justify-center min-w-[32px] h-8 px-2 rounded-lg',
      'font-mono text-sm font-bold border-2 transition-all',
      highlight
        ? 'bg-gradient-to-br from-cyan-500 to-indigo-500 text-white border-cyan-400 shadow-lg shadow-cyan-500/30 animate-pulse'
        : 'bg-gray-800 text-gray-300 border-gray-600'
    )}>
      {children}
    </div>
  )
}

function KeyboardHint({ keys, label }: KeyboardHintProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-center gap-4 px-5 py-3 rounded-xl bg-warehouse-navyDark/90 border border-warehouse-navyLight backdrop-blur-sm"
    >
      <div className="flex items-center gap-1.5">
        {keys.map((key, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            {idx > 0 && <span className="text-gray-500 text-xs">/</span>}
            <KeyboardKey highlight>
              {key === 'SPACE' ? '␣ 空格' : key === 'ENTER' ? '↵ Enter' : key === 'ESC' ? 'Esc' : key}
            </KeyboardKey>
          </div>
        ))}
      </div>
      <div className="w-px h-6 bg-warehouse-navyLight" />
      <span className="text-sm text-gray-200 font-medium">{label}</span>
    </motion.div>
  )
}

const KNOWLEDGE_DATA = [
  {
    title: '认识仓库布局',
    content: '仓库被划分为 A、B、C、D 四个区域，每个区域有多个货架。\n\n你当前位于【入口】位置（蓝色标记），A 区货架在仓库上方。\n\n移动到 A 区货架旁，靠近第一个货位即可完成本步。',
    type: 'rule' as const
  },
  {
    title: '货位编码规则',
    content: '货位编码格式：货架号-层数-列号\n\n例如：SHELF-A-L1-C01\n• SHELF-A → A 货架\n• L1 → 第 1 层（L=Level，从下往上数）\n• C01 → 第 01 列（C=Column，从左往右数）\n\n记住这个规则，拣货时需要快速定位！',
    type: 'rule' as const
  },
  {
    title: '拣货标准流程',
    content: '拣货标准操作流程（SOP）：\n\n① 确认商品信息（SKU、名称、数量）\n② 移动到对应货位\n③ 扫描货位确认位置正确\n④ 拣取商品放入周转箱\n⑤ 前往收银台结算\n\n注意：SKU 不匹配或数量错误会扣分！',
    type: 'tip' as const
  },
  {
    title: '收银台结算',
    content: '所有商品拣取完成后，必须前往收银台（右下角绿色标记）进行结算。\n\n只有在收银台才能完成订单提交，提交后订单才算真正完成。\n\n提示：注意周转箱容量，装满了需要先结算！',
    type: 'rule' as const
  },
  {
    title: '恭喜完成教学！',
    content: '你已经掌握了拣货的基础操作流程！\n\n接下来的挑战：\n• 订单关：按订单清单拣货，共 10 个关卡\n• 限时关：在时间压力下提高效率，共 6 个关卡\n\n继续加油，成为顶尖拣货员！',
    type: 'tip' as const
  }
]

export default function TutorialLevel() {
  const navigate = useNavigate()
  const {
    tutorialStepIndex, nextTutorialStep, setTutorialStepIndex,
    playerPosition, moveStep, startGame, resetGame,
    scanLocation, pickItem, placeItemAtCheckout,
    setLevel, setStocks, setOrders, getNearbyLocation, isAtCheckout,
    toteItems, getCurrentOrderItems
  } = useGameStore()
  const {
    playerId, nickname, tutorialCompleted,
    setTutorialCompleted, unlockLevel, updateAchievement,
    addTrainingTime, updateBestScore
  } = usePlayerStore()
  const { addScoreRecord } = useScoreStore()
  const startTimeRef = useRef<number>(Date.now())

  const [showKnowledge, setShowKnowledge] = useState(true)
  const [scanAnimation, setScanAnimation] = useState(false)
  const [pickAnimation, setPickAnimation] = useState(false)
  const [stepCompleted, setStepCompleted] = useState(false)
  const [allDone, setAllDone] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

  const currentStep = TUTORIAL_STEPS[tutorialStepIndex]
  const currentKnowledge = KNOWLEDGE_DATA[tutorialStepIndex]

  const showNotification = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 2500)
  }, [])

  useEffect(() => {
    resetGame()
    setLevel('tutorial', 1)
    setStocks(STOCK_ITEMS)

    const targetLoc = LOCATIONS.find(l => l.locationId === 'SHELF-A-L1-C01')
    const targetStock = targetLoc ? getStockByLocation(targetLoc.locationId) : null
    const targetSku = targetStock?.sku ?? 'DAILY-001'

    const orderId = generateId('ord')
    const tutorialOrder: Order = {
      orderId,
      priority: 1,
      type: 'normal',
      createdAt: new Date().toISOString()
    }
    const tutorialOrderItems: OrderItem[] = [
      {
        itemId: generateId('item'),
        orderId,
        sku: targetSku,
        requiredQty: 1,
        picked: false
      }
    ]
    setOrders([tutorialOrder], tutorialOrderItems)

    startGame()
    setTutorialStepIndex(0)
    setShowKnowledge(true)
    startTimeRef.current = Date.now()
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showKnowledge || allDone) return

      const key = e.key.toLowerCase()
      if (['w', 'arrowup'].includes(key)) {
        e.preventDefault()
        moveStep('up')
      } else if (['s', 'arrowdown'].includes(key)) {
        e.preventDefault()
        moveStep('down')
      } else if (['a', 'arrowleft'].includes(key)) {
        e.preventDefault()
        moveStep('left')
      } else if (['d', 'arrowright'].includes(key)) {
        e.preventDefault()
        moveStep('right')
      } else if (key === ' ') {
        e.preventDefault()
        handleScan()
      } else if (key === 'p') {
        e.preventDefault()
        handlePick()
      } else if (key === 'enter') {
        e.preventDefault()
        handlePlace()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showKnowledge, allDone, tutorialStepIndex, scanAnimation, pickAnimation])

  const calculateDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2))
  }

  useEffect(() => {
    if (showKnowledge || allDone || stepCompleted) return

    if (tutorialStepIndex === 0) {
      const target = getLocationById('SHELF-A-L1-C01')
      if (target && calculateDistance(playerPosition, { x: target.posX, y: target.posY }) < 2) {
        handleStepComplete()
      }
    } else if (tutorialStepIndex === 3) {
      if (isAtCheckout()) {
        handleStepComplete()
      }
    }
  }, [playerPosition, tutorialStepIndex, showKnowledge, allDone, stepCompleted])

  const handleStepComplete = useCallback(() => {
    if (stepCompleted) return
    setStepCompleted(true)
    showNotification('success', `${currentStep?.title ?? ''} - 完成！`)

    setTimeout(() => {
      if (tutorialStepIndex >= TUTORIAL_STEPS.length - 1) {
        const durationMs = Date.now() - startTimeRef.current
        const trainingMinutes = Math.max(1, Math.ceil(durationMs / 60000))

        setTutorialCompleted(true)
        unlockLevel(1, 'order')
        unlockLevel(1, 'timed')
        updateAchievement({ totalGames: (usePlayerStore.getState().achievement.totalGames || 0) + 1 })
        addTrainingTime(trainingMinutes)

        const sessionId = generateId('ses')
        const scoreId = generateId('scr')

        const gameSession: GameSession = {
          sessionId,
          playerId,
          levelType: 'tutorial',
          levelId: 1,
          durationMs,
          startTime: new Date(startTimeRef.current).toISOString(),
          endTime: new Date().toISOString(),
          status: 'completed'
        }

        const score: Score = {
          scoreId,
          sessionId,
          totalScore: 500,
          accuracy: 100,
          timeBonus: 100,
          pathScore: 80,
          penaltyPoints: 0,
          rank: 1
        }

        addScoreRecord(score, gameSession, nickname)
        updateBestScore('tutorial-1', 500)

        setAllDone(true)

        setTimeout(() => {
          navigate('/')
        }, 2000)
      } else {
        nextTutorialStep()
        setStepCompleted(false)
        setShowKnowledge(true)
      }
    }, 1200)
  }, [tutorialStepIndex, stepCompleted, currentStep, showNotification, nextTutorialStep, setTutorialCompleted, unlockLevel, updateAchievement, addTrainingTime, addScoreRecord, updateBestScore, playerId, nickname, navigate])

  const handleScan = useCallback(() => {
    if (scanAnimation || showKnowledge || allDone || stepCompleted) return

    if (tutorialStepIndex !== 1) {
      if (tutorialStepIndex === 2) {
        const nearby = getNearbyLocation()
        const targetLoc = getLocationById('SHELF-A-L1-C01')
        if (!nearby || !targetLoc || nearby.locationId !== targetLoc.locationId) {
          showNotification('error', '请先移动到正确的货位附近再扫描')
          return
        }
        setScanAnimation(true)
        const result = scanLocation()
        setTimeout(() => {
          setScanAnimation(false)
          if (result.success) {
            showNotification('success', '扫描成功，现在可以拣货了')
          }
        }, 800)
        return
      }
      showNotification('info', '当前步骤不需要扫描')
      return
    }

    const nearby = getNearbyLocation()
    const targetLoc = getLocationById('SHELF-A-L1-C01')
    if (!nearby) {
      showNotification('error', '请靠近货位再扫描')
      return
    }
    if (!targetLoc || nearby.locationId !== targetLoc.locationId) {
      showNotification('error', `请扫描 SHELF-A-L1-C01 货位`)
      return
    }

    setScanAnimation(true)
    const result = scanLocation()
    setTimeout(() => {
      setScanAnimation(false)
      if (result.success) {
        handleStepComplete()
      }
    }, 800)
  }, [tutorialStepIndex, scanAnimation, showKnowledge, allDone, stepCompleted, getNearbyLocation, scanLocation, showNotification, handleStepComplete])

  const handlePick = useCallback(() => {
    if (pickAnimation || showKnowledge || allDone || stepCompleted) return

    if (tutorialStepIndex !== 2) {
      showNotification('info', '当前步骤不需要拣货')
      return
    }

    const nearby = getNearbyLocation()
    const targetLoc = getLocationById('SHELF-A-L1-C01')
    if (!nearby || !targetLoc || nearby.locationId !== targetLoc.locationId) {
      showNotification('error', '请移动到 SHELF-A-L1-C01 货位附近')
      return
    }

    setPickAnimation(true)
    const result = pickItem(1)
    setTimeout(() => {
      setPickAnimation(false)
      if (result.success) {
        handleStepComplete()
      } else {
        showNotification('error', result.message)
      }
    }, 600)
  }, [tutorialStepIndex, pickAnimation, showKnowledge, allDone, stepCompleted, getNearbyLocation, pickItem, showNotification, handleStepComplete])

  const handlePlace = useCallback(() => {
    if (showKnowledge || allDone || stepCompleted) return

    if (tutorialStepIndex !== 4) {
      if (tutorialStepIndex === 3 && isAtCheckout()) {
        handleStepComplete()
        return
      }
      showNotification('info', '当前步骤不需要结算')
      return
    }

    if (!isAtCheckout()) {
      showNotification('error', '请先移动到收银台')
      return
    }

    const currentOrderItems = getCurrentOrderItems()
    const allPicked = currentOrderItems.every(oi => oi.picked)
    if (!allPicked) {
      showNotification('error', '还有商品未拣取！')
      return
    }

    const result = placeItemAtCheckout()
    if (result.success) {
      handleStepComplete()
    } else {
      showNotification('error', result.message)
    }
  }, [tutorialStepIndex, showKnowledge, allDone, stepCompleted, isAtCheckout, getCurrentOrderItems, placeItemAtCheckout, showNotification, handleStepComplete])

  const targetLocations = useMemo(() => {
    switch (tutorialStepIndex) {
      case 0:
      case 1:
      case 2:
        return ['SHELF-A-L1-C01']
      default:
        return []
    }
  }, [tutorialStepIndex])

  const hintKeys = useMemo((): KeyboardHintProps['keys'] => {
    switch (tutorialStepIndex) {
      case 0:
      case 3:
        return ['W', 'A', 'S', 'D']
      case 1:
        return ['SPACE']
      case 2:
        return ['P']
      case 4:
        return ['ENTER']
      default:
        return []
    }
  }, [tutorialStepIndex])

  const hintLabel = useMemo(() => {
    switch (tutorialStepIndex) {
      case 0:
        return '移动到 A 区货架旁'
      case 1:
        return '扫描附近货位'
      case 2:
        return '拣取商品放入周转箱'
      case 3:
        return '前往收银台结算'
      case 4:
        return '确认订单完成结算'
      default:
        return ''
    }
  }, [tutorialStepIndex])

  const currentOrderItemsDisplay = getCurrentOrderItems()

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
      <div className="absolute top-4 left-4 right-4 z-40 pointer-events-none">
        <div className="flex items-start justify-between gap-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="pointer-events-auto flex items-center gap-3"
          >
            <div className="hud-panel-accent px-4 py-2 rounded-lg flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-cyan-300 font-bold text-sm tracking-wide">教学模式</span>
              <span className="text-white/60 text-xs font-mono">·</span>
              <span className="text-white/80 text-sm font-bold">步骤 {tutorialStepIndex + 1}/{TUTORIAL_STEPS.length}</span>
            </div>
            <button
              onClick={() => navigate('/')}
              className="hud-panel px-3 py-2 rounded-lg flex items-center gap-1.5 text-gray-300 hover:text-white transition-colors pointer-events-auto"
            >
              <Home className="w-4 h-4" />
              <span className="text-sm font-medium">主菜单</span>
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="pointer-events-auto"
          >
            <div className="hud-panel px-6 py-3 rounded-xl text-center">
              <div className="text-white/50 text-[10px] uppercase tracking-widest mb-0.5">当前任务</div>
              <div className="text-white font-bold text-base">{currentStep?.title}</div>
            </div>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className={cn(
              'fixed top-24 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-2',
              notification.type === 'success'
                ? 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-300'
                : notification.type === 'error'
                ? 'bg-red-500/20 border border-red-400/50 text-red-300'
                : 'bg-blue-500/20 border border-blue-400/50 text-blue-300'
            )}
          >
            <div className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center',
              notification.type === 'success' ? 'bg-emerald-500/30'
                : notification.type === 'error' ? 'bg-red-500/30'
                : 'bg-blue-500/30'
            )}>
              {notification.type === 'success' ? <Check className="w-4 h-4" />
                : notification.type === 'error' ? <X className="w-4 h-4" />
                : <Info className="w-4 h-4" />}
            </div>
            <span className="font-semibold text-sm">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="min-h-screen flex items-stretch p-4 pt-24 pb-28 gap-4">
        <motion.aside
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="w-56 shrink-0 flex flex-col gap-4"
        >
          <div className="industrial-border rounded-2xl p-5 bg-gradient-to-br from-warehouse-navyDark/95 to-warehouse-navy/90 backdrop-blur-sm flex-1">
            <h3 className="text-sm font-bold text-white mb-5 flex items-center gap-2">
              <Keyboard className="w-4 h-4 text-cyan-400" />
              训练进度
            </h3>
            <StepIndicator currentStep={tutorialStepIndex} totalSteps={TUTORIAL_STEPS.length} />
          </div>

          {tutorialStepIndex >= 2 && currentOrderItemsDisplay.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="industrial-border rounded-2xl p-4 bg-gradient-to-br from-warehouse-navyDark/95 to-warehouse-navy/90 backdrop-blur-sm"
            >
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-emerald-400" />
                教学订单
              </h3>
              {currentOrderItemsDisplay.map((item, idx) => {
                const product = getProductBySku(item.sku)
                return (
                  <div
                    key={item.itemId}
                    className={cn(
                      'p-3 rounded-xl border mb-2 last:mb-0 transition-all',
                      item.picked
                        ? 'bg-emerald-500/10 border-emerald-400/30'
                        : 'bg-white/5 border-white/10'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-5 h-5 rounded"
                        style={{ backgroundColor: product?.color ?? '#666' }}
                      />
                      <span className={cn(
                        'text-sm font-semibold flex-1',
                        item.picked ? 'text-emerald-300 line-through' : 'text-white'
                      )}>
                        {product?.name ?? item.sku}
                      </span>
                      {item.picked && <Check className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400 font-mono">{item.sku}</span>
                      <span className={cn(
                        'font-mono font-bold',
                        item.picked ? 'text-emerald-400' : 'text-gray-300'
                      )}>
                        ×{item.requiredQty}
                      </span>
                    </div>
                  </div>
                )
              })}
            </motion.div>
          )}

          {toteItems.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="industrial-border rounded-2xl p-4 bg-gradient-to-br from-orange-500/10 to-amber-500/10 backdrop-blur-sm border-orange-400/20"
            >
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Package className="w-4 h-4 text-orange-400" />
                周转箱
              </h3>
              {toteItems.map((item, idx) => {
                const product = getProductBySku(item.sku)
                return (
                  <div key={idx} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: product?.color ?? '#666' }}
                      />
                      <span className="text-xs text-gray-300 truncate max-w-[120px]">
                        {product?.name ?? item.sku}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-orange-300">×{item.quantity}</span>
                  </div>
                )
              })}
            </motion.div>
          )}
        </motion.aside>

        <motion.main
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="flex-1 relative"
        >
          <div className={cn(
            'absolute inset-0 rounded-2xl pointer-events-none z-20 transition-all duration-500',
            stepCompleted && 'ring-4 ring-emerald-400/60 rounded-2xl'
          )}>
            {stepCompleted && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-emerald-500/5 rounded-2xl flex items-center justify-center"
              >
                <motion.div
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                  className="w-32 h-32 rounded-full bg-emerald-500/20 border-4 border-emerald-400 flex items-center justify-center"
                >
                  <Check className="w-16 h-16 text-emerald-400" strokeWidth={3} />
                </motion.div>
              </motion.div>
            )}
          </div>

          {tutorialStepIndex === 3 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute top-4 right-4 z-30 px-3 py-2 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center gap-2"
            >
              <MapPin className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span className="text-sm font-semibold text-emerald-300">目标：收银台</span>
            </motion.div>
          )}

          <div className="relative h-full rounded-2xl overflow-hidden border-2 border-warehouse-navyLight/50 shadow-2xl">
            {scanAnimation && (
              <motion.div
                className="absolute inset-0 z-30 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 1, 0] }}
                transition={{ duration: 0.8 }}
              >
                <motion.div
                  className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-lg"
                  style={{ boxShadow: '0 0 20px rgba(34, 211, 238, 0.8)' }}
                  animate={{ top: ['0%', '100%'] }}
                  transition={{ duration: 0.7, ease: 'easeInOut' }}
                />
                <div className="absolute inset-0 bg-cyan-500/5" />
              </motion.div>
            )}

            {pickAnimation && (
              <motion.div
                className="absolute inset-0 z-30 pointer-events-none bg-orange-500/10"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 0.6 }}
              >
                <motion.div
                  className="absolute inset-0 rounded-2xl border-4 border-orange-400/60"
                  animate={{ scale: [1, 1.02, 1], opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 0.6 }}
                />
              </motion.div>
            )}

            <WarehouseMap
              playerPosition={playerPosition}
              targetLocations={targetLocations}
              selectedLocationId={tutorialStepIndex <= 2 ? 'SHELF-A-L1-C01' : null}
              shelves={SHELVES}
              locations={LOCATIONS}
              stockItems={STOCK_ITEMS}
            />
          </div>
        </motion.main>

        <motion.aside
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="w-80 shrink-0 flex flex-col gap-4"
        >
          <div className="industrial-border rounded-2xl bg-gradient-to-br from-warehouse-navyDark/95 to-warehouse-navy/90 backdrop-blur-sm overflow-hidden flex flex-col flex-1">
            <div className="px-5 py-4 border-b border-warehouse-navyLight/50 bg-gradient-to-r from-indigo-500/10 to-cyan-500/10">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">{tutorialStepIndex + 1}</span>
                  </div>
                  <span className="text-xs text-cyan-400 font-bold uppercase tracking-wider">第 {tutorialStepIndex + 1} 步 / 共 {TUTORIAL_STEPS.length} 步</span>
                </div>
                <button
                  onClick={() => setShowKnowledge(true)}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                  title="重新查看知识"
                >
                  <Lightbulb className="w-4 h-4 text-yellow-400" />
                </button>
              </div>
              <h2 className="text-xl font-bold text-white">{currentStep?.title}</h2>
            </div>

            <div className="p-5 flex-1 flex flex-col">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 mb-5">
                <p className="text-sm text-gray-200 leading-relaxed">
                  {currentStep?.description}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-400/20 mb-5">
                <div className="flex items-start gap-2.5">
                  <Lightbulb className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs text-yellow-400 font-bold uppercase tracking-wider mb-1">操作提示</div>
                    <p className="text-sm text-yellow-100/90 leading-relaxed">
                      {currentStep?.hint}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-auto space-y-3">
                {tutorialStepIndex === 1 && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleScan}
                    disabled={scanAnimation}
                    className={cn(
                      'w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all',
                      'bg-gradient-to-r from-cyan-500 to-blue-500 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50',
                      scanAnimation && 'opacity-70 cursor-not-allowed'
                    )}
                  >
                    <ScanLine className={cn('w-5 h-5', scanAnimation && 'animate-spin')} />
                    {scanAnimation ? '扫描中...' : '扫描货位'}
                  </motion.button>
                )}

                {tutorialStepIndex === 2 && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handlePick}
                    disabled={pickAnimation}
                    className={cn(
                      'w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all',
                      'bg-gradient-to-r from-emerald-500 to-green-500 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50',
                      pickAnimation && 'opacity-70 cursor-not-allowed'
                    )}
                  >
                    <Hand className={cn('w-5 h-5', pickAnimation && 'animate-bounce')} />
                    {pickAnimation ? '拣取中...' : '拣取商品'}
                  </motion.button>
                )}

                {tutorialStepIndex === 4 && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handlePlace}
                    className="w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all"
                  >
                    <Box className="w-5 h-5" />
                    完成结算
                  </motion.button>
                )}

                {(tutorialStepIndex === 0 || tutorialStepIndex === 3) && (
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-sm text-gray-300">使用 WASD 键移动角色...</span>
                  </div>
                )}
              </div>
            </div>

            <div className="px-5 py-4 border-t border-warehouse-navyLight/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400 font-medium">步骤进度</span>
                <span className="text-xs font-mono font-bold text-cyan-400">
                  {Math.round(((tutorialStepIndex + (stepCompleted ? 1 : 0)) / TUTORIAL_STEPS.length) * 100)}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-black/30 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-500"
                  initial={{ width: 0 }}
                  animate={{
                    width: `${((tutorialStepIndex + (stepCompleted ? 1 : 0)) / TUTORIAL_STEPS.length) * 100}%`
                  }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
            </div>
          </div>
        </motion.aside>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40"
      >
        <KeyboardHint keys={hintKeys} label={hintLabel} />
      </motion.div>

      <KnowledgePopup
        open={showKnowledge}
        title={currentKnowledge?.title ?? ''}
        content={currentKnowledge?.content ?? ''}
        type={currentKnowledge?.type ?? 'tip'}
        stepNumber={tutorialStepIndex + 1}
        onClose={() => setShowKnowledge(false)}
      />

      <AnimatePresence>
        {allDone && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.8, y: 40, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 150, damping: 20 }}
              className="relative w-full max-w-md"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 via-orange-500 to-emerald-500 rounded-3xl blur-xl opacity-40 animate-pulse" />
              <div className="relative rounded-3xl bg-gradient-to-br from-warehouse-navyDark via-warehouse-navy to-slate-900 border-2 border-yellow-400/40 overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-yellow-400 via-orange-500 to-emerald-500" />

                <div className="p-8 text-center">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
                    className="w-28 h-28 mx-auto mb-6 rounded-full bg-gradient-to-br from-yellow-400 via-orange-500 to-amber-600 flex items-center justify-center shadow-2xl"
                    style={{ boxShadow: '0 0 60px rgba(234, 179, 8, 0.4)' }}
                  >
                    <Trophy className="w-14 h-14 text-white" strokeWidth={2.5} />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Sparkles className="w-5 h-5 text-yellow-400" />
                      <span className="text-yellow-400 font-bold uppercase tracking-widest text-sm">教学训练完成</span>
                      <Sparkles className="w-5 h-5 text-yellow-400" />
                    </div>
                    <h2 className="text-3xl font-black text-white mb-3 bg-gradient-to-r from-white via-yellow-100 to-white bg-clip-text text-transparent">
                      恭喜你！
                    </h2>
                    <p className="text-gray-300 mb-6 leading-relaxed">
                      你已经成功掌握了仓库拣货的基础操作。<br />
                      <span className="text-emerald-400 font-semibold">订单关已解锁</span>，准备好迎接真正的挑战了吗？
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="grid grid-cols-2 gap-3 mb-7"
                  >
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-400/30">
                      <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-0.5">解锁</div>
                      <div className="text-white font-bold">订单关 ×10</div>
                    </div>
                    <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-400/30">
                      <div className="text-[10px] text-blue-400 font-bold uppercase tracking-wider mb-0.5">成就</div>
                      <div className="text-white font-bold">新手拣货员</div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="space-y-3"
                  >
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate('/order')}
                      className="w-full py-4 rounded-xl font-bold text-white text-base bg-gradient-to-r from-emerald-500 to-green-500 shadow-xl shadow-emerald-500/40 hover:shadow-emerald-500/60 flex items-center justify-center gap-2 transition-all"
                    >
                      <ChevronRight className="w-5 h-5" />
                      立即进入订单关
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate('/')}
                      className="w-full py-3.5 rounded-xl font-semibold text-gray-300 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white flex items-center justify-center gap-2 transition-all"
                    >
                      <Home className="w-4 h-4" />
                      返回主菜单
                    </motion.button>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
