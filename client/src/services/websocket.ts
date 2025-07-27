import { io, Socket } from 'socket.io-client'
import { store } from '../store'
import { updateBalance, addTransaction } from '../store/slices/walletSlice'

class WebSocketService {
  private socket: Socket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  connect(token: string) {
    if (this.socket?.connected) {
      return
    }

    const wsUrl = (import.meta as any).env?.VITE_WS_URL || 'http://localhost:3000'
    
    this.socket = io(wsUrl, {
      auth: {
        token,
      },
      transports: ['websocket'],
      upgrade: false,
    })

    this.setupEventListeners()
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    this.reconnectAttempts = 0
  }

  private setupEventListeners() {
    if (!this.socket) return

    this.socket.on('connect', () => {
      console.log('WebSocket connected')
      this.reconnectAttempts = 0
      
      // Join user's personal room for wallet updates
      this.socket?.emit('join-wallet-room')
    })

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason)
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, don't reconnect
        return
      }
      
      this.handleReconnect()
    })

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error)
      this.handleReconnect()
    })

    // Wallet-specific events
    this.socket.on('wallet-balance-updated', (data: {
      balance: number
      bonusBalance: number
      lockedBalance: number
    }) => {
      console.log('Wallet balance updated:', data)
      store.dispatch(updateBalance(data))
    })

    this.socket.on('wallet-transaction-created', (transaction: any) => {
      console.log('New transaction:', transaction)
      store.dispatch(addTransaction(transaction))
    })

    // Betting-related events (for future use)
    this.socket.on('bet-placed', (data: any) => {
      console.log('Bet placed:', data)
      // Handle bet placement updates
    })

    this.socket.on('bet-settled', (data: any) => {
      console.log('Bet settled:', data)
      // Handle bet settlement updates
    })

    // Notification events
    this.socket.on('notification', (notification: {
      type: 'info' | 'success' | 'warning' | 'error'
      title: string
      message: string
      data?: any
    }) => {
      console.log('Notification received:', notification)
      // Handle notifications (could dispatch to a notifications slice)
      this.showNotification(notification)
    })
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
    
    setTimeout(() => {
      if (this.socket && !this.socket.connected) {
        this.socket.connect()
      }
    }, delay)
  }

  private showNotification(notification: {
    type: 'info' | 'success' | 'warning' | 'error'
    title: string
    message: string
    data?: any
  }) {
    // Simple browser notification for now
    // In a real app, you'd integrate with a toast/notification system
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
      })
    }
  }

  // Emit events
  emitWalletEvent(event: string, data: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data)
    }
  }

  // Check connection status
  isConnected(): boolean {
    return this.socket?.connected || false
  }

  // Request permission for browser notifications
  static async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false
    }

    if (Notification.permission === 'granted') {
      return true
    }

    if (Notification.permission === 'denied') {
      return false
    }

    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }
}

export const websocketService = new WebSocketService()