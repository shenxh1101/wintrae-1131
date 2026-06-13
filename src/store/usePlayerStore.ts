import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Achievement, AbilityDimension } from '../types'

interface PlayerState {
  playerId: string
  nickname: string
  tutorialCompleted: boolean
  achievement: Achievement
  unlockedLevels: number[]
  unlockedTimedLevels: number[]
  totalTrainingMinutes: number
  bestScores: Record<string, number>
  setNickname: (nickname: string) => void
  setTutorialCompleted: (completed: boolean) => void
  unlockLevel: (levelId: number, levelType: 'order' | 'timed') => void
  checkAndUnlockTimedLevel: () => void
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
      tutorialCompleted: false,
      achievement: getInitialAchievement(generatePlayerId()),
      unlockedLevels: [],
      unlockedTimedLevels: [],
      totalTrainingMinutes: 0,
      bestScores: {},

      setNickname: (nickname: string) => {
        set({ nickname })
      },

      setTutorialCompleted: (completed: boolean) => {
        set({ tutorialCompleted: completed })
      },

      unlockLevel: (levelId: number, levelType: 'order' | 'timed') => {
        const key = levelType === 'order' ? 'unlockedLevels' : 'unlockedTimedLevels'
        const current = get()[key]
        if (!current.includes(levelId)) {
          set({ [key]: [...current, levelId].sort((a, b) => a - b) } as Partial<PlayerState>)
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
          tutorialCompleted: false,
          achievement: getInitialAchievement(newPlayerId),
          unlockedLevels: [],
          unlockedTimedLevels: [],
          totalTrainingMinutes: 0,
          bestScores: {}
        })
      },

      checkAndUnlockTimedLevel: () => {
        const { unlockedLevels, unlockedTimedLevels } = get()
        if (unlockedLevels.includes(3) && !unlockedTimedLevels.includes(1)) {
          set({ unlockedTimedLevels: [...unlockedTimedLevels, 1].sort((a, b) => a - b) })
        }
      }
    }),
    {
      name: 'warehouse-picking-player',
      partialize: (state) => ({
        playerId: state.playerId,
        nickname: state.nickname,
        tutorialCompleted: state.tutorialCompleted,
        achievement: state.achievement,
        unlockedLevels: state.unlockedLevels,
        unlockedTimedLevels: state.unlockedTimedLevels,
        totalTrainingMinutes: state.totalTrainingMinutes,
        bestScores: state.bestScores
      })
    }
  )
)
