export interface BetValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface BetOddsChange {
  selectionId: string;
  oldOdds: number;
  newOdds: number;
  selectionName: string;
}

export interface BetConfirmation {
  betId: string;
  reference: string;
  stake: number;
  potentialWin: number;
  oddsChanges?: BetOddsChange[];
  requiresConfirmation: boolean;
}