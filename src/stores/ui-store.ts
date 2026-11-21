import { create } from "zustand";

interface UIState {
  searchOpen: boolean;
  tocOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  toggleSearch: () => void;
  setTocOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  searchOpen: false,
  tocOpen: true,
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  toggleSearch: () => set((state) => ({ searchOpen: !state.searchOpen })),
  setTocOpen: (tocOpen) => set({ tocOpen }),
}));
