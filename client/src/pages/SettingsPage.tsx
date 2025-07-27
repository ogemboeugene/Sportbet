import React, { useState, useEffect } from 'react'
import { useAppSelector, useAppDispatch } from '../hooks/redux'
import { 
  User, 
  Lock, 
  Bell, 
  Globe, 
  Palette, 
  Shield, 
  CreditCard, 
  Mail,
  Phone,
  Eye,
  EyeOff,
  Save,
  AlertTriangle
} from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import toast from 'react-hot-toast'
import { authApi } from '../services/authApi'
import { walletApi } from '../services/walletApi'

interface UserSettings {
  profile: {
    firstName: string
    lastName: string
    email: string
    phone?: string
    dateOfBirth?: string
    country?: string
    language: string
    timezone: string
  }
  notifications: {
    email: {
      marketing: boolean
      security: boolean
      transactions: boolean
      betting: boolean
    }
    push: {
      security: boolean
      transactions: boolean
      betting: boolean
    }
    sms: {
      security: boolean
      transactions: boolean
    }
  }
  security: {
    twoFactorEnabled: boolean
    sessionTimeout: number
    loginNotifications: boolean
  }
  gambling: {
    dailyDepositLimit?: number
    monthlyDepositLimit?: number
    dailyLossLimit?: number
    monthlyLossLimit?: number
    sessionTimeLimit?: number
    coolingOffPeriod?: number
  }
  privacy: {
    profileVisibility: 'public' | 'private'
    activityVisibility: 'public' | 'friends' | 'private'
    dataSharing: boolean
  }
}

const SettingsPage: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth)
  const { theme, toggleTheme } = useTheme()
  const [activeTab, setActiveTab] = useState('profile')
  const [settings, setSettings] = useState<UserSettings>({
    profile: {
      firstName: user?.profile?.firstName || '',
      lastName: user?.profile?.lastName || '',
      email: user?.email || '',
      phone: user?.profile?.phone || '',
      dateOfBirth: user?.profile?.dateOfBirth || '',
      country: user?.profile?.country || '',
      language: 'en',
      timezone: 'UTC'
    },
    notifications: {
      email: {
        marketing: true,
        security: true,
        transactions: true,
        betting: true
      },
      push: {
        security: true,
        transactions: true,
        betting: false
      },
      sms: {
        security: true,
        transactions: false
      }
    },
    security: {
      twoFactorEnabled: user?.twoFactorEnabled || false,
      sessionTimeout: 30,
      loginNotifications: true
    },
    gambling: {
      dailyDepositLimit: undefined,
      monthlyDepositLimit: undefined,
      dailyLossLimit: undefined,
      monthlyLossLimit: undefined,
      sessionTimeLimit: undefined,
      coolingOffPeriod: undefined
    },
    privacy: {
      profileVisibility: 'private',
      activityVisibility: 'private',
      dataSharing: false
    }
  })
  
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'gambling', label: 'Responsible Gambling', icon: AlertTriangle },
    { id: 'privacy', label: 'Privacy', icon: Lock },
    { id: 'appearance', label: 'Appearance', icon: Palette }
  ]

  const handleSettingsChange = (section: keyof UserSettings, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }))
  }

  const handleNestedChange = (section: keyof UserSettings, subsection: string, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [subsection]: {
          ...(prev[section] as any)[subsection],
          [field]: value
        }
      }
    }))
  }

  const handleSaveProfile = async () => {
    setLoading(true)
    try {
      await authApi.updateProfile(settings.profile)
      toast.success('Profile updated successfully!')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long')
      return
    }

    setLoading(true)
    try {
      await authApi.changePassword(passwordData.currentPassword, passwordData.newPassword)
      toast.success('Password changed successfully!')
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateLimits = async () => {
    setLoading(true)
    try {
      await walletApi.updateLimits({
        dailyDeposit: settings.gambling.dailyDepositLimit,
        monthlyDeposit: settings.gambling.monthlyDepositLimit
      })
      toast.success('Gambling limits updated successfully!')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update limits')
    } finally {
      setLoading(false)
    }
  }

  const renderProfileTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            First Name
          </label>
          <input
            type="text"
            value={settings.profile.firstName}
            onChange={(e) => handleSettingsChange('profile', 'firstName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Last Name
          </label>
          <input
            type="text"
            value={settings.profile.lastName}
            onChange={(e) => handleSettingsChange('profile', 'lastName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Email
          </label>
          <input
            type="email"
            value={settings.profile.email}
            onChange={(e) => handleSettingsChange('profile', 'email', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Phone
          </label>
          <input
            type="tel"
            value={settings.profile.phone}
            onChange={(e) => handleSettingsChange('profile', 'phone', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>
      
      <div className="flex justify-end">
        <button
          onClick={handleSaveProfile}
          disabled={loading}
          className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
        >
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Saving...' : 'Save Profile'}
        </button>
      </div>
    </div>
  )

  const renderSecurityTab = () => (
    <div className="space-y-6">
      {/* Change Password */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Change Password</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              New Password
            </label>
            <input
              type="password"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <button
            onClick={handleChangePassword}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
          >
            {loading ? 'Changing...' : 'Change Password'}
          </button>
        </div>
      </div>

      {/* Two-Factor Authentication */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Two-Factor Authentication</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Add an extra layer of security to your account
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.security.twoFactorEnabled}
              onChange={(e) => handleSettingsChange('security', 'twoFactorEnabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>
    </div>
  )

  const renderGamblingTab = () => (
    <div className="space-y-6">
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex">
          <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Responsible Gambling
            </h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              Set limits to help control your gambling activity and spend responsibly.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Daily Deposit Limit ($)
          </label>
          <input
            type="number"
            value={settings.gambling.dailyDepositLimit || ''}
            onChange={(e) => handleSettingsChange('gambling', 'dailyDepositLimit', parseFloat(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="No limit"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Monthly Deposit Limit ($)
          </label>
          <input
            type="number"
            value={settings.gambling.monthlyDepositLimit || ''}
            onChange={(e) => handleSettingsChange('gambling', 'monthlyDepositLimit', parseFloat(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="No limit"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleUpdateLimits}
          disabled={loading}
          className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
        >
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Saving...' : 'Update Limits'}
        </button>
      </div>
    </div>
  )

  const renderAppearanceTab = () => (
    <div className="space-y-6">
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Theme</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Switch between light and dark mode
            </p>
          </div>
          <button
            onClick={toggleTheme}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            {theme === 'dark' ? (
              <>
                <Globe className="h-4 w-4 mr-2" />
                Light Mode
              </>
            ) : (
              <>
                <Palette className="h-4 w-4 mr-2" />
                Dark Mode
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return renderProfileTab()
      case 'security':
        return renderSecurityTab()
      case 'gambling':
        return renderGamblingTab()
      case 'appearance':
        return renderAppearanceTab()
      default:
        return <div className="text-center py-8 text-gray-500">Coming soon...</div>
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage your account settings and preferences
            </p>
          </div>

          <div className="flex flex-col lg:flex-row">
            {/* Sidebar */}
            <div className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-700">
              <nav className="p-4 space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        activeTab === tab.id
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <Icon className="h-5 w-5 mr-3" />
                      {tab.label}
                    </button>
                  )
                })}
              </nav>
            </div>

            {/* Content */}
            <div className="flex-1 p-6">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
