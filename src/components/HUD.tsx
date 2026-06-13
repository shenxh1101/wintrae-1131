import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Target, Timer, Trophy, TrendingUp, Layers } from 'lucide-react'

interface HUDProps {
  timeMs: number
  accuracy: number
  score: number
  pathEfficiency: number
  levelName: string
  totalItems?: number
  completedItems?: number
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export default function HUD({
  timeMs,
  accuracy,
  score,
  pathEfficiency,
  levelName,
  totalItems = 0,
  completedItems = 0,
}: HUDProps) {
  const timeColor = useMemo(() => {
    const totalSeconds = timeMs / 1000
    if (totalSeconds > 180) return 'text-warehouse-success'
    if (totalSeconds > 60) return 'text-warehouse-warning'
    return 'text-warehouse-danger'
  }, [timeMs])

  const accuracyColor = useMemo(() => {
    if (accuracy >= 90) return 'text-warehouse-success'
    if (accuracy >= 70) return 'text-warehouse-warning'
    return 'text-warehouse-danger'
  }, [accuracy])

  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-40 p-4">
      <div className="flex items-start justify-between gap-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="pointer-events-auto flex items-center gap-4 rounded-xl bg-warehouse-navy/80 px-5 py-3 shadow-warehouse backdrop-blur-md border border-warehouse-navyLight/50"
        >
          <div className="flex items-center gap-2.5">
            <div className={cn(
              'p-2 rounded-lg',
              timeMs / 1000 <= 60 ? 'bg-warehouse-danger/20 animate-pulse' : 'bg-warehouse-navyLight/50'
            )}>
              <Timer className={cn('w-5 h-5', timeColor)} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">时间</span>
              <motion.span
                key={formatTime(timeMs)}
                initial={{ scale: 1.05 }}
                animate={{ scale: 1 }}
                className={cn(
                  'font-mono text-3xl font-bold leading-none tracking-tight',
                  timeColor
                )}
              >
                {formatTime(timeMs)}
              </motion.span>
            </div>
          </div>

          <div className="w-px h-10 bg-warehouse-navyLight/50" />

          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-warehouse-navyLight/50">
              <Layers className="w-5 h-5 text-warehouse-orange" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">进度</span>
              <span className="font-mono text-lg font-bold text-white leading-none">
                {completedItems}
                <span className="text-gray-500 text-sm">/{totalItems}</span>
              </span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="pointer-events-auto text-center"
        >
          <div className="inline-flex flex-col items-center rounded-xl bg-warehouse-navy/80 px-6 py-3 shadow-warehouse backdrop-blur-md border border-warehouse-navyLight/50">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-0.5">当前关卡</span>
            <span className="text-white font-bold text-lg leading-tight">{levelName}</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="pointer-events-auto flex flex-col gap-3 w-56"
        >
          <div className="rounded-xl bg-warehouse-navy/80 px-4 py-3 shadow-warehouse backdrop-blur-md border border-warehouse-navyLight/50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-warehouse-orange" />
                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">准确率</span>
              </div>
              <motion.span
                key={accuracy}
                initial={{ y: -5, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className={cn('font-mono text-sm font-bold', accuracyColor)}
              >
                {accuracy.toFixed(0)}%
              </motion.span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-warehouse-navyLight overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: accuracy >= 90
                    ? 'linear-gradient(90deg, #10B981, #34D399)'
                    : accuracy >= 70
                    ? 'linear-gradient(90deg, #F59E0B, #FBBF24)'
                    : 'linear-gradient(90deg, #EF4444, #F87171)',
                }}
                initial={{ width: 0 }}
                animate={{ width: `${accuracy}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-warehouse-navy/80 px-3 py-2.5 shadow-warehouse backdrop-blur-md border border-warehouse-navyLight/50">
              <div className="flex items-center gap-1.5 mb-1">
                <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-[9px] text-gray-400 uppercase tracking-wider font-medium">分数</span>
              </div>
              <motion.span
                key={score}
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                className="font-mono text-xl font-bold text-white leading-none block"
              >
                {score.toLocaleString()}
              </motion.span>
            </div>

            <div className="rounded-xl bg-warehouse-navy/80 px-3 py-2.5 shadow-warehouse backdrop-blur-md border border-warehouse-navyLight/50">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[9px] text-gray-400 uppercase tracking-wider font-medium">路径</span>
              </div>
              <span className={cn(
                'font-mono text-xl font-bold leading-none block',
                pathEfficiency >= 80 ? 'text-warehouse-success' : pathEfficiency >= 60 ? 'text-warehouse-warning' : 'text-warehouse-danger'
              )}>
                {pathEfficiency.toFixed(0)}%
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {totalItems > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="pointer-events-none mt-3 mx-auto max-w-md"
        >
          <div className="rounded-full bg-warehouse-navy/80 px-3 py-2 shadow-card backdrop-blur-md border border-warehouse-navyLight/30">
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">订单进度</span>
              <div className="flex-1 h-2 rounded-full bg-warehouse-navyLight overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-warehouse-orange to-warehouse-orangeLight"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
              <span className="text-xs font-mono font-bold text-warehouse-orange whitespace-nowrap">
                {progress.toFixed(0)}%
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
