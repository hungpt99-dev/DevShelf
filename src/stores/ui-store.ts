import { create } from "zustand";

interface UIState {
  searchOpen: boolean;
  searchQuery: string;
  tocOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  toggleSearch: () => void;
  setTocOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  searchOpen: false,
  searchQuery: "",
  tocOpen: true,
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  toggleSearch: () => set((state) => ({ searchOpen: !state.searchOpen })),
  setTocOpen: (tocOpen) => set({ tocOpen }),
}));
