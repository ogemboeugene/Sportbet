import React, { useState, useCallback } from 'react'
import { Plus, Minus, X, Calculator } from 'lucide-react'
import { Button, Card, CardHeader, CardContent, Badge, Input } from '../ui'
import { BetSelection, Event, Market, Selection } from '../../types'

interface BetBuilderProps {
  events: Event[]
  onAddSelection: (selection: BetSelection) => void
  onRemoveSelection: (selectionId: string) => void
  selectedSelections: BetSelection[]
  maxSelections?: number
}

interface BetBuilderSelection extends BetSelection {
  event: Event
  market: Market
  selection: Selection
}

const BetBuilder: React.FC<BetBuilderProps> = ({
  events,
  onAddSelection,
  onRemoveSelection,
  selectedSelections,
  maxSelections = 10
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSport, setSelectedSport] = useState<string>('')
  const [builderSelections, setBuilderSelections] = useState<BetBuilderSelection[]>([])

  const filteredEvents = events.filter(event => {
    const matchesSearch = searchTerm === '' || 
      event.homeTeam.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.awayTeam.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesSport = selectedSport === '' || event.sportKey === selectedSport
    
    return matchesSearch && matchesSport && event.status === 'upcoming'
  })

  const handleAddToBuilder = useCallback((event: Event, market: Market, selection: Selection) => {
    if (builderSelections.length >= maxSelections) return

    const betSelection: BetSelection = {
      eventId: event.eventId,
      marketId: market.marketId,
      selectionId: selection.selectionId,
      odds: selection.odds,
      eventName: `${event.homeTeam} vs ${event.awayTeam}`,
      marketName: market.marketName,
      selectionName: selection.selectionName,
      startTime: event.startTime,
      status: 'pending'
    }

    const builderSelection: BetBuilderSelection = {
      ...betSelection,
      event,
      market,
      selection
    }

    setBuilderSelections(prev => [...prev, builderSelection])
  }, [builderSelections.length, maxSelections])

  const handleAddAllToSlip = useCallback(() => {
    builderSelections.forEach(selection => {
      onAddSelection(selection)
    })
    setBuilderSelections([])
  }, [builderSelections, onAddSelection])

  // Use selectedSelections to show conflicts
  const hasConflicts = useCallback(() => {
    return selectedSelections.some(selected => 
      builderSelections.some(builder => 
        builder.eventId === selected.eventId && builder.marketId === selected.marketId
      )
    )
  }, [selectedSelections, builderSelections])

  const handleRemoveFromBuilder = useCallback((selectionId: string) => {
    setBuilderSelections(prev => prev.filter(sel => sel.selectionId !== selectionId))
    // Also remove from main bet slip if it exists there
    const selectionToRemove = selectedSelections.find(sel => sel.selectionId === selectionId)
    if (selectionToRemove) {
      onRemoveSelection(selectionId)
    }
  }, [selectedSelections, onRemoveSelection])

  const calculateCombinedOdds = useCallback(() => {
    return builderSelections.reduce((acc, selection) => acc * selection.odds, 1)
  }, [builderSelections])

  const uniqueSports = Array.from(new Set(events.map(event => event.sportKey)))

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Bet Builder</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Build custom bets by combining selections from different markets
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              placeholder="Search teams..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              className="input"
              value={selectedSport}
              onChange={(e) => setSelectedSport(e.target.value)}
            >
              <option value="">All Sports</option>
              {uniqueSports.map(sport => (
                <option key={sport} value={sport}>
                  {sport.charAt(0).toUpperCase() + sport.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Builder Selections */}
      {builderSelections.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Your Bet Builder</h4>
              <div className="flex items-center space-x-2">
                {hasConflicts() && (
                  <Badge variant="warning" className="text-xs">
                    Conflicts detected
                  </Badge>
                )}
                <Badge variant="primary">
                  {builderSelections.length}/{maxSelections}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {builderSelections.map((selection) => (
                <div
                  key={selection.selectionId}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{selection.eventName}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {selection.marketName}: {selection.selectionName}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="success">{selection.odds.toFixed(2)}</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFromBuilder(selection.selectionId)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-600">
                <div className="flex items-center space-x-2">
                  <Calculator className="h-4 w-4" />
                  <span className="font-medium">Combined Odds:</span>
                  <Badge variant="primary" size="lg">
                    {calculateCombinedOdds().toFixed(2)}
                  </Badge>
                </div>
                <Button onClick={handleAddAllToSlip}>
                  Add to Bet Slip
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredEvents.map((event) => (
          <Card key={event.eventId}>
            <CardHeader padding="sm">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">
                  {event.homeTeam} vs {event.awayTeam}
                </h4>
                <Badge variant="info" size="sm">
                  {new Date(event.startTime).toLocaleDateString()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent padding="sm">
              <div className="space-y-3">
                {event.markets.slice(0, 3).map((market) => (
                  <div key={market.marketId}>
                    <h5 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                      {market.marketName}
                    </h5>
                    <div className="grid grid-cols-2 gap-2">
                      {market.selections.slice(0, 4).map((selection) => {
                        const isSelected = builderSelections.some(
                          sel => sel.selectionId === selection.selectionId
                        )
                        const isDisabled = builderSelections.length >= maxSelections && !isSelected
                        
                        return (
                          <Button
                            key={selection.selectionId}
                            variant={isSelected ? "primary" : "outline"}
                            size="sm"
                            disabled={isDisabled || !selection.active}
                            onClick={() => {
                              if (isSelected) {
                                handleRemoveFromBuilder(selection.selectionId)
                              } else {
                                handleAddToBuilder(event, market, selection)
                              }
                            }}
                            className="justify-between flex items-center"
                          >
                            <div className="flex items-center space-x-1">
                              {isSelected ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                              <span className="text-xs truncate">
                                {selection.selectionName}
                              </span>
                            </div>
                            <span className="text-xs font-bold">
                              {selection.odds.toFixed(2)}
                            </span>
                          </Button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredEvents.length === 0 && (
        <Card>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">
                No events found matching your criteria
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default BetBuilder