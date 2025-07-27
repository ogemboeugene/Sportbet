import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { addBetSelection } from '../../store/slices/bettingSlice';
import { Selection, Event } from '../../types';

interface OddsDisplayProps {
  event: Event;
  market: {
    marketId: string;
    marketName: string;
    selections: Selection[];
  };
  oddsFormat?: 'decimal' | 'fractional' | 'american';
}

export const OddsDisplay: React.FC<OddsDisplayProps> = ({
  event,
  market,
  oddsFormat = 'decimal',
}) => {
  const dispatch = useDispatch();
  const { betSlip } = useSelector((state: RootState) => state.betting);

  const formatOdds = (odds: number): string => {
    switch (oddsFormat) {
      case 'fractional':
        const numerator = Math.round((odds - 1) * 100);
        const denominator = 100;
        const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
        const divisor = gcd(numerator, denominator);
        return `${numerator / divisor}/${denominator / divisor}`;
      
      case 'american':
        if (odds >= 2) {
          return `+${Math.round((odds - 1) * 100)}`;
        } else {
          return `-${Math.round(100 / (odds - 1))}`;
        }
      
      case 'decimal':
      default:
        return odds.toFixed(2);
    }
  };

  const handleSelectionClick = (selection: Selection) => {
    // Check if selection is already in bet slip
    const isSelected = betSlip.some(s => s.selectionId === selection.selectionId);
    
    if (isSelected) {
      // Remove from bet slip if already selected
      // This will be handled by the BetSlip component
      return;
    }

    // Add to bet slip
    const betSelection = {
      eventId: event.eventId,
      marketId: market.marketId,
      selectionId: selection.selectionId,
      odds: selection.odds,
      eventName: `${event.homeTeam} vs ${event.awayTeam}`,
      marketName: market.marketName,
      selectionName: selection.selectionName,
      startTime: event.startTime,
      status: 'pending' as const,
    };

    dispatch(addBetSelection(betSelection));
  };

  const isSelectionSelected = (selectionId: string): boolean => {
    return betSlip.some(s => s.selectionId === selectionId);
  };

  const isEventStarted = (): boolean => {
    return new Date(event.startTime) <= new Date();
  };

  if (isEventStarted()) {
    return (
      <div className="text-center text-gray-500 py-2">
        <span className="text-sm">Event Started</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-700">{market.marketName}</h4>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {market.selections.map((selection) => (
          <button
            key={selection.selectionId}
            onClick={() => handleSelectionClick(selection)}
            disabled={!selection.active}
            className={`
              p-2 rounded-lg border text-sm font-medium transition-colors
              ${!selection.active
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : isSelectionSelected(selection.selectionId)
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-900 border-gray-300 hover:bg-blue-50 hover:border-blue-300'
              }
            `}
          >
            <div className="flex flex-col items-center">
              <span className="truncate w-full text-center mb-1">
                {selection.selectionName}
              </span>
              <span className="font-bold">
                {formatOdds(selection.odds)}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};