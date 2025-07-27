import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { useAppDispatch } from './hooks/redux'
import { checkAuth } from './store/slices/authSlice'
import { useWebSocket } from './hooks/useWebSocket'
import { useSession } from './hooks/useSession'
import Layout from './components/layout/Layout'
import SessionMonitor from './components/common/SessionMonitor'
import HomePage from './pages/HomePage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import TwoFactorVerifyPage from './pages/auth/TwoFactorVerifyPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import DashboardPage from './pages/DashboardPage'
import SecurityPage from './pages/SecurityPage'
import KycPage from './pages/KycPage'
import { WalletPage } from './pages/WalletPage'
import { BettingPage } from './pages/BettingPage'
import HistoryPage from './pages/HistoryPage'
import SettingsPage from './pages/SettingsPage'
import KycManagementPage from './pages/admin/KycManagementPage'
import ComplianceDashboardPage from './pages/admin/ComplianceDashboardPage'
import ProtectedRoute from './components/auth/ProtectedRoute'
import { ThemeProvider } from './contexts/ThemeContext'

function App(): React.ReactElement {
  const dispatch = useAppDispatch()
  const { endSession } = useSession()
  
  // Initialize WebSocket connection
  useWebSocket()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      dispatch(checkAuth())
    }
  }, [dispatch])

  const handleSessionEnd = () => {
    // Use the endSession function to properly end the session
    endSession()
    // Redirect to home page when session ends
    window.location.href = '/'
  }

  return (
    <ThemeProvider>
      <SessionMonitor onSessionEnd={handleSessionEnd} />
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-2fa" element={<TwoFactorVerifyPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          
          {/* Self-exclusion page */}
          <Route path="/self-excluded" element={
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
              <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
                <div className="mb-4">
                  <svg className="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Account Self-Excluded</h2>
                <p className="text-gray-600 mb-4">
                  Your account is currently self-excluded. If you need help, please contact our support team or visit the resources below.
                </p>
                <div className="space-y-2">
                  <a href="https://www.gamblersanonymous.org" target="_blank" rel="noopener noreferrer" className="block text-blue-600 hover:text-blue-800">
                    Gamblers Anonymous
                  </a>
                  <a href="https://www.ncpgambling.org" target="_blank" rel="noopener noreferrer" className="block text-blue-600 hover:text-blue-800">
                    National Council on Problem Gambling
                  </a>
                </div>
              </div>
            </div>
          } />
          
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/security" 
            element={
              <ProtectedRoute>
                <SecurityPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/kyc" 
            element={
              <ProtectedRoute>
                <KycPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/wallet" 
            element={
              <ProtectedRoute>
                <WalletPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/betting" 
            element={
              <ProtectedRoute>
                <BettingPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/history" 
            element={
              <ProtectedRoute>
                <HistoryPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/settings" 
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            } 
          />
          
          {/* Admin routes */}
          <Route 
            path="/admin/kyc" 
            element={
              <ProtectedRoute>
                <KycManagementPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/compliance" 
            element={
              <ProtectedRoute>
                <ComplianceDashboardPage />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Layout>
    </ThemeProvider>
  )
}

export default App