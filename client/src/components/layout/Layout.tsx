import React from 'react'
import { useAppSelector } from '../../hooks/redux'
import Header from './Header'
import Sidebar from './Sidebar'

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { sidebarOpen } = useAppSelector((state) => state.ui)
  const { isAuthenticated } = useAppSelector((state) => state.auth)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Header />
      
      <div className="flex flex-1">
        {isAuthenticated && (
          <Sidebar isOpen={sidebarOpen} />
        )}
        
        <main className={`flex-1 transition-all duration-300 ease-in-out ${
          isAuthenticated && sidebarOpen ? 'lg:ml-64' : ''
        } w-full overflow-x-hidden`}>
          <div className="p-3 sm:p-4 md:p-6 w-full">
            <div className="max-w-7xl mx-auto w-full">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default Layout