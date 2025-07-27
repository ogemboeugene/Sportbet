import React, { useState, useEffect } from 'react'
import { Clock, MapPin, Monitor, Shield, AlertTriangle } from 'lucide-react'
import { authApi } from '../../services/authApi'
import toast from 'react-hot-toast'

interface LoginRecord {
  _id: string
  ipAddress: string
  userAgent: string
  location?: string
  status: 'success' | 'failed' | 'blocked'
  failureReason?: string
  timestamp: string
}

interface SecurityAnalysis {
  isAnomalous: boolean
  anomalies: string[]
  stats: {
    totalLogins: number
    todayLogins: number
    uniqueIPs: number
    uniqueDevices: number
  }
}

const LoginHistory: React.FC = () => {
  const [loginHistory, setLoginHistory] = useState<LoginRecord[]>([])
  const [securityAnalysis, setSecurityAnalysis] = useState<SecurityAnalysis | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLoginHistory()
  }, [])

  const fetchLoginHistory = async () => {
    try {
      setLoading(true)
      const [historyResponse, analysisResponse] = await Promise.allSettled([
        authApi.getLoginHistory(),
        authApi.getSecurityAnalysis()
      ])

      if (historyResponse.status === 'fulfilled') {
        const data = historyResponse.value.data
        setLoginHistory(Array.isArray(data) ? data : (data as any)?.history || [])
      } else {
        console.error('Failed to fetch login history:', historyResponse.reason)
        setLoginHistory([])
      }

      if (analysisResponse.status === 'fulfilled') {
        setSecurityAnalysis(analysisResponse.value.data || {
          isAnomalous: false,
          anomalies: [],
          stats: {
            totalLogins: 0,
            todayLogins: 0,
            uniqueIPs: 0,
            uniqueDevices: 0
          }
        })
      } else {
        console.error('Failed to fetch security analysis:', analysisResponse.reason)
        setSecurityAnalysis({
          isAnomalous: false,
          anomalies: [],
          stats: {
            totalLogins: 0,
            todayLogins: 0,
            uniqueIPs: 0,
            uniqueDevices: 0
          }
        })
      }
    } catch (error) {
      console.error('Error fetching login data:', error)
      toast.error('Failed to load login history')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    )
  }

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [historyResponse, analysisResponse] = await Promise.all([
        authApi.getLoginHistory(),
        authApi.getSecurityAnalysis(),
      ])
      
      setLoginHistory(historyResponse.data)
      setSecurityAnalysis(analysisResponse.data)
    } catch (error: any) {
      toast.error('Failed to load security data')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <Shield className="h-4 w-4 text-green-600" />
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      case 'blocked':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      default:
        return <Shield className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      case 'blocked':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  const formatUserAgent = (userAgent: string) => {
    // Simple user agent parsing for display
    if (userAgent.includes('Chrome')) return 'Chrome'
    if (userAgent.includes('Firefox')) return 'Firefox'
    if (userAgent.includes('Safari')) return 'Safari'
    if (userAgent.includes('Edge')) return 'Edge'
    return 'Unknown Browser'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="loading-spinner w-8 h-8"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Security Analysis */}
      {securityAnalysis && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Security Analysis
          </h3>
          
          {securityAnalysis.isAnomalous && (
            <div className="mb-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                <h4 className="text-sm font-medium text-yellow-900 dark:text-yellow-300">
                  Unusual Activity Detected
                </h4>
              </div>
              <ul className="mt-2 text-sm text-yellow-800 dark:text-yellow-400">
                {securityAnalysis.anomalies.map((anomaly, index) => (
                  <li key={index}>• {anomaly}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {securityAnalysis?.stats?.totalLogins || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Total Logins (7 days)
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {securityAnalysis?.stats?.todayLogins || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Today's Logins
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {securityAnalysis?.stats?.uniqueIPs || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Unique IPs
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {securityAnalysis?.stats?.uniqueDevices || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Unique Devices
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Login History */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Recent Login Activity
          </h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Your recent login attempts and security events
          </p>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {loginHistory.length === 0 ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
              No login history available
            </div>
          ) : (
            loginHistory.map((record) => (
              <div key={record._id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {getStatusIcon(record.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(record.status)}`}>
                          {record.status === 'success' ? 'Successful' : 
                           record.status === 'failed' ? 'Failed' : 'Blocked'}
                        </span>
                        {record.failureReason && (
                          <span className="text-sm text-red-600 dark:text-red-400">
                            {record.failureReason}
                          </span>
                        )}
                      </div>
                      
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <Clock className="h-4 w-4 mr-2" />
                          {new Date(record.timestamp).toLocaleString()}
                        </div>
                        
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <MapPin className="h-4 w-4 mr-2" />
                          {record.location || 'Unknown Location'} • {record.ipAddress}
                        </div>
                        
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <Monitor className="h-4 w-4 mr-2" />
                          {formatUserAgent(record.userAgent)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default LoginHistory