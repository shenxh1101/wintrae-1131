import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Score, GameSession, LeaderboardEntry, TrendPoint, LevelType, AbilityRadar } from '../types'

interface ScoreRecord {
  score: Score
  session: GameSession
  nickname: string
  timestamp: string
}

interface ScoreState {
  scoreRecords: ScoreRecord[]
  leaderboard: LeaderboardEntry[]
  isLoadingLeaderboard: boolean
  addScoreRecord: (score: Score, session: GameSession, nickname: string) => void
  getSessionScores: (sessionId: string) => Score | null
  getPlayerScores: (playerId: string) => ScoreRecord[]
  getLevelScores: (levelType: LevelType, levelId: number) => ScoreRecord[]
  getPersonalBest: (playerId: string, levelType: LevelType, levelId: number) => ScoreRecord | null
  getAverageScore: (playerId: string) => number
  getTotalGames: (playerId: string) => number
  getScoreTrend: (playerId: string, days?: number) => TrendPoint[]
  getAccuracyTrend: (playerId: string, days?: number) => TrendPoint[]
  getAbilityRadar: (playerId: string) => AbilityRadar
  fetchLeaderboard: (levelType?: LevelType, levelId?: number, limit?: number) => Promise<void>
  clearScores: () => void
  removeScore: (scoreId: string) => void
}

const generateMockLeaderboard = (levelType?: LevelType, levelId?: number, limit: number = 20): LeaderboardEntry[] => {
  const mockNames = ['闪电手', '精准王', '老司机', '新人小白', '速度之星', '零失误', '效率大师', '路径规划师', '应急专家', '全能选手', '稳健派', '快手阿强', '细心小美', '挑战王', '不败神话']
  const entries: LeaderboardEntry[] = []
  const baseDate = new Date('2026-06-14')

  for (let i = 0; i < limit; i++) {
    const rand = Math.random()
    const totalScore = Math.floor(900 - i * 25 + rand * 50)
    const accuracy = Math.min(100, 98 - i * 0.8 + rand * 4)
    const durationMs = Math.floor(60000 + i * 15000 + rand * 30000)
    const date = new Date(baseDate)
    date.setDate(date.getDate() - Math.floor(rand * 30))

    entries.push({
      rank: i + 1,
      playerId: `player-mock-${i + 1}`,
      nickname: mockNames[i % mockNames.length],
      levelType: levelType ?? 'order',
      levelId: levelId ?? 1,
      totalScore: Math.max(0, totalScore),
      accuracy: Number(accuracy.toFixed(1)),
      durationMs,
      timestamp: date.toISOString()
    })
  }

  return entries.sort((a, b) => b.totalScore - a.totalScore).map((e, i) => ({ ...e, rank: i + 1 }))
}

export const useScoreStore = create<ScoreState>()(
  persist(
    (set, get) => ({
      scoreRecords: [],
      leaderboard: [],
      isLoadingLeaderboard: false,

      addScoreRecord: (score: Score, session: GameSession, nickname: string) => {
        set((state) => {
          const record: ScoreRecord = {
            score,
            session,
            nickname,
            timestamp: new Date().toISOString()
          }
          return {
            scoreRecords: [record, ...state.scoreRecords]
          }
        })
      },

      getSessionScores: (sessionId: string): Score | null => {
        const record = get().scoreRecords.find(r => r.session.sessionId === sessionId)
        return record?.score ?? null
      },

      getPlayerScores: (playerId: string): ScoreRecord[] => {
        return get().scoreRecords
          .filter(r => r.session.playerId === playerId)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      },

      getLevelScores: (levelType: LevelType, levelId: number): ScoreRecord[] => {
        return get().scoreRecords
          .filter(r => r.session.levelType === levelType && r.session.levelId === levelId)
          .sort((a, b) => b.score.totalScore - a.score.totalScore)
      },

      getPersonalBest: (playerId: string, levelType: LevelType, levelId: number): ScoreRecord | null => {
        const levelScores = get()
          .getLevelScores(levelType, levelId)
          .filter(r => r.session.playerId === playerId)
        return levelScores.length > 0 ? levelScores[0] : null
      },

      getAverageScore: (playerId: string): number => {
        const playerScores = get().getPlayerScores(playerId)
        if (playerScores.length === 0) return 0
        const sum = playerScores.reduce((acc, r) => acc + r.score.totalScore, 0)
        return Math.round(sum / playerScores.length)
      },

      getTotalGames: (playerId: string): number => {
        return get().getPlayerScores(playerId).length
      },

      getScoreTrend: (playerId: string, days: number = 30): TrendPoint[] => {
        const playerScores = get().getPlayerScores(playerId)
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - days)

        const filtered = playerScores.filter(r => new Date(r.timestamp) >= cutoffDate)

        const dailyMap = new Map<string, { total: number; count: number }>()
        filtered.forEach(r => {
          const date = new Date(r.timestamp).toISOString().split('T')[0]
          const existing = dailyMap.get(date) ?? { total: 0, count: 0 }
          dailyMap.set(date, {
            total: existing.total + r.score.totalScore,
            count: existing.count + 1
          })
        })

        return Array.from(dailyMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, data]) => ({
            date,
            value: Math.round(data.total / data.count)
          }))
      },

      getAccuracyTrend: (playerId: string, days: number = 30): TrendPoint[] => {
        const playerScores = get().getPlayerScores(playerId)
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - days)

        const filtered = playerScores.filter(r => new Date(r.timestamp) >= cutoffDate)

        const dailyMap = new Map<string, { total: number; count: number }>()
        filtered.forEach(r => {
          const date = new Date(r.timestamp).toISOString().split('T')[0]
          const existing = dailyMap.get(date) ?? { total: 0, count: 0 }
          dailyMap.set(date, {
            total: existing.total + r.score.accuracy,
            count: existing.count + 1
          })
        })

        return Array.from(dailyMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, data]) => ({
            date,
            value: Number((data.total / data.count).toFixed(1))
          }))
      },

      getAbilityRadar: (playerId: string): AbilityRadar => {
        const playerScores = get().getPlayerScores(playerId)

        if (playerScores.length === 0) {
          return { speed: 0, accuracy: 0, pathPlanning: 0, emergency: 0 }
        }

        const recentScores = playerScores.slice(0, 10)
        const avgAccuracy = recentScores.reduce((sum, r) => sum + r.score.accuracy, 0) / recentScores.length
        const avgPathScore = recentScores.reduce((sum, r) => sum + r.score.pathScore, 0) / recentScores.length

        const totalDurationMs = recentScores.reduce((sum, r) => sum + r.session.durationMs, 0)
        const totalScore = recentScores.reduce((sum, r) => sum + r.score.totalScore, 0)
        const speedBase = totalDurationMs > 0 ? Math.min(100, (totalScore / (totalDurationMs / 60000)) / 10) : 0

        const emergencyCount = recentScores.filter(r => (r.score.raceConditionBonus ?? 0) > 0).length
        const emergencyBase = Math.min(100, (emergencyCount / recentScores.length) * 100 + (recentScores.reduce((sum, r) => sum + (r.score.raceConditionBonus ?? 0), 0) / recentScores.length))

        return {
          speed: Math.min(100, Math.round(speedBase)),
          accuracy: Math.min(100, Math.round(avgAccuracy)),
          pathPlanning: Math.min(100, Math.round(avgPathScore)),
          emergency: Math.min(100, Math.round(emergencyBase))
        }
      },

      fetchLeaderboard: async (levelType?: LevelType, levelId?: number, limit: number = 20) => {
        set({ isLoadingLeaderboard: true })
        await new Promise(resolve => setTimeout(resolve, 300))
        const state = get()
        const localRecords = state.getLevelScores(levelType ?? 'order', levelId ?? 1)
          .map((r, idx, arr) => ({
            rank: idx + 1,
            playerId: r.session.playerId,
            nickname: r.nickname,
            levelType: r.session.levelType,
            levelId: r.session.levelId,
            totalScore: r.score.totalScore,
            accuracy: r.score.accuracy,
            durationMs: r.session.durationMs,
            timestamp: r.timestamp
          }))

        const mockEntries = generateMockLeaderboard(levelType, levelId, limit)

        const combined = [...localRecords, ...mockEntries]
          .sort((a, b) => b.totalScore - a.totalScore)
          .slice(0, limit)
          .map((e, i) => ({ ...e, rank: i + 1 }))

        set({
          leaderboard: combined,
          isLoadingLeaderboard: false
        })
      },

      clearScores: () => {
        set({ scoreRecords: [], leaderboard: [] })
      },

      removeScore: (scoreId: string) => {
        set((state) => ({
          scoreRecords: state.scoreRecords.filter(r => r.score.scoreId !== scoreId)
        }))
      }
    }),
    {
      name: 'warehouse-picking-scores',
      partialize: (state) => ({
        scoreRecords: state.scoreRecords
      })
    }
  )
)
