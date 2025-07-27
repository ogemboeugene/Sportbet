import React, { useState, useEffect } from 'react';
import { responsibleGamblingApi, ResponsibleGamblingLimits as ResponsibleGamblingLimitsType, LimitUsage, UpdateLimitsRequest } from '../../services/responsibleGamblingApi';

interface RiskMessages {
  level: 'low' | 'medium' | 'high';
  messages: string[];
  riskScore: number;
}

const ResponsibleGamblingLimits: React.FC = () => {
  const [limits, setLimits] = useState<ResponsibleGamblingLimitsType | null>(null);
  const [usage, setUsage] = useState<LimitUsage | null>(null);
  const [riskMessages, setRiskMessages] = useState<RiskMessages | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingLimits, setEditingLimits] = useState<UpdateLimitsRequest>({});
  const [showEditForm, setShowEditForm] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [limitsData, usageData] = await Promise.all([
        responsibleGamblingApi.getLimits(),
        responsibleGamblingApi.getLimitUsage()
      ]);
      setLimits(limitsData);
      setUsage(usageData);
      setRiskMessages({ level: 'low', messages: [], riskScore: 0 });
    } catch (error) {
      console.error('Failed to load responsible gambling data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLimits = async () => {
    if (!limits) return;

    setSaving(true);
    try {
      const updatedLimits = await responsibleGamblingApi.updateLimits(editingLimits);
      setLimits(updatedLimits);
      setShowEditForm(false);
      setEditingLimits({});
      
      // Reload usage data
      const usageData = await responsibleGamblingApi.getLimitUsage();
      setUsage(usageData);
      
    } catch (error) {
      console.error('Failed to update limits:', error);
      alert('Failed to update limits. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600 bg-red-100';
    if (percentage >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const getUsageBarColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 70) return 'text-red-600 bg-red-100';
    if (score >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!limits || !usage) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">Failed to load responsible gambling data.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Risk Assessment */}
      {riskMessages && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Risk Assessment</h2>
          
          <div className="flex items-center mb-4">
            <span className="text-sm font-medium text-gray-700 mr-3">Risk Score:</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskScoreColor(riskMessages.riskScore)}`}>
              {riskMessages.riskScore}/100
            </span>
          </div>

          {riskMessages.messages.length > 0 && (
            <div className="space-y-2">
              {riskMessages.messages.map((message: string, index: number) => (
                <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">{message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Current Limits and Usage */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Responsible Gambling Limits</h2>
          <button
            onClick={() => setShowEditForm(!showEditForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            {showEditForm ? 'Cancel' : 'Edit Limits'}
          </button>
        </div>

        {showEditForm ? (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Deposit Limits */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Deposit Limits</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Daily Deposit</label>
                  <input
                    type="number"
                    value={editingLimits.dailyDeposit ?? limits.dailyDeposit}
                    onChange={(e) => setEditingLimits({...editingLimits, dailyDeposit: Number(e.target.value)})}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weekly Deposit</label>
                  <input
                    type="number"
                    value={editingLimits.weeklyDeposit ?? limits.weeklyDeposit}
                    onChange={(e) => setEditingLimits({...editingLimits, weeklyDeposit: Number(e.target.value)})}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Deposit</label>
                  <input
                    type="number"
                    value={editingLimits.monthlyDeposit ?? limits.monthlyDeposit}
                    onChange={(e) => setEditingLimits({...editingLimits, monthlyDeposit: Number(e.target.value)})}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Betting Limits */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Betting Limits</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Daily Betting</label>
                  <input
                    type="number"
                    value={editingLimits.dailyBetting ?? limits.dailyBetting}
                    onChange={(e) => setEditingLimits({...editingLimits, dailyBetting: Number(e.target.value)})}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weekly Betting</label>
                  <input
                    type="number"
                    value={editingLimits.weeklyBetting ?? limits.weeklyBetting}
                    onChange={(e) => setEditingLimits({...editingLimits, weeklyBetting: Number(e.target.value)})}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Betting</label>
                  <input
                    type="number"
                    value={editingLimits.monthlyBetting ?? limits.monthlyBetting}
                    onChange={(e) => setEditingLimits({...editingLimits, monthlyBetting: Number(e.target.value)})}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Session and Loss Limits */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Session & Loss Limits</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Session Time (minutes)</label>
                  <input
                    type="number"
                    value={editingLimits.sessionTime ?? limits.sessionTime}
                    onChange={(e) => setEditingLimits({...editingLimits, sessionTime: Number(e.target.value)})}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Daily Loss Limit</label>
                  <input
                    type="number"
                    value={editingLimits.dailyLoss ?? limits.dailyLoss}
                    onChange={(e) => setEditingLimits({...editingLimits, dailyLoss: Number(e.target.value)})}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weekly Loss Limit</label>
                  <input
                    type="number"
                    value={editingLimits.weeklyLoss ?? limits.weeklyLoss}
                    onChange={(e) => setEditingLimits({...editingLimits, weeklyLoss: Number(e.target.value)})}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Loss Limit</label>
                  <input
                    type="number"
                    value={editingLimits.monthlyLoss ?? limits.monthlyLoss}
                    onChange={(e) => setEditingLimits({...editingLimits, monthlyLoss: Number(e.target.value)})}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowEditForm(false);
                  setEditingLimits({});
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLimits}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Deposit Usage */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Deposit Usage</h3>
              
              {[
                { key: 'dailyDeposit', label: 'Daily', format: formatCurrency },
                { key: 'weeklyDeposit', label: 'Weekly', format: formatCurrency },
                { key: 'monthlyDeposit', label: 'Monthly', format: formatCurrency }
              ].map(({ key, label, format }) => {
                const usageData = usage[key as keyof LimitUsage];
                return (
                  <div key={key} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">{label}</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getUsageColor(usageData.percentage)}`}>
                        {usageData.percentage.toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div
                        className={`h-2 rounded-full ${getUsageBarColor(usageData.percentage)}`}
                        style={{ width: `${Math.min(100, usageData.percentage)}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-600">
                      {format(usageData.used)} of {format(usageData.limit)}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Betting Usage */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Betting Usage</h3>
              
              {[
                { key: 'dailyBetting', label: 'Daily', format: formatCurrency },
                { key: 'weeklyBetting', label: 'Weekly', format: formatCurrency },
                { key: 'monthlyBetting', label: 'Monthly', format: formatCurrency }
              ].map(({ key, label, format }) => {
                const usageData = usage[key as keyof LimitUsage];
                return (
                  <div key={key} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">{label}</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getUsageColor(usageData.percentage)}`}>
                        {usageData.percentage.toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div
                        className={`h-2 rounded-full ${getUsageBarColor(usageData.percentage)}`}
                        style={{ width: `${Math.min(100, usageData.percentage)}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-600">
                      {format(usageData.used)} of {format(usageData.limit)}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Session and Loss Usage */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Session & Loss Usage</h3>
              
              {[
                { key: 'sessionTime', label: 'Session Time', format: formatTime },
                { key: 'dailyLoss', label: 'Daily Loss', format: formatCurrency },
                { key: 'weeklyLoss', label: 'Weekly Loss', format: formatCurrency },
                { key: 'monthlyLoss', label: 'Monthly Loss', format: formatCurrency }
              ].map(({ key, label, format }) => {
                const usageData = usage[key as keyof LimitUsage];
                return (
                  <div key={key} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">{label}</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getUsageColor(usageData.percentage)}`}>
                        {usageData.percentage.toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div
                        className={`h-2 rounded-full ${getUsageBarColor(usageData.percentage)}`}
                        style={{ width: `${Math.min(100, usageData.percentage)}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-600">
                      {format(usageData.used)} of {format(usageData.limit)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResponsibleGamblingLimits;