import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import {
  fetchSports,
  fetchPopularEvents,
  setSelectedSport,
  searchEvents,
  fetchOddsForSport,
} from '../store/slices/bettingSlice';
import { SportsList } from '../components/betting/SportsList';
import { EventsList } from '../components/betting/EventsList';
import { BetSlip } from '../components/betting/BetSlip';
import { BetHistory } from '../components/betting/BetHistory';
import { SearchBar } from '../components/common/SearchBar';
import { debounce } from 'lodash';

export const BettingPage: React.FC = () => {
  const dispatch: AppDispatch = useDispatch();
  const {
    sports,
    events,
    selectedSport,
    betSlip,
    loading,
  } = useSelector((state: RootState) => state.betting);

  const [activeTab, setActiveTab] = useState<'betting' | 'history'>('betting');
  const [isBetSlipOpen, setIsBetSlipOpen] = useState(false);
  
  // New state for professional layout
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    dispatch(fetchSports());
    if (!selectedSport) {
      dispatch(fetchPopularEvents());
    }
  }, [dispatch]);

  const debouncedSearch = useCallback(
    debounce((query: string) => {
      if (query.length > 2) {
        dispatch(searchEvents(query));
        dispatch(setSelectedSport(null)); // Clear sport selection on search
      } else if (query.length === 0) {
        // If search is cleared, go back to popular or selected sport
        if (selectedSport) {
          dispatch(fetchOddsForSport({ sportKey: selectedSport }));
        } else {
          dispatch(fetchPopularEvents());
        }
      }
    }, 500),
    [dispatch, selectedSport]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedSearch(query);
  };

  const handleSportSelect = (sportKey: string) => {
    setSearchQuery(''); // Clear search when a sport is selected
    dispatch(setSelectedSport(sportKey));
    if (sportKey === 'all') {
      dispatch(fetchPopularEvents());
    } else {
      // Fetch real odds from the API
      dispatch(fetchOddsForSport({ sportKey }));
    }
  };

  const getHeaderTitle = () => {
    if (searchQuery) return `Search Results for "${searchQuery}"`;
    if (selectedSport && selectedSport !== 'all') {
      return sports.find(s => s.key === selectedSport)?.title || 'Events';
    }
    return 'Popular Events';
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      {/* Sports Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">Sports</h2>
        </div>
        <div className="flex-grow overflow-y-auto">
          <SportsList
            sports={sports}
            selectedSport={selectedSport || 'all'}
            onSportSelect={handleSportSelect}
            loading={loading}
          />
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Main Header */}
        <header className="bg-white border-b border-gray-200 p-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">{getHeaderTitle()}</h1>
            <div className="w-96">
              <SearchBar
                placeholder="Search for teams or events..."
                value={searchQuery}
                onChange={handleSearchChange}
              />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setActiveTab('betting')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                activeTab === 'betting'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              Events
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                activeTab === 'history'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              My Bets
            </button>
            <button
              onClick={() => setIsBetSlipOpen(true)}
              className={`relative px-4 py-2 rounded-lg font-medium transition-colors ${
                betSlip.length > 0
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
              disabled={betSlip.length === 0}
            >
              Bet Slip
              {betSlip.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                  {betSlip.length}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Events/History Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'betting' ? (
            <EventsList events={events} loading={loading} />
          ) : (
            <div className="bg-white rounded-lg shadow-md p-6">
              <BetHistory />
            </div>
          )}
        </div>
      </main>

      {/* Bet Slip Modal */}
      <BetSlip
        isOpen={isBetSlipOpen}
        onClose={() => setIsBetSlipOpen(false)}
      />
    </div>
  );
};