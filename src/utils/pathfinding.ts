/**
 * 网格地图中的单个节点
 */
export interface GridNode {
  /** X轴坐标（列） */
  x: number;
  /** Y轴坐标（行） */
  y: number;
  /** 是否为障碍物（货架/墙体） */
  isObstacle: boolean;
}

/**
 * A*算法搜索过程中的节点状态
 */
interface SearchNode extends GridNode {
  /** 从起点到当前节点的实际代价 */
  g: number;
  /** 从当前节点到终点的预估代价（启发式） */
  h: number;
  /** 总代价 f = g + h */
  f: number;
  /** 父节点引用，用于回溯路径 */
  parent: SearchNode | null;
}

/**
 * 坐标点
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * 路径规划结果
 */
export interface PathResult {
  /** 是否找到可行路径 */
  found: boolean;
  /** 最优路径坐标数组（从起点到终点） */
  path: Point[];
  /** 最优路径长度（步数） */
  pathLength: number;
  /** 搜索过的节点总数（用于调试） */
  nodesExplored: number;
}

/**
 * 计算曼哈顿距离（启发式函数）
 * 曼哈顿距离 = |x1 - x2| + |y1 - y2|
 * 适用于网格中只能上下左右移动的场景
 *
 * @param a - 起点坐标
 * @param b - 终点坐标
 * @returns 两点之间的曼哈顿距离
 */
export function manhattanDistance(a: Point, b: Point): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/**
 * 判断坐标是否在网格范围内
 *
 * @param point - 待检查坐标
 * @param cols - 网格列数
 * @param rows - 网格行数
 * @returns 是否在有效范围内
 */
function isInBounds(point: Point, cols: number, rows: number): boolean {
  return point.x >= 0 && point.x < cols && point.y >= 0 && point.y < rows;
}

/**
 * 获取相邻的4个方向节点（上下左右）
 *
 * @param node - 当前节点
 * @returns 相邻节点坐标数组
 */
function getNeighbors(node: Point): Point[] {
  return [
    { x: node.x, y: node.y - 1 },
    { x: node.x, y: node.y + 1 },
    { x: node.x - 1, y: node.y },
    { x: node.x + 1, y: node.y },
  ];
}

/**
 * A*路径规划算法
 * 在带障碍物的网格地图中，寻找从起点到终点的最短可行路径
 *
 * @param grid - 二维网格地图，每个节点标记是否为障碍物
 * @param start - 起点坐标
 * @param end - 终点坐标
 * @returns 路径规划结果，包含路径、长度等信息
 *
 * @example
 * ```ts
 * const grid: GridNode[][] = [
 *   [{ x:0,y:0,isObstacle:false }, { x:1,y:0,isObstacle:true }],
 *   [{ x:0,y:1,isObstacle:false }, { x:1,y:1,isObstacle:false }]
 * ];
 * const result = findPath(grid, {x:0,y:0}, {x:1,y:1});
 * ```
 */
export function findPath(
  grid: GridNode[][],
  start: Point,
  end: Point
): PathResult {
  const rows = grid.length;
  const cols = rows > 0 ? grid[0].length : 0;

  const result: PathResult = {
    found: false,
    path: [],
    pathLength: 0,
    nodesExplored: 0,
  };

  if (!isInBounds(start, cols, rows) || !isInBounds(end, cols, rows)) {
    return result;
  }

  if (grid[start.y][start.x].isObstacle || grid[end.y][end.x].isObstacle) {
    return result;
  }

  if (start.x === end.x && start.y === end.y) {
    result.found = true;
    result.path = [{ x: start.x, y: start.y }];
    result.pathLength = 0;
    return result;
  }

  const openList: SearchNode[] = [];
  const closedSet = new Set<string>();

  const nodeKey = (p: Point) => `${p.x},${p.y}`;

  const startNode: SearchNode = {
    ...grid[start.y][start.x],
    g: 0,
    h: manhattanDistance(start, end),
    f: 0,
    parent: null,
  };
  startNode.f = startNode.g + startNode.h;
  openList.push(startNode);

  while (openList.length > 0) {
    openList.sort((a, b) => a.f - b.f);
    const current = openList.shift()!;
    result.nodesExplored++;

    if (current.x === end.x && current.y === end.y) {
      result.found = true;
      const path: Point[] = [];
      let node: SearchNode | null = current;
      while (node) {
        path.unshift({ x: node.x, y: node.y });
        node = node.parent;
      }
      result.path = path;
      result.pathLength = path.length - 1;
      return result;
    }

    closedSet.add(nodeKey(current));

    const neighbors = getNeighbors(current);
    for (const neighborPos of neighbors) {
      if (!isInBounds(neighborPos, cols, rows)) continue;

      const gridNeighbor = grid[neighborPos.y][neighborPos.x];
      if (gridNeighbor.isObstacle) continue;

      const key = nodeKey(neighborPos);
      if (closedSet.has(key)) continue;

      const tentativeG = current.g + 1;

      let neighborNode = openList.find(
        (n) => n.x === neighborPos.x && n.y === neighborPos.y
      );

      if (!neighborNode) {
        neighborNode = {
          ...gridNeighbor,
          g: tentativeG,
          h: manhattanDistance(neighborPos, end),
          f: 0,
          parent: current,
        };
        neighborNode.f = neighborNode.g + neighborNode.h;
        openList.push(neighborNode);
      } else if (tentativeG < neighborNode.g) {
        neighborNode.g = tentativeG;
        neighborNode.f = neighborNode.g + neighborNode.h;
        neighborNode.parent = current;
      }
    }
  }

  return result;
}

/**
 * 计算多点之间的最优巡回路径（贪心最近邻策略）
 * 给定起点和多个目标点，计算访问所有目标点的较优路径顺序
 *
 * @param grid - 二维网格地图
 * @param start - 起点坐标
 * @param targets - 需要依次访问的目标点数组
 * @returns 完整路径（包含所有中间路径），以及分段路径长度
 */
export function findMultiPointPath(
  grid: GridNode[][],
  start: Point,
  targets: Point[]
): { fullPath: Point[]; segmentLengths: number[]; totalLength: number } {
  const fullPath: Point[] = [{ ...start }];
  const segmentLengths: number[] = [];
  let totalLength = 0;
  let currentPos = { ...start };
  const remaining = targets.map((t) => ({ ...t }));

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestResult: PathResult | null = null;

    for (let i = 0; i < remaining.length; i++) {
      const result = findPath(grid, currentPos, remaining[i]);
      if (result.found) {
        if (!bestResult || result.pathLength < bestResult.pathLength) {
          bestResult = result;
          bestIdx = i;
        }
      }
    }

    if (bestResult && bestResult.path.length > 1) {
      for (let i = 1; i < bestResult.path.length; i++) {
        fullPath.push(bestResult.path[i]);
      }
      segmentLengths.push(bestResult.pathLength);
      totalLength += bestResult.pathLength;
      currentPos = { ...remaining[bestIdx] };
    }

    remaining.splice(bestIdx, 1);
  }

  return { fullPath, segmentLengths, totalLength };
}

/**
 * 计算路径效率评分
 * 公式：(最优路径长度 / 玩家实际路径长度) × 基础分
 *
 * @param optimalLength - 最优路径步数
 * @param actualLength - 玩家实际路径步数
 * @param baseScore - 基础分（默认200）
 * @returns 路径规划得分（0 ~ baseScore）
 */
export function calculatePathScore(
  optimalLength: number,
  actualLength: number,
  baseScore: number = 200
): number {
  if (actualLength <= 0) return baseScore;
  if (optimalLength <= 0) return baseScore;
  const ratio = optimalLength / actualLength;
  return Math.max(0, Math.min(baseScore, Math.round(ratio * baseScore)));
}
