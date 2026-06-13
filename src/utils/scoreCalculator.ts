/**
 * 成绩计算输入参数
 */
export interface ScoreInput {
  /** 关卡配置的时间限制（毫秒） */
  timeLimitMs: number;
  /** 玩家实际用时（毫秒） */
  actualTimeMs: number;
  /** 总操作次数 */
  totalOperations: number;
  /** 正确操作次数 */
  correctOperations: number;
  /** 最优路径长度（步数） */
  optimalPathLength: number;
  /** 玩家实际路径长度（步数） */
  actualPathLength: number;
  /** 正确拣取临期品的次数 */
  nearExpiryCorrectCount: number;
  /** 错拣次数 */
  wrongPickCount: number;
  /** 漏拣次数 */
  missedPickCount: number;
  /** 成功处理补货干扰的次数 */
  restockHandledCount: number;
  /** 基础完成分（默认200） */
  baseScore?: number;
}

/**
 * 成绩计算明细输出
 */
export interface ScoreBreakdown {
  /** 基础完成分 */
  baseScore: number;
  /** 时间奖励分 */
  timeBonus: number;
  /** 准确率分 */
  accuracyScore: number;
  /** 路径规划分 */
  pathScore: number;
  /** 临期正确奖励 */
  nearExpiryBonus: number;
  /** 补货干扰处理奖励 */
  restockBonus: number;
  /** 错拣扣分 */
  wrongPickPenalty: number;
  /** 漏拣扣分 */
  missedPickPenalty: number;
  /** 最终总分 */
  totalScore: number;
  /** 准确率百分比 (0-100) */
  accuracyPercent: number;
  /** 时间奖励占比 (0-1) */
  timeBonusRatio: number;
  /** 路径效率 (0-1) */
  pathEfficiency: number;
}

/**
 * 成绩计算常量配置
 */
export const SCORE_CONSTANTS = {
  /** 基础完成分 */
  BASE_SCORE: 200,
  /** 时间奖励满分 */
  TIME_BONUS_MAX: 200,
  /** 准确率分满分 */
  ACCURACY_SCORE_MAX: 300,
  /** 路径规划分满分 */
  PATH_SCORE_MAX: 200,
  /** 每次正确拣取临期品奖励 */
  NEAR_EXPIRY_BONUS_PER: 20,
  /** 每次成功处理补货干扰奖励 */
  RESTOCK_BONUS_PER: 15,
  /** 每次错拣扣分 */
  WRONG_PICK_PENALTY_PER: 30,
  /** 每次漏拣扣分 */
  MISSED_PICK_PENALTY_PER: 50,
} as const;

/**
 * 计算准确率百分比
 *
 * @param correct - 正确操作次数
 * @param total - 总操作次数
 * @returns 准确率 (0-100)
 */
export function calculateAccuracyPercent(correct: number, total: number): number {
  if (total <= 0) return 100;
  return Math.max(0, Math.min(100, Math.round((correct / total) * 100)));
}

/**
 * 计算时间奖励占比
 * 提前完成越多，奖励越高；超时则无奖励
 *
 * @param actualMs - 实际用时（毫秒）
 * @param limitMs - 时间限制（毫秒）
 * @returns 时间奖励占比 (0-1)
 */
export function calculateTimeBonusRatio(actualMs: number, limitMs: number): number {
  if (limitMs <= 0) return 0;
  if (actualMs >= limitMs) return 0;
  const savedRatio = (limitMs - actualMs) / limitMs;
  return Math.max(0, Math.min(1, savedRatio));
}

/**
 * 计算路径效率
 *
 * @param optimalLength - 最优路径长度
 * @param actualLength - 实际路径长度
 * @returns 路径效率 (0-1)
 */
export function calculatePathEfficiency(
  optimalLength: number,
  actualLength: number
): number {
  if (actualLength <= 0) return 1;
  if (optimalLength <= 0) return 1;
  const ratio = optimalLength / actualLength;
  return Math.max(0, Math.min(1, ratio));
}

/**
 * 计算完整成绩明细
 * 按PRD公式：
 * 总分 = 基础完成分 + 时间奖励 + 准确率分 + 路径分
 *      + 临期正确奖励 + 补货处理奖励
 *      - 错拣扣分 - 漏拣扣分
 *
 * @param input - 成绩计算输入参数
 * @returns 成绩明细对象，包含各分项和总分
 *
 * @example
 * ```ts
 * const result = calculateScore({
 *   timeLimitMs: 300000,
 *   actualTimeMs: 200000,
 *   totalOperations: 20,
 *   correctOperations: 18,
 *   optimalPathLength: 45,
 *   actualPathLength: 55,
 *   nearExpiryCorrectCount: 2,
 *   wrongPickCount: 1,
 *   missedPickCount: 1,
 *   restockHandledCount: 1
 * });
 * ```
 */
export function calculateScore(input: ScoreInput): ScoreBreakdown {
  const baseScore = input.baseScore ?? SCORE_CONSTANTS.BASE_SCORE;

  const accuracyPercent = calculateAccuracyPercent(
    input.correctOperations,
    input.totalOperations
  );
  const timeBonusRatio = calculateTimeBonusRatio(
    input.actualTimeMs,
    input.timeLimitMs
  );
  const pathEfficiency = calculatePathEfficiency(
    input.optimalPathLength,
    input.actualPathLength
  );

  const timeBonus = Math.round(timeBonusRatio * SCORE_CONSTANTS.TIME_BONUS_MAX);
  const accuracyScore = Math.round(
    (accuracyPercent / 100) * SCORE_CONSTANTS.ACCURACY_SCORE_MAX
  );
  const pathScore = Math.round(pathEfficiency * SCORE_CONSTANTS.PATH_SCORE_MAX);
  const nearExpiryBonus =
    input.nearExpiryCorrectCount * SCORE_CONSTANTS.NEAR_EXPIRY_BONUS_PER;
  const restockBonus =
    input.restockHandledCount * SCORE_CONSTANTS.RESTOCK_BONUS_PER;
  const wrongPickPenalty =
    input.wrongPickCount * SCORE_CONSTANTS.WRONG_PICK_PENALTY_PER;
  const missedPickPenalty =
    input.missedPickCount * SCORE_CONSTANTS.MISSED_PICK_PENALTY_PER;

  const totalScore =
    baseScore +
    timeBonus +
    accuracyScore +
    pathScore +
    nearExpiryBonus +
    restockBonus -
    wrongPickPenalty -
    missedPickPenalty;

  return {
    baseScore,
    timeBonus,
    accuracyScore,
    pathScore,
    nearExpiryBonus,
    restockBonus,
    wrongPickPenalty,
    missedPickPenalty,
    totalScore: Math.max(0, totalScore),
    accuracyPercent,
    timeBonusRatio,
    pathEfficiency,
  };
}

/**
 * 根据总分计算等级评定
 *
 * @param totalScore - 总分
 * @returns 等级（S/A/B/C/D）
 */
export function getScoreRank(totalScore: number): 'S' | 'A' | 'B' | 'C' | 'D' {
  if (totalScore >= 850) return 'S';
  if (totalScore >= 700) return 'A';
  if (totalScore >= 550) return 'B';
  if (totalScore >= 400) return 'C';
  return 'D';
}

/**
 * 计算能力雷达图的四维指标
 * 分别为：速度、准确率、路径规划、应急处理
 *
 * @param breakdown - 成绩明细
 * @returns 四维能力指标 (每项0-100)
 */
export function calculateAbilityMetrics(breakdown: ScoreBreakdown): {
  speed: number;
  accuracy: number;
  pathPlanning: number;
  emergency: number;
} {
  const speed = Math.round(breakdown.timeBonusRatio * 100);
  const accuracy = breakdown.accuracyPercent;
  const pathPlanning = Math.round(breakdown.pathEfficiency * 100);

  const emergencyRaw =
    breakdown.restockBonus > 0
      ? 100
      : breakdown.wrongPickPenalty + breakdown.missedPickPenalty > 150
        ? 20
        : breakdown.wrongPickPenalty + breakdown.missedPickPenalty > 50
          ? 50
          : 80;

  return {
    speed,
    accuracy,
    pathPlanning,
    emergency: emergencyRaw,
  };
}
