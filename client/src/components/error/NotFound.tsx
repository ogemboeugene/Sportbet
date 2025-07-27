import React from 'react'
import { Search, Home, ArrowLeft, FileQuestion } from 'lucide-react'
import { Card, CardContent, Button, Input } from '../ui'

interface NotFoundProps {
  title?: string
  description?: string
  showSearch?: boolean
  onSearch?: (query: string) => void
  suggestions?: Array<{
    label: string
    href: string
    icon?: React.ReactNode
  }>
  customActions?: Array<{
    label: string
    onClick: () => void
    variant?: 'primary' | 'secondary' | 'outline'
    icon?: React.ReactNode
  }>
}

const NotFound: React.FC<NotFoundProps> = ({
  title = 'Page Not Found',
  description = "Sorry, we couldn't find the page you're looking for. It might have been moved, deleted, or you entered the wrong URL.",
  showSearch = true,
  onSearch,
  suggestions = [],
  customActions = []
}) => {
  const [searchQuery, setSearchQuery] = React.useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (onSearch && searchQuery.trim()) {
      onSearch(searchQuery.trim())
    }
  }

  const defaultSuggestions = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: <Home className="h-4 w-4" />
    },
    {
      label: 'Betting',
      href: '/betting',
      icon: <Search className="h-4 w-4" />
    },
    {
      label: 'Wallet',
      href: '/wallet',
      icon: <Search className="h-4 w-4" />
    }
  ]

  const displaySuggestions = suggestions.length > 0 ? suggestions : defaultSuggestions

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <Card className="max-w-2xl w-full">
        <CardContent className="p-12 text-center">
          <div className="mb-8">
            <div className="relative">
              <div className="text-9xl font-bold text-gray-200 dark:text-gray-800 select-none">
                404
              </div>
              <FileQuestion className="h-16 w-16 text-gray-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              {title}
            </h1>
            
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
              {description}
            </p>
          </div>

          {showSearch && (
            <div className="mb-8">
              <form onSubmit={handleSearch} className="max-w-md mx-auto">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Search for pages, features..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    leftIcon={<Search className="h-4 w-4" />}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={!searchQuery.trim()}>
                    Search
                  </Button>
                </div>
              </form>
            </div>
          )}

          <div className="mb-8">
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => window.history.back()}
                leftIcon={<ArrowLeft className="h-4 w-4" />}
                variant="outline"
              >
                Go Back
              </Button>
              
              <Button
                onClick={() => window.location.href = '/'}
                leftIcon={<Home className="h-4 w-4" />}
              >
                Go Home
              </Button>

              {customActions.map((action, index) => (
                <Button
                  key={index}
                  onClick={action.onClick}
                  variant={action.variant || 'secondary'}
                  leftIcon={action.icon}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </div>

          {displaySuggestions.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Popular Pages
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {displaySuggestions.map((suggestion, index) => (
                  <a
                    key={index}
                    href={suggestion.href}
                    className="flex items-center space-x-2 p-3 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    {suggestion.icon}
                    <span>{suggestion.label}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500">
              Still having trouble? {' '}
              <a
                href="/support"
                className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
              >
                Contact Support
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default NotFound