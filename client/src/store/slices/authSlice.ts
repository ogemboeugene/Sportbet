import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { authApi } from '../../services/authApi'
import { User, LoginCredentials, RegisterData } from '../../types'

interface AuthState {
  user: User | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null
  requiresTwoFactor: boolean
  tempToken: string | null
}

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('token'),
  refreshToken: localStorage.getItem('refreshToken'),
  isAuthenticated: !!localStorage.getItem('token'),
  loading: false,
  error: null,
  requiresTwoFactor: false,
  tempToken: null,
}

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const response = await authApi.login(credentials)
      return (response as any).data.data // Extract the nested data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Login failed')
    }
  }
)

export const register = createAsyncThunk(
  'auth/register',
  async (userData: RegisterData, { rejectWithValue }) => {
    try {
      const response = await authApi.register(userData)
      return (response as any).data.data // Extract the nested data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Registration failed')
    }
  }
)

export const checkAuth = createAsyncThunk(
  'auth/checkAuth',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No token found')
      }
      
      const response = await authApi.getProfile()
      return (response as any).data.data // Extract the nested data
    } catch (error: any) {
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      return rejectWithValue('Authentication failed')
    }
  }
)

export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState }
      const refreshToken = state.auth.refreshToken
      
      if (!refreshToken) {
        throw new Error('No refresh token found')
      }
      
      const response = await authApi.refreshToken(refreshToken)
      return response.data
    } catch (error: any) {
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      return rejectWithValue('Token refresh failed')
    }
  }
)

export const logout = createAsyncThunk(
  'auth/logout',
  async (_) => {
    try {
      await authApi.logout()
    } catch (error) {
      // Continue with logout even if API call fails
    } finally {
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
    }
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    setTwoFactorRequired: (state, action: PayloadAction<{ tempToken: string }>) => {
      state.requiresTwoFactor = true
      state.tempToken = action.payload.tempToken
      state.loading = false
    },
    clearTwoFactor: (state) => {
      state.requiresTwoFactor = false
      state.tempToken = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false
        
        if (action.payload.requiresTwoFactor) {
          state.requiresTwoFactor = true
          state.tempToken = action.payload.tempToken || null
        } else {
          state.user = action.payload.user
          state.token = action.payload.accessToken
          state.refreshToken = action.payload.refreshToken
          state.isAuthenticated = true
          
          localStorage.setItem('token', action.payload.accessToken)
          localStorage.setItem('refreshToken', action.payload.refreshToken)
        }
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      
      // Register
      .addCase(register.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false
        state.user = action.payload.user
        state.token = action.payload.accessToken
        state.refreshToken = action.payload.refreshToken
        state.isAuthenticated = true
        
        localStorage.setItem('token', action.payload.accessToken)
        localStorage.setItem('refreshToken', action.payload.refreshToken)
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      
      // Check Auth
      .addCase(checkAuth.pending, (state) => {
        state.loading = true
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.loading = false
        state.user = action.payload
        state.isAuthenticated = true
      })
      .addCase(checkAuth.rejected, (state) => {
        state.loading = false
        state.isAuthenticated = false
        state.user = null
        state.token = null
        state.refreshToken = null
      })
      
      // Refresh Token
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.user = action.payload.user
        state.token = action.payload.accessToken
        state.refreshToken = action.payload.refreshToken
        
        localStorage.setItem('token', action.payload.accessToken)
        localStorage.setItem('refreshToken', action.payload.refreshToken)
      })
      .addCase(refreshToken.rejected, (state) => {
        state.isAuthenticated = false
        state.user = null
        state.token = null
        state.refreshToken = null
      })
      
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null
        state.token = null
        state.refreshToken = null
        state.isAuthenticated = false
        state.requiresTwoFactor = false
        state.tempToken = null
      })
  },
})

export const { clearError, setTwoFactorRequired, clearTwoFactor } = authSlice.actions
export default authSlice.reducer