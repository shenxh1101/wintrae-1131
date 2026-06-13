import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Search, ClipboardList, Timer, BookOpen, Star, Clock,
  Calendar, CheckCircle2, XCircle, ChevronDown, Filter, History,
  TrendingUp, Award, Package, Trophy
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useScoreStore } from '@/store/useScoreStore'
import { usePlayerStore } from '@/store/usePlayerStore'
import { useReviewListState } from '@/store/useReviewListState'
import { ORDER_LEVELS, TIMED_LEVELS } from '@/data/mockData'
import type { LevelType } from '@/types'
import { getScoreRank } from '@/utils/scoreCalculator'

type FilterType = 'all' | LevelType

const LEVEL_TYPE_INFO: Record<LevelType, { label: string; icon: typeof BookOpen; color: string; bg: string; border: string }> = {
  tutorial: { label: '教学关', icon: BookOpen, color: 'text-blue-400', bg: 'bg-blue-500/15', border: 'border-blue-500/30' },
  order: { label: '订单关', icon: ClipboardList, color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30' },
  timed: { label: '限时关', icon: Timer, color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/30' },
}

const FILTER_OPTIONS: { value: FilterType; label: string; icon?: typeof Filter }[] = [
  { value: 'all', label: '全部' },
  { value: 'tutorial', label: '教学关', icon: BookOpen },
  { value: 'order', label: '订单关', icon: ClipboardList },
  { value: 'timed', label: '限时关', icon: Timer },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 120,
      damping: 16
    }
  }
}

const headerVariants = {
  hidden: { opacity: 0, y: -15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 100, damping: 15 }
  }
}

function getLevelName(levelType: LevelType, levelId: number): string {
  if (levelType === 'order') {
    const level = ORDER_LEVELS.find(l => l.levelId === levelId)
    return level?.name ?? `订单关 ${levelId}`
  }
  if (levelType === 'timed') {
    const level = TIMED_LEVELS.find(l => l.levelId === levelId)
    return level?.name ?? `限时关 ${levelId}`
  }
  return `教学关 ${levelId}`
}

function calculateStars(score: number, levelType: LevelType): number {
  const baseMax = levelType === 'tutorial' ? 500 : levelType === 'order' ? 800 : 1000
  const ratio = score / baseMax
  if (ratio >= 0.9) return 3
  if (ratio >= 0.75) return 2
  if (ratio >= 0.5) return 1
  return 0
}

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatDate(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / 3600000)
    if (diffHours === 0) {
      const diffMins = Math.floor(diffMs / 60000)
      return diffMins <= 1 ? '刚刚' : `${diffMins}分钟前`
    }
    return `${diffHours}小时前`
  }
  if (diffDays === 1) return '昨天'
  if (diffDays < 7) return `${diffDays}天前`
  
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

function FilterDropdown({
  value,
  onChange,
  options,
}: {
  value: FilterType
  onChange: (v: FilterType) => void
  options: typeof FILTER_OPTIONS
}) {
  const [open, setOpen] = useState(false)
  const selected = options.find(o => o.value === value)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-sm"
      >
        <Filter size={14} className="text-white/50" />
        <span className="text-white/80 font-medium">{selected?.label}</span>
        <ChevronDown
          size={14}
          className={cn('text-white/50 transition-transform', open && 'rotate-180')}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.98 }}
            className="absolute top-full right-0 mt-1 rounded-lg bg-warehouse-navy border border-white/10 shadow-xl z-20 overflow-hidden min-w-[140px]"
          >
            {options.map(opt => {
              const Icon = opt.icon
              return (
                <button
                  key={String(opt.value)}
                  onClick={() => {
                    onChange(opt.value)
                    setOpen(false)
                  }}
                  className={cn(
                    'w-full text-left px-3 py-2.5 text-sm transition-colors flex items-center gap-2',
                    opt.value === value
                      ? 'bg-warehouse-orange/20 text-warehouse-orange font-medium'
                      : 'text-white/70 hover:bg-white/5'
                  )}
                >
                  {Icon && <Icon size={14} />}
                  {opt.label}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ReviewCard({
  record,
  index,
  onNavigate,
}: {
  record: ReturnType<typeof useScoreStore.getState>['scoreRecords'][0]
  index: number
  onNavigate: () => void
}) {
  const navigate = useNavigate()
  const { session, score, timestamp } = record
  const typeInfo = LEVEL_TYPE_INFO[session.levelType]
  const LevelIcon = typeInfo.icon
  const levelName = getLevelName(session.levelType, session.levelId)
  const stars = calculateStars(score.totalScore, session.levelType)
  const isCompleted = session.status === 'completed'
  const rank = getScoreRank(score.totalScore)

  return (
    <motion.div
      variants={itemVariants}
      custom={index}
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => {
        onNavigate()
        navigate(`/review/${session.sessionId}`, { state: { from: 'list' } })
      }}
      className="relative rounded-2xl bg-warehouse-navy/40 border border-white/10 hover:border-warehouse-orange/40 p-5 cursor-pointer transition-all group overflow-hidden"
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 30% 0%, rgba(255,107,53,0.12) 0%, transparent 50%)'
        }}
      />

      <div className="relative z-10 flex items-start gap-4">
        <motion.div
          whileHover={{ rotate: 8, scale: 1.05 }}
          className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border',
            typeInfo.bg,
            typeInfo.border
          )}
        >
          <LevelIcon size={22} className={typeInfo.color} />
        </motion.div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-white font-bold text-base truncate">
                  {levelName}
                </h3>
                <span className={cn(
                  'text-[10px] px-2 py-0.5 rounded-full font-medium border',
                  typeInfo.bg,
                  typeInfo.border,
                  typeInfo.color
                )}>
                  L{session.levelId} · {typeInfo.label}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    className={cn(
                      'transition-all',
                      i < stars
                        ? 'text-yellow-400 fill-yellow-400 scale-100'
                        : 'text-gray-600 scale-90'
                    )}
                  />
                ))}
                <span className="text-[10px] text-white/40 ml-1">
                  {rank}
                </span>
              </div>
            </div>

            <div className="flex-shrink-0 text-right">
              <div className="text-2xl font-black text-warehouse-orange tracking-tight">
                {score.totalScore}
              </div>
              <div className="text-[10px] text-white/40">总分</div>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap mt-3">
            <div className="flex items-center gap-1.5 text-xs text-white/55">
              <Target size={12} className="text-emerald-400" />
              <span>准确率 <span className="text-emerald-400 font-medium">{score.accuracy}%</span></span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-white/55">
              <Clock size={12} className="text-sky-400" />
              <span>用时 <span className="text-sky-400 font-medium">{formatDuration(session.durationMs)}</span></span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-white/55">
              <Calendar size={12} className="text-violet-400" />
              <span className="text-violet-300/80">{formatDate(timestamp)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
            <div className="flex items-center gap-2">
              {isCompleted ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30">
                  <CheckCircle2 size={12} className="text-emerald-400" />
                  <span className="text-[11px] font-medium text-emerald-400">已通关</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30">
                  <XCircle size={12} className="text-rose-400" />
                  <span className="text-[11px] font-medium text-rose-400">未通关</span>
                </div>
              )}
              {score.penaltyPoints > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-rose-500/10 text-[10px] text-rose-300">
                  <AlertTriangle size={10} />
                  扣 {score.penaltyPoints} 分
                </div>
              )}
              {(score.nearExpiryBonus ?? 0) > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 text-[10px] text-amber-300">
                  <Award size={10} />
                  临期 +{score.nearExpiryBonus}
                </div>
              )}
              {(score.raceConditionBonus ?? 0) > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-violet-500/10 text-[10px] text-violet-300">
                  <Zap size={10} />
                  应急 +{score.raceConditionBonus}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 text-xs text-white/40 group-hover:text-warehouse-orange/80 transition-colors">
              <span>查看复盘</span>
              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-warehouse-orange/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    </motion.div>
  )
}

function ChevronRight(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function AlertTriangle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function Target(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  )
}

function Zap(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

export default function ReviewList() {
  const navigate = useNavigate()
  const playerId = usePlayerStore(s => s.playerId)
  const { scoreRecords, getPlayerScores } = useScoreStore()
  const { filterType: storedFilterType, searchQuery: storedSearchQuery, scrollTop: storedScrollTop, setFilterType: storeSetFilterType, setSearchQuery: storeSetSearchQuery, setScrollTop: storeSetScrollTop } = useReviewListState()
  const [filterType, setFilterType] = useState<FilterType>(storedFilterType as FilterType)
  const [searchQuery, setSearchQuery] = useState(storedSearchQuery)
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollRestored = useRef(false)

  const handleFilterChange = (v: FilterType) => {
    setFilterType(v)
    storeSetFilterType(v)
  }

  const handleSearchChange = (v: string) => {
    setSearchQuery(v)
    storeSetSearchQuery(v)
  }

  const handleCardNavigate = () => {
    if (scrollRef.current) {
      storeSetScrollTop(scrollRef.current.scrollTop)
    }
  }

  useEffect(() => {
    if (!scrollRestored.current && scrollRef.current && storedScrollTop > 0) {
      scrollRef.current.scrollTop = storedScrollTop
      scrollRestored.current = true
    }
  }, [storedScrollTop])

  const playerRecords = useMemo(() => {
    const records = getPlayerScores(playerId)
    return records
  }, [scoreRecords, playerId, getPlayerScores])

  const filteredRecords = useMemo(() => {
    let result = playerRecords

    if (filterType !== 'all') {
      result = result.filter(r => r.session.levelType === filterType)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(r => {
        const levelName = getLevelName(r.session.levelType, r.session.levelId).toLowerCase()
        return levelName.includes(query) || String(r.score.totalScore).includes(query)
      })
    }

    return result
  }, [playerRecords, filterType, searchQuery])

  const stats = useMemo(() => {
    const total = playerRecords.length
    const completed = playerRecords.filter(r => r.session.status === 'completed').length
    const avgScore = total > 0
      ? Math.round(playerRecords.reduce((s, r) => s + r.score.totalScore, 0) / total)
      : 0
    const bestScore = total > 0
      ? Math.max(...playerRecords.map(r => r.score.totalScore))
      : 0

    const typeCounts = {
      tutorial: playerRecords.filter(r => r.session.levelType === 'tutorial').length,
      order: playerRecords.filter(r => r.session.levelType === 'order').length,
      timed: playerRecords.filter(r => r.session.levelType === 'timed').length,
    }

    return { total, completed, avgScore, bestScore, typeCounts }
  }, [playerRecords])

  return (
    <div ref={scrollRef} className="min-h-screen bg-gradient-to-br from-warehouse-navyDark via-warehouse-navy to-warehouse-navyDark text-white overflow-y-auto">
      <div className="max-w-5xl mx-auto p-4 md:p-6">
        <motion.header
          variants={headerVariants}
          initial="hidden"
          animate="visible"
          className="mb-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-warehouse-navyLight/60 hover:bg-warehouse-navyLight border border-white/10 transition-all text-sm"
            >
              <ArrowLeft size={18} />
              <span>返回主菜单</span>
            </motion.button>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <History size={22} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black tracking-tight">历史复盘</h1>
                <p className="text-xs text-white/45 mt-0.5">查看所有训练记录，分析提升路径</p>
              </div>
            </div>
          </div>
        </motion.header>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5"
        >
          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <div className="text-[11px] text-white/45 mb-1 flex items-center gap-1">
              <Package size={11} className="text-sky-400" />
              总记录数
            </div>
            <div className="text-2xl font-black text-white">{stats.total}</div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <div className="text-[11px] text-white/45 mb-1 flex items-center gap-1">
              <CheckCircle2 size={11} className="text-emerald-400" />
              通关次数
            </div>
            <div className="text-2xl font-black text-emerald-400">{stats.completed}</div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <div className="text-[11px] text-white/45 mb-1 flex items-center gap-1">
              <TrendingUp size={11} className="text-amber-400" />
              平均分
            </div>
            <div className="text-2xl font-black text-amber-400">{stats.avgScore}</div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <div className="text-[11px] text-white/45 mb-1 flex items-center gap-1">
              <Trophy size={11} className="text-yellow-400" />
              最高分
            </div>
            <div className="text-2xl font-black text-yellow-400">{stats.bestScore}</div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="flex flex-wrap items-center gap-3 mb-5"
        >
          <div className="flex-1 min-w-[200px] max-w-md relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="搜索关卡名称或分数..."
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-warehouse-orange/50 focus:bg-white/8 transition-all"
            />
          </div>

          <FilterDropdown
            value={filterType}
            onChange={handleFilterChange}
            options={FILTER_OPTIONS}
          />

          <div className="flex items-center gap-2 text-xs text-white/40">
            <span className="px-2 py-1 rounded bg-white/5 border border-white/10">
              {filteredRecords.length} 条记录
            </span>
          </div>
        </motion.div>

        {stats.typeCounts.tutorial + stats.typeCounts.order + stats.typeCounts.timed > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-4 mb-5 px-4 py-3 rounded-xl bg-white/5 border border-white/10"
          >
            <span className="text-xs text-white/50 flex-shrink-0">类型分布:</span>
            {(Object.keys(LEVEL_TYPE_INFO) as LevelType[]).map(type => {
              const info = LEVEL_TYPE_INFO[type]
              const Icon = info.icon
              const count = stats.typeCounts[type]
              return (
                <div key={type} className="flex items-center gap-1.5">
                  <Icon size={12} className={info.color} />
                  <span className="text-xs text-white/60">{info.label}</span>
                  <span className={cn('text-xs font-bold', info.color)}>{count}</span>
                </div>
              )
            })}
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {filteredRecords.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="rounded-2xl bg-white/5 border border-white/10 p-12 text-center"
            >
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-warehouse-navyLight/40 flex items-center justify-center">
                <Search size={32} className="text-white/30" />
              </div>
              <h3 className="text-lg font-bold text-white/70 mb-2">
                {playerRecords.length === 0 ? '暂无复盘记录' : '没有找到匹配的记录'}
              </h3>
              <p className="text-sm text-white/40 max-w-sm mx-auto">
                {playerRecords.length === 0
                  ? '完成一次训练后，这里会显示你的复盘记录。快去挑战吧！'
                  : '尝试调整筛选条件或搜索关键词'}
              </p>
              {playerRecords.length === 0 && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/tutorial')}
                  className="mt-6 px-6 py-2.5 rounded-xl bg-gradient-to-r from-warehouse-orange to-warehouse-orangeDark text-white font-medium text-sm shadow-lg shadow-warehouse-orange/30"
                >
                  开始训练
                </motion.button>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="list"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-3"
            >
              {filteredRecords.map((record, index) => (
                <ReviewCard key={record.score.scoreId} record={record} index={index} onNavigate={handleCardNavigate} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
