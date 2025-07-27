import React, { useState, useEffect } from 'react'
import { notificationApi, NotificationPreferences, DeviceToken } from '../../services/notificationApi'

export const NotificationPreferencesComponent: React.FC = () => {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [deviceTokens, setDeviceTokens] = useState<DeviceToken[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default')

  useEffect(() => {
    loadPreferences()
    loadDeviceTokens()
    checkPushPermission()
  }, [])

  const loadPreferences = async () => {
    try {
      setLoading(true)
      const prefs = await notificationApi.getPreferences()
      setPreferences(prefs)
    } catch (error) {
      console.error('Failed to load preferences:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadDeviceTokens = async () => {
    try {
      const tokens = await notificationApi.getDeviceTokens()
      setDeviceTokens(tokens)
    } catch (error) {
      console.error('Failed to load device tokens:', error)
    }
  }

  const checkPushPermission = () => {
    if ('Notification' in window) {
      setPushPermission(Notification.permission)
    }
  }

  const handlePreferenceChange = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!preferences) return

    try {
      setSaving(true)
      const updatedPrefs = { ...preferences, [key]: value }
      await notificationApi.updatePreferences({ [key]: value })
      setPreferences(updatedPrefs)
    } catch (error) {
      console.error('Failed to update preferences:', error)
    } finally {
      setSaving(false)
    }
  }

  const requestPushPermission = async () => {
    try {
      const permission = await notificationApi.requestNotificationPermission()
      setPushPermission(permission)
      
      if (permission === 'granted') {
        // Register service worker and get FCM token
        await notificationApi.registerServiceWorker()
        const token = await notificationApi.getFirebaseToken()
        
        await notificationApi.registerDeviceToken({
          token,
          platform: 'web',
          userAgent: navigator.userAgent,
          appVersion: '1.0.0',
        })
        
        loadDeviceTokens()
      }
    } catch (error) {
      console.error('Failed to request push permission:', error)
    }
  }

  const removeDeviceToken = async (tokenId: string) => {
    try {
      const token = deviceTokens.find(t => t.id === tokenId)
      if (token) {
        await notificationApi.removeDeviceToken(token.id)
        setDeviceTokens(prev => prev.filter(t => t.id !== tokenId))
      }
    } catch (error) {
      console.error('Failed to remove device token:', error)
    }
  }

  const sendTestNotification = async (type: 'in-app' | 'push') => {
    try {
      if (type === 'in-app') {
        await notificationApi.sendTestInAppNotification()
      } else {
        await notificationApi.sendTestPushNotification()
      }
      alert(`Test ${type} notification sent!`)
    } catch (error) {
      console.error(`Failed to send test ${type} notification:`, error)
      alert(`Failed to send test ${type} notification`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Loading preferences...</div>
      </div>
    )
  }

  if (!preferences) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500">Failed to load notification preferences</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Notification Preferences</h2>

      {/* Channel Preferences */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Channels</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Email Notifications</label>
              <p className="text-sm text-gray-500">Receive notifications via email</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.email}
                onChange={(e) => handlePreferenceChange('email', e.target.checked)}
                disabled={saving}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Push Notifications</label>
              <p className="text-sm text-gray-500">Receive push notifications on your devices</p>
              {pushPermission !== 'granted' && (
                <button
                  onClick={requestPushPermission}
                  className="mt-1 text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  Enable push notifications
                </button>
              )}
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.push && pushPermission === 'granted'}
                onChange={(e) => handlePreferenceChange('push', e.target.checked)}
                disabled={saving || pushPermission !== 'granted'}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">SMS Notifications</label>
              <p className="text-sm text-gray-500">Receive notifications via SMS</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.sms}
                onChange={(e) => handlePreferenceChange('sms', e.target.checked)}
                disabled={saving}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">In-App Notifications</label>
              <p className="text-sm text-gray-500">Show notifications within the app</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.in_app}
                onChange={(e) => handlePreferenceChange('in_app', e.target.checked)}
                disabled={saving}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Notification Types */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Types</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Betting Updates</label>
              <p className="text-sm text-gray-500">Bet settlements, wins, losses</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.betUpdates}
                onChange={(e) => handlePreferenceChange('betUpdates', e.target.checked)}
                disabled={saving}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Financial Updates</label>
              <p className="text-sm text-gray-500">Deposits, withdrawals, balance changes</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.financial}
                onChange={(e) => handlePreferenceChange('financial', e.target.checked)}
                disabled={saving}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Security Alerts</label>
              <p className="text-sm text-gray-500">Login attempts, security changes</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.security}
                onChange={(e) => handlePreferenceChange('security', e.target.checked)}
                disabled={saving}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Promotions</label>
              <p className="text-sm text-gray-500">Special offers, bonuses, promotions</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.promotions}
                onChange={(e) => handlePreferenceChange('promotions', e.target.checked)}
                disabled={saving}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">System Announcements</label>
              <p className="text-sm text-gray-500">Maintenance, updates, important notices</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.system}
                onChange={(e) => handlePreferenceChange('system', e.target.checked)}
                disabled={saving}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Device Management */}
      {deviceTokens.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Registered Devices</h3>
          <div className="space-y-3">
            {deviceTokens.map((token) => (
              <div key={token.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {token.platform.charAt(0).toUpperCase() + token.platform.slice(1)} Device
                  </div>
                  <div className="text-xs text-gray-500">
                    Last used: {new Date(token.lastUsedAt).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => removeDeviceToken(token.id)}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test Notifications */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Notifications</h3>
        <div className="flex space-x-4">
          <button
            onClick={() => sendTestNotification('in-app')}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
          >
            Test In-App
          </button>
          <button
            onClick={() => sendTestNotification('push')}
            disabled={pushPermission !== 'granted'}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Test Push
          </button>
        </div>
      </div>

      {saving && (
        <div className="text-center py-4">
          <div className="text-blue-600">Saving preferences...</div>
        </div>
      )}
    </div>
  )
}