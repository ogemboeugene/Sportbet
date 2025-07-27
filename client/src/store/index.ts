import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import uiReducer from './slices/uiSlice'
import walletReducer from './slices/walletSlice'
import bettingReducer from './slices/bettingSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    wallet: walletReducer,
    betting: bettingReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch