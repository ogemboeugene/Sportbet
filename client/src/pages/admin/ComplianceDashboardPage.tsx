import React, { useState, useEffect } from 'react'
import { 
  AlertTriangle, 
  Shield, 
  Users, 
  TrendingUp, 
  Clock, 
  CheckCircle,
  XCircle,
  Eye
} from 'lucide-react'
import { complianceApi, ComplianceDashboard, ComplianceAlert } from '../../services/complianceApi'
import toast from 'react-hot-toast'

const ComplianceDashboardPage: React.FC = () => {
  const [dashboard, setDashboard] = useState<ComplianceDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedAlert, setSelectedAlert] = useState<ComplianceAlert | null>(null)
  const [showAlertModal, setShowAlertModal] = useState(false)

  useEffect(() => {
    fetchDashboard()
  }, [])

  const fetchDashboard = async () => {
    try {
      const response = await complianceApi.getDashboard()
      setDashboard(response.data)
    } catch (error: any) {
      toast.error('Failed to load compliance dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleAlertAction = async (alertId: string, action: string, data?: any) => {
    try {
      switch (action) {
        case 'assign':
          await complianceApi.assignAlert(alertId, data.assignedTo)
          break
        case 'resolve':
          await complianceApi.updateAlertStatus(alertId, 'resolved', data.notes, data.resolution)
          break
        case 'escalate':
          await complianceApi.escalateAlert(alertId, data.reason)
          break
        case 'false_positive':
          await complianceApi.updateAlertStatus(alertId, 'false_positive', data.notes)
          break
      }
      
      toast.success('Alert updated successfully')
      await fetchDashboard()
      setShowAlertModal(false)
    } catch (error: any) {
      toast.error('Failed to update alert')
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />
      case 'medium':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'low':
        return <AlertTriangle className="h-4 w-4 text-blue-600" />
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-400" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      case 'low':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'investigating':
        return <Clock className="h-4 w-4 text-blue-600" />
      case 'false_positive':
        return <XCircle className="h-4 w-4 text-gray-600" />
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
    }
  }

  const formatAlertType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="loading-spinner w-8 h-8"></div>
      </div>
    )
  }

  if (!dashboard) {
    return (
      <div className="text-center p-8 text-gray-500 dark:text-gray-400">
        Failed to load compliance dashboard
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Compliance Dashboard</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Monitor fraud detection, risk management, and compliance activities
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Active Alerts
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {dashboard.activeAlerts}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <Shield className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Critical Alerts
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {dashboard.criticalAlerts}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <Users className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                High Risk Users
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {dashboard.highRiskUsers}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Resolved Today
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {dashboard.stats.resolvedToday}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts by Type */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Alerts by Type
          </h3>
          <div className="space-y-3">
            {Object.entries(dashboard.alertsByType).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {formatAlertType(type)}
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Risk Distribution
          </h3>
          <div className="space-y-3">
            {dashboard.riskDistribution.map((item) => (
              <div key={item._id} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-2 ${
                    item._id === 'critical' ? 'bg-red-500' :
                    item._id === 'high' ? 'bg-orange-500' :
                    item._id === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                  }`}></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                    {item._id} Risk
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Alerts */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Recent Alerts
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Alert Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Severity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Triggered
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {dashboard.recentAlerts.map((alert) => (
                <tr key={alert._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {alert.userId.profile.firstName} {alert.userId.profile.lastName}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {alert.userId.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {formatAlertType(alert.alertType)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getSeverityIcon(alert.severity)}
                      <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getSeverityColor(alert.severity)}`}>
                        {alert.severity}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(alert.status)}
                      <span className="ml-2 text-sm text-gray-900 dark:text-white capitalize">
                        {alert.status.replace('_', ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(alert.triggeredAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => {
                        setSelectedAlert(alert)
                        setShowAlertModal(true)
                      }}
                      className="text-primary-600 hover:text-primary-900 dark:text-primary-400"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Alert Detail Modal */}
      {showAlertModal && selectedAlert && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Alert Details
              </h3>
              <button
                onClick={() => setShowAlertModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  User
                </label>
                <p className="text-sm text-gray-900 dark:text-white">
                  {selectedAlert.userId.profile.firstName} {selectedAlert.userId.profile.lastName} ({selectedAlert.userId.email})
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Alert Type
                </label>
                <p className="text-sm text-gray-900 dark:text-white">
                  {formatAlertType(selectedAlert.alertType)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Description
                </label>
                <p className="text-sm text-gray-900 dark:text-white">
                  {selectedAlert.description}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Metadata
                </label>
                <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-x-auto">
                  {JSON.stringify(selectedAlert.metadata, null, 2)}
                </pre>
              </div>

              {selectedAlert.status === 'open' && (
                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => handleAlertAction(selectedAlert._id, 'resolve', {
                      notes: 'Resolved from dashboard',
                      resolution: 'Manual review completed'
                    })}
                    className="btn btn-sm btn-primary"
                  >
                    Resolve
                  </button>
                  <button
                    onClick={() => handleAlertAction(selectedAlert._id, 'false_positive', {
                      notes: 'Marked as false positive'
                    })}
                    className="btn btn-sm btn-secondary"
                  >
                    False Positive
                  </button>
                  <button
                    onClick={() => handleAlertAction(selectedAlert._id, 'escalate', {
                      reason: 'Requires senior review'
                    })}
                    className="btn btn-sm btn-danger"
                  >
                    Escalate
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ComplianceDashboardPage