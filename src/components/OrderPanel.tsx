import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Package, Check, AlertTriangle, ShoppingCart, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { getProductBySku } from '@/data/mockData'
import type { OrderItemConfig, StockItem } from '@/data/mockData'

interface OrderItemDisplay extends OrderItemConfig {
  itemId: string
  pickedQty: number
  isNearExpiry?: boolean
  completed: boolean
  locationId?: string
}

interface OrderDisplay {
  orderId: string
  priority: number
  type: 'normal' | 'urgent' | 'batch'
  items: OrderItemDisplay[]
}

interface OrderPanelProps {
  orders: OrderDisplay[]
  currentOrderId: string | null
  currentItemId: string | null
  pickedQuantities: Record<string, number>
  stockItems: StockItem[]
}

const PRIORITY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: '低', color: 'bg-gray-500' },
  2: { label: '普通', color: 'bg-blue-500' },
  3: { label: '高', color: 'bg-yellow-500' },
  4: { label: '紧急', color: 'bg-orange-500' },
  5: { label: '特急', color: 'bg-red-500' },
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  normal: { label: '普通', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  urgent: { label: '紧急', color: 'text-red-400 bg-red-500/10 border-red-500/30' },
  batch: { label: '批量', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
}

function ProductShapePreview({ color, shape, size = 28 }: { color: string; shape: string; size?: number }) {
  const s = size
  switch (shape) {
    case 'circle':
      return <div className="rounded-full" style={{ width: s, height: s, backgroundColor: color }} />
    case 'square':
      return <div className="rounded" style={{ width: s, height: s, backgroundColor: color }} />
    case 'rectangle':
      return <div className="rounded" style={{ width: s, height: s * 0.7, backgroundColor: color }} />
    case 'triangle':
      return (
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: `${s / 2}px solid transparent`,
            borderRight: `${s / 2}px solid transparent`,
            borderBottom: `${s}px solid ${color}`,
          }}
        />
      )
    case 'diamond':
      return (
        <div
          className="rotate-45 rounded-sm"
          style={{ width: s * 0.7, height: s * 0.7, backgroundColor: color }}
        />
      )
    case 'hexagon':
      return (
        <div
          className="rounded-md"
          style={{
            width: s,
            height: s,
            backgroundColor: color,
            clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
          }}
        />
      )
    default:
      return <div className="rounded-full" style={{ width: s, height: s, backgroundColor: color }} />
  }
}

export default function OrderPanel({
  orders,
  currentOrderId,
  currentItemId,
  pickedQuantities,
  stockItems,
}: OrderPanelProps) {
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(
    new Set(orders.map(o => o.orderId))
  )

  const toggleOrder = (orderId: string) => {
    setExpandedOrders(prev => {
      const next = new Set(prev)
      if (next.has(orderId)) {
        next.delete(orderId)
      } else {
        next.add(orderId)
      }
      return next
    })
  }

  const totalItems = orders.reduce((sum, o) => sum + o.items.length, 0)
  const completedItems = orders.reduce(
    (sum, o) => sum + o.items.filter(i => i.completed).length,
    0
  )

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col h-full bg-warehouse-navy/90 backdrop-blur-md border border-warehouse-navyLight/50 rounded-xl shadow-warehouse overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-warehouse-navyLight/50 bg-warehouse-navyDark/50">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-warehouse-orange" />
          <h3 className="font-bold text-white text-sm">订单清单</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400">
            <span className="text-warehouse-success font-bold">{completedItems}</span>
            <span className="mx-1">/</span>
            <span className="text-white font-bold">{totalItems}</span>
          </span>
          <span className="text-[10px] text-gray-500">已拣</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        <AnimatePresence mode="popLayout">
          {orders.map(order => {
            const isExpanded = expandedOrders.has(order.orderId)
            const isCurrent = order.orderId === currentOrderId
            const orderCompleted = order.items.every(i => i.completed)
            const typeConfig = TYPE_LABELS[order.type]
            const priorityConfig = PRIORITY_LABELS[order.priority] || PRIORITY_LABELS[2]

            return (
              <motion.div
                key={order.orderId}
                layout
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className={cn(
                  'rounded-lg overflow-hidden border transition-colors',
                  isCurrent
                    ? 'border-warehouse-orange/50 shadow-glow-orange'
                    : orderCompleted
                    ? 'border-warehouse-success/30'
                    : 'border-warehouse-navyLight/50'
                )}
              >
                <motion.button
                  layout
                  onClick={() => toggleOrder(order.orderId)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-left',
                    orderCompleted ? 'bg-warehouse-success/5' : 'bg-warehouse-navyLight/20',
                    'hover:bg-warehouse-navyLight/30 transition-colors'
                  )}
                >
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </motion.div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-white truncate">
                        {order.orderId}
                      </span>
                      <span className={cn(
                        'text-[9px] px-1.5 py-0.5 rounded border font-medium',
                        typeConfig.color
                      )}>
                        {typeConfig.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={cn('w-2 h-2 rounded-full', priorityConfig.color)} />
                      <span className="text-[10px] text-gray-400">
                        优先级: {priorityConfig.label}
                      </span>
                    </div>
                  </div>

                  {orderCompleted && (
                    <div className="flex items-center gap-1 text-warehouse-success">
                      <Check className="w-4 h-4" />
                      <span className="text-[10px] font-bold">完成</span>
                    </div>
                  )}
                </motion.button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="p-2 space-y-1.5 border-t border-warehouse-navyLight/30 bg-warehouse-navyDark/30">
                        {order.items.map(item => {
                          const product = getProductBySku(item.sku)
                          const isCurrentItem = item.itemId === currentItemId
                          const picked = pickedQuantities[item.itemId] ?? item.pickedQty ?? 0
                          const progress = Math.min((picked / item.requiredQty) * 100, 100)

                          return (
                            <motion.div
                              key={item.itemId}
                              layout
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className={cn(
                                'relative rounded-lg p-2 border transition-all cursor-pointer',
                                item.completed
                                  ? 'bg-warehouse-success/5 border-warehouse-success/30'
                                  : isCurrentItem
                                  ? 'bg-warehouse-orange/10 border-warehouse-orange shadow-glow-orange'
                                  : 'bg-warehouse-navyLight/10 border-warehouse-navyLight/30 hover:border-warehouse-navyLight/50'
                              )}
                            >
                              {isCurrentItem && !item.completed && (
                                <motion.div
                                  layoutId="activeItemIndicator"
                                  className="absolute -left-0.5 top-1/2 -translate-y-1/2 w-1 h-8 bg-warehouse-orange rounded-r"
                                />
                              )}

                              <div className="flex items-start gap-2">
                                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-warehouse-navyDark/60 border border-warehouse-navyLight/30 shrink-0">
                                  {product ? (
                                    <ProductShapePreview
                                      color={product.color}
                                      shape={product.shape}
                                      size={26}
                                    />
                                  ) : (
                                    <Package className="w-5 h-5 text-gray-500" />
                                  )}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className={cn(
                                      'text-xs font-semibold truncate',
                                      item.completed ? 'text-warehouse-success' : 'text-white'
                                    )}>
                                      {product?.name || item.sku}
                                    </span>
                                    {item.isNearExpiry && (
                                      <span className="inline-flex items-center gap-0.5 text-[9px] px-1 py-0.5 rounded bg-warehouse-danger/20 text-warehouse-danger border border-warehouse-danger/30 font-bold shrink-0">
                                        <AlertTriangle className="w-2.5 h-2.5" />
                                        临期
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] font-mono text-gray-400 truncate">
                                      {item.sku}
                                    </span>
                                    {item.locationId && (
                                      <span className="text-[9px] text-warehouse-orange/80 font-mono">
                                        @{item.locationId}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2 mt-1.5">
                                    <div className="flex-1 h-1.5 rounded-full bg-warehouse-navyLight/50 overflow-hidden">
                                      <motion.div
                                        className={cn(
                                          'h-full rounded-full',
                                          item.completed
                                            ? 'bg-warehouse-success'
                                            : 'bg-gradient-to-r from-warehouse-orange to-warehouse-orangeLight'
                                        )}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                        transition={{ duration: 0.3 }}
                                      />
                                    </div>
                                    <span className={cn(
                                      'text-[11px] font-mono font-bold shrink-0',
                                      item.completed
                                        ? 'text-warehouse-success'
                                        : picked > 0
                                        ? 'text-warehouse-warning'
                                        : 'text-gray-400'
                                    )}>
                                      {picked}/{item.requiredQty}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center justify-center w-6 h-6 shrink-0">
                                  {item.completed ? (
                                    <motion.div
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      className="w-5 h-5 rounded-full bg-warehouse-success flex items-center justify-center"
                                    >
                                      <Check className="w-3 h-3 text-white" />
                                    </motion.div>
                                  ) : isCurrentItem ? (
                                    <motion.div
                                      animate={{ scale: [1, 1.2, 1] }}
                                      transition={{ duration: 1.5, repeat: Infinity }}
                                      className="w-2.5 h-2.5 rounded-full bg-warehouse-orange"
                                    />
                                  ) : null}
                                </div>
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      <div className="px-4 py-3 border-t border-warehouse-navyLight/50 bg-warehouse-navyDark/50">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">总计进度</span>
          <span className="font-mono font-bold text-white">
            {totalItems > 0 ? ((completedItems / totalItems) * 100).toFixed(0) : 0}%
          </span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-warehouse-navyLight overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-warehouse-success via-warehouse-orange to-warehouse-orangeLight"
            initial={{ width: 0 }}
            animate={{
              width: totalItems > 0 ? `${(completedItems / totalItems) * 100}%` : '0%',
            }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>
    </motion.div>
  )
}
