import React from 'react';
import { Sport } from '../../types';

interface SportsListProps {
  sports: Sport[];
  selectedSport?: string;
  onSportSelect: (sportKey: string) => void;
  loading?: boolean;
}

export const SportsList: React.FC<SportsListProps> = ({
  sports,
  selectedSport,
  onSportSelect,
  loading = false,
}) => {
  const getSportIcon = (sportKey: string): string => {
    const iconMap: Record<string, string> = {
      'americanfootball_nfl': '🏈',
      'basketball_nba': '🏀',
      'soccer_epl': '⚽',
      'baseball_mlb': '⚾',
      'icehockey_nhl': '🏒',
      'tennis': '🎾',
      'golf': '⛳',
      'mma': '🥊',
      'boxing': '🥊',
      'cricket': '🏏',
    };
    
    return iconMap[sportKey] || '🏆';
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(8)].map((_, index) => (
          <div
            key={index}
            className="animate-pulse bg-gray-200 rounded-lg h-12"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Sports</h3>
      
      {/* All Sports Option */}
      <button
        onClick={() => onSportSelect('all')}
        className={`
          w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors
          ${selectedSport === 'all' || !selectedSport
            ? 'bg-blue-600 text-white'
            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
          }
        `}
      >
        <span className="text-xl">🏆</span>
        <div className="flex-1">
          <span className="font-medium">All Sports</span>
        </div>
      </button>

      {/* Individual Sports */}
      {sports.map((sport) => (
        <button
          key={sport.key}
          onClick={() => onSportSelect(sport.key)}
          className={`
            w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors
            ${selectedSport === sport.key
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }
          `}
        >
          <span className="text-xl">{getSportIcon(sport.key)}</span>
          <div className="flex-1">
            <span className="font-medium">{sport.title}</span>
          </div>
        </button>
      ))}

      {sports.length === 0 && !loading && (
        <div className="text-center text-gray-500 py-8">
          <p>No sports available</p>
        </div>
      )}
    </div>
  );
};