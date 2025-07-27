import React, { useState } from 'react'
import { TrendingUp, History, User, Star } from 'lucide-react'
import EnhancedDashboardPage from './EnhancedDashboardPage'
import ProfileManagement from '../components/profile/ProfileManagement'
import FavoritesManagement from '../components/favorites/FavoritesManagement'
import AdvancedBetHistory from '../components/betting/AdvancedBetHistory'

const DashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'profile' | 'favorites' | 'history'>('overview')

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'favorites', label: 'Favorites', icon: Star },
    { id: 'history', label: 'Bet History', icon: History }
  ] as const

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <EnhancedDashboardPage />
      case 'profile':
        return <ProfileManagement userId="current" />
      case 'favorites':
        return <FavoritesManagement />
      case 'history':
        return <AdvancedBetHistory />
      default:
        return <EnhancedDashboardPage />
    }
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 flex items-center space-x-2
                    ${activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="transition-all duration-200">
        {renderContent()}
      </div>
    </div>
  )
}

export default DashboardPage