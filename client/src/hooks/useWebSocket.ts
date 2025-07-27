import { useEffect } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../store'
import { websocketService } from '../services/websocket'

export const useWebSocket = () => {
  const { token, isAuthenticated } = useSelector((state: RootState) => state.auth)

  useEffect(() => {
    if (isAuthenticated && token) {
      // Connect to WebSocket
      websocketService.connect(token)

      return () => {
        // Disconnect when component unmounts or user logs out
        websocketService.disconnect()
      }
    } else {
      // Disconnect if not authenticated
      websocketService.disconnect()
    }
  }, [isAuthenticated, token])

  return {
    isConnected: websocketService.isConnected(),
    emitEvent: websocketService.emitWalletEvent.bind(websocketService),
  }
}