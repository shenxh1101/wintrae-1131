import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  Scan,
  PackagePlus,
  Minus,
  Plus,
  AlertTriangle,
  Box,
  MapPin,
  Tag,
  Package,
  Check,
  X,
} from 'lucide-react'
import { getProductBySku } from '@/data/mockData'
import type { Location, StockItem, OrderItemConfig } from '@/data/mockData'

interface ToteItem {
  sku: string
  quantity: number
  locationId: string
}

interface OperationPanelProps {
  selectedLocation: Location | null
  stockInfo: StockItem | null
  currentOrderItem: (OrderItemConfig & { itemId: string; requiredQty: number }) | null
  toteItems: ToteItem[]
  toteCapacity: number
  isScanning: boolean
  isPicking: boolean
  scanResult: {
    success: boolean
    message: string
    scannedSku?: string
    expectedSku?: string
    quantity?: number
    isNearExpiry?: boolean
  } | null
  onScan: () => void
  onPick: (qty: number) => void
}

function ProductVisual({
  color,
  shape,
  size = 120,
  isNearExpiry = false,
}: {
  color: string
  shape: string
  size?: number
  isNearExpiry?: boolean
}) {
  const wrapperSize = size
  const itemSize = size * 0.6

  return (
    <div
      className={cn(
        'relative flex items-center justify-center rounded-2xl border-2',
        isNearExpiry
          ? 'bg-warehouse-danger/5 border-warehouse-danger/30'
          : 'bg-warehouse-navyLight/20 border-warehouse-navyLight/50'
      )}
      style={{ width: wrapperSize, height: wrapperSize }}
    >
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        className="relative"
      >
        {shape === 'circle' && (
          <motion.div
            className="rounded-full shadow-lg"
            style={{ width: itemSize, height: itemSize, backgroundColor: color }}
            whileHover={{ scale: 1.05 }}
          />
        )}
        {shape === 'square' && (
          <motion.div
            className="rounded-xl shadow-lg"
            style={{ width: itemSize, height: itemSize, backgroundColor: color }}
            whileHover={{ scale: 1.05 }}
          />
        )}
        {shape === 'rectangle' && (
          <motion.div
            className="rounded-xl shadow-lg"
            style={{ width: itemSize, height: itemSize * 0.75, backgroundColor: color }}
            whileHover={{ scale: 1.05 }}
          />
        )}
        {shape === 'triangle' && (
          <motion.div
            whileHover={{ scale: 1.05 }}
            style={{
              width: 0,
              height: 0,
              borderLeft: `${itemSize / 2}px solid transparent`,
              borderRight: `${itemSize / 2}px solid transparent`,
              borderBottom: `${itemSize}px solid ${color}`,
              filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))',
            }}
          />
        )}
        {shape === 'diamond' && (
          <motion.div
            className="rotate-45 rounded-lg shadow-lg"
            style={{ width: itemSize * 0.75, height: itemSize * 0.75, backgroundColor: color }}
            whileHover={{ scale: 1.05 }}
          />
        )}
        {shape === 'hexagon' && (
          <motion.div
            className="rounded-xl shadow-lg"
            style={{
              width: itemSize,
              height: itemSize,
              backgroundColor: color,
              clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
            }}
            whileHover={{ scale: 1.05 }}
          />
        )}

        {isNearExpiry && (
          <motion.div
            animate={{ rotate: [0, -5, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-warehouse-danger flex items-center justify-center shadow-lg border-2 border-white"
          >
            <AlertTriangle className="w-4 h-4 text-white" />
          </motion.div>
        )}
      </motion.div>

      <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
        <motion.div
          className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent"
          animate={{ top: ['0%', '100%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    </div>
  )
}

export default function OperationPanel({
  selectedLocation,
  stockInfo,
  currentOrderItem,
  toteItems,
  toteCapacity,
  isScanning,
  isPicking,
  scanResult,
  onScan,
  onPick,
}: OperationPanelProps) {
  const [pickQty, setPickQty] = useState(1)

  const product = stockInfo ? getProductBySku(stockInfo.sku) : null
  const orderProduct = currentOrderItem ? getProductBySku(currentOrderItem.sku) : null
  const toteTotalQty = toteItems.reduce((sum, t) => sum + t.quantity, 0)

  const maxPickQty = stockInfo
    ? Math.min(stockInfo.quantity, currentOrderItem?.requiredQty || stockInfo.quantity)
    : 0

  const handleQtyChange = (delta: number) => {
    setPickQty(prev => {
      const next = prev + delta
      if (next < 1) return 1
      if (next > maxPickQty) return maxPickQty
      return next
    })
  }

  const handlePick = () => {
    if (pickQty > 0 && stockInfo) {
      onPick(pickQty)
      setPickQty(1)
    }
  }

  const canPick =
    scanResult?.success &&
    stockInfo &&
    pickQty > 0 &&
    pickQty <= stockInfo.quantity &&
    !isPicking &&
    toteTotalQty < toteCapacity

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col h-full bg-warehouse-navy/90 backdrop-blur-md border border-warehouse-navyLight/50 rounded-xl shadow-warehouse overflow-hidden"
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-warehouse-navyLight/50 bg-warehouse-navyDark/50">
        <Box className="w-5 h-5 text-warehouse-orange" />
        <h3 className="font-bold text-white text-sm">拣货操作</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!selectedLocation ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="w-16 h-16 rounded-2xl bg-warehouse-navyLight/20 border border-dashed border-warehouse-navyLight/50 flex items-center justify-center mb-4">
              <MapPin className="w-8 h-8 text-gray-500" />
            </div>
            <p className="text-sm text-gray-400 mb-1">未选择货位</p>
            <p className="text-xs text-gray-500">在地图上点击货位或移动到目标位置</p>
          </div>
        ) : (
          <>
            <div className="rounded-xl bg-warehouse-navyDark/50 border border-warehouse-navyLight/30 p-3">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-warehouse-orange" />
                <span className="text-xs font-medium text-gray-400">当前货位</span>
              </div>
              <div className="font-mono text-lg font-bold text-warehouse-orange">
                {selectedLocation.locationId}
              </div>
              <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-400">
                <span>货架: {selectedLocation.shelfId}</span>
                <span>层: {selectedLocation.level}</span>
                <span>列: {selectedLocation.col}</span>
              </div>
            </div>

            {!scanResult ? (
              <div className="flex flex-col items-center py-4">
                <motion.button
                  onClick={onScan}
                  disabled={isScanning}
                  whileHover={!isScanning ? { scale: 1.02 } : {}}
                  whileTap={!isScanning ? { scale: 0.98 } : {}}
                  className={cn(
                    'w-full flex items-center justify-center gap-3 py-4 rounded-xl font-bold text-base transition-all',
                    isScanning
                      ? 'bg-warehouse-navyLight text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/30'
                  )}
                >
                  {isScanning ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <Scan className="w-5 h-5" />
                      </motion.div>
                      <span>扫描中...</span>
                    </>
                  ) : (
                    <>
                      <Scan className="w-5 h-5" />
                      <span>扫描货位</span>
                    </>
                  )}
                </motion.button>
                <p className="mt-2 text-xs text-gray-500">按空格键或点击按钮扫描</p>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={scanResult.success ? 'success' : 'error'}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div
                    className={cn(
                      'rounded-xl p-3 border flex items-start gap-3',
                      scanResult.success
                        ? 'bg-warehouse-success/5 border-warehouse-success/30'
                        : 'bg-warehouse-danger/5 border-warehouse-danger/30'
                    )}
                  >
                    <div
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                        scanResult.success ? 'bg-warehouse-success/20' : 'bg-warehouse-danger/20'
                      )}
                    >
                      {scanResult.success ? (
                        <Check className="w-4 h-4 text-warehouse-success" />
                      ) : (
                        <X className="w-4 h-4 text-warehouse-danger" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className={cn(
                          'text-sm font-bold mb-0.5',
                          scanResult.success ? 'text-warehouse-success' : 'text-warehouse-danger'
                        )}
                      >
                        {scanResult.success ? '扫描成功' : '扫描失败'}
                      </div>
                      <p className="text-xs text-gray-400 break-words">{scanResult.message}</p>
                    </div>
                  </div>

                  {product && stockInfo && (
                    <div className="rounded-xl bg-warehouse-navyDark/50 border border-warehouse-navyLight/30 p-4">
                      <div className="flex items-start gap-4">
                        <ProductVisual
                          color={product.color}
                          shape={product.shape}
                          size={100}
                          isNearExpiry={stockInfo.isNearExpiry}
                        />

                        <div className="flex-1 min-w-0 space-y-2">
                          <div>
                            <div className="text-sm font-bold text-white truncate">
                              {product.name}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Tag className="w-3 h-3 text-gray-500" />
                              <span className="text-xs font-mono text-gray-400 truncate">
                                {product.sku}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-lg bg-warehouse-navy/50 px-2.5 py-1.5">
                              <div className="text-[9px] text-gray-500 uppercase">分类</div>
                              <div className="text-xs font-semibold text-gray-300">
                                {product.category}
                              </div>
                            </div>
                            <div className="rounded-lg bg-warehouse-navy/50 px-2.5 py-1.5">
                              <div className="text-[9px] text-gray-500 uppercase">库存</div>
                              <div
                                className={cn(
                                  'text-xs font-bold font-mono',
                                  stockInfo.quantity < 5
                                    ? 'text-warehouse-danger'
                                    : 'text-warehouse-success'
                                )}
                              >
                                {stockInfo.quantity} 件
                              </div>
                            </div>
                          </div>

                          {stockInfo.isNearExpiry && (
                            <div className="flex items-center gap-1.5 rounded-lg bg-warehouse-danger/10 border border-warehouse-danger/30 px-2.5 py-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-warehouse-danger shrink-0" />
                              <span className="text-xs font-semibold text-warehouse-danger">
                                临期品 - 过期: {stockInfo.expiryDate}
                              </span>
                            </div>
                          )}

                          {currentOrderItem && !scanResult.success && orderProduct && (
                            <div className="rounded-lg bg-warehouse-warning/10 border border-warehouse-warning/30 px-2.5 py-2">
                              <div className="text-[9px] text-warehouse-warning uppercase font-bold mb-0.5">
                                订单需求
                              </div>
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-3 h-3 rounded"
                                  style={{ backgroundColor: orderProduct.color }}
                                />
                                <span className="text-xs text-gray-300 truncate">
                                  {orderProduct.name}
                                </span>
                                <span className="text-xs font-mono text-warehouse-warning ml-auto">
                                  x{currentOrderItem.requiredQty}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {scanResult.success && stockInfo && (
                    <div className="space-y-3">
                      <div className="rounded-xl bg-warehouse-navyDark/50 border border-warehouse-navyLight/30 p-3">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-medium text-gray-400">拣货数量</span>
                          <span className="text-[10px] text-gray-500">
                            最多 {maxPickQty} 件
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleQtyChange(-1)}
                            disabled={pickQty <= 1}
                            className={cn(
                              'w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg transition-colors',
                              pickQty <= 1
                                ? 'bg-warehouse-navyLight/30 text-gray-600 cursor-not-allowed'
                                : 'bg-warehouse-navyLight hover:bg-warehouse-navyLight/70 text-white'
                            )}
                          >
                            <Minus className="w-4 h-4" />
                          </motion.button>

                          <motion.div
                            key={pickQty}
                            initial={{ scale: 1.2, opacity: 0.5 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="flex-1 text-center"
                          >
                            <span className="font-mono text-3xl font-bold text-white">
                              {pickQty}
                            </span>
                          </motion.div>

                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleQtyChange(1)}
                            disabled={pickQty >= maxPickQty}
                            className={cn(
                              'w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg transition-colors',
                              pickQty >= maxPickQty
                                ? 'bg-warehouse-navyLight/30 text-gray-600 cursor-not-allowed'
                                : 'bg-warehouse-navyLight hover:bg-warehouse-navyLight/70 text-white'
                            )}
                          >
                            <Plus className="w-4 h-4" />
                          </motion.button>
                        </div>

                        {currentOrderItem && (
                          <div className="mt-3 flex items-center justify-between text-xs">
                            <span className="text-gray-500">订单需求</span>
                            <span className="font-mono text-warehouse-orange font-bold">
                              {pickQty} / {currentOrderItem.requiredQty}
                            </span>
                          </div>
                        )}
                      </div>

                      <motion.button
                        onClick={handlePick}
                        disabled={!canPick}
                        whileHover={canPick ? { scale: 1.02 } : {}}
                        whileTap={canPick ? { scale: 0.98 } : {}}
                        className={cn(
                          'w-full flex items-center justify-center gap-3 py-4 rounded-xl font-bold text-base transition-all shadow-lg',
                          canPick
                            ? 'bg-gradient-to-r from-warehouse-orange to-warehouse-orangeDark hover:from-warehouse-orangeDark hover:to-warehouse-orange text-white shadow-warehouse-orange/30'
                            : 'bg-warehouse-navyLight text-gray-500 cursor-not-allowed shadow-none'
                        )}
                      >
                        {isPicking ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                            >
                              <PackagePlus className="w-5 h-5" />
                            </motion.div>
                            <span>拣货中...</span>
                          </>
                        ) : toteTotalQty >= toteCapacity ? (
                          <>
                            <PackagePlus className="w-5 h-5" />
                            <span>周转箱已满</span>
                          </>
                        ) : (
                          <>
                            <PackagePlus className="w-5 h-5" />
                            <span>放入周转箱 ({pickQty}件)</span>
                          </>
                        )}
                      </motion.button>

                      {currentOrderItem && pickQty < currentOrderItem.requiredQty && (
                        <p className="text-[11px] text-center text-warehouse-warning/80">
                          提示: 订单需要 {currentOrderItem.requiredQty} 件，请确认数量
                        </p>
                      )}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </>
        )}
      </div>

      <div className="border-t border-warehouse-navyLight/50 bg-warehouse-navyDark/50 p-3">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-warehouse-orange" />
            <span className="text-xs font-semibold text-white">周转箱</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                'text-xs font-mono font-bold',
                toteTotalQty >= toteCapacity ? 'text-warehouse-danger' : 'text-white'
              )}
            >
              {toteTotalQty}
            </span>
            <span className="text-[10px] text-gray-500">/ {toteCapacity}</span>
          </div>
        </div>

        <div className="h-2 rounded-full bg-warehouse-navyLight/50 overflow-hidden mb-3">
          <motion.div
            className={cn(
              'h-full rounded-full transition-all',
              toteTotalQty >= toteCapacity
                ? 'bg-warehouse-danger'
                : toteTotalQty >= toteCapacity * 0.8
                ? 'bg-warehouse-warning'
                : 'bg-gradient-to-r from-warehouse-orange to-warehouse-orangeLight'
            )}
            initial={{ width: 0 }}
            animate={{ width: `${(toteTotalQty / toteCapacity) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {toteItems.length === 0 ? (
          <div className="text-center py-4 text-xs text-gray-500">周转箱为空</div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5 max-h-28 overflow-y-auto pr-1">
            {toteItems.map((item, idx) => {
              const p = getProductBySku(item.sku)
              return (
                <motion.div
                  key={`${item.sku}-${idx}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 rounded-lg bg-warehouse-navy/50 border border-warehouse-navyLight/30 px-2 py-1.5"
                >
                  <div
                    className="w-5 h-5 rounded shrink-0"
                    style={{ backgroundColor: p?.color || '#6B7280' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-gray-300 truncate font-medium">
                      {p?.name || item.sku}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-warehouse-orange shrink-0">
                    x{item.quantity}
                  </span>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </motion.div>
  )
}
