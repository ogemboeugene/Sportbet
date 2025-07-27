import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Bet, BetSelection, Sport, Event } from '../../types';
import * as bettingApi from '../../services/bettingApi';
import * as oddsApi from '../../services/oddsApi';

interface BettingState {
  // Bet slip
  betSlip: BetSelection[];
  
  // Sports and events
  sports: Sport[];
  events: Event[];
  selectedSport: string | null;
  
  // User bets
  userBets: Bet[];
  activeBets: Bet[];
  bettingStats: bettingApi.BettingStats | null;
  
  // UI state
  loading: boolean;
  error: string | null;
  
  // Pagination
  currentPage: number;
  totalBets: number;
  hasMore: boolean;
}

const initialState: BettingState = {
  betSlip: [],
  sports: [],
  events: [],
  selectedSport: null,
  userBets: [],
  activeBets: [],
  bettingStats: null,
  loading: false,
  error: null,
  currentPage: 0,
  totalBets: 0,
  hasMore: true,
};

// Async thunks
export const fetchSports = createAsyncThunk(
  'betting/fetchSports',
  async () => {
    return await oddsApi.getSports();
  }
);

export const fetchEventsBySport = createAsyncThunk(
  'betting/fetchEventsBySport',
  async ({ sportKey, limit = 50, status = 'upcoming' }: {
    sportKey: string;
    limit?: number;
    status?: string;
  }) => {
    return await oddsApi.getEventsBySport(sportKey, limit, status);
  }
);

export const fetchPopularEvents = createAsyncThunk(
  'betting/fetchPopularEvents',
  async () => {
    return await oddsApi.getPopularEvents();
  }
);

export const searchEvents = createAsyncThunk(
  'betting/searchEvents',
  async (query: string) => {
    if (!query) return [];
    return await oddsApi.searchEvents(query);
  }
);

export const fetchOddsForSport = createAsyncThunk(
  'betting/fetchOddsForSport',
  async ({ sportKey, region = 'us', market = 'h2h' }: {
    sportKey: string;
    region?: string;
    market?: string;
  }) => {
    return await oddsApi.getOddsForSport(sportKey, region, market);
  }
);

export const fetchUserBets = createAsyncThunk(
  'betting/fetchUserBets',
  async ({ status, limit = 50, offset = 0 }: {
    status?: string;
    limit?: number;
    offset?: number;
  }) => {
    return await bettingApi.getUserBets(status, limit, offset);
  }
);

export const fetchActiveBets = createAsyncThunk(
  'betting/fetchActiveBets',
  async () => {
    return await bettingApi.getActiveBets();
  }
);

export const fetchBettingStats = createAsyncThunk(
  'betting/fetchBettingStats',
  async () => {
    return await bettingApi.getBettingStats();
  }
);

export const placeBet = createAsyncThunk(
  'betting/placeBet',
  async (betData: bettingApi.PlaceBetRequest) => {
    return await bettingApi.placeBet(betData);
  }
);

export const cancelBet = createAsyncThunk(
  'betting/cancelBet',
  async (betId: string) => {
    return await bettingApi.cancelBet(betId);
  }
);

const bettingSlice = createSlice({
  name: 'betting',
  initialState,
  reducers: {
    // Bet slip management
    addBetSelection: (state, action: PayloadAction<BetSelection>) => {
      const selection = action.payload;
      
      // Remove any existing selection with the same selectionId
      state.betSlip = state.betSlip.filter(s => s.selectionId !== selection.selectionId);
      
      // Remove any selection from the same event (can't bet on multiple outcomes)
      state.betSlip = state.betSlip.filter(s => s.eventId !== selection.eventId);
      
      // Add the new selection
      state.betSlip.push(selection);
    },
    
    removeBetSelection: (state, action: PayloadAction<string>) => {
      state.betSlip = state.betSlip.filter(s => s.selectionId !== action.payload);
    },
    
    clearBetSlip: (state) => {
      state.betSlip = [];
    },
    
    updateSelectionStake: (state, action: PayloadAction<{ selectionId: string; stake: number }>) => {
      const { selectionId } = action.payload;
      const selection = state.betSlip.find(s => s.selectionId === selectionId);
      if (selection) {
        // This would be used for system bets where each selection can have different stakes
        // For now, we use a single stake for all selections
      }
    },
    
    // Sports and events
    setSelectedSport: (state, action: PayloadAction<string | null>) => {
      state.selectedSport = action.payload;
    },
    
    updateEventOdds: (state, action: PayloadAction<{ eventId: string; markets: any[] }>) => {
      const { eventId, markets } = action.payload;
      const event = state.events.find(e => e.eventId === eventId);
      if (event) {
        event.markets = markets;
        event.lastOddsUpdate = new Date().toISOString();
      }
      
      // Update bet slip selections if odds changed
      state.betSlip = state.betSlip.map(selection => {
        if (selection.eventId === eventId) {
          const market = markets.find(m => m.marketId === selection.marketId);
          if (market) {
            const updatedSelection = market.selections.find((s: any) => s.selectionId === selection.selectionId);
            if (updatedSelection) {
              return { ...selection, odds: updatedSelection.odds };
            }
          }
        }
        return selection;
      });
    },
    
    // Error handling
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    // Reset state
    resetBettingState: (state) => {
      return { ...initialState, betSlip: state.betSlip }; // Keep bet slip
    },
  },
  extraReducers: (builder) => {
    // Fetch sports
    builder
      .addCase(fetchSports.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSports.fulfilled, (state, action) => {
        state.loading = false;
        state.sports = action.payload;
      })
      .addCase(fetchSports.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch sports';
      });
    
    // Fetch events by sport
    builder
      .addCase(fetchEventsBySport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEventsBySport.fulfilled, (state, action) => {
        state.loading = false;
        state.events = action.payload;
      })
      .addCase(fetchEventsBySport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch events';
      });
    
    // Fetch popular events
    builder
      .addCase(fetchPopularEvents.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPopularEvents.fulfilled, (state, action) => {
        state.loading = false;
        state.events = action.payload;
      })
      .addCase(fetchPopularEvents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch popular events';
      });

    // Search events
    builder
      .addCase(searchEvents.pending, (state) => {
        state.loading = true;
      })
      .addCase(searchEvents.fulfilled, (state, action) => {
        state.loading = false;
        state.events = action.payload; // Replace events with search results
      })
      .addCase(searchEvents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to search events';
      });

    // Fetch odds for sport
    builder
      .addCase(fetchOddsForSport.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchOddsForSport.fulfilled, (state, action) => {
        state.loading = false;
        // Transform the raw Odds API response to our Event format
        state.events = action.payload.map((event: any) => {
          // Get the best/first bookmaker's markets
          const bestBookmaker = event.bookmakers?.[0];
          const markets = bestBookmaker?.markets?.map((market: any) => ({
            marketId: `${event.id}_${market.key}`,
            marketName: market.key === 'h2h' ? 'Match Winner' : market.key,
            selections: market.outcomes.map((outcome: any, index: number) => ({
              selectionId: `${event.id}_${market.key}_${index}`,
              selectionName: outcome.name,
              odds: outcome.price,
              active: true,
            })),
          })) || [];

          return {
            _id: event.id, // Use API event ID as _id
            eventId: event.id,
            sportKey: event.sport_key,
            sportTitle: event.sport_title,
            homeTeam: event.home_team,
            awayTeam: event.away_team,
            startTime: event.commence_time,
            status: new Date(event.commence_time) > new Date() ? 'upcoming' : 'live',
            markets,
            // Additional data for better UX
            bookmakers: event.bookmakers?.map((bm: any) => ({
              key: bm.key,
              title: bm.title,
              lastUpdate: bm.last_update,
            })) || [],
            lastOddsUpdate: bestBookmaker?.last_update || new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        });
      })
      .addCase(fetchOddsForSport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch odds';
      });
    
    // Fetch user bets
    builder
      .addCase(fetchUserBets.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserBets.fulfilled, (state, action) => {
        state.loading = false;
        state.userBets = action.payload.bets;
        state.totalBets = action.payload.total;
        state.hasMore = action.payload.bets.length === 50; // Assuming limit of 50
      })
      .addCase(fetchUserBets.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch user bets';
      });
    
    // Fetch active bets
    builder
      .addCase(fetchActiveBets.fulfilled, (state, action) => {
        state.activeBets = action.payload;
      });
    
    // Fetch betting stats
    builder
      .addCase(fetchBettingStats.fulfilled, (state, action) => {
        state.bettingStats = action.payload;
      });
    
    // Place bet
    builder
      .addCase(placeBet.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(placeBet.fulfilled, (state, action) => {
        state.loading = false;
        state.betSlip = []; // Clear bet slip after successful bet
        state.userBets.unshift(action.payload); // Add new bet to the beginning
      })
      .addCase(placeBet.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to place bet';
      });
    
    // Cancel bet
    builder
      .addCase(cancelBet.fulfilled, (state, action) => {
        const updatedBet = action.payload;
        state.userBets = state.userBets.map(bet => 
          bet._id === updatedBet._id ? updatedBet : bet
        );
        state.activeBets = state.activeBets.filter(bet => bet._id !== updatedBet._id);
      });
  },
});

export const {
  addBetSelection,
  removeBetSelection,
  clearBetSlip,
  updateSelectionStake,
  setSelectedSport,
  updateEventOdds,
  setError,
  clearError,
  resetBettingState,
} = bettingSlice.actions;

export default bettingSlice.reducer;