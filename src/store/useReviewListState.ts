import { create } from 'zustand'

interface ReviewListState {
  filterType: string
  searchQuery: string
  scrollTop: number
  setFilterType: (ft: string) => void
  setSearchQuery: (sq: string) => void
  setScrollTop: (st: number) => void
  clearState: () => void
}

export const useReviewListState = create<ReviewListState>((set) => ({
  filterType: 'all',
  searchQuery: '',
  scrollTop: 0,
  setFilterType: (filterType) => set({ filterType }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setScrollTop: (scrollTop) => set({ scrollTop }),
  clearState: () => set({ filterType: 'all', searchQuery: '', scrollTop: 0 }),
}))
