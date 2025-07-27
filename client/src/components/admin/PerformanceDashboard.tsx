import React, { useState, useEffect } from 'react';
import { usePerformanceMonitoring } from '../../hooks/usePerformanceMonitoring';

interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  timestamp: string;
  services: {
    database: 'up' | 'down';
    redis: 'up' | 'down';
    external_apis: 'up' | 'down';
  };
  metrics: {
    cpu_usage: number;
    memory_usage: number;
    response_time: number;
    error_rate: number;
  };
}

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  resolved: boolean;
}

const PerformanceDashboard: React.FC = () => {
  const { metrics, webVitals, isOnline, getPerformanceInsights } = usePerformanceMonitoring();
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [performanceHistory, setPerformanceHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch system health data
  const fetchSystemHealth = async () => {
    try {
      const response = await fetch('/api/monitoring/health/detailed');
      const data = await response.json();
      setSystemHealth(data.details.system);
    } catch (error) {
      console.error('Failed to fetch system health:', error);
    }
  };

  // Fetch alerts
  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/monitoring/alerts');
      const data = await response.json();
      setAlerts(data);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    }
  };

  // Fetch performance history
  const fetchPerformanceHistory = async () => {
    try {
      const response = await fetch('/api/monitoring/performance/history');
      const data = await response.json();
      setPerformanceHistory(data.slice(-20)); // Last 20 data points
    } catch (error) {
      console.error('Failed to fetch performance history:', error);
    }
  };

  // Refresh data
  const refreshData = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchSystemHealth(),
      fetchAlerts(),
      fetchPerformanceHistory(),
    ]);
    setRefreshing(false);
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await refreshData();
      setLoading(false);
    };

    loadData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'critical': return 'border-red-500 bg-red-50';
      case 'warning': return 'border-yellow-500 bg-yellow-50';
      case 'info': return 'border-blue-500 bg-blue-50';
      default: return 'border-gray-500 bg-gray-50';
    }
  };

  const insights = getPerformanceInsights();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Performance Dashboard</h1>
        <div className="flex items-center space-x-4">
          <div className={`flex items-center px-3 py-1 rounded-full ${isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${isOnline ? 'bg-green-600' : 'bg-red-600'}`}></div>
            {isOnline ? 'Online' : 'Offline'}
          </div>
          <button
            onClick={refreshData}
            disabled={refreshing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* System Health Overview */}
      {systemHealth && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className={`p-4 rounded-lg ${getStatusColor(systemHealth.status)}`}>
            <h3 className="font-semibold">System Status</h3>
            <p className="text-2xl font-bold">{systemHealth.status}</p>
          </div>
          
          <div className="p-4 bg-white rounded-lg shadow">
            <h3 className="font-semibold text-gray-700">CPU Usage</h3>
            <p className="text-2xl font-bold text-blue-600">{systemHealth.metrics.cpu_usage}%</p>
          </div>
          
          <div className="p-4 bg-white rounded-lg shadow">
            <h3 className="font-semibold text-gray-700">Memory Usage</h3>
            <p className="text-2xl font-bold text-purple-600">{systemHealth.metrics.memory_usage}%</p>
          </div>
          
          <div className="p-4 bg-white rounded-lg shadow">
            <h3 className="font-semibold text-gray-700">Response Time</h3>
            <p className="text-2xl font-bold text-orange-600">{systemHealth.metrics.response_time}ms</p>
          </div>
        </div>
      )}

      {/* Web Vitals */}
      {metrics && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Web Vitals</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">First Contentful Paint</p>
              <p className={`text-2xl font-bold ${webVitals.fcp && webVitals.fcp > 1800 ? 'text-red-600' : 'text-green-600'}`}>
                {webVitals.fcp ? `${webVitals.fcp.toFixed(0)}ms` : 'N/A'}
              </p>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-600">Largest Contentful Paint</p>
              <p className={`text-2xl font-bold ${webVitals.lcp && webVitals.lcp > 2500 ? 'text-red-600' : 'text-green-600'}`}>
                {webVitals.lcp ? `${webVitals.lcp.toFixed(0)}ms` : 'N/A'}
              </p>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-600">First Input Delay</p>
              <p className={`text-2xl font-bold ${webVitals.fid && webVitals.fid > 100 ? 'text-red-600' : 'text-green-600'}`}>
                {webVitals.fid ? `${webVitals.fid.toFixed(0)}ms` : 'N/A'}
              </p>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-600">Cumulative Layout Shift</p>
              <p className={`text-2xl font-bold ${webVitals.cls && webVitals.cls > 0.1 ? 'text-red-600' : 'text-green-600'}`}>
                {webVitals.cls ? webVitals.cls.toFixed(3) : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Performance Score */}
      {insights && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Performance Score</h2>
          <div className="flex items-center space-x-6">
            <div className="text-center">
              <div className={`text-6xl font-bold ${
                insights.score >= 90 ? 'text-green-600' :
                insights.score >= 80 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {insights.score}
              </div>
              <p className="text-lg font-semibold">Grade: {insights.grade}</p>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-2">Recommendations:</h3>
              <ul className="space-y-1">
                {insights.insights.map((insight, index) => (
                  <li key={index} className="text-sm text-gray-700 flex items-start">
                    <span className="text-yellow-500 mr-2">⚠</span>
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Performance History Chart */}
      {performanceHistory.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Performance Trends</h2>
          <div className="h-64 flex items-end justify-between space-x-2">
            {performanceHistory.slice(-10).map((data, index) => (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div className="w-full bg-gray-200 rounded mb-1" style={{ height: '200px' }}>
                  <div 
                    className="bg-blue-500 rounded w-full" 
                    style={{ 
                      height: `${Math.min(200, (data.response_time / 1000) * 200)}px`,
                      marginTop: `${200 - Math.min(200, (data.response_time / 1000) * 200)}px`
                    }}
                  ></div>
                </div>
                <span className="text-xs text-gray-600">{data.response_time}ms</span>
              </div>
            ))}
          </div>
          <div className="mt-4 text-sm text-gray-600">
            Last 10 response time measurements (max scale: 1000ms)
          </div>
        </div>
      )}

      {/* Alerts */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Alerts</h2>
        {alerts.length === 0 ? (
          <p className="text-gray-500">No alerts</p>
        ) : (
          <div className="space-y-3">
            {alerts.slice(0, 5).map((alert) => (
              <div key={alert.id} className={`p-3 border-l-4 rounded ${getAlertColor(alert.type)}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{alert.title}</h3>
                    <p className="text-sm text-gray-600">{alert.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{new Date(alert.timestamp).toLocaleString()}</p>
                  </div>
                  {!alert.resolved && (
                    <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">Unresolved</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Services Status */}
      {systemHealth && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Services Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(systemHealth.services).map(([service, status]) => (
              <div key={service} className="flex items-center justify-between p-3 border rounded">
                <span className="font-medium capitalize">{service.replace('_', ' ')}</span>
                <span className={`px-2 py-1 text-xs rounded ${
                  status === 'up' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceDashboard;
