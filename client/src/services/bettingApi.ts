import { api } from './api';
import { Bet, BetSelection } from '../types';

export interface PlaceBetRequest {
  stake: number;
  selections: BetSelection[];
  currency?: string;
}

export interface ValidateBetRequest {
  stake: number;
  selections: BetSelection[];
  currency?: string;
}

export interface ValidateBetResponse {
  isValid: boolean;
  errors: string[];
  potentialWin: number;
}

export interface BettingStats {
  totalBets: number;
  totalStake: number;
  totalWinnings: number;
  pendingBets: number;
  wonBets: number;
  lostBets: number;
  voidBets: number;
  profitLoss: number;
}

export interface GetBetsResponse {
  bets: Bet[];
  total: number;
}

// Place a bet
export const placeBet = async (betData: PlaceBetRequest): Promise<Bet> => {
  const response = await api.post('/betting/place-bet', betData);
  return response.data;
};

// Validate a bet before placing
export const validateBet = async (betData: ValidateBetRequest): Promise<ValidateBetResponse> => {
  const response = await api.post('/betting/validate-bet', betData);
  return response.data;
};

// Get user's bets
export const getUserBets = async (
  status?: string,
  limit: number = 50,
  offset: number = 0
): Promise<GetBetsResponse> => {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  params.append('limit', limit.toString());
  params.append('offset', offset.toString());

  const response = await api.get(`/betting/my-bets?${params.toString()}`);
  return response.data;
};

// Get active bets
export const getActiveBets = async (): Promise<Bet[]> => {
  const response = await api.get('/betting/active-bets');
  return response.data;
};

// Get betting statistics
export const getBettingStats = async (): Promise<BettingStats> => {
  const response = await api.get('/betting/stats');
  return response.data;
};

// Get bet by ID
export const getBetById = async (betId: string): Promise<Bet> => {
  const response = await api.get(`/betting/bet/${betId}`);
  return response.data;
};

// Get bet by reference
export const getBetByReference = async (reference: string): Promise<Bet> => {
  const response = await api.get(`/betting/reference/${reference}`);
  return response.data;
};

// Cancel a bet
export const cancelBet = async (betId: string): Promise<Bet> => {
  const response = await api.put(`/betting/cancel/${betId}`);
  return response.data;
};

// Odds API related functions
export const getSports = async () => {
  const response = await api.get('/odds/sports');
  return response.data;
};

export const getEvents = async (sportKey: string, status: string) => {
  const response = await api.get(`/odds/sports/${sportKey}/events?status=${status}`);
  return response.data;
};

export const getPopularEvents = async () => {
  const response = await api.get('/odds/popular');
  return response.data;
};

export const searchEvents = async (query: string) => {
  const response = await api.get(`/odds/search?q=${query}`);
  return response.data;
};

export const getOddsForSport = async (sportKey: string, region: string = 'us', market: string = 'h2h') => {
  const response = await api.get(`/odds/sports/${sportKey}/odds?region=${region}&market=${market}`);
  return response.data;
};