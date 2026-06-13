import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Achievement, AbilityDimension } from '../types'

interface PlayerState {
  playerId: string
  nickname: string
  achievement: Achievement
  unlockedLevels: number[]
  unlockedTimedLevels: number[]
  totalTrainingMinutes: number
  bestScores: Record<string, number>
  setNickname: (nickname: string) => void
  unlockLevel: (levelId: number, levelType: 'order' | 'timed') => void
  addTrainingTime: (minutes: number) => void
  updateBestScore: (key: string, score: number) => void
  updateAchievement: (updates: Partial<Achievement>) => void
  updateAbilityRadar: (dimension: AbilityDimension, value: number) => void
  resetPlayer: () => void
}

const generatePlayerId = (): string => {
  return `player-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const getInitialAchievement = (playerId: string): Achievement => ({
  playerId,
  totalGames: 0,
  totalTime: 0,
  avgAccuracy: 0,
  avgPathScore: 0,
  unlockedLevels: '1',
  bestScores: {},
  abilityRadar: {
    speed: 0,
    accuracy: 0,
    pathPlanning: 0,
    emergency: 0
  }
})

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      playerId: generatePlayerId(),
      nickname: '新玩家',
      achievement: getInitialAchievement(generatePlayerId()),
      unlockedLevels: [1],
      unlockedTimedLevels: [1],
      totalTrainingMinutes: 0,
      bestScores: {},

      setNickname: (nickname: string) => {
        set({ nickname })
      },

      unlockLevel: (levelId: number, levelType: 'order' | 'timed') => {
        const key = levelType === 'order' ? 'unlockedLevels' : 'unlockedTimedLevels'
        const current = get()[key]
        if (!current.includes(levelId)) {
          set({ [key]: [...current, levelId].sort((a, b) => a - b) } as Partial<PlayerState>)
        }
        const nextLevel = levelId + 1
        if (!current.includes(nextLevel)) {
          set({ [key]: [...get()[key], nextLevel].sort((a, b) => a - b) } as Partial<PlayerState>)
        }
      },

      addTrainingTime: (minutes: number) => {
        set((state) => {
          const newTotalMinutes = state.totalTrainingMinutes + minutes
          return {
            totalTrainingMinutes: newTotalMinutes,
            achievement: {
              ...state.achievement,
              totalTime: newTotalMinutes * 60
            }
          }
        })
      },

      updateBestScore: (key: string, score: number) => {
        set((state) => {
          const currentBest = state.bestScores[key] ?? 0
          if (score > currentBest) {
            return {
              bestScores: {
                ...state.bestScores,
                [key]: score
              },
              achievement: {
                ...state.achievement,
                bestScores: {
                  ...state.achievement.bestScores,
                  [key]: score
                }
              }
            }
          }
          return state
        })
      },

      updateAchievement: (updates: Partial<Achievement>) => {
        set((state) => ({
          achievement: {
            ...state.achievement,
            ...updates
          }
        }))
      },

      updateAbilityRadar: (dimension: AbilityDimension, value: number) => {
        set((state) => ({
          achievement: {
            ...state.achievement,
            abilityRadar: {
              ...state.achievement.abilityRadar!,
              [dimension]: Math.min(100, Math.max(0, value))
            }
          }
        }))
      },

      resetPlayer: () => {
        const newPlayerId = generatePlayerId()
        set({
          playerId: newPlayerId,
          nickname: '新玩家',
          achievement: getInitialAchievement(newPlayerId),
          unlockedLevels: [1],
          unlockedTimedLevels: [1],
          totalTrainingMinutes: 0,
          bestScores: {}
        })
      }
    }),
    {
      name: 'warehouse-picking-player',
      partialize: (state) => ({
        playerId: state.playerId,
        nickname: state.nickname,
        achievement: state.achievement,
        unlockedLevels: state.unlockedLevels,
        unlockedTimedLevels: state.unlockedTimedLevels,
        totalTrainingMinutes: state.totalTrainingMinutes,
        bestScores: state.bestScores
      })
    }
  )
)
