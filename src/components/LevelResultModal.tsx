import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  Trophy,
  Star,
  Clock,
  Target,
  TrendingUp,
  RotateCcw,
  Home,
  BarChart3,
  Sparkles,
  ChevronRight,
  Award,
  AlertCircle,
} from 'lucide-react'

export type GradeRank = 'S' | 'A' | 'B' | 'C' | 'D'

export interface ScoreDetailItem {
  id: string
  label: string
  value: number
  maxValue?: number
  type: 'positive' | 'negative' | 'neutral'
}

export interface UnlockInfo {
  id: string
  title: string
  description: string
  icon: 'level' | 'achievement' | 'skin'
}

export interface LevelResultData {
  totalScore: number
  bestScore?: number
  grade: GradeRank
  accuracy: number
  timeMs: number
  baseScore: number
  timeBonus: number
  accuracyScore: number
  pathScore: number
  nearExpiryBonus?: number
  raceConditionBonus?: number
  penaltyPoints: number
  details: ScoreDetailItem[]
  stars: number
  isNewBest?: boolean
  unlocks?: UnlockInfo[]
}

interface LevelResultModalProps {
  open: boolean
  result: LevelResultData | null
  onViewReplay: () => void
  onPlayAgain: () => void
  onBackToMenu: () => void
}

const GRADE_CONFIG: Record<
  GradeRank,
  {
    color: string
    bgGradient: string
    borderColor: string
    glowColor: string
    label: string
  }
> = {
  S: {
    color: 'text-yellow-300',
    bgGradient: 'from-yellow-400 via-amber-400 to-yellow-500',
    borderColor: 'border-yellow-400/50',
    glowColor: 'shadow-[0_0_60px_rgba(250,204,21,0.4)]',
    label: '完美',
  },
  A: {
    color: 'text-emerald-400',
    bgGradient: 'from-emerald-400 via-green-400 to-teal-400',
    borderColor: 'border-emerald-400/50',
    glowColor: 'shadow-[0_0_50px_rgba(52,211,153,0.35)]',
    label: '优秀',
  },
  B: {
    color: 'text-blue-400',
    bgGradient: 'from-blue-400 via-sky-400 to-cyan-400',
    borderColor: 'border-blue-400/50',
    glowColor: 'shadow-[0_0_40px_rgba(96,165,250,0.3)]',
    label: '良好',
  },
  C: {
    color: 'text-orange-400',
    bgGradient: 'from-orange-400 via-amber-400 to-yellow-400',
    borderColor: 'border-orange-400/50',
    glowColor: 'shadow-[0_0_30px_rgba(251,146,60,0.25)]',
    label: '合格',
  },
  D: {
    color: 'text-red-400',
    bgGradient: 'from-red-400 via-rose-400 to-pink-400',
    borderColor: 'border-red-400/50',
    glowColor: 'shadow-[0_0_30px_rgba(248,113,113,0.25)]',
    label: '待提升',
  },
}

const UNLOCK_ICONS = {
  level: Trophy,
  achievement: Award,
  skin: Sparkles,
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes > 0) {
    return `${minutes}分${seconds}秒`
  }
  return `${seconds}秒`
}

function StarsDisplay({ count, total = 3 }: { count: number; total?: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ scale: 0, rotate: -180 }}
          animate={{
            scale: i < count ? 1 : 0.8,
            rotate: 0,
            opacity: i < count ? 1 : 0.3,
          }}
          transition={{
            type: 'spring',
            stiffness: 400,
            damping: 20,
            delay: 0.6 + i * 0.1,
          }}
        >
          <Star
            className={cn(
              'w-8 h-8',
              i < count
                ? 'text-yellow-400 fill-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]'
                : 'text-gray-600'
            )}
          />
        </motion.div>
      ))}
    </div>
  )
}

export default function LevelResultModal({
  open,
  result,
  onViewReplay,
  onPlayAgain,
  onBackToMenu,
}: LevelResultModalProps) {
  if (!result) return null

  const gradeConfig = GRADE_CONFIG[result.grade]

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={onBackToMenu}
          />

          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className={cn(
                'relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border-2 bg-warehouse-navy shadow-2xl',
                gradeConfig.borderColor,
                gradeConfig.glowColor
              )}
              onClick={e => e.stopPropagation()}
            >
              <div
                className={cn(
                  'absolute inset-x-0 top-0 h-40 rounded-t-3xl opacity-20 pointer-events-none bg-gradient-to-b',
                  gradeConfig.bgGradient
                )}
              />

              <div className="relative p-6 pb-0">
                {result.isNewBest && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="absolute top-4 left-1/2 -translate-x-1/2"
                  >
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/20 border border-yellow-400/30">
                      <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                      <span className="text-xs font-bold text-yellow-300">新纪录!</span>
                    </div>
                  </motion.div>
                )}

                <div className="text-center pt-4">
                  <motion.div
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25, delay: 0.1 }}
                    className={cn(
                      'inline-flex items-center justify-center w-28 h-28 rounded-3xl mb-4 bg-gradient-to-br border-4',
                      gradeConfig.bgGradient,
                      gradeConfig.borderColor
                    )}
                  >
                    <span className={cn('text-6xl font-black drop-shadow-lg', gradeConfig.color)}>
                      {result.grade}
                    </span>
                  </motion.div>

                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className={cn('text-lg font-bold mb-4', gradeConfig.color)}
                  >
                    {gradeConfig.label}
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="mb-4"
                  >
                    <StarsDisplay count={result.stars} />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', delay: 0.4 }}
                    className="mb-6"
                  >
                    <div className="text-[11px] text-gray-400 uppercase tracking-widest mb-1">
                      总分
                    </div>
                    <motion.div
                      key={result.totalScore}
                      initial={{ scale: 1.1 }}
                      animate={{ scale: 1 }}
                      className="font-mono text-5xl font-black text-white tracking-tight"
                    >
                      {result.totalScore.toLocaleString()}
                    </motion.div>
                    {result.bestScore !== undefined && (
                      <div className="text-xs text-gray-500 mt-1">
                        历史最高:{' '}
                        <span className="font-mono font-semibold text-gray-400">
                          {result.bestScore.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="grid grid-cols-3 gap-2 mb-6"
                  >
                    <div className="rounded-xl bg-warehouse-navyDark/60 border border-warehouse-navyLight/30 p-3">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Clock className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-[10px] text-gray-400 uppercase">用时</span>
                      </div>
                      <div className="font-mono text-sm font-bold text-white">
                        {formatTime(result.timeMs)}
                      </div>
                    </div>
                    <div className="rounded-xl bg-warehouse-navyDark/60 border border-warehouse-navyLight/30 p-3">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Target className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-[10px] text-gray-400 uppercase">准确</span>
                      </div>
                      <div
                        className={cn(
                          'font-mono text-sm font-bold',
                          result.accuracy >= 90
                            ? 'text-emerald-400'
                            : result.accuracy >= 70
                            ? 'text-yellow-400'
                            : 'text-red-400'
                        )}
                      >
                        {result.accuracy.toFixed(0)}%
                      </div>
                    </div>
                    <div className="rounded-xl bg-warehouse-navyDark/60 border border-warehouse-navyLight/30 p-3">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <TrendingUp className="w-3.5 h-3.5 text-orange-400" />
                        <span className="text-[10px] text-gray-400 uppercase">路径</span>
                      </div>
                      <div
                        className={cn(
                          'font-mono text-sm font-bold',
                          result.pathScore >= 160
                            ? 'text-emerald-400'
                            : result.pathScore >= 120
                            ? 'text-yellow-400'
                            : 'text-red-400'
                        )}
                      >
                        {result.pathScore}分
                      </div>
                    </div>
                  </motion.div>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="mb-6"
                >
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    得分明细
                  </div>
                  <div className="rounded-xl bg-warehouse-navyDark/60 border border-warehouse-navyLight/30 overflow-hidden divide-y divide-warehouse-navyLight/20">
                    {result.details.map((item, idx) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.7 + idx * 0.05 }}
                        className="flex items-center justify-between px-4 py-2.5"
                      >
                        <span className="text-sm text-gray-300">{item.label}</span>
                        <div className="flex items-center gap-2">
                          {item.maxValue && (
                            <span className="text-[11px] text-gray-500 font-mono">
                              /{item.maxValue}
                            </span>
                          )}
                          <span
                            className={cn(
                              'font-mono font-bold text-sm',
                              item.type === 'positive'
                                ? 'text-emerald-400'
                                : item.type === 'negative'
                                ? 'text-red-400'
                                : 'text-white'
                            )}
                          >
                            {item.type === 'positive' && '+'}
                            {item.type === 'negative' && '-'}
                            {item.value}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {result.unlocks && result.unlocks.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 }}
                    className="mb-6"
                  >
                    <div className="text-xs font-bold text-yellow-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      解锁内容
                    </div>
                    <div className="space-y-2">
                      {result.unlocks.map((unlock, idx) => {
                        const Icon = UNLOCK_ICONS[unlock.icon]
                        return (
                          <motion.div
                            key={unlock.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 1 + idx * 0.1 }}
                            className="flex items-center gap-3 rounded-xl bg-yellow-500/5 border border-yellow-400/20 p-3"
                          >
                            <div className="w-10 h-10 rounded-lg bg-yellow-500/15 flex items-center justify-center shrink-0">
                              <Icon className="w-5 h-5 text-yellow-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-yellow-300">
                                {unlock.title}
                              </div>
                              <div className="text-xs text-gray-400">{unlock.description}</div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-yellow-500/50 shrink-0" />
                          </motion.div>
                        )
                      })}
                    </div>
                  </motion.div>
                )}

                {result.grade === 'D' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="mb-6"
                  >
                    <div className="flex items-start gap-2.5 rounded-xl bg-red-500/5 border border-red-400/20 p-3">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm font-semibold text-red-300 mb-0.5">需要多练习</div>
                        <div className="text-xs text-gray-400 leading-relaxed">
                          建议查看复盘分析，了解错误原因。重点提升拣货准确率和路径规划。
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.1 }}
                className="sticky bottom-0 p-6 pt-4 bg-gradient-to-t from-warehouse-navy via-warehouse-navy to-transparent"
              >
                <div className="grid grid-cols-3 gap-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onViewReplay}
                    className="flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-xl bg-warehouse-navyLight/40 hover:bg-warehouse-navyLight/60 border border-warehouse-navyLight/50 transition-colors"
                  >
                    <BarChart3 className="w-5 h-5 text-gray-300" />
                    <span className="text-xs font-semibold text-gray-300">查看复盘</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onPlayAgain}
                    className={cn(
                      'flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-xl font-bold transition-all shadow-lg',
                      'bg-gradient-to-r from-warehouse-orange to-warehouse-orangeDark hover:from-warehouse-orangeDark hover:to-warehouse-orange text-white shadow-warehouse-orange/30'
                    )}
                  >
                    <RotateCcw className="w-5 h-5" />
                    <span className="text-xs font-bold">再玩一次</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onBackToMenu}
                    className="flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-xl bg-warehouse-navyLight/40 hover:bg-warehouse-navyLight/60 border border-warehouse-navyLight/50 transition-colors"
                  >
                    <Home className="w-5 h-5 text-gray-300" />
                    <span className="text-xs font-semibold text-gray-300">返回主菜单</span>
                  </motion.button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
