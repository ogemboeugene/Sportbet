import React, { useState, useEffect } from 'react';
import { dashboardApi, DashboardData } from '../services/dashboardApi';
import { 
  Wallet, 
  TrendingUp, 
  History, 
  Award, 
  User,
  Heart,
  Star,
  Clock,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardSkeleton from '../components/skeletons/DashboardSkeleton';
import StatCard from '../components/charts/StatCard';
import LineChart from '../components/charts/LineChart';
import PieChart from '../components/charts/PieChart';

const EnhancedDashboardPage: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (dashboardData) {
      fetchAnalytics();
    }
  }, [selectedPeriod, dashboardData]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await dashboardApi.getDashboard();
      setDashboardData(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const response = await dashboardApi.getBettingAnalytics(selectedPeriod);
      setAnalyticsData(response.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 dark:text-gray-400">Failed to load dashboard data</p>
      </div>
    );
  }

  const stats = [
    {
      title: 'Account Balance',
      value: `${dashboardData?.wallet?.currency || 'USD'} ${dashboardData?.wallet?.balance?.toFixed(2) || '0.00'}`,
      icon: <Wallet className="h-5 w-5" />,
      color: 'green' as const,
      change: {
        value: 2.5,
        type: 'increase' as const,
        period: 'vs last month'
      }
    },
    {
      title: 'Active Bets',
      value: dashboardData?.activeBets?.toString() || '0',
      icon: <TrendingUp className="h-5 w-5" />,
      color: 'blue' as const,
      change: dashboardData?.betting?.overall?.pendingBets > 0 ? {
        value: dashboardData?.betting?.overall?.pendingBets || 0,
        type: 'neutral' as const,
        period: 'pending'
      } : undefined
    },
    {
      title: 'Total Bets',
      value: dashboardData?.betting?.overall?.totalBets?.toString() || '0',
      icon: <History className="h-5 w-5" />,
      color: 'purple' as const,
      change: {
        value: dashboardData?.betting?.monthly?.totalBets || 0,
        type: 'neutral' as const,
        period: `this ${selectedPeriod}`
      }
    },
    {
      title: 'Win Rate',
      value: dashboardData?.betting?.overall?.totalBets > 0 
        ? `${(((dashboardData?.betting?.overall?.wonBets || 0) / ((dashboardData?.betting?.overall?.wonBets || 0) + (dashboardData?.betting?.overall?.lostBets || 0))) * 100).toFixed(1)}%`
        : '0%',
      icon: <Award className="h-5 w-5" />,
      color: 'yellow' as const,
      change: {
        value: dashboardData?.betting?.overall?.profitLoss || 0,
        type: (dashboardData?.betting?.overall?.profitLoss || 0) > 0 ? 'increase' as const : 'decrease' as const,
        period: 'this period'
      }
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome back, {dashboardData?.user?.profile?.firstName || 'User'}!
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Here's an overview of your betting activity and account status.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${
              dashboardData?.user?.kycStatus === 'verified' ? 'bg-green-500' :
              dashboardData?.user?.kycStatus === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
            }`}></div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              KYC {dashboardData?.user?.kycStatus || 'unverified'}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatCard
            key={index}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            color={stat.color}
            change={stat.change}
          />
        ))}
      </div>

      {/* Period Selector for Analytics */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Performance Analytics
          </h2>
          <div className="flex space-x-2">
            {(['week', 'month', 'year'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-3 py-1 rounded-md text-sm capitalize ${
                  selectedPeriod === period
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>

        {analyticsLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : analyticsData ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Profit/Loss Chart */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Profit/Loss Trend
              </h3>
              <LineChart
                data={analyticsData.chartData?.map((item: any) => ({
                  x: item.date,
                  y: item.profit,
                  label: item.date
                })) || []}
                title="Profit/Loss Trend"
                height={200}
                xAxisLabel="Date"
                yAxisLabel="Profit/Loss"
                color="#10B981"
              />
            </div>

            {/* Sports Breakdown */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Sports Distribution
              </h3>
              <PieChart
                data={analyticsData.sportBreakdown?.slice(0, 5).map((item: any) => ({
                  label: item.sport,
                  value: item.bets,
                  color: undefined // Will use default colors
                })) || []}
                title="Sports Distribution"
                size={200}
                showLegend={true}
              />
            </div>
          </div>
        ) : null}
      </div>

      {/* Quick Actions and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Star className="h-5 w-5 mr-2 text-yellow-500" />
            Quick Actions
          </h2>
          <div className="space-y-3">
            <button className="w-full btn btn-primary text-left flex items-center justify-between">
              <span>Place New Bet</span>
              <TrendingUp className="h-4 w-4" />
            </button>
            <button className="w-full btn btn-secondary text-left flex items-center justify-between">
              <span>Deposit Funds</span>
              <Wallet className="h-4 w-4" />
            </button>
            <button className="w-full btn btn-secondary text-left flex items-center justify-between">
              <span>View Bet History</span>
              <History className="h-4 w-4" />
            </button>
            <button className="w-full btn btn-secondary text-left flex items-center justify-between">
              <span>Manage Favorites</span>
              <Heart className="h-4 w-4" />
            </button>
            <button className="w-full btn btn-secondary text-left flex items-center justify-between">
              <span>Account Settings</span>
              <User className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Clock className="h-5 w-5 mr-2 text-gray-500" />
            Recent Activity
          </h2>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {dashboardData?.recentActivity?.length > 0 ? (
              dashboardData.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      activity.type === 'bet' ? 'bg-blue-500' : 'bg-green-500'
                    }`}></div>
                    <div>
                      <p className="text-sm text-gray-900 dark:text-white">{activity.action}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(activity.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm font-medium ${
                      activity.type === 'bet' && activity.status === 'won' ? 'text-green-600' :
                      activity.type === 'bet' && activity.status === 'lost' ? 'text-red-600' :
                      'text-gray-600 dark:text-gray-400'
                    }`}>
                      ${activity.amount.toFixed(2)}
                    </span>
                    {activity.type === 'bet' && activity.status === 'won' && (
                      <ArrowUpRight className="h-3 w-3 text-green-600" />
                    )}
                    {activity.type === 'bet' && activity.status === 'lost' && (
                      <ArrowDownRight className="h-3 w-3 text-red-600" />
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                No recent activity
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Account Status */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Account Status
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <span className="text-sm text-gray-600 dark:text-gray-400">Email Verification</span>
            <span className={`px-2 py-1 text-xs rounded-full ${
              dashboardData?.user?.emailVerified 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
            }`}>
              {dashboardData?.user?.emailVerified ? 'Verified' : 'Pending'}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <span className="text-sm text-gray-600 dark:text-gray-400">KYC Status</span>
            <span className={`px-2 py-1 text-xs rounded-full ${
              dashboardData?.user?.kycStatus === 'verified'
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                : dashboardData?.user?.kycStatus === 'pending'
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
            }`}>
              {dashboardData?.user?.kycStatus === 'verified' ? 'Verified' : 
               dashboardData?.user?.kycStatus === 'pending' ? 'Pending' : 'Required'}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <span className="text-sm text-gray-600 dark:text-gray-400">Two-Factor Auth</span>
            <span className={`px-2 py-1 text-xs rounded-full ${
              dashboardData?.user?.twoFactorEnabled
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
            }`}>
              {dashboardData?.user?.twoFactorEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedDashboardPage;
