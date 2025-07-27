import React, { createContext, useContext, useEffect } from 'react'
import { useAppSelector, useAppDispatch } from '../hooks/redux'
import { toggleTheme, setTheme } from '../store/slices/uiSlice'
import { ThemeContextType } from '../types'

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: React.ReactNode
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const dispatch = useAppDispatch()
  const theme = useAppSelector((state) => state.ui.theme)

  useEffect(() => {
    // Apply theme to document
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  useEffect(() => {
    // Check system preference on mount
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const savedTheme = localStorage.getItem('theme')
    
    if (!savedTheme) {
      dispatch(setTheme(mediaQuery.matches ? 'dark' : 'light'))
    }

    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('theme')) {
        dispatch(setTheme(e.matches ? 'dark' : 'light'))
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [dispatch])

  const handleToggleTheme = () => {
    dispatch(toggleTheme())
  }

  const value: ThemeContextType = {
    theme,
    toggleTheme: handleToggleTheme,
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}