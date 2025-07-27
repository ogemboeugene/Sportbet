import { api } from './api';

export interface DashboardData {
  user: {
    id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
      dateOfBirth?: Date;
      phoneNumber?: string;
      country?: string;
      address?: string;
      city?: string;
      postalCode?: string;
    };
    kycStatus: string;
    emailVerified: boolean;
    twoFactorEnabled: boolean;
    preferences: any;
    limits: any;
    createdAt: Date;
  };
  wallet: {
    balance: number;
    currency: string;
  };
  betting: {
    overall: any;
    monthly: any;
    sports: any[];
    performance: any;
  };
  activeBets: number;
  recentTransactions: any[];
  recentActivity: any[];
  notifications: {
    unread: number;
    total: number;
  };
}

export interface BettingAnalytics {
  chartData: any[];
  sportBreakdown: any[];
  betTypeAnalysis: any[];
  streakAnalysis: any;
}

export interface BetHistoryResponse {
  bets: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  filters: {
    statuses: string[];
    sports: string[];
    betTypes: string[];
  };
}

export interface FavoriteTeam {
  teamName: string;
  sportKey: string;
  addedAt: Date;
}

export interface FavoriteSport {
  sportKey: string;
  sportTitle: string;
  addedAt: Date;
}

export const dashboardApi = {
  // Dashboard endpoints
  getDashboard: (): Promise<{ data: DashboardData }> =>
    api.get('/users/dashboard'),

  getBettingAnalytics: (period: 'week' | 'month' | 'year' = 'month'): Promise<{ data: BettingAnalytics }> =>
    api.get(`/users/dashboard/analytics?period=${period}`),

  // Profile management
  getDetailedProfile: () =>
    api.get('/users/profile/detailed'),

  updateProfile: (profileData: {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    dateOfBirth?: string;
    address?: string;
    city?: string;
    country?: string;
    postalCode?: string;
  }) =>
    api.put('/users/profile/update', profileData),

  // Favorites management
  getFavoriteTeams: (): Promise<{ data: FavoriteTeam[] }> =>
    api.get('/users/favorites/teams'),

  addFavoriteTeam: (teamName: string, sportKey: string) =>
    api.post('/users/favorites/teams', { teamName, sportKey }),

  removeFavoriteTeam: (teamName: string, sportKey: string) =>
    api.delete('/users/favorites/teams', { data: { teamName, sportKey } }),

  getFavoriteSports: (): Promise<{ data: FavoriteSport[] }> =>
    api.get('/users/favorites/sports'),

  addFavoriteSport: (sportKey: string) =>
    api.post('/users/favorites/sports', { sportKey }),

  removeFavoriteSport: (sportKey: string) =>
    api.delete('/users/favorites/sports', { data: { sportKey } }),

  getFavoriteEvents: (limit?: number) =>
    api.get(`/users/favorites/events${limit ? `?limit=${limit}` : ''}`),

  // Bet history with advanced filtering
  getBetHistory: (params: {
    page?: number;
    limit?: number;
    status?: string;
    sportKey?: string;
    betType?: string;
    startDate?: string;
    endDate?: string;
    minStake?: number;
    maxStake?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<{ data: BetHistoryResponse }> => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });
    return api.get(`/users/bets/history?${queryParams.toString()}`);
  },

  searchBets: (searchTerm: string, page: number = 1, limit: number = 20) =>
    api.get(`/users/bets/search?q=${encodeURIComponent(searchTerm)}&page=${page}&limit=${limit}`),

  getBetDetails: (betId: string) =>
    api.get(`/users/bets/${betId}`),

  getBetStatistics: (params: {
    status?: string;
    sportKey?: string;
    startDate?: string;
    endDate?: string;
  } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });
    return api.get(`/users/bets/statistics/summary?${queryParams.toString()}`);
  },

  getPopularSelections: (limit: number = 10) =>
    api.get(`/users/bets/popular-selections?limit=${limit}`),
};
