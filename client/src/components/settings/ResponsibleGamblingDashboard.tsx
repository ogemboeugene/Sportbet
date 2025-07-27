import React, { useState, useEffect } from 'react';
import { sessionApi, GamblingPatternAnalysis, SessionHistory } from '../../services/sessionApi';

const ResponsibleGamblingDashboard: React.FC = () => {
  const [analysis, setAnalysis] = useState<GamblingPatternAnalysis | null>(null);
  const [sessionHistory, setSessionHistory] = useState<SessionHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [analysisData, historyData] = await Promise.all([
        sessionApi.getGamblingPatternAnalysis(),
        sessionApi.getSessionHistory(30)
      ]);
      
      setAnalysis(analysisData);
      setSessionHistory(historyData);
      setError(null);
    } catch (err) {
      console.error('Failed to load responsible gambling data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getRiskLevelIcon = (level: string) => {
    switch (level) {
      case 'high':
        return (
          <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'medium':
        return (
          <svg className="h-5 w-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'low':
        return (
          <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatHours = (minutes: number) => {
    return `${(minutes / 60).toFixed(1)}h`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={loadData}
                className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Responsible Gambling Dashboard</h2>
        
        {/* Risk Assessment */}
        {analysis && (
          <div className={`border rounded-lg p-6 mb-6 ${getRiskLevelColor(analysis.riskLevel)}`}>
            <div className="flex items-center mb-4">
              {getRiskLevelIcon(analysis.riskLevel)}
              <div className="ml-3">
                <h3 className="text-lg font-medium capitalize">
                  {analysis.riskLevel} Risk Level
                </h3>
                <p className="text-sm opacity-75">
                  Risk Score: {analysis.riskScore}/100
                </p>
              </div>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div 
                className={`h-2 rounded-full ${
                  analysis.riskLevel === 'high' ? 'bg-red-500' :
                  analysis.riskLevel === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(analysis.riskScore, 100)}%` }}
              ></div>
            </div>

            {analysis.indicators.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium mb-2">Risk Indicators:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {analysis.indicators.map((indicator, index) => (
                    <li key={index}>{indicator}</li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <h4 className="font-medium mb-2">Recommendations:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {analysis.recommendations.map((recommendation, index) => (
                  <li key={index}>{recommendation}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Session Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {sessionHistory && (
            <>
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-blue-600">Total Sessions</p>
                    <p className="text-2xl font-bold text-blue-900">{sessionHistory.totalSessions}</p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-green-600">Total Time</p>
                    <p className="text-2xl font-bold text-green-900">{formatHours(sessionHistory.totalTime)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-8 w-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-yellow-600">Average Session</p>
                    <p className="text-2xl font-bold text-yellow-900">{formatTime(sessionHistory.averageSessionTime)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-8 w-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-purple-600">Longest Session</p>
                    <p className="text-2xl font-bold text-purple-900">{formatTime(sessionHistory.longestSession)}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Session Patterns */}
        {analysis && (
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Session Patterns</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{analysis.sessionPatterns.sessionsPerDay}</p>
                <p className="text-sm text-gray-600">Sessions per day</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{analysis.sessionPatterns.lateNightSessions}</p>
                <p className="text-sm text-gray-600">Late night sessions</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{analysis.sessionPatterns.weekendSessions}</p>
                <p className="text-sm text-gray-600">Weekend sessions</p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => window.location.href = '/settings/limits'}
            className="bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            <div className="flex items-center justify-center">
              <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Set Limits
            </div>
          </button>

          <button
            onClick={() => window.location.href = '/settings/self-exclusion'}
            className="bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
          >
            <div className="flex items-center justify-center">
              <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              Self-Exclusion
            </div>
          </button>

          <button
            onClick={loadData}
            className="bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
          >
            <div className="flex items-center justify-center">
              <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Data
            </div>
          </button>
        </div>
      </div>

      {/* Help Resources */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Need Help?</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">National Problem Gambling Helpline</h4>
            <p className="text-sm text-gray-600 mb-3">24/7 confidential support for problem gambling</p>
            <div className="space-y-2">
              <div className="text-sm text-gray-600">
                <strong>Phone:</strong> 1-800-522-4700
              </div>
              <a
                href="https://www.ncpgambling.org"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm"
              >
                Visit Website
                <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Gamblers Anonymous</h4>
            <p className="text-sm text-gray-600 mb-3">Fellowship of men and women who share their experience</p>
            <a
              href="https://www.gamblersanonymous.org"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm"
            >
              Visit Website
              <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Responsible Gambling Tips</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Set time and money limits before you start</li>
            <li>• Never gamble when upset, angry, or depressed</li>
            <li>• Take regular breaks during gambling sessions</li>
            <li>• Don't chase losses with bigger bets</li>
            <li>• Never gamble more than you can afford to lose</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ResponsibleGamblingDashboard;