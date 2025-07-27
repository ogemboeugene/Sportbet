import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { Injectable, Logger } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'

interface AuthenticatedSocket extends Socket {
  userId?: string
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/',
})
export class WalletGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  private readonly logger = new Logger(WalletGateway.name)
  private connectedUsers = new Map<string, string>() // userId -> socketId

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = client.handshake.auth.token
      if (!token) {
        client.disconnect()
        return
      }

      const payload = this.jwtService.verify(token)
      client.userId = payload.sub

      this.connectedUsers.set(payload.sub, client.id)
      this.logger.log(`User ${payload.sub} connected with socket ${client.id}`)

      // Send connection confirmation
      client.emit('connected', { userId: payload.sub })
    } catch (error) {
      this.logger.error('Authentication failed for socket connection', error)
      client.disconnect()
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.connectedUsers.delete(client.userId)
      this.logger.log(`User ${client.userId} disconnected`)
    }
  }

  @SubscribeMessage('join-wallet-room')
  handleJoinWalletRoom(@ConnectedSocket() client: AuthenticatedSocket) {
    if (client.userId) {
      const roomName = `wallet-${client.userId}`
      client.join(roomName)
      this.logger.log(`User ${client.userId} joined wallet room: ${roomName}`)
      client.emit('joined-wallet-room', { room: roomName })
    }
  }

  @SubscribeMessage('leave-wallet-room')
  handleLeaveWalletRoom(@ConnectedSocket() client: AuthenticatedSocket) {
    if (client.userId) {
      const roomName = `wallet-${client.userId}`
      client.leave(roomName)
      this.logger.log(`User ${client.userId} left wallet room: ${roomName}`)
    }
  }

  // Emit wallet balance update to specific user
  emitBalanceUpdate(userId: string, balanceData: {
    balance: number
    bonusBalance: number
    lockedBalance: number
  }) {
    const roomName = `wallet-${userId}`
    this.server.to(roomName).emit('wallet-balance-updated', balanceData)
    this.logger.log(`Emitted balance update to user ${userId}`)
  }

  // Emit new transaction to specific user
  emitTransactionCreated(userId: string, transaction: any) {
    const roomName = `wallet-${userId}`
    this.server.to(roomName).emit('wallet-transaction-created', transaction)
    this.logger.log(`Emitted new transaction to user ${userId}`)
  }

  // Emit notification to specific user
  emitNotification(userId: string, notification: {
    type: 'info' | 'success' | 'warning' | 'error'
    title: string
    message: string
    data?: any
  }) {
    const roomName = `wallet-${userId}`
    this.server.to(roomName).emit('notification', notification)
    this.logger.log(`Emitted notification to user ${userId}: ${notification.title}`)
  }

  // Emit bet-related events (for future use)
  emitBetPlaced(userId: string, betData: any) {
    const roomName = `wallet-${userId}`
    this.server.to(roomName).emit('bet-placed', betData)
  }

  emitBetSettled(userId: string, betData: any) {
    const roomName = `wallet-${userId}`
    this.server.to(roomName).emit('bet-settled', betData)
  }

  // Broadcast to all connected users (admin notifications, etc.)
  broadcastNotification(notification: {
    type: 'info' | 'success' | 'warning' | 'error'
    title: string
    message: string
    data?: any
  }) {
    this.server.emit('notification', notification)
    this.logger.log(`Broadcasted notification: ${notification.title}`)
  }

  // Get connected users count
  getConnectedUsersCount(): number {
    return this.connectedUsers.size
  }

  // Check if user is connected
  isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId)
  }

  // Get all connected user IDs
  getConnectedUserIds(): string[] {
    return Array.from(this.connectedUsers.keys())
  }
}