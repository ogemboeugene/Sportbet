import { api } from './api';

export interface ResponsibleGamblingLimits {
  dailyDeposit: number;
  weeklyDeposit: number;
  monthlyDeposit: number;
  dailyBetting: number;
  weeklyBetting: number;
  monthlyBetting: number;
  sessionTime: number;
  dailyLoss: number;
  weeklyLoss: number;
  monthlyLoss: number;
  lastUpdated: string;
}

export interface LimitUsage {
  dailyDeposit: { used: number; limit: number; percentage: number };
  weeklyDeposit: { used: number; limit: number; percentage: number };
  monthlyDeposit: { used: number; limit: number; percentage: number };
  dailyBetting: { used: number; limit: number; percentage: number };
  weeklyBetting: { used: number; limit: number; percentage: number };
  monthlyBetting: { used: number; limit: number; percentage: number };
  sessionTime: { used: number; limit: number; percentage: number };
  dailyLoss: { used: number; limit: number; percentage: number };
  weeklyLoss: { used: number; limit: number; percentage: number };
  monthlyLoss: { used: number; limit: number; percentage: number };
}

export interface UpdateLimitsRequest {
  dailyDeposit?: number;
  weeklyDeposit?: number;
  monthlyDeposit?: number;
  dailyBetting?: number;
  weeklyBetting?: number;
  monthlyBetting?: number;
  sessionTime?: number;
  dailyLoss?: number;
  weeklyLoss?: number;
  monthlyLoss?: number;
}

export const responsibleGamblingApi = {
  // Get current responsible gambling limits
  getLimits: async (): Promise<ResponsibleGamblingLimits> => {
    const response = await api.get('/users/responsible-gambling/limits');
    return response.data.data;
  },

  // Update responsible gambling limits
  updateLimits: async (limits: UpdateLimitsRequest): Promise<ResponsibleGamblingLimits> => {
    const response = await api.put('/users/responsible-gambling/limits', limits);
    return response.data.data;
  },

  // Get current limit usage
  getLimitUsage: async (): Promise<LimitUsage> => {
    const response = await api.get('/users/responsible-gambling/usage');
    return response.data.data;
  },
};