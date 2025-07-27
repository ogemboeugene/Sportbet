import React, { useState } from 'react'
import { Shield, Key, Download, AlertTriangle } from 'lucide-react'
import { useAppSelector } from '../hooks/redux'
import TwoFactorSetup from '../components/auth/TwoFactorSetup'
import LoginHistory from '../components/security/LoginHistory'
import { authApi } from '../services/authApi'
import toast from 'react-hot-toast'

const SecurityPage: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth)
  const [showSetup, setShowSetup] = useState(false)
  const [showDisable, setShowDisable] = useState(false)
  const [disableToken, setDisableToken] = useState('')
  const [loading, setLoading] = useState(false)

  const handleDisable2FA = async () => {
    if (!disableToken || disableToken.length !== 6) {
      toast.error('Please enter a valid 6-digit code')
      return
    }

    setLoading(true)
    try {
      await authApi.disable2FA(disableToken)
      toast.success('Two-factor authentication disabled')
      setShowDisable(false)
      setDisableToken('')
      // Refresh page or update user state
      window.location.reload()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to disable 2FA')
    } finally {
      setLoading(false)
    }
  }

  const handleRegenerateBackupCodes = async () => {
    const token = prompt('Enter your 6-digit authenticator code to regenerate backup codes:')
    if (!token || token.length !== 6) {
      toast.error('Please enter a valid 6-digit code')
      return
    }

    try {
      const response = await authApi.regenerateBackupCodes(token)
      
      // Download new backup codes
      const content = `BetPlatform Two-Factor Authentication Backup Codes\n\nGenerated: ${new Date().toLocaleString()}\n\nBackup Codes:\n${response.data.backupCodes.join('\n')}\n\nImportant:\n- Keep these codes safe and secure\n- Each code can only be used once\n- Use these codes if you lose access to your authenticator app`
      
      const blob = new Blob([content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'betplatform-backup-codes-new.txt'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast.success('New backup codes generated and downloaded!')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to regenerate backup codes')
    }
  }

  if (showSetup) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <TwoFactorSetup
            onComplete={() => {
              setShowSetup(false)
              window.location.reload()
            }}
            onCancel={() => setShowSetup(false)}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Security Settings</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage your account security and authentication settings.
        </p>
      </div>

      {/* Two-Factor Authentication */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-3 bg-primary-100 dark:bg-primary-900 rounded-lg">
                <Shield className="h-6 w-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Two-Factor Authentication
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Add an extra layer of security to your account
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className={`px-3 py-1 text-sm rounded-full ${
                user?.twoFactorEnabled
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
              }`}>
                {user?.twoFactorEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>

          <div className="mt-6 flex space-x-3">
            {user?.twoFactorEnabled ? (
              <>
                <button
                  onClick={() => setShowDisable(true)}
                  className="btn btn-danger btn-sm"
                >
                  Disable 2FA
                </button>
                <button
                  onClick={handleRegenerateBackupCodes}
                  className="btn btn-secondary btn-sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  New Backup Codes
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowSetup(true)}
                className="btn btn-primary btn-sm"
              >
                Enable 2FA
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Password Security */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <Key className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Password
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Change your password regularly to keep your account secure
              </p>
            </div>
          </div>

          <div className="mt-6">
            <button className="btn btn-secondary btn-sm">
              Change Password
            </button>
          </div>
        </div>
      </div>

      {/* Account Security */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Account Security Status
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Email Verification
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Verify your email address to secure your account
                </p>
              </div>
              <span className={`px-3 py-1 text-sm rounded-full ${
                user?.emailVerified
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
              }`}>
                {user?.emailVerified ? 'Verified' : 'Unverified'}
              </span>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  KYC Verification
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Complete identity verification for full account access
                </p>
              </div>
              <span className={`px-3 py-1 text-sm rounded-full ${
                user?.kycStatus === 'verified'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                  : user?.kycStatus === 'pending'
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
              }`}>
                {user?.kycStatus === 'verified' ? 'Verified' : 
                 user?.kycStatus === 'pending' ? 'Pending' : 'Required'}
              </span>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Two-Factor Authentication
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Protect your account with an additional security layer
                </p>
              </div>
              <span className={`px-3 py-1 text-sm rounded-full ${
                user?.twoFactorEnabled
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
              }`}>
                {user?.twoFactorEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Login History and Security Analysis */}
      <LoginHistory />

      {/* Disable 2FA Modal */}
      {showDisable && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600 mr-3" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Disable Two-Factor Authentication
              </h3>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              This will make your account less secure. Enter your 6-digit authenticator code or backup code to confirm.
            </p>
            
            <input
              type="text"
              maxLength={8}
              value={disableToken}
              onChange={(e) => setDisableToken(e.target.value)}
              className="input mb-4"
              placeholder="Enter 6-digit code or backup code"
            />
            
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowDisable(false)
                  setDisableToken('')
                }}
                className="flex-1 btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleDisable2FA}
                disabled={loading || !disableToken}
                className="flex-1 btn btn-danger"
              >
                {loading ? (
                  <div className="loading-spinner w-5 h-5" />
                ) : (
                  'Disable 2FA'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SecurityPage