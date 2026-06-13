import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, ClipboardList, Timer, Search, Trophy, Lock, Unlock,
  User, Clock, Star, Play, Shuffle, ChevronRight, Sparkles, Settings,
  Check, Target, Zap, Route, AlertTriangle
} from 'lucide-react'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts'
import { usePlayerStore } from '@/store/usePlayerStore'
import { useScoreStore } from '@/store/useScoreStore'
import { ORDER_LEVELS, TIMED_LEVELS } from '@/data/mockData'
import { cn } from '@/lib/utils'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  }
}

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 120,
      damping: 14
    }
  }
}

const sidebarVariants = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: 'spring', stiffness: 100, damping: 15, delay: 0.2 }
  }
}

const rightbarVariants = {
  hidden: { opacity: 0, x: 30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: 'spring', stiffness: 100, damping: 15, delay: 0.25 }
  }
}

interface MenuCardProps {
  icon: React.ReactNode
  title: string
  subtitle: string
  statusText: string
  progress: number
  maxProgress: number
  gradient: string
  glowColor: string
  borderColor: string
  locked: boolean
  completed?: boolean
  onClick: () => void
  delay: number
  iconBg: string
}

function MenuCard({
  icon, title, subtitle, statusText, progress, maxProgress,
  gradient, glowColor, borderColor, locked, completed, onClick, delay, iconBg
}: MenuCardProps) {
  const progressPercent = maxProgress > 0 ? (progress / maxProgress) * 100 : 0

  return (
    <motion.div
      variants={cardVariants}
      custom={delay}
      whileHover={!locked ? {
        y: -8,
        scale: 1.02,
        rotateX: 3,
        rotateY: -3,
        transition: { type: 'spring', stiffness: 300, damping: 20 }
      } : {}}
      whileTap={!locked ? { scale: 0.98 } : {}}
      onClick={!locked ? onClick : undefined}
      className={cn(
        'relative rounded-2xl p-6 cursor-pointer overflow-hidden border-2 transition-all',
        locked
          ? 'bg-gray-800/40 border-gray-700/50 cursor-not-allowed opacity-70'
          : cn(
              'bg-gradient-to-br border-transparent hover:border-opacity-100',
              gradient,
              'hover:shadow-2xl'
            )
      )}
      style={{
        perspective: '1000px',
        transformStyle: 'preserve-3d',
        boxShadow: !locked ? `0 0 0 1px ${borderColor}20, 0 8px 32px -8px ${glowColor}40` : undefined
      }}
    >
      {!locked && (
        <div
          className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 0%, ${glowColor}15 0%, transparent 60%)`
          }}
        />
      )}

      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-start justify-between mb-4">
          <motion.div
            whileHover={!locked ? { rotate: 10, scale: 1.1 } : {}}
            className={cn(
              'w-14 h-14 rounded-xl flex items-center justify-center text-2xl',
              locked ? 'bg-gray-700/50 text-gray-500' : iconBg
            )}
          >
            {icon}
          </motion.div>

          <div className="flex flex-col items-end gap-1">
            {completed && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40">
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-[10px] font-bold text-emerald-400">已完成</span>
              </div>
            )}
            {locked ? (
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="p-2 rounded-lg bg-gray-700/60"
              >
                <Lock className="w-4 h-4 text-gray-500" />
              </motion.div>
            ) : (
              <div className="p-2 rounded-lg bg-white/10">
                <Unlock className="w-4 h-4 text-white/80" />
              </div>
            )}
          </div>
        </div>

        <h3 className={cn(
          'text-xl font-bold mb-1',
          locked ? 'text-gray-400' : 'text-white'
        )}>
          {title}
        </h3>
        <p className={cn(
          'text-sm mb-4 flex-1',
          locked ? 'text-gray-500' : 'text-white/70'
        )}>
          {subtitle}
        </p>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className={cn(
              'text-xs font-medium',
              locked ? 'text-gray-500' : 'text-white/80'
            )}>
              {statusText}
            </span>
            {!locked && maxProgress > 0 && (
              <span className="text-xs font-mono font-bold text-white/90">
                {progress}/{maxProgress}
              </span>
            )}
          </div>
          {!locked && maxProgress > 0 && (
            <div className="h-2 rounded-full bg-black/30 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${glowColor}, ${borderColor})`
                }}
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 1, delay: 0.5 + delay * 0.1, ease: 'easeOut' }}
              />
            </div>
          )}
        </div>

        {!locked && (
          <motion.div
            className="mt-4 flex items-center gap-1 text-sm font-semibold"
            style={{ color: borderColor }}
            whileHover={{ x: 4 }}
          >
            进入关卡
            <ChevronRight className="w-4 h-4" />
          </motion.div>
        )}
        {locked && (
          <div className="mt-4 text-xs text-gray-500 flex items-center gap-1">
            <Lock className="w-3 h-3" />
            完成前置关卡解锁
          </div>
        )}
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background: locked
            ? 'linear-gradient(90deg, transparent, #4B5563, transparent)'
            : `linear-gradient(90deg, transparent, ${borderColor}80, transparent)`
        }}
      />
    </motion.div>
  )
}

function WarehouseBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.07]"
        viewBox="0 0 800 600"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern id="shelfPattern" width="120" height="100" patternUnits="userSpaceOnUse">
            <rect x="10" y="10" width="100" height="15" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.6" />
            <rect x="10" y="30" width="100" height="15" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.6" />
            <rect x="10" y="50" width="100" height="15" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.6" />
            <rect x="10" y="70" width="100" height="15" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.6" />
            <line x1="10" y1="10" x2="10" y2="85" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
            <line x1="110" y1="10" x2="110" y2="85" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
            <line x1="35" y1="10" x2="35" y2="85" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.3" />
            <line x1="60" y1="10" x2="60" y2="85" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.3" />
            <line x1="85" y1="10" x2="85" y2="85" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.3" />
            <circle cx="22" cy="17" r="1.5" fill="currentColor" opacity="0.4" />
            <circle cx="47" cy="17" r="1.5" fill="currentColor" opacity="0.4" />
            <circle cx="72" cy="17" r="1.5" fill="currentColor" opacity="0.4" />
            <circle cx="97" cy="17" r="1.5" fill="currentColor" opacity="0.4" />
            <circle cx="22" cy="37" r="1.5" fill="currentColor" opacity="0.3" />
            <circle cx="72" cy="37" r="1.5" fill="currentColor" opacity="0.3" />
            <circle cx="47" cy="57" r="1.5" fill="currentColor" opacity="0.4" />
            <circle cx="97" cy="57" r="1.5" fill="currentColor" opacity="0.4" />
            <circle cx="22" cy="77" r="1.5" fill="currentColor" opacity="0.3" />
            <circle cx="47" cy="77" r="1.5" fill="currentColor" opacity="0.3" />
            <circle cx="72" cy="77" r="1.5" fill="currentColor" opacity="0.3" />
          </pattern>
          <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="50%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
        </defs>
        <rect width="800" height="600" fill="url(#bgGradient)" />
        <rect width="800" height="600" fill="url(#shelfPattern)" className="text-cyan-400" />
        <g opacity="0.15">
          <line x1="0" y1="100" x2="800" y2="100" stroke="#FF6B35" strokeWidth="1" strokeDasharray="10 20" />
          <line x1="0" y1="250" x2="800" y2="250" stroke="#6366f1" strokeWidth="1" strokeDasharray="15 25" />
          <line x1="0" y1="400" x2="800" y2="400" stroke="#10B981" strokeWidth="1" strokeDasharray="8 18" />
          <line x1="0" y1="520" x2="800" y2="520" stroke="#F59E0B" strokeWidth="1" strokeDasharray="12 22" />
        </g>
      </svg>

      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 20% 20%, rgba(99, 102, 241, 0.12) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(255, 107, 53, 0.10) 0%, transparent 50%), radial-gradient(ellipse at 50% 50%, rgba(16, 185, 129, 0.06) 0%, transparent 60%)'
        }}
      />

      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent"
          animate={{ top: ['0%', '100%'] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />
    </div>
  )
}

interface NicknameModalProps {
  open: boolean
  onClose: (name: string) => void
  initialName: string
}

function NicknameModal({ open, onClose, initialName }: NicknameModalProps) {
  const [name, setName] = useState(initialName)

  const handleSubmit = () => {
    const trimmed = name.trim()
    if (trimmed.length > 0 && trimmed !== '新玩家') {
      onClose(trimmed)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => initialName !== '新玩家' && onClose(initialName)}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 250, damping: 25 }}
            className="relative w-full max-w-md mx-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="industrial-border rounded-2xl bg-gradient-to-br from-warehouse-navyDark to-warehouse-navy p-8">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-indigo-500 to-orange-400 rounded-t-2xl" />

              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500/30 to-cyan-500/30 flex items-center justify-center border border-indigo-400/30">
                  <User className="w-8 h-8 text-indigo-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">设置玩家昵称</h2>
                <p className="text-sm text-gray-400">给自己取一个响亮的名字吧！</p>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    placeholder="请输入昵称（2-12个字符）"
                    maxLength={12}
                    className="w-full px-4 py-3.5 rounded-xl bg-warehouse-navyDark/80 border-2 border-warehouse-navyLight text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors font-medium"
                    autoFocus
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-mono">
                    {name.length}/12
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSubmit}
                  disabled={!name.trim() || name.trim() === '新玩家'}
                  className={cn(
                    'w-full py-3.5 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2',
                    name.trim() && name.trim() !== '新玩家'
                      ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 hover:shadow-lg hover:shadow-indigo-500/30'
                      : 'bg-gray-700 cursor-not-allowed opacity-60'
                  )}
                >
                  <Sparkles className="w-5 h-5" />
                  确认开始
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function MainMenu() {
  const navigate = useNavigate()
  const {
    nickname, setNickname, tutorialCompleted, unlockedLevels, unlockedTimedLevels,
    totalTrainingMinutes, bestScores, achievement
  } = usePlayerStore()
  const { getTotalGames, getAbilityRadar, scoreRecords, getAverageScore } = useScoreStore()
  const playerId = usePlayerStore(s => s.playerId)

  const [showNicknameModal, setShowNicknameModal] = useState(false)
  const [editingNickname, setEditingNickname] = useState(false)

  const orderProgress = unlockedLevels.length
  const timedProgress = unlockedTimedLevels.length
  const reviewCount = scoreRecords.length

  const totalOrderLevels = ORDER_LEVELS.length
  const totalTimedLevels = TIMED_LEVELS.length

  const averageScore = getAverageScore(playerId)
  const totalGames = getTotalGames(playerId)
  const abilityRadar = getAbilityRadar(playerId)

  const radarData = [
    { subject: '速度', value: abilityRadar.speed, fullMark: 100 },
    { subject: '准确', value: abilityRadar.accuracy, fullMark: 100 },
    { subject: '路径', value: abilityRadar.pathPlanning, fullMark: 100 },
    { subject: '应急', value: abilityRadar.emergency, fullMark: 100 },
  ]

  const overallRating = useMemo(() => {
    const sum = abilityRadar.speed + abilityRadar.accuracy + abilityRadar.pathPlanning + abilityRadar.emergency
    return Math.round(sum / 4)
  }, [abilityRadar])

  const bestTutorialScore = Math.max(0, ...Object.entries(bestScores)
    .filter(([k]) => k.startsWith('tutorial-'))
    .map(([, v]) => v))
  const bestOrderScore = Math.max(0, ...Object.entries(bestScores)
    .filter(([k]) => k.startsWith('order-'))
    .map(([, v]) => v))
  const bestTimedScore = Math.max(0, ...Object.entries(bestScores)
    .filter(([k]) => k.startsWith('timed-'))
    .map(([, v]) => v))
  const bestOverallScore = Math.max(bestTutorialScore, bestOrderScore, bestTimedScore)

  useEffect(() => {
    if (nickname === '新玩家') {
      setShowNicknameModal(true)
    }
  }, [nickname])

  const handleNicknameSave = (name: string) => {
    setNickname(name)
    setShowNicknameModal(false)
    setEditingNickname(false)
  }

  const cardConfigs = [
    {
      key: 'tutorial',
      icon: <BookOpen className="w-7 h-7" />,
      title: '教学关',
      subtitle: '学习基础拣货操作流程',
      statusText: tutorialCompleted ? '已掌握全部内容' : '尚未开始训练',
      progress: tutorialCompleted ? 1 : 0,
      maxProgress: 1,
      gradient: 'from-blue-600/20 to-blue-900/30',
      glowColor: '#3B82F6',
      borderColor: '#3B82F6',
      locked: false,
      completed: tutorialCompleted,
      iconBg: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
      onClick: () => navigate('/tutorial')
    },
    {
      key: 'order',
      icon: <ClipboardList className="w-7 h-7" />,
      title: '订单关',
      subtitle: '按订单完成拣货任务',
      statusText: tutorialCompleted ? '解锁进度' : '完成教学关解锁',
      progress: orderProgress,
      maxProgress: totalOrderLevels,
      gradient: 'from-emerald-600/20 to-emerald-900/30',
      glowColor: '#10B981',
      borderColor: '#10B981',
      locked: !tutorialCompleted,
      iconBg: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
      onClick: () => navigate('/order')
    },
    {
      key: 'timed',
      icon: <Timer className="w-7 h-7" />,
      title: '限时关',
      subtitle: '时间压力下的效率考验',
      statusText: '解锁进度',
      progress: timedProgress,
      maxProgress: totalTimedLevels,
      gradient: 'from-orange-600/20 to-orange-900/30',
      glowColor: '#F59E0B',
      borderColor: '#F59E0B',
      locked: false,
      iconBg: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
      onClick: () => navigate('/timed')
    },
    {
      key: 'review',
      icon: <Search className="w-7 h-7" />,
      title: '错误复盘',
      subtitle: '分析操作记录优化流程',
      statusText: `${scoreRecords.length} 次复盘记录`,
      progress: Math.min(scoreRecords.length, 20),
      maxProgress: 20,
      gradient: 'from-purple-600/20 to-purple-900/30',
      glowColor: '#8B5CF6',
      borderColor: '#8B5CF6',
      locked: scoreRecords.length === 0,
      iconBg: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
      onClick: () => scoreRecords.length > 0 && navigate('/review/last')
    },
    {
      key: 'leaderboard',
      icon: <Trophy className="w-7 h-7" />,
      title: '成绩榜',
      subtitle: '与其他玩家一较高下',
      statusText: bestOverallScore > 0 ? `最佳成绩: ${bestOverallScore}` : '暂无成绩',
      progress: Math.min(bestOverallScore, 1000),
      maxProgress: 1000,
      gradient: 'from-yellow-500/20 to-amber-700/30',
      glowColor: '#EAB308',
      borderColor: '#FBBF24',
      locked: false,
      iconBg: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
      onClick: () => navigate('/leaderboard')
    },
  ]

  return (
    <div className="relative min-h-screen overflow-hidden scanlines">
      <WarehouseBackdrop />

      <div className="relative z-10 min-h-screen flex flex-col">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="px-6 py-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <motion.div
              whileHover={{ rotate: 5, scale: 1.05 }}
              className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/30"
            >
              <svg viewBox="0 0 24 24" className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
                <circle cx="6.5" cy="6.5" r="1" fill="currentColor" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
                <circle cx="6.5" cy="17.5" r="1" fill="currentColor" />
              </svg>
            </motion.div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight bg-gradient-to-r from-white via-indigo-200 to-cyan-200 bg-clip-text text-transparent">
                仓库拣货训练系统
              </h1>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-xs font-mono text-gray-400 bg-gray-800/60 px-2 py-0.5 rounded">
                  v1.0.0
                </span>
                <span className="w-1 h-1 rounded-full bg-gray-600" />
                <span className="text-xs text-gray-500">Warehouse Picking Simulator</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-warehouse-navy/60 border border-warehouse-navyLight/50 backdrop-blur-sm">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500/30 to-purple-500/30 flex items-center justify-center border border-indigo-400/30">
                <User className="w-4.5 h-4.5 text-indigo-300" />
              </div>
              <div className="flex flex-col">
                {editingNickname ? (
                  <input
                    type="text"
                    value={nickname}
                    onChange={e => setNickname(e.target.value)}
                    onBlur={() => setEditingNickname(false)}
                    onKeyDown={e => e.key === 'Enter' && setEditingNickname(false)}
                    className="bg-transparent border-b border-indigo-400 text-white text-sm font-bold outline-none w-24"
                    autoFocus
                    maxLength={12}
                  />
                ) : (
                  <span
                    className="text-sm font-bold text-white cursor-pointer hover:text-indigo-300 transition-colors"
                    onClick={() => setEditingNickname(true)}
                  >
                    {nickname}
                  </span>
                )}
                <span className="text-[10px] text-gray-400">
                  {totalGames} 场训练
                </span>
              </div>
              <button
                onClick={() => setShowNicknameModal(true)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors ml-1"
                title="修改昵称"
              >
                <Settings className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>
          </div>
        </motion.header>

        <div className="flex-1 flex items-stretch gap-4 px-4 md:px-6 pb-6">
          <motion.aside
            variants={sidebarVariants}
            initial="hidden"
            animate="visible"
            className="hidden lg:flex flex-col gap-4 w-64 shrink-0"
          >
            <div className="industrial-border rounded-2xl p-5 bg-gradient-to-br from-warehouse-navyDark/90 to-warehouse-navy/80 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-white font-bold text-lg">{nickname}</div>
                  <div className="text-xs text-gray-400 font-mono">ID: {playerId.slice(-8)}</div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm text-gray-300">训练时长</span>
                  </div>
                  <span className="font-mono font-bold text-white">
                    {totalTrainingMinutes >= 60
                      ? `${Math.floor(totalTrainingMinutes / 60)}h${totalTrainingMinutes % 60}m`
                      : `${totalTrainingMinutes}min`}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm text-gray-300">综合评分</span>
                  </div>
                  <span className="font-mono font-bold text-yellow-400">{overallRating}</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm text-gray-300">平均分数</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-400">{averageScore}</span>
                </div>
              </div>
            </div>

            <div className="industrial-border rounded-2xl p-5 bg-gradient-to-br from-warehouse-navyDark/90 to-warehouse-navy/80 backdrop-blur-sm">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                能力雷达
              </h3>
              <div className="h-48 -mx-2">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius="75%">
                    <PolarGrid stroke="#4B5563" strokeWidth="0.5" />
                    <PolarAngleAxis
                      tick={{ fill: '#9CA3AF', fontSize: 11 }}
                      dataKey="subject"
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 100]}
                      tick={false}
                      axisLine={false}
                    />
                    <Radar
                      name="能力值"
                      dataKey="value"
                      stroke="#8B5CF6"
                      fill="#8B5CF6"
                      fillOpacity={0.35}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400 flex items-center gap-1"><Zap className="w-3 h-3 text-orange-400" />速度</span>
                  <span className="font-mono text-white">{abilityRadar.speed}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400 flex items-center gap-1"><Target className="w-3 h-3 text-emerald-400" />准确</span>
                  <span className="font-mono text-white">{abilityRadar.accuracy}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400 flex items-center gap-1"><Route className="w-3 h-3 text-cyan-400" />路径</span>
                  <span className="font-mono text-white">{abilityRadar.pathPlanning}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-red-400" />应急</span>
                  <span className="font-mono text-white">{abilityRadar.emergency}</span>
                </div>
              </div>
            </div>
          </motion.aside>

          <motion.main
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex-1 flex items-center justify-center"
          >
            <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
              {cardConfigs.map((config, idx) => (
                <MenuCard
                  {...config}
                  key={config.key}
                  delay={idx}
                />
              ))}
            </div>
          </motion.main>

          <motion.aside
            variants={rightbarVariants}
            initial="hidden"
            animate="visible"
            className="hidden xl:flex flex-col gap-4 w-56 shrink-0"
          >
            <div className="industrial-border rounded-2xl p-5 bg-gradient-to-br from-warehouse-navyDark/90 to-warehouse-navy/80 backdrop-blur-sm">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Play className="w-4 h-4 text-cyan-400" />
                快速入口
              </h3>

              <div className="space-y-3">
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (tutorialCompleted) {
                      navigate('/order')
                    } else {
                      navigate('/tutorial')
                    }
                  }}
                  className="w-full p-4 rounded-xl bg-gradient-to-r from-indigo-500/20 to-cyan-500/20 border border-indigo-400/40 text-left group hover:border-indigo-400/70 transition-all"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white font-bold text-sm flex items-center gap-1.5">
                      <Play className="w-4 h-4 text-indigo-400 fill-indigo-400" />
                      {tutorialCompleted ? '继续训练' : '开始教学'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {tutorialCompleted ? '从上次进度继续' : '学习基础操作'}
                  </p>
                  <div className="mt-2 h-1 rounded-full bg-black/30 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400"
                      style={{
                        width: tutorialCompleted
                          ? `${(orderProgress / totalOrderLevels) * 100}%`
                          : '0%'
                      }}
                    />
                  </div>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (orderProgress >= 3) navigate('/timed')
                  }}
                  disabled={orderProgress < 3}
                  className={cn(
                    'w-full p-4 rounded-xl text-left transition-all',
                    orderProgress >= 3
                      ? 'bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-400/40 hover:border-orange-400/70'
                      : 'bg-gray-800/40 border border-gray-700/50 opacity-60 cursor-not-allowed'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn(
                      'font-bold text-sm flex items-center gap-1.5',
                      orderProgress >= 3 ? 'text-white' : 'text-gray-500'
                    )}>
                      <Shuffle className={cn('w-4 h-4', orderProgress >= 3 ? 'text-orange-400' : 'text-gray-600')} />
                      随机挑战
                    </span>
                  </div>
                  <p className={cn(
                    'text-xs',
                    orderProgress >= 3 ? 'text-gray-400' : 'text-gray-500'
                  )}>
                    {orderProgress >= 3 ? '随机限时关卡' : `订单关${3 - orderProgress}关后解锁`}
                  </p>
                </motion.button>
              </div>
            </div>

            <div className="industrial-border rounded-2xl p-5 bg-gradient-to-br from-warehouse-navyDark/90 to-warehouse-navy/80 backdrop-blur-sm flex-1">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-400" />
                最佳成绩
              </h3>

              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400">订单关最高</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {bestOrderScore > 0 ? bestOrderScore : '--'}
                    </span>
                  </div>
                  <div className="h-1 rounded-full bg-black/30 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${Math.min(100, (bestOrderScore / 800) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400">限时关最高</span>
                    <span className="font-mono font-bold text-orange-400">
                      {bestTimedScore > 0 ? bestTimedScore : '--'}
                    </span>
                  </div>
                  <div className="h-1 rounded-full bg-black/30 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-orange-500"
                      style={{ width: `${Math.min(100, (bestTimedScore / 1000) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.aside>
        </div>

        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="px-6 py-3 text-center text-xs text-gray-500"
        >
          提示：使用 WASD 或方向键移动，空格键扫描，P 键拣货
        </motion.footer>
      </div>

      <NicknameModal
        open={showNicknameModal}
        onClose={handleNicknameSave}
        initialName={nickname === '新玩家' ? '' : nickname}
      />
    </div>
  )
}
