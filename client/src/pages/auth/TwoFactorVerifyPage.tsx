import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Shield, ArrowLeft } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../hooks/redux'
import { authApi } from '../../services/authApi'
import { clearTwoFactor } from '../../store/slices/authSlice'
import toast from 'react-hot-toast'

const verifySchema = z.object({
  token: z.string().length(6, 'Token must be exactly 6 digits').regex(/^\d+$/, 'Token must contain only numbers'),
})

type VerifyFormData = z.infer<typeof verifySchema>

const TwoFactorVerifyPage: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  
  const { tempToken, requiresTwoFactor } = useAppSelector((state) => state.auth)
  const from = location.state?.from?.pathname || '/dashboard'

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<VerifyFormData>({
    resolver: zodResolver(verifySchema),
  })

  const tokenValue = watch('token')

  useEffect(() => {
    if (!requiresTwoFactor || !tempToken) {
      navigate('/login', { replace: true })
    }
  }, [requiresTwoFactor, tempToken, navigate])

  const onSubmit = async (data: VerifyFormData) => {
    if (!tempToken) return

    setLoading(true)
    try {
      const response = await authApi.verifyTwoFactor(tempToken, data.token)
      
      // Store tokens
      localStorage.setItem('token', response.data.accessToken)
      localStorage.setItem('refreshToken', response.data.refreshToken)
      
      // Clear 2FA state
      dispatch(clearTwoFactor())
      
      toast.success('Two-factor authentication successful!')
      navigate(from, { replace: true })
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Invalid verification code')
    } finally {
      setLoading(false)
    }
  }

  const handleBackToLogin = () => {
    dispatch(clearTwoFactor())
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
            <Shield className="h-8 w-8 text-primary-600 dark:text-primary-400" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
            Two-Factor Authentication
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Enter the 6-digit code from your authenticator app or use a backup code
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label htmlFor="token" className="sr-only">
              Verification Code
            </label>
            <input
              {...register('token')}
              type="text"
              maxLength={6}
              className={`input text-center text-2xl tracking-widest ${
                errors.token ? 'border-red-500 focus:ring-red-500' : ''
              }`}
              placeholder="000000"
              autoComplete="one-time-code"
              autoFocus
            />
            {errors.token && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.token.message}
              </p>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || !tokenValue || tokenValue.length !== 6}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="loading-spinner w-5 h-5" />
              ) : (
                'Verify Code'
              )}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={handleBackToLogin}
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-500 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to login
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Having trouble? Contact support for assistance with your account.
          </p>
        </div>
      </div>
    </div>
  )
}

export default TwoFactorVerifyPage