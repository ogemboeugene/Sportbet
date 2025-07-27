import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, Moon, Sun, User, LogOut, Settings } from 'lucide-react'
import { useAppSelector, useAppDispatch } from '../../hooks/redux'
import { toggleSidebar } from '../../store/slices/uiSlice'
import { logout } from '../../store/slices/authSlice'
import { useTheme } from '../../contexts/ThemeContext'

const Header: React.FC = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const { isAuthenticated, user } = useAppSelector((state) => state.auth)

  const handleLogout = () => {
    dispatch(logout())
    navigate('/')
  }

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side */}
          <div className="flex items-center">
            {isAuthenticated && (
              <button
                onClick={() => dispatch(toggleSidebar())}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
              >
                <Menu className="h-6 w-6" />
              </button>
            )}
            
            <Link to="/" className="ml-2 sm:ml-4 flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-primary-600 dark:text-primary-400">
                  <span className="hidden sm:inline">BetPlatform</span>
                  <span className="sm:hidden">Bet</span>
                </h1>
              </div>
            </Link>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 sm:h-5 sm:w-5" />
              ) : (
                <Moon className="h-4 w-4 sm:h-5 sm:w-5" />
              )}
            </button>

            {isAuthenticated ? (
              <div className="flex items-center space-x-2 sm:space-x-4">
                {/* User menu */}
                <div className="relative group">
                  <button className="flex items-center space-x-1 sm:space-x-2 p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500">
                    <User className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="text-sm font-medium hidden sm:inline">
                      {user?.profile?.firstName || 'User'}
                    </span>
                  </button>
                  
                  {/* Dropdown menu */}
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="py-1">
                      <Link
                        to="/dashboard"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <User className="h-4 w-4 mr-2" />
                        Dashboard
                      </Link>
                      <Link
                        to="/settings"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign out
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2 sm:space-x-4">
                <Link
                  to="/login"
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 px-2 sm:px-3 py-2 rounded-md text-sm font-medium"
                >
                  <span className="hidden sm:inline">Sign in</span>
                  <span className="sm:hidden">In</span>
                </Link>
                <Link
                  to="/register"
                  className="btn btn-primary btn-sm text-xs sm:text-sm px-2 sm:px-3"
                >
                  <span className="hidden sm:inline">Sign up</span>
                  <span className="sm:hidden">Up</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header