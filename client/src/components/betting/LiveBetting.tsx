import React, { useState, useEffect } from 'react'
import { Play, Pause, Clock, Users, Target, TrendingUp } from 'lucide-react'
import { Button, Card, CardHeader, CardContent, Badge } from '../ui'
import { Event, BetSelection } from '../../types'

interface LiveBettingProps {
  events: Event[]
  onPlaceBet: (selection: BetSelection) => void
  onAddToSlip: (selection: BetSelection) => void
}

interface LiveEvent extends Event {
  liveData: {
    minute: number
    period: string
    score: {
      home: number
      away: number
    }
    stats: {
      possession: {
        home: number
        away: number
      }
      shots: {
        home: number
        away: number
      }
      corners: {
        home: number
        away: number
      }
    }
    incidents: LiveIncident[]
  }
}

interface LiveIncident {
  id: string
  type: 'goal' | 'yellow_card' | 'red_card' | 'substitution' | 'corner' | 'penalty'
  minute: number
  team: 'home' | 'away'
  player?: string
  description: string
}

const LiveBetting: React.FC<LiveBettingProps> = ({
  events,
  onPlaceBet,
  onAddToSlip
}) => {
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([])
  const [selectedEvent, setSelectedEvent] = useState<LiveEvent | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Helper function to use onPlaceBet for quick betting
  const handleQuickBet = (selection: BetSelection) => {
    onPlaceBet(selection);
  };

  // Simulate live data updates
  useEffect(() => {
    const simulateLiveData = (event: Event): LiveEvent => {
      const minute = Math.floor(Math.random() * 90) + 1
      const homeScore = Math.floor(Math.random() * 4)
      const awayScore = Math.floor(Math.random() * 4)
      
      return {
        ...event,
        liveData: {
          minute,
          period: minute > 45 ? '2nd Half' : '1st Half',
          score: {
            home: homeScore,
            away: awayScore
          },
          stats: {
            possession: {
              home: 45 + Math.random() * 10,
              away: 45 + Math.random() * 10
            },
            shots: {
              home: Math.floor(Math.random() * 15),
              away: Math.floor(Math.random() * 15)
            },
            corners: {
              home: Math.floor(Math.random() * 8),
              away: Math.floor(Math.random() * 8)
            }
          },
          incidents: [
            {
              id: '1',
              type: 'goal',
              minute: 23,
              team: 'home',
              player: 'Player A',
              description: 'Goal scored'
            },
            {
              id: '2',
              type: 'yellow_card',
              minute: 34,
              team: 'away',
              player: 'Player B',
              description: 'Yellow card for foul'
            }
          ]
        }
      }
    }

    const liveEventsData = events
      .filter(event => event.status === 'live')
      .map(simulateLiveData)

    setLiveEvents(liveEventsData)
    
    if (liveEventsData.length > 0 && !selectedEvent) {
      setSelectedEvent(liveEventsData[0])
    }
  }, [events, selectedEvent])

  // Auto-refresh live data
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      setLiveEvents(prev => prev.map(event => ({
        ...event,
        liveData: {
          ...event.liveData,
          minute: Math.min(event.liveData.minute + 1, 90),
          stats: {
            possession: {
              home: 45 + Math.random() * 10,
              away: 45 + Math.random() * 10
            },
            shots: {
              home: event.liveData.stats.shots.home + (Math.random() > 0.9 ? 1 : 0),
              away: event.liveData.stats.shots.away + (Math.random() > 0.9 ? 1 : 0)
            },
            corners: {
              home: event.liveData.stats.corners.home + (Math.random() > 0.95 ? 1 : 0),
              away: event.liveData.stats.corners.away + (Math.random() > 0.95 ? 1 : 0)
            }
          }
        }
      })))
    }, 5000)

    return () => clearInterval(interval)
  }, [autoRefresh])

  const getIncidentIcon = (type: LiveIncident['type']) => {
    switch (type) {
      case 'goal':
        return <Target className="h-4 w-4 text-green-500" />
      case 'yellow_card':
        return <div className="w-3 h-4 bg-yellow-500 rounded-sm" />
      case 'red_card':
        return <div className="w-3 h-4 bg-red-500 rounded-sm" />
      default:
        return <div className="w-3 h-3 bg-gray-400 rounded-full" />
    }
  }

  const createBetSelection = (event: LiveEvent, marketId: string, selectionId: string, odds: number, marketName: string, selectionName: string): BetSelection => ({
    eventId: event.eventId,
    marketId,
    selectionId,
    odds,
    eventName: `${event.homeTeam} vs ${event.awayTeam}`,
    marketName,
    selectionName,
    startTime: event.startTime,
    status: 'pending'
  })

  if (liveEvents.length === 0) {
    return (
      <Card>
        <CardContent>
          <div className="text-center py-8">
            <Play className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              No live events available at the moment
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Live Events List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2" />
              Live Events
              <div className="flex items-center ml-4 text-sm text-gray-600">
                <Users className="h-4 w-4 mr-1" />
                {liveEvents.length * 137} betting
              </div>
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {autoRefresh ? 'Pause' : 'Resume'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {liveEvents.map((event) => (
              <div
                key={event.eventId}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedEvent?.eventId === event.eventId
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setSelectedEvent(event)}
              >
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="danger" size="sm">
                    <div className="w-1 h-1 bg-white rounded-full animate-pulse mr-1" />
                    LIVE
                  </Badge>
                  <div className="flex items-center text-xs text-gray-500">
                    <Clock className="h-3 w-3 mr-1" />
                    {event.liveData.minute}'
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium truncate">{event.homeTeam}</span>
                    <span className="text-lg font-bold">{event.liveData.score.home}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate">{event.awayTeam}</span>
                    <span className="text-lg font-bold">{event.liveData.score.away}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Selected Event Details */}
      {selectedEvent && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Match Info & Stats */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">
                    {selectedEvent.homeTeam} vs {selectedEvent.awayTeam}
                  </h4>
                  <div className="flex items-center space-x-2">
                    <Badge variant="info">{selectedEvent.liveData.period}</Badge>
                    <Badge variant="danger">
                      {selectedEvent.liveData.minute}' LIVE
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center mb-6">
                  <div>
                    <div className="text-2xl font-bold">{selectedEvent.liveData.score.home}</div>
                    <div className="text-sm text-gray-600">{selectedEvent.homeTeam}</div>
                  </div>
                  <div className="flex items-center justify-center">
                    <div className="text-gray-400">VS</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{selectedEvent.liveData.score.away}</div>
                    <div className="text-sm text-gray-600">{selectedEvent.awayTeam}</div>
                  </div>
                </div>

                {/* Match Stats */}
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Possession</span>
                      <span>{selectedEvent.liveData.stats.possession.home.toFixed(0)}% - {selectedEvent.liveData.stats.possession.away.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${selectedEvent.liveData.stats.possession.home}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-center text-sm">
                    <div>{selectedEvent.liveData.stats.shots.home}</div>
                    <div className="text-gray-600">Shots</div>
                    <div>{selectedEvent.liveData.stats.shots.away}</div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-center text-sm">
                    <div>{selectedEvent.liveData.stats.corners.home}</div>
                    <div className="text-gray-600">Corners</div>
                    <div>{selectedEvent.liveData.stats.corners.away}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Incidents */}
            <Card>
              <CardHeader>
                <h4 className="font-semibold">Match Events</h4>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {selectedEvent.liveData.incidents.map((incident) => (
                    <div key={incident.id} className="flex items-center space-x-3 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                      <div className="text-xs font-mono w-8">{incident.minute}'</div>
                      {getIncidentIcon(incident.type)}
                      <div className="flex-1 text-sm">
                        <span className="font-medium">{incident.player}</span>
                        <span className="text-gray-600 ml-2">{incident.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Live Betting Markets */}
          <div>
            <Card>
              <CardHeader>
                <h4 className="font-semibold flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Live Markets
                </h4>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Next Goal Market */}
                  <div>
                    <h5 className="text-sm font-medium mb-2">Next Goal</h5>
                    <div className="space-y-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-between"
                        onClick={() => onAddToSlip(createBetSelection(
                          selectedEvent,
                          'next_goal',
                          'home',
                          2.1,
                          'Next Goal',
                          selectedEvent.homeTeam
                        ))}
                      >
                        <span>{selectedEvent.homeTeam}</span>
                        <span className="font-bold">2.10</span>
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        className="w-full justify-between bg-green-600 hover:bg-green-700"
                        onClick={() => handleQuickBet(createBetSelection(
                          selectedEvent,
                          'next_goal',
                          'home',
                          2.1,
                          'Next Goal',
                          selectedEvent.homeTeam
                        ))}
                      >
                        <span>Quick Bet ${5}</span>
                        <span className="font-bold">2.10</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-between"
                        onClick={() => onAddToSlip(createBetSelection(
                          selectedEvent,
                          'next_goal',
                          'away',
                          3.2,
                          'Next Goal',
                          selectedEvent.awayTeam
                        ))}
                      >
                        <span>{selectedEvent.awayTeam}</span>
                        <span className="font-bold">3.20</span>
                      </Button>
                    </div>
                  </div>

                  {/* Total Goals */}
                  <div>
                    <h5 className="text-sm font-medium mb-2">Total Goals</h5>
                    <div className="space-y-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-between"
                        onClick={() => onAddToSlip(createBetSelection(
                          selectedEvent,
                          'total_goals',
                          'over_2_5',
                          1.8,
                          'Total Goals',
                          'Over 2.5'
                        ))}
                      >
                        <span>Over 2.5</span>
                        <span className="font-bold">1.80</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-between"
                        onClick={() => onAddToSlip(createBetSelection(
                          selectedEvent,
                          'total_goals',
                          'under_2_5',
                          2.0,
                          'Total Goals',
                          'Under 2.5'
                        ))}
                      >
                        <span>Under 2.5</span>
                        <span className="font-bold">2.00</span>
                      </Button>
                    </div>
                  </div>

                  {/* Both Teams to Score */}
                  <div>
                    <h5 className="text-sm font-medium mb-2">Both Teams to Score</h5>
                    <div className="space-y-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-between"
                        onClick={() => onAddToSlip(createBetSelection(
                          selectedEvent,
                          'btts',
                          'yes',
                          1.7,
                          'Both Teams to Score',
                          'Yes'
                        ))}
                      >
                        <span>Yes</span>
                        <span className="font-bold">1.70</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-between"
                        onClick={() => onAddToSlip(createBetSelection(
                          selectedEvent,
                          'btts',
                          'no',
                          2.1,
                          'Both Teams to Score',
                          'No'
                        ))}
                      >
                        <span>No</span>
                        <span className="font-bold">2.10</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

export default LiveBetting