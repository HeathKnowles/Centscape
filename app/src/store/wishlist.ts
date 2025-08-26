import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeUrl } from '../utils/normalizeUrl';

export interface WishlistItem {
  id: string;
  title: string;
  image?: string;
  price?: string;
  currency?: string;
  siteName?: string;
  sourceUrl: string;
  normalizedUrl: string; // v2 field for deduplication
  createdAt: string;
}

interface WishlistState {
  items: WishlistItem[];
  savedAmount: number;
  goalAmount: number;
  isLoading: boolean;
  error: string | null;
}

interface WishlistActions {
  addItem: (item: Omit<WishlistItem, 'id' | 'createdAt' | 'normalizedUrl'>) => boolean;
  removeItem: (id: string) => void;
  updateSavedAmount: (amount: number) => void;
  setGoalAmount: (amount: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  initializeStore: () => void;
  getTotalWishlistValue: () => number;
  getDaysToGoal: () => number;
  getProgressPercentage: () => number;
}

// Schema migration function
const migrateStore = (persistedState: any, version: number) => {
  if (version === 0) {
    // Migrate from v1 to v2: add normalizedUrl field
    const migratedItems = persistedState.items?.map((item: any) => ({
      ...item,
      normalizedUrl: item.normalizedUrl || normalizeUrl(item.sourceUrl),
    })) || [];

    return {
      ...persistedState,
      items: migratedItems,
    };
  }
  return persistedState;
};

export const useWishlistStore = create<WishlistState & WishlistActions>()(
  persist(
    (set, get) => ({
      // State
      items: [],
      savedAmount: 125, // Default from UI
      goalAmount: 499.99, // Default from UI
      isLoading: false,
      error: null,

      // Actions
      addItem: (newItem) => {
        const normalizedUrl = normalizeUrl(newItem.sourceUrl);
        
        // Check for duplicates using normalized URL
        const existingItem = get().items.find(
          item => item.normalizedUrl === normalizedUrl
        );
        
        if (existingItem) {
          set({ error: 'This item is already in your wishlist' });
          return false;
        }

        const item: WishlistItem = {
          ...newItem,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          normalizedUrl,
          createdAt: new Date().toISOString(),
        };

        set(state => ({
          items: [item, ...state.items],
          error: null,
        }));
        
        return true;
      },

      removeItem: (id) => {
        set(state => ({
          items: state.items.filter(item => item.id !== id),
        }));
      },

      updateSavedAmount: (amount) => {
        set({ savedAmount: Math.max(0, amount) });
      },

      setGoalAmount: (amount) => {
        set({ goalAmount: Math.max(0, amount) });
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      setError: (error) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },

      initializeStore: () => {
        // Any initialization logic if needed
        console.log('Wishlist store initialized');
      },

      getTotalWishlistValue: () => {
        return get().items.reduce((total, item) => {
          const price = parseFloat(item.price || '0');
          return total + (isNaN(price) ? 0 : price);
        }, 0);
      },

      getDaysToGoal: () => {
        const { savedAmount, goalAmount } = get();
        const remaining = goalAmount - savedAmount;
        
        // Simple calculation based on current savings rate
        // Assumes user saves ~$2.15/day based on UI ($125 saved, ~58 days to go)
        const dailySavingsRate = 2.15;
        
        return Math.ceil(remaining / dailySavingsRate);
      },

      getProgressPercentage: () => {
        const { savedAmount, goalAmount } = get();
        return Math.min((savedAmount / goalAmount) * 100, 100);
      },
    }),
    {
      name: 'centscape-wishlist',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      migrate: migrateStore,
    }
  )
);