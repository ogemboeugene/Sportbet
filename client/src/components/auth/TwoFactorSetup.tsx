import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Shield, Copy, Download, Eye, EyeOff } from 'lucide-react'
import { authApi } from '../../services/authApi'
import toast from 'react-hot-toast'

const setupSchema = z.object({
  token: z.string().length(6, 'Token must be exactly 6 digits').regex(/^\d+$/, 'Token must contain only numbers'),
})

type SetupFormData = z.infer<typeof setupSchema>

interface TwoFactorSetupProps {
  onComplete: () => void
  onCancel: () => void
}

const TwoFactorSetup: React.FC<TwoFactorSetupProps> = ({ onComplete, onCancel }) => {
  const [step, setStep] = useState<'setup' | 'verify'>('setup')
  const [setupData, setSetupData] = useState<{
    secret: string
    qrCode: string
    backupCodes: string[]
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [showBackupCodes, setShowBackupCodes] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<SetupFormData>({
    resolver: zodResolver(setupSchema),
  })

  const tokenValue = watch('token')

  const handleSetup = async () => {
    setLoading(true)
    try {
      const response = await authApi.setup2FA()
      setSetupData(response.data)
      setStep('verify')
      toast.success('Scan the QR code with your authenticator app')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to setup 2FA')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (data: SetupFormData) => {
    setLoading(true)
    try {
      await authApi.enable2FA(data.token)
      toast.success('Two-factor authentication enabled successfully!')
      onComplete()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Invalid verification code')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
  }

  const downloadBackupCodes = () => {
    if (!setupData) return
    
    const content = `BetPlatform Two-Factor Authentication Backup Codes\n\nGenerated: ${new Date().toLocaleString()}\n\nBackup Codes:\n${setupData.backupCodes.join('\n')}\n\nImportant:\n- Keep these codes safe and secure\n- Each code can only be used once\n- Use these codes if you lose access to your authenticator app`
    
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'betplatform-backup-codes.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast.success('Backup codes downloaded!')
  }

  if (step === 'setup') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
            <Shield className="h-8 w-8 text-primary-600 dark:text-primary-400" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            Enable Two-Factor Authentication
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Add an extra layer of security to your account by enabling two-factor authentication.
          </p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
            What you'll need:
          </h4>
          <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
            <li>• An authenticator app (Google Authenticator, Authy, etc.)</li>
            <li>• Your mobile device to scan the QR code</li>
            <li>• A secure place to store backup codes</li>
          </ul>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="flex-1 btn btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleSetup}
            disabled={loading}
            className="flex-1 btn btn-primary"
          >
            {loading ? (
              <div className="loading-spinner w-5 h-5" />
            ) : (
              'Continue'
            )}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Scan QR Code
        </h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Scan this QR code with your authenticator app, then enter the 6-digit code below.
        </p>
      </div>

      {setupData && (
        <>
          {/* QR Code */}
          <div className="flex justify-center">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <img
                src={setupData.qrCode}
                alt="2FA QR Code"
                className="w-48 h-48"
              />
            </div>
          </div>

          {/* Manual Entry */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Can't scan? Enter this code manually:
            </p>
            <div className="flex items-center space-x-2">
              <code className="flex-1 text-sm bg-white dark:bg-gray-700 border rounded px-3 py-2 font-mono">
                {setupData.secret}
              </code>
              <button
                onClick={() => copyToClipboard(setupData.secret)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Backup Codes */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-yellow-900 dark:text-yellow-300">
                Backup Codes
              </h4>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowBackupCodes(!showBackupCodes)}
                  className="text-yellow-700 dark:text-yellow-400 hover:text-yellow-900 dark:hover:text-yellow-300"
                >
                  {showBackupCodes ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={downloadBackupCodes}
                  className="text-yellow-700 dark:text-yellow-400 hover:text-yellow-900 dark:hover:text-yellow-300"
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="text-sm text-yellow-800 dark:text-yellow-400 mb-3">
              Save these backup codes in a secure location. Each can only be used once.
            </p>
            {showBackupCodes && (
              <div className="grid grid-cols-2 gap-2">
                {setupData.backupCodes.map((code, index) => (
                  <code
                    key={index}
                    className="text-sm bg-white dark:bg-gray-700 border rounded px-2 py-1 font-mono text-center"
                  >
                    {code}
                  </code>
                ))}
              </div>
            )}
          </div>

          {/* Verification */}
          <form onSubmit={handleSubmit(handleVerify)} className="space-y-4">
            <div>
              <label htmlFor="token" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Enter verification code
              </label>
              <input
                {...register('token')}
                type="text"
                maxLength={6}
                className={`input text-center text-xl tracking-widest ${
                  errors.token ? 'border-red-500 focus:ring-red-500' : ''
                }`}
                placeholder="000000"
                autoComplete="one-time-code"
              />
              {errors.token && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.token.message}
                </p>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !tokenValue || tokenValue.length !== 6}
                className="flex-1 btn btn-primary"
              >
                {loading ? (
                  <div className="loading-spinner w-5 h-5" />
                ) : (
                  'Enable 2FA'
                )}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  )
}

export default TwoFactorSetup