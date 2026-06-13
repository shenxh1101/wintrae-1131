import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { Position } from '@/types'
import type { Shelf, Location, StockItem, Product } from '@/data/mockData'
import { getStockByLocation, getProductBySku } from '@/data/mockData'

const CELL_SIZE = 40
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

interface WarehouseMapProps {
  playerPosition: Position
  targetLocations: string[]
  selectedLocationId?: string | null
  shelves: Shelf[]
  locations: Location[]
  stockItems: StockItem[]
  showPath?: boolean
  playerPath?: Position[]
  onLocationClick?: (locationId: string) => void
}

export default function WarehouseMap({
  playerPosition,
  targetLocations,
  selectedLocationId,
  shelves,
  locations,
  stockItems,
  showPath = false,
  playerPath = [],
  onLocationClick,
}: WarehouseMapProps) {
  const [hoveredLocationId, setHoveredLocationId] = useState<string | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  const gridCells = useMemo(() => {
    const cells: { x: number; y: number }[] = []
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        cells.push({ x, y })
      }
    }
    return cells
  }, [])

  const aisleCells = useMemo(() => {
    const blocked = new Set<string>()
    shelves.forEach(shelf => {
      for (let dx = 0; dx < shelf.width; dx++) {
        for (let dy = 0; dy < shelf.height; dy++) {
          blocked.add(`${shelf.posX + dx},${shelf.posY + dy}`)
        }
      }
    })
    return gridCells.filter(cell => !blocked.has(`${cell.x},${cell.y}`))
  }, [gridCells, shelves])

  const locationMap = useMemo(() => {
    const map = new Map<string, Location>()
    locations.forEach(loc => map.set(loc.locationId, loc))
    return map
  }, [locations])

  const handleLocationHover = (locationId: string, e: React.MouseEvent) => {
    const rect = (e.currentTarget as SVGElement).getBoundingClientRect()
    const svgRect = (e.currentTarget.closest('svg') as SVGElement)?.getBoundingClientRect()
    if (svgRect) {
      const tooltipWidth = 200
      const tooltipHeight = 120
      const margin = 8
      
      let x = rect.left - svgRect.left + rect.width / 2
      let y = rect.top - svgRect.top - margin
      
      const minX = tooltipWidth / 2 + margin
      const maxX = SVG_WIDTH - tooltipWidth / 2 - margin
      const minY = tooltipHeight + margin
      
      x = Math.max(minX, Math.min(maxX, x))
      y = Math.max(minY, y)
      
      setTooltipPos({ x, y })
    }
    setHoveredLocationId(locationId)
  }

  const renderShape = (shape: string, color: string, cx: number, cy: number, size: number) => {
    const s = size / 2
    switch (shape) {
      case 'circle':
        return <circle cx={cx} cy={cy} r={s} fill={color} />
      case 'square':
        return <rect x={cx - s} y={cy - s} width={size} height={size} fill={color} rx={2} />
      case 'rectangle':
        return <rect x={cx - s} y={cy - s * 0.7} width={size} height={size * 0.7} fill={color} rx={2} />
      case 'triangle':
        return (
          <polygon
            points={`${cx},${cy - s} ${cx - s},${cy + s} ${cx + s},${cy + s}`}
            fill={color}
          />
        )
      case 'diamond':
        return (
          <polygon
            points={`${cx},${cy - s} ${cx + s},${cy} ${cx},${cy + s} ${cx - s},${cy}`}
            fill={color}
          />
        )
      case 'hexagon':
        const h = s * 0.866
        return (
          <polygon
            points={`${cx + s},${cy} ${cx + s / 2},${cy - h} ${cx - s / 2},${cy - h} ${cx - s},${cy} ${cx - s / 2},${cy + h} ${cx + s / 2},${cy + h}`}
            fill={color}
          />
        )
      default:
        return <circle cx={cx} cy={cy} r={s} fill={color} />
    }
  }

  const pathD = useMemo(() => {
    if (playerPath.length < 2) return ''
    return playerPath
      .map((p, i) => {
        const x = p.x * CELL_SIZE + CELL_SIZE / 2
        const y = p.y * CELL_SIZE + CELL_SIZE / 2
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
      })
      .join(' ')
  }, [playerPath])

  const hoveredStock = hoveredLocationId ? getStockByLocation(hoveredLocationId) : null
  const hoveredLoc = hoveredLocationId ? locationMap.get(hoveredLocationId) : null
  const hoveredProduct = hoveredStock ? getProductBySku(hoveredStock.sku) : null

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-warehouse-navyDark rounded-xl overflow-hidden">
      <div className="relative" style={{ width: SVG_WIDTH, height: SVG_HEIGHT }}>
        <svg
          width={SVG_WIDTH}
          height={SVG_HEIGHT}
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="block"
        >
          <defs>
            <pattern id="gridPattern" width={CELL_SIZE} height={CELL_SIZE} patternUnits="userSpaceOnUse">
              <path
                d={`M ${CELL_SIZE} 0 L 0 0 0 ${CELL_SIZE}`}
                fill="none"
                stroke="rgba(107, 114, 128, 0.15)"
                strokeWidth="1"
              />
            </pattern>
            <filter id="glowFilter">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <radialGradient id="playerGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="targetGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FF6B35" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#FF6B35" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect width={SVG_WIDTH} height={SVG_HEIGHT} fill="url(#gridPattern)" />

          {aisleCells.map(cell => (
            <rect
              key={`aisle-${cell.x}-${cell.y}`}
              x={cell.x * CELL_SIZE}
              y={cell.y * CELL_SIZE}
              width={CELL_SIZE}
              height={CELL_SIZE}
              fill="#374151"
              opacity={0.4}
            />
          ))}

          {shelves.map(shelf => {
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
                  strokeWidth="2"
                  rx="4"
                />
                <rect
                  x={shelf.posX * CELL_SIZE + 4}
                  y={shelf.posY * CELL_SIZE + 4}
                  width={shelf.width * CELL_SIZE - 8}
                  height={shelf.height * CELL_SIZE - 8}
                  fill="none"
                  stroke={areaColor}
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  opacity={0.5}
                  rx="2"
                />
                <text
                  x={shelf.posX * CELL_SIZE + 8}
                  y={shelf.posY * CELL_SIZE + 18}
                  fill={areaColor}
                  fontSize="11"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {shelf.shelfId.replace('SHELF-', '')}
                </text>
                <text
                  x={shelf.posX * CELL_SIZE + shelf.width * CELL_SIZE - 8}
                  y={shelf.posY * CELL_SIZE + 18}
                  fill={areaColor}
                  fontSize="9"
                  textAnchor="end"
                  opacity={0.8}
                >
                  {shelf.areaCode}
                </text>
              </g>
            )
          })}

          {locations.map(loc => {
            const stock = stockItems.find(s => s.locationId === loc.locationId)
            const product = stock ? getProductBySku(stock.sku) : null
            const isTarget = targetLocations.includes(loc.locationId)
            const isSelected = selectedLocationId === loc.locationId
            const cx = loc.posX * CELL_SIZE
            const cy = loc.posY * CELL_SIZE
            const locSize = CELL_SIZE * 0.55
            const isSoldOut = stock && stock.quantity === 0
            const displayColor = isSoldOut ? '#9CA3AF' : (product?.color || '#9CA3AF')
            const displayShape = product?.shape || 'square'

            return (
              <g
                key={loc.locationId}
                style={{ cursor: 'pointer' }}
                onClick={() => onLocationClick?.(loc.locationId)}
                onMouseEnter={(e) => handleLocationHover(loc.locationId, e)}
                onMouseLeave={() => setHoveredLocationId(null)}
              >
                {isTarget && (
                  <>
                    <motion.circle
                      cx={cx}
                      cy={cy}
                      r={locSize * 0.9}
                      fill="none"
                      stroke="#FF6B35"
                      strokeWidth="2"
                      opacity={0.8}
                      animate={{
                        r: [locSize * 0.8, locSize * 1.3, locSize * 0.8],
                        opacity: [0.8, 0.2, 0.8],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    />
                    <rect
                      x={cx - locSize / 2}
                      y={cy - locSize / 2}
                      width={locSize}
                      height={locSize}
                      fill="none"
                      stroke="#FF6B35"
                      strokeWidth="2.5"
                      rx="3"
                      filter="url(#glowFilter)"
                    />
                  </>
                )}

                {isSelected && (
                  <motion.rect
                    x={cx - locSize / 2 - 3}
                    y={cy - locSize / 2 - 3}
                    width={locSize + 6}
                    height={locSize + 6}
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth="2"
                    rx="4"
                    initial={{ scale: 1.2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    filter="url(#glowFilter)"
                  />
                )}

                <rect
                  x={cx - locSize / 2}
                  y={cy - locSize / 2}
                  width={locSize}
                  height={locSize}
                  fill={isSelected ? 'rgba(59, 130, 246, 0.2)' : '#374151'}
                  stroke={isSelected ? '#3B82F6' : '#4B5563'}
                  strokeWidth="1"
                  rx="2"
                />

                {stock && (
                  <g opacity={isSoldOut ? 0.5 : 1}>
                    {renderShape(
                      displayShape,
                      displayColor,
                      cx,
                      cy,
                      locSize * 0.65
                    )}
                    {stock.isNearExpiry && !isSoldOut && (
                      <circle
                        cx={cx + locSize * 0.3}
                        cy={cy - locSize * 0.3}
                        r={4}
                        fill="#EF4444"
                        stroke="#fff"
                        strokeWidth="1"
                      />
                    )}
                    {isSoldOut && (
                      <text
                        x={cx}
                        y={cy + locSize * 0.55}
                        fill="#9CA3AF"
                        fontSize="8"
                        textAnchor="middle"
                        fontWeight="bold"
                      >
                        售罄
                      </text>
                    )}
                  </g>
                )}
              </g>
            )
          })}

          {showPath && pathD && (
            <motion.path
              d={pathD}
              fill="none"
              stroke="rgba(59, 130, 246, 0.5)"
              strokeWidth="3"
              strokeDasharray="8 4"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
            />
          )}

          <g>
            <rect
              x={18 * CELL_SIZE}
              y={13 * CELL_SIZE}
              width={CELL_SIZE}
              height={CELL_SIZE}
              fill="rgba(16, 185, 129, 0.2)"
              stroke="#10B981"
              strokeWidth="2"
              strokeDasharray="4 2"
              rx="4"
            />
            <text
              x={18 * CELL_SIZE + CELL_SIZE / 2}
              y={13 * CELL_SIZE + CELL_SIZE / 2 + 4}
              fill="#10B981"
              fontSize="10"
              textAnchor="middle"
              fontWeight="bold"
            >
              收银台
            </text>
          </g>

          <g>
            <rect
              x={10 * CELL_SIZE}
              y={13 * CELL_SIZE}
              width={CELL_SIZE}
              height={CELL_SIZE}
              fill="rgba(59, 130, 246, 0.15)"
              stroke="#3B82F6"
              strokeWidth="1"
              strokeDasharray="2 2"
              rx="4"
            />
            <text
              x={10 * CELL_SIZE + CELL_SIZE / 2}
              y={13 * CELL_SIZE + CELL_SIZE / 2 + 4}
              fill="#3B82F6"
              fontSize="9"
              textAnchor="middle"
              opacity={0.7}
            >
              入口
            </text>
          </g>

          <g
            style={{
              transform: `translate(${playerPosition.x * CELL_SIZE + CELL_SIZE / 2}px, ${playerPosition.y * CELL_SIZE + CELL_SIZE / 2}px)`,
            }}
          >
            <motion.circle
              r={CELL_SIZE * 0.9}
              fill="url(#playerGlow)"
              animate={{
                r: [CELL_SIZE * 0.7, CELL_SIZE * 1.0, CELL_SIZE * 0.7],
                opacity: [0.4, 0.8, 0.4],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
            <motion.circle
              r={CELL_SIZE * 0.35}
              fill="#3B82F6"
              stroke="#fff"
              strokeWidth="2.5"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
            <circle r={CELL_SIZE * 0.18} fill="#fff" opacity={0.9} />
          </g>
        </svg>

        <AnimatePresence>
          {hoveredLocationId && hoveredLoc && (
            <motion.div
              initial={{ opacity: 0, y: 5, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute pointer-events-none z-50"
              style={{
                left: tooltipPos.x,
                top: tooltipPos.y,
                transform: 'translate(-50%, -100%)',
              }}
            >
              <div className="bg-warehouse-navy border border-warehouse-navyLight rounded-lg p-2.5 shadow-card min-w-[180px]">
                <div className="text-xs font-mono text-warehouse-orange mb-1">
                  {hoveredLoc.locationId}
                </div>
                {hoveredStock && hoveredProduct ? (
                  <>
                    <div className="text-sm font-semibold text-white mb-1.5">
                      {hoveredProduct.name}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-300 mb-1.5">
                      <span className="flex items-center gap-1">
                        <span
                          className="w-2.5 h-2.5 rounded-sm"
                          style={{ backgroundColor: hoveredStock.quantity === 0 ? '#9CA3AF' : hoveredProduct.color }}
                        />
                        SKU: {hoveredStock.sku}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">货位:</span>
                      <span className="text-white font-mono">{hoveredLoc.locationId}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1 text-xs">
                      <span className="text-gray-400">库存:</span>
                      <span className={cn(
                        'font-semibold',
                        hoveredStock.quantity === 0 ? 'text-gray-500' :
                        hoveredStock.quantity < 5 ? 'text-warehouse-danger' : 'text-warehouse-success'
                      )}>
                        {hoveredStock.quantity === 0 ? '已售罄' : `${hoveredStock.quantity} 件`}
                      </span>
                    </div>
                    {hoveredStock.isNearExpiry && hoveredStock.quantity > 0 && (
                      <div className="mt-2 text-xs text-warehouse-danger bg-warehouse-danger/10 rounded px-1.5 py-0.5 inline-flex items-center gap-1">
                        ⚠️ 临期品
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-gray-400">空货位</div>
                )}
              </div>
              <div
                className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 bg-warehouse-navy border-r border-b border-warehouse-navyLight rotate-45"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
