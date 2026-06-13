import { create } from 'zustand'
import type { LevelType } from '@/types'

interface ReviewSwitcherState {
  recordFilter: 'all' | LevelType
  setRecordFilter: (f: 'all' | LevelType) => void
}

export const useReviewSwitcherState = create<ReviewSwitcherState>((set) => ({
  recordFilter: 'all',
  setRecordFilter: (recordFilter) => set({ recordFilter }),
}))
