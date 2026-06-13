import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRightLeft,
  X,
} from 'lucide-react'

export type NotificationType = 'success' | 'warning' | 'error' | 'restock'

export interface GameEventNotification {
  id: string
  type: NotificationType
  message: string
  timestamp: number
}

interface GameNotificationProps {
  events: GameEventNotification[]
  onDismiss: (id: string) => void
  autoDismissMs?: number
}

const TYPE_CONFIG: Record<
  NotificationType,
  {
    bg: string
    border: string
    iconColor: string
    iconBg: string
    Icon: typeof CheckCircle2
    label: string
  }
> = {
  success: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/20',
    Icon: CheckCircle2,
    label: '成功',
  },
  warning: {
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    iconColor: 'text-yellow-400',
    iconBg: 'bg-yellow-500/20',
    Icon: AlertTriangle,
    label: '警告',
  },
  error: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    iconColor: 'text-red-400',
    iconBg: 'bg-red-500/20',
    Icon: XCircle,
    label: '错误',
  },
  restock: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    iconColor: 'text-blue-400',
    iconBg: 'bg-blue-500/20',
    Icon: ArrowRightLeft,
    label: '补货',
  },
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}

function NotificationItem({
  event,
  onDismiss,
  autoDismissMs,
}: {
  event: GameEventNotification
  onDismiss: (id: string) => void
  autoDismissMs: number
}) {
  const config = TYPE_CONFIG[event.type]
  const { Icon } = config

  useEffect(() => {
    if (autoDismissMs <= 0) return

    const timer = setTimeout(() => {
      onDismiss(event.id)
    }, autoDismissMs)

    return () => clearTimeout(timer)
  }, [event.id, autoDismissMs, onDismiss])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={cn(
        'relative w-80 rounded-xl backdrop-blur-md border shadow-card overflow-hidden',
        config.bg,
        config.border
      )}
    >
      <div className="flex items-start gap-3 p-3 pr-8">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25, delay: 0.05 }}
          className={cn(
            'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
            config.iconBg
          )}
        >
          <Icon className={cn('w-5 h-5', config.iconColor)} />
        </motion.div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('text-xs font-bold uppercase tracking-wide', config.iconColor)}>
              {config.label}
            </span>
            <span className="text-[10px] text-gray-500 font-mono">
              {formatTime(event.timestamp)}
            </span>
          </div>
          <motion.p
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.2 }}
            className="text-sm text-gray-200 break-words leading-relaxed"
          >
            {event.message}
          </motion.p>
        </div>
      </div>

      <button
        onClick={() => onDismiss(event.id)}
        className="absolute top-2 right-2 p-1 rounded-md text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {autoDismissMs > 0 && (
        <motion.div
          className={cn(
            'absolute bottom-0 left-0 h-0.5',
            event.type === 'success' && 'bg-emerald-500',
            event.type === 'warning' && 'bg-yellow-500',
            event.type === 'error' && 'bg-red-500',
            event.type === 'restock' && 'bg-blue-500'
          )}
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: autoDismissMs / 1000, ease: 'linear' }}
        />
      )}
    </motion.div>
  )
}

export default function GameNotification({
  events,
  onDismiss,
  autoDismissMs = 5000,
}: GameNotificationProps) {
  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      <div className="pointer-events-auto absolute top-20 right-4 flex flex-col gap-2 max-h-[calc(100vh-80px)] overflow-hidden">
        <AnimatePresence mode="popLayout">
          {events.slice(0, 5).map(event => (
            <NotificationItem
              key={event.id}
              event={event}
              onDismiss={onDismiss}
              autoDismissMs={autoDismissMs}
            />
          ))}
        </AnimatePresence>

        {events.length > 5 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-xs text-gray-500 pt-1"
          >
            还有 {events.length - 5} 条通知
          </motion.div>
        )}
      </div>
    </div>
  )
}
