import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Trophy, Medal, Award, Crown, ChevronDown, User, Clock, Target,
  TrendingUp, Activity, Star, Flame, Zap, ShieldAlert, MapPin,
  Calendar, BarChart2
} from 'lucide-react'
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar
} from 'recharts'
import { cn } from '@/lib/utils'
import { useScoreStore } from '@/store/useScoreStore'
import type { LevelType, LeaderboardEntry, AbilityRadar, TrendPoint } from '@/types'
import { ORDER_LEVELS, TIMED_LEVELS } from '@/data/mockData'
import { calculateAbilityMetrics, getScoreRank, SCORE_CONSTANTS, type ScoreBreakdown } from '@/utils/scoreCalculator'

type TabType = 'order' | 'timed' | 'mine'
type Difficulty = 1 | 2 | 3 | 4 | 5

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  1: '入门',
  2: '简单',
  3: '中等',
  4: '困难',
  5: '专家',
}

const MOCK_NICKNAME = '仓库新星'
const MOCK_PLAYER_ID = 'player-local-001'

interface PodiumEntry extends LeaderboardEntry {
  medalColor: string
  medalGradient: string
  platformHeight: number
}

function MiniRadar({ data, size = 70 }: { data: AbilityRadar; size?: number }) {
  const chartData = [
    { subject: '速度', A: data.speed },
    { subject: '准确', A: data.accuracy },
    { subject: '路径', A: data.pathPlanning },
    { subject: '应急', A: data.emergency },
  ]
  return (
    <div style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="rgba(255,255,255,0.1)" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 8 }} />
          <Radar
            name="能力"
            dataKey="A"
            stroke="#FF6B35"
            fill="#FF6B35"
            fillOpacity={0.35}
            strokeWidth={1}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

function PodiumCard({ entry, rankNum }: { entry: PodiumEntry; rankNum: number }) {
  const MedalIcon = rankNum === 1 ? Crown : Medal
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rankNum * 0.1, type: 'spring', stiffness: 80 }}
      className="flex flex-col items-center"
    >
      <div
        className={cn(
          'relative w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center mb-3',
          'border-4 shadow-lg',
          rankNum === 1 ? 'border-yellow-400 bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-600 shadow-yellow-500/30' :
          rankNum === 2 ? 'border-gray-300 bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400 shadow-gray-400/30' :
          'border-amber-600 bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 shadow-amber-600/30'
        )}
      >
        <MedalIcon
          size={rankNum === 1 ? 28 : 24}
          className={cn(
            rankNum === 1 ? 'text-yellow-900' :
            rankNum === 2 ? 'text-gray-700' :
            'text-amber-900'
          )}
        />
        <span className={cn(
          'absolute -top-2 -right-2 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center',
          rankNum === 1 ? 'bg-yellow-400 text-yellow-900' :
          rankNum === 2 ? 'bg-gray-300 text-gray-800' :
          'bg-amber-600 text-amber-100'
        )}>
          {rankNum}
        </span>
      </div>

      <div className="text-center mb-2">
        <div className="font-bold text-white text-sm md:text-base truncate max-w-[120px]">
          {entry.nickname}
        </div>
        <div className="text-warehouse-orange text-xl md:text-2xl font-black mt-1 tracking-tight">
          {entry.totalScore}
        </div>
        <div className="text-xs text-white/50 mt-0.5">分</div>
      </div>

      <div className="flex items-center gap-3 text-[10px] text-white/60 mb-3">
        <span className="flex items-center gap-1">
          <Target size={11} className="text-warehouse-success" />
          {entry.accuracy}%
        </span>
        <span className="flex items-center gap-1">
          <Clock size={11} className="text-sky-400" />
          {Math.floor(entry.durationMs / 60000)}:{String(Math.floor((entry.durationMs % 60000) / 1000)).padStart(2, '0')}
        </span>
      </div>

      <div
        className={cn(
          'w-20 md:w-24 rounded-t-lg flex items-center justify-center font-bold text-white/90',
          rankNum === 1 ? 'h-16 md:h-20 bg-gradient-to-b from-yellow-500/80 to-yellow-700/80' :
          rankNum === 2 ? 'h-12 md:h-16 bg-gradient-to-b from-gray-400/80 to-gray-600/80' :
          'h-9 md:h-12 bg-gradient-to-b from-amber-600/80 to-amber-800/80'
        )}
      >
        <Star size={14} className="mr-1 text-white/70" />
        <span>{getScoreRank(entry.totalScore)}</span>
      </div>
    </motion.div>
  )
}

function RankCard({ entry, isMine = false }: { entry: LeaderboardEntry; isMine?: boolean }) {
  const rankColors: Record<number, string> = {
    4: 'border-sky-500/30 bg-sky-500/5',
    5: 'border-cyan-500/30 bg-cyan-500/5',
    6: 'border-teal-500/30 bg-teal-500/5',
    7: 'border-emerald-500/30 bg-emerald-500/5',
    8: 'border-green-500/30 bg-green-500/5',
    9: 'border-lime-500/30 bg-lime-500/5',
    10: 'border-yellow-500/30 bg-yellow-500/5',
  }
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(entry.rank - 3, 7) * 0.05 }}
      whileHover={{ scale: 1.01 }}
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl border transition-all',
        isMine
          ? 'border-warehouse-orange/50 bg-warehouse-orange/10 shadow-glow-orange/30 ring-1 ring-warehouse-orange/30'
          : rankColors[entry.rank] || 'border-white/10 bg-white/5',
      )}
    >
      <div className={cn(
        'flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm',
        isMine
          ? 'bg-warehouse-orange text-white'
          : 'bg-white/10 text-white/70'
      )}>
        {entry.rank}
      </div>

      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-warehouse-navyLight to-warehouse-navyDark border border-white/10 flex items-center justify-center">
        <User size={16} className="text-white/60" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            'font-semibold text-sm truncate',
            isMine ? 'text-warehouse-orange' : 'text-white'
          )}>
            {entry.nickname}
            {isMine && <span className="ml-1 text-xs">(我)</span>}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/50">
            {getScoreRank(entry.totalScore)}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-[11px] text-white/50">
          <span className="flex items-center gap-0.5">
            <Target size={10} /> {entry.accuracy}%
          </span>
          <span className="flex items-center gap-0.5">
            <Clock size={10} />
            {Math.floor(entry.durationMs / 60000)}:{String(Math.floor((entry.durationMs % 60000) / 1000)).padStart(2, '0')}
          </span>
        </div>
      </div>

      <MiniRadar
        data={{
          speed: Math.min(100, Math.round(entry.totalScore / 9)),
          accuracy: entry.accuracy,
          pathPlanning: Math.round(entry.accuracy * 0.85 + (entry.totalScore % 15)),
          emergency: Math.max(30, Math.round(100 - entry.rank * 6)),
        }}
        size={64}
      />

      <div className="flex-shrink-0 text-right">
        <div className={cn(
          'text-lg font-black',
          isMine ? 'text-warehouse-orange' : 'text-white'
        )}>
          {entry.totalScore}
        </div>
        <div className="text-[10px] text-white/40">总分</div>
      </div>
    </motion.div>
  )
}

function SelectField<T extends string | number>({
  value,
  onChange,
  options,
  label,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  label: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <div className="text-[11px] text-white/40 mb-1">{label}</div>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-sm"
      >
        <span className="text-white/80 font-medium">
          {options.find(o => o.value === value)?.label}
        </span>
        <ChevronDown
          size={14}
          className={cn('text-white/50 transition-transform', open && 'rotate-180')}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute top-full left-0 right-0 mt-1 rounded-lg bg-warehouse-navy border border-white/10 shadow-xl z-20 overflow-hidden"
          >
            {options.map(opt => (
              <button
                key={String(opt.value)}
                onClick={() => {
                  onChange(opt.value)
                  setOpen(false)
                }}
                className={cn(
                  'w-full text-left px-3 py-2 text-sm transition-colors',
                  opt.value === value
                    ? 'bg-warehouse-orange/20 text-warehouse-orange font-medium'
                    : 'text-white/70 hover:bg-white/5'
                )}
              >
                {opt.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Leaderboard() {
  const [activeTab, setActiveTab] = useState<TabType>('order')
  const [orderLevelId, setOrderLevelId] = useState<number>(1)
  const [timedLevelId, setTimedLevelId] = useState<number>(1)
  const [difficulty, setDifficulty] = useState<Difficulty>(3)
  const [isLoading, setIsLoading] = useState(false)

  const scoreStore = useScoreStore()

  const currentLevelType: LevelType = activeTab === 'order' ? 'order' : activeTab === 'timed' ? 'timed' : 'order'
  const currentLevelId = activeTab === 'order' ? orderLevelId : activeTab === 'timed' ? timedLevelId : 1

  useEffect(() => {
    if (activeTab === 'mine') return
    setIsLoading(true)
    scoreStore.fetchLeaderboard(currentLevelType, currentLevelId, 30).finally(() => {
      setIsLoading(false)
    })
  }, [activeTab, currentLevelType, currentLevelId, difficulty])

  const leaderboardData = useMemo<LeaderboardEntry[]>(() => {
    if (activeTab === 'mine') return []
    const base = scoreStore.leaderboard.length > 0
      ? [...scoreStore.leaderboard]
      : Array.from({ length: 15 }, (_, i) => {
        const mockNames = ['闪电手', '精准王', '老司机', '速度之星', '零失误', '效率大师', '路径规划师', '应急专家', '全能选手', '稳健派', '快手阿强', '细心小美', '挑战王', '不败神话', '新手上路']
        const rand = Math.sin(i * 99 + currentLevelId * 7) * 10000
        const jitter = (rand - Math.floor(rand))
        return {
          rank: i + 1,
          playerId: `player-mock-${i}`,
          nickname: mockNames[i % mockNames.length],
          levelType: currentLevelType,
          levelId: currentLevelId,
          totalScore: Math.floor(900 - i * 28 + jitter * 40),
          accuracy: Number(Math.min(100, 98 - i * 0.6 + jitter * 5).toFixed(1)),
          durationMs: Math.floor(65000 + i * 12000 + jitter * 25000),
          timestamp: new Date(Date.now() - i * 86400000 - jitter * 86400000 * 30).toISOString(),
        } as LeaderboardEntry
      })
    base.sort((a, b) => b.totalScore - a.totalScore)
    return base.map((e, i) => ({ ...e, rank: i + 1 }))
  }, [scoreStore.leaderboard, activeTab, currentLevelType, currentLevelId])

  const myEntry: LeaderboardEntry = useMemo(() => {
    const myScore = 720 + (currentLevelId * 15) - (difficulty * 8)
    return {
      rank: Math.min(leaderboardData.length + 1, Math.max(3, Math.floor(leaderboardData.length * 0.4))),
      playerId: MOCK_PLAYER_ID,
      nickname: MOCK_NICKNAME,
      levelType: currentLevelType,
      levelId: currentLevelId,
      totalScore: myScore,
      accuracy: 92.3,
      durationMs: 142000,
      timestamp: new Date().toISOString(),
    }
  }, [leaderboardData, currentLevelType, currentLevelId, difficulty])

  const top3 = leaderboardData.slice(0, 3).map((e, i): PodiumEntry => ({
    ...e,
    medalColor: ['#FBBF24', '#9CA3AF', '#D97706'][i],
    medalGradient: '',
    platformHeight: [20, 14, 10][i],
  }))
  const restRanks = leaderboardData.slice(3, 10)

  const scoreDistribution = useMemo(() => {
    const bins = [
      { range: '0-399', count: 0 },
      { range: '400-549', count: 0 },
      { range: '550-699', count: 0 },
      { range: '700-849', count: 0 },
      { range: '850-1000', count: 0 },
    ]
    for (let i = 0; i < 80; i++) {
      const s = 300 + Math.floor(Math.abs(Math.sin(i * 7.3 + currentLevelId)) * 700)
      if (s < 400) bins[0].count++
      else if (s < 550) bins[1].count++
      else if (s < 700) bins[2].count++
      else if (s < 850) bins[3].count++
      else bins[4].count++
    }
    return bins
  }, [currentLevelId])

  const myAbilityRadar: AbilityRadar = useMemo(() => {
    const storeRadar = scoreStore.getAbilityRadar(MOCK_PLAYER_ID)
    if (storeRadar.speed > 0 || storeRadar.accuracy > 0) return storeRadar
    return {
      speed: 78,
      accuracy: 92,
      pathPlanning: 81,
      emergency: 67,
    }
  }, [scoreStore])

  const scoreTrend: (TrendPoint & { accuracy?: number })[] = useMemo(() => {
    const fromStore = scoreStore.getScoreTrend(MOCK_PLAYER_ID, 10)
    const accFromStore = scoreStore.getAccuracyTrend(MOCK_PLAYER_ID, 10)
    if (fromStore.length >= 5) {
      return fromStore.map((p, i) => ({
        ...p,
        accuracy: accFromStore[i]?.value ?? 90,
      }))
    }
    return Array.from({ length: 10 }, (_, i) => {
      const base = 620 + i * 12 + Math.floor(Math.sin(i * 2.1) * 35)
      return {
        date: `${i + 1}`,
        value: base,
        accuracy: Number((87 + Math.sin(i * 1.7) * 7).toFixed(1)),
        levelId: (i % 5) + 1,
      }
    })
  }, [scoreStore])

  const levelHeatmapData = useMemo(() => {
    const allLevels = [
      ...ORDER_LEVELS.map(l => ({ id: `O${l.levelId}`, name: l.name.slice(0, 4), bestScore: l.baseScore + 250 + Math.floor(Math.sin(l.levelId * 3) * 120) })),
      ...TIMED_LEVELS.map(l => ({ id: `T${l.levelId}`, name: l.name.slice(0, 4), bestScore: l.baseScore + 150 + Math.floor(Math.cos(l.levelId * 2) * 100) })),
    ]
    return allLevels
  }, [])

  const myErrorStats = useMemo(() => [
    { name: '错拣', value: 5, color: '#F43F5E' },
    { name: '漏拣', value: 3, color: '#EF4444' },
    { name: '数量错误', value: 4, color: '#F97316' },
    { name: '顺序错误', value: 2, color: '#8B5CF6' },
    { name: '货位错误', value: 6, color: '#EAB308' },
  ], [])

  const myTrainingStats = useMemo(() => {
    const games = scoreStore.getTotalGames(MOCK_PLAYER_ID) || 24
    const avg = scoreStore.getAverageScore(MOCK_PLAYER_ID) || 742
    return {
      games,
      totalHours: 18.5,
      avgScore: avg,
      level: 'L3 拣货员',
      expProgress: 68,
    }
  }, [scoreStore])

  const orderLevelOptions = ORDER_LEVELS.map(l => ({ value: l.levelId, label: `L${l.levelId} ${l.name}` }))
  const timedLevelOptions = TIMED_LEVELS.map(l => ({ value: l.levelId, label: `L${l.levelId} ${l.name}` }))
  const difficultyOptions = (Object.keys(DIFFICULTY_LABELS) as unknown as Difficulty[]).map(d => ({
    value: d,
    label: `${d}星 · ${DIFFICULTY_LABELS[d]}`,
  }))

  return (
    <div className="min-h-screen bg-gradient-to-br from-warehouse-navyDark via-warehouse-navy to-warehouse-navyDark text-white p-4 md:p-6">
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        <header className="mb-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-warehouse-orange to-amber-500 flex items-center justify-center shadow-glow-orange/40">
              <Trophy size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight">成绩榜</h1>
              <p className="text-xs text-white/45 mt-0.5">训练记录 · 排名对比 · 能力分析</p>
            </div>
          </div>

          <div className="flex p-1 rounded-xl bg-white/5 border border-white/10">
            {(
              [
                { key: 'order', label: '订单关排行', icon: List },
                { key: 'timed', label: '限时关排行', icon: Clock },
                { key: 'mine', label: '我的数据', icon: User },
              ] as const
            ).map(tab => {
              const Icon = tab.icon
              const active = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as TabType)}
                  className={cn(
                    'relative flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all',
                    active ? 'text-white' : 'text-white/55 hover:text-white/80'
                  )}
                >
                  {active && (
                    <motion.div
                      layoutId="lb-tab-bg"
                      className="absolute inset-0 rounded-lg bg-gradient-to-r from-warehouse-orange to-warehouse-orangeDark shadow-md"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    <Icon size={15} />
                    {tab.label}
                  </span>
                </button>
              )
            })}
          </div>
        </header>

        <AnimatePresence mode="wait">
          {(activeTab === 'order' || activeTab === 'timed') && (
            <motion.div
              key="rank-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white/5 border border-white/10 rounded-2xl p-4">
                <SelectField
                  label="关卡选择"
                  value={activeTab === 'order' ? orderLevelId : timedLevelId}
                  onChange={v => activeTab === 'order' ? setOrderLevelId(v as number) : setTimedLevelId(v as number)}
                  options={activeTab === 'order' ? orderLevelOptions : timedLevelOptions}
                />
                <SelectField
                  label="难度"
                  value={difficulty}
                  onChange={v => setDifficulty(v as Difficulty)}
                  options={difficultyOptions}
                />
                <div className="md:col-span-2 flex items-end gap-3">
                  <div className="flex-1 p-3 rounded-xl bg-gradient-to-br from-warehouse-orange/15 to-amber-500/5 border border-warehouse-orange/20">
                    <div className="text-[11px] text-warehouse-orange/80 mb-1 flex items-center gap-1">
                      <Activity size={11} />
                      当前关卡参与人次
                    </div>
                    <div className="text-xl font-black">
                      {1234 + currentLevelId * 156 + (difficulty - 1) * 89}
                      <span className="ml-1 text-xs font-normal text-white/40">人</span>
                    </div>
                  </div>
                </div>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-20 text-white/40">
                  <div className="animate-spin mr-3">
                    <Clock size={20} />
                  </div>
                  加载榜单数据...
                </div>
              ) : (
                <>
                  <div className="rounded-2xl bg-gradient-to-b from-white/5 to-transparent border border-white/10 p-4 md:p-6">
                    <h3 className="text-sm font-semibold text-white/70 mb-4 flex items-center gap-2">
                      <Crown size={16} className="text-yellow-400" />
                      TOP 3 领奖台
                    </h3>
                    <div className="flex items-end justify-center gap-4 md:gap-8">
                      {top3.length >= 2 && <PodiumCard entry={top3[1]} rankNum={2} />}
                      {top3.length >= 1 && <PodiumCard entry={top3[0]} rankNum={1} />}
                      {top3.length >= 3 && <PodiumCard entry={top3[2]} rankNum={3} />}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-white/70 px-1 flex items-center gap-2">
                      <Award size={16} className="text-sky-400" />
                      4 - 10 名
                    </h3>
                    {restRanks.map(entry => (
                      <RankCard key={entry.playerId} entry={entry} />
                    ))}
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-white/70 px-1 mb-2 flex items-center gap-2">
                      <User size={16} className="text-warehouse-orange" />
                      我的排名
                    </h3>
                    <RankCard entry={myEntry} isMine />
                  </div>

                  <div className="rounded-2xl bg-white/5 border border-white/10 p-4 md:p-5">
                    <h3 className="text-sm font-semibold text-white/70 mb-3 flex items-center gap-2">
                      <BarChart2 size={16} className="text-violet-400" />
                      分数分布（全部玩家）
                    </h3>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={scoreDistribution} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                          <XAxis dataKey="range" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} />
                          <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} label={{ value: '人次', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} />
                          <Tooltip
                            cursor={{ fill: 'rgba(255,107,53,0.08)' }}
                            contentStyle={{
                              backgroundColor: '#1E3A5F',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '8px',
                              fontSize: '12px',
                            }}
                          />
                          <Bar
                            dataKey="count"
                            name="玩家数"
                            fill="url(#barGrad)"
                            radius={[6, 6, 0, 0]}
                            animationDuration={800}
                          />
                          <defs>
                            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#FF6B35" />
                              <stop offset="100%" stopColor="#F97316" />
                            </linearGradient>
                          </defs>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {activeTab === 'mine' && (
            <motion.div
              key="mine-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-4"
            >
              <div className="rounded-2xl bg-gradient-to-r from-warehouse-navyLight/60 via-warehouse-orange/10 to-amber-500/5 border border-white/10 p-5">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="relative">
                    <div className="w-18 h-18 w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-warehouse-orange via-amber-500 to-yellow-400 flex items-center justify-center shadow-glow-orange/40">
                      <User size={32} className="text-white" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-warehouse-navy border border-warehouse-orange/50 text-[10px] font-bold text-warehouse-orange shadow-lg">
                      {myTrainingStats.level}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl md:text-2xl font-black">{MOCK_NICKNAME}</h2>
                      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                        <Flame size={11} /> 连续 7 天
                      </span>
                    </div>
                    <div className="mt-2 w-full max-w-md h-2 rounded-full bg-white/10 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${myTrainingStats.expProgress}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className="h-full bg-gradient-to-r from-warehouse-orange to-yellow-400 rounded-full"
                      />
                    </div>
                    <div className="mt-1 text-[11px] text-white/45 flex items-center gap-3 flex-wrap">
                      <span>经验值 {myTrainingStats.expProgress}%</span>
                      <span className="text-white/25">|</span>
                      <span>ID: {MOCK_PLAYER_ID}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 md:gap-5 min-w-[260px]">
                    <div className="text-center">
                      <div className="text-xs text-white/45 mb-0.5">训练时长</div>
                      <div className="text-lg font-black text-sky-400">{myTrainingStats.totalHours}<span className="text-xs font-normal ml-0.5">h</span></div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-white/45 mb-0.5">总场次</div>
                      <div className="text-lg font-black text-emerald-400">{myTrainingStats.games}<span className="text-xs font-normal ml-0.5">局</span></div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-white/45 mb-0.5">平均分</div>
                      <div className="text-lg font-black text-warehouse-orange">{myTrainingStats.avgScore}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Target size={16} className="text-violet-400" />
                    四维能力雷达
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart
                        data={[
                          { subject: '速度', value: myAbilityRadar.speed, fullMark: 100 },
                          { subject: '准确率', value: myAbilityRadar.accuracy, fullMark: 100 },
                          { subject: '路径规划', value: myAbilityRadar.pathPlanning, fullMark: 100 },
                          { subject: '应急处理', value: myAbilityRadar.emergency, fullMark: 100 },
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius="75%"
                      >
                        <PolarGrid stroke="rgba(255,255,255,0.1)" />
                        <PolarAngleAxis
                          dataKey="subject"
                          tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                        />
                        <PolarRadiusAxis
                          angle={30}
                          domain={[0, 100]}
                          tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                        />
                        <Radar
                          name="当前能力"
                          dataKey="value"
                          stroke="#FF6B35"
                          fill="#FF6B35"
                          fillOpacity={0.35}
                          strokeWidth={2}
                          animationDuration={800}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1E3A5F',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-4 gap-2 mt-1">
                    {[
                      { icon: Zap, key: 'speed', label: '速度', v: myAbilityRadar.speed, c: 'text-sky-400' },
                      { icon: Target, key: 'accuracy', label: '准确', v: myAbilityRadar.accuracy, c: 'text-emerald-400' },
                      { icon: MapPin, key: 'pathPlanning', label: '路径', v: myAbilityRadar.pathPlanning, c: 'text-violet-400' },
                      { icon: ShieldAlert, key: 'emergency', label: '应急', v: myAbilityRadar.emergency, c: 'text-amber-400' },
                    ].map(item => {
                      const I = item.icon
                      return (
                        <div key={item.key} className="text-center p-2 rounded-lg bg-white/5 border border-white/5">
                          <I size={13} className={cn('mx-auto mb-0.5', item.c)} />
                          <div className={cn('text-base font-black', item.c)}>{item.v}</div>
                          <div className="text-[10px] text-white/45">{item.label}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <TrendingUp size={16} className="text-emerald-400" />
                    近10次成绩趋势
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={scoreTrend}
                        margin={{ top: 5, right: 20, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                        <XAxis
                          dataKey="date"
                          tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                          label={{ value: '场次', position: 'insideBottom', offset: -4, fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                        />
                        <YAxis
                          yAxisId="left"
                          tick={{ fill: 'rgba(255,107,53,0.7)', fontSize: 11 }}
                          stroke="rgba(255,107,53,0.3)"
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          tick={{ fill: 'rgba(16,185,129,0.7)', fontSize: 11 }}
                          stroke="rgba(16,185,129,0.3)"
                          domain={[70, 100]}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1E3A5F',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="value"
                          name="分数"
                          stroke="#FF6B35"
                          strokeWidth={2.5}
                          dot={{ fill: '#FF6B35', r: 3, strokeWidth: 2, stroke: '#fff' }}
                          activeDot={{ r: 5, fill: '#FF6B35' }}
                          animationDuration={800}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="accuracy"
                          name="准确率(%)"
                          stroke="#10B981"
                          strokeWidth={2.5}
                          dot={{ fill: '#10B981', r: 3, strokeWidth: 2, stroke: '#fff' }}
                          activeDot={{ r: 5, fill: '#10B981' }}
                          animationDuration={800}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Calendar size={16} className="text-sky-400" />
                    各关卡完成度（最高分）
                  </h3>
                  <div className="grid grid-cols-4 md:grid-cols-8 gap-2 mb-3">
                    {levelHeatmapData.map(item => {
                      const maxScore = 1000
                      const ratio = Math.min(1, item.bestScore / maxScore)
                      let bg = 'bg-white/5 border-white/10'
                      let text = 'text-white/40'
                      if (ratio > 0.85) { bg = 'bg-emerald-500/40 border-emerald-400/50'; text = 'text-white' }
                      else if (ratio > 0.7) { bg = 'bg-emerald-500/25 border-emerald-500/30'; text = 'text-emerald-200' }
                      else if (ratio > 0.55) { bg = 'bg-amber-500/25 border-amber-500/30'; text = 'text-amber-200' }
                      else if (ratio > 0.4) { bg = 'bg-orange-500/20 border-orange-500/30'; text = 'text-orange-200' }
                      else if (ratio > 0) { bg = 'bg-rose-500/15 border-rose-500/30'; text = 'text-rose-200' }
                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          whileHover={{ scale: 1.08, y: -2 }}
                          className={cn(
                            'aspect-square rounded-lg border flex flex-col items-center justify-center p-1 cursor-pointer transition-all',
                            bg
                          )}
                          title={`${item.name}: ${item.bestScore}分`}
                        >
                          <div className={cn('text-[10px] font-bold', text)}>{item.id}</div>
                          <div className={cn('text-[10px] md:text-xs font-black mt-0.5', text)}>{item.bestScore}</div>
                        </motion.div>
                      )
                    })}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-white/40 mt-2 pt-2 border-t border-white/5">
                    <span>低</span>
                    <div className="flex items-center gap-1">
                      {['bg-white/5', 'bg-rose-500/20', 'bg-orange-500/30', 'bg-amber-500/40', 'bg-emerald-500/60'].map((c, i) => (
                        <div key={i} className={cn('w-6 h-3 rounded-sm border border-white/10', c)} />
                      ))}
                    </div>
                    <span>高</span>
                  </div>
                </div>

                <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <AlertCircle size={16} className="text-rose-400" />
                    错误类型累计统计
                  </h3>
                  <div className="flex items-center gap-4">
                    <div className="w-1/2 h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={myErrorStats}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={78}
                            paddingAngle={3}
                            dataKey="value"
                            animationDuration={800}
                          >
                            {myErrorStats.map((entry, i) => (
                              <Cell key={i} fill={entry.color} stroke="rgba(255,255,255,0.08)" strokeWidth={2} />
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
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="w-1/2 space-y-2">
                      {myErrorStats.map(item => {
                        const total = myErrorStats.reduce((s, e) => s + e.value, 0)
                        const pct = Math.round((item.value / total) * 100)
                        return (
                          <div key={item.name}>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                                <span className="text-white/70">{item.name}</span>
                              </span>
                              <span className="text-white/60 font-mono">{item.value}次 · {pct}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                                className="h-full rounded-full"
                                style={{ backgroundColor: item.color }}
                              />
                            </div>
                          </div>
                        )
                      })}
                      <div className="mt-3 pt-2 border-t border-white/5 text-[11px] text-white/40 flex items-center justify-between">
                        <span>累计错误</span>
                        <span className="text-white/70 font-mono font-semibold">
                          {myErrorStats.reduce((s, e) => s + e.value, 0)} 次
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

function AlertCircle(props: any) {
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
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

function List(props: any) {
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
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  )
}
