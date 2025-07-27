import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  Home, 
  TrendingUp, 
  Wallet, 
  History, 
  Settings, 
  Shield,
  UserCheck,
  X 
} from 'lucide-react'
import { useAppDispatch } from '../../hooks/redux'
import { setSidebarOpen } from '../../store/slices/uiSlice'
import { cn } from '../../utils/cn'

interface SidebarProps {
  isOpen: boolean
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen }) => {
  const dispatch = useAppDispatch()
  const location = useLocation()

  const menuItems = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Sports Betting', href: '/betting', icon: TrendingUp },
    { name: 'Wallet', href: '/wallet', icon: Wallet },
    { name: 'Bet History', href: '/history', icon: History },
    { name: 'Identity Verification', href: '/kyc', icon: UserCheck },
    { name: 'Security', href: '/security', icon: Shield },
    { name: 'Settings', href: '/settings', icon: Settings },
  ]

  const closeSidebar = () => {
    dispatch(setSidebarOpen(false))
  }

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity z-20 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700 lg:hidden">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Menu
          </h2>
          <button
            onClick={closeSidebar}
            className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="mt-8 px-4">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.href

              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    onClick={() => {
                      // Close sidebar on mobile after navigation
                      if (window.innerWidth < 1024) {
                        closeSidebar()
                      }
                    }}
                    className={cn(
                      'flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200',
                      isActive
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    )}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {item.name}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            <p>BetPlatform v1.0</p>
            <p>© 2024 All rights reserved</p>
          </div>
        </div>
      </div>
    </>
  )
}

export default Sidebar