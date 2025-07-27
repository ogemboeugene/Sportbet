import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { removeBetSelection, clearBetSlip, updateSelectionStake } from '../../store/slices/bettingSlice';
import { placeBet, validateBet } from '../../services/bettingApi';
import { BetSelection } from '../../types';

interface BetSlipProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BetSlip: React.FC<BetSlipProps> = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const { betSlip, loading } = useSelector((state: RootState) => state.betting);
  const { balance } = useSelector((state: RootState) => state.wallet);
  
  const [stake, setStake] = useState<number>(10);
  const [potentialWin, setPotentialWin] = useState<number>(0);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  // Calculate total odds and potential winnings
  useEffect(() => {
    if (betSlip.length > 0) {
      const totalOdds = betSlip.reduce((acc, selection) => acc * selection.odds, 1);
      setPotentialWin(stake * totalOdds);
    } else {
      setPotentialWin(0);
    }
  }, [betSlip, stake]);

  // Validate bet when selections or stake change
  useEffect(() => {
    if (betSlip.length > 0 && stake > 0) {
      validateBetSelections();
    }
  }, [betSlip, stake]);

  const validateBetSelections = async () => {
    if (betSlip.length === 0) return;

    // First do client-side validation
    const clientErrors = validateSelections(betSlip);
    if (clientErrors.length > 0) {
      setValidationErrors(clientErrors);
      return;
    }

    setIsValidating(true);
    try {
      const result = await validateBet({
        stake,
        selections: betSlip,
      });

      setValidationErrors(result.errors || []);
    } catch (error) {
      setValidationErrors(['Failed to validate bet']);
    } finally {
      setIsValidating(false);
    }
  };

  const handlePlaceBet = async () => {
    if (validationErrors.length > 0) return;

    try {
      await placeBet({
        stake,
        selections: betSlip,
      });

      dispatch(clearBetSlip());
      setStake(10);
      onClose();
      
      // Show success message (you can implement toast notifications)
      alert('Bet placed successfully!');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to place bet');
    }
  };

  const handleRemoveSelection = (selectionId: string) => {
    dispatch(removeBetSelection(selectionId));
  };

  const handleUpdateSelectionStake = (selectionId: string, newStake: number) => {
    dispatch(updateSelectionStake({ selectionId, stake: newStake }));
  };

  const handleClearAll = () => {
    dispatch(clearBetSlip());
    setStake(10);
  };

  const validateSelections = (selections: BetSelection[]) => {
    const errors: string[] = [];
    
    if (selections.length === 0) {
      errors.push('No selections in bet slip');
    }
    
    selections.forEach((selection: BetSelection) => {
      if (selection.odds <= 1) {
        errors.push(`Invalid odds for ${selection.selectionName}`);
      }
      if (!selection.selectionId) {
        errors.push(`Invalid selection: ${selection.selectionName}`);
      }
    });
    
    return errors;
  };

  const formatOdds = (odds: number) => {
    return odds.toFixed(2);
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
      <div className="bg-white w-96 h-full shadow-lg overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Bet Slip</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          {betSlip.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-sm text-red-600 hover:text-red-800 mt-2"
            >
              Clear All
            </button>
          )}
        </div>

        <div className="p-4">
          {betSlip.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p>Your bet slip is empty</p>
              <p className="text-sm mt-2">Click on odds to add selections</p>
            </div>
          ) : (
            <>
              {/* Selections */}
              <div className="space-y-3 mb-4">
                {betSlip.map((selection) => (
                  <div
                    key={selection.selectionId}
                    className="border border-gray-200 rounded-lg p-3"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{selection.eventName}</p>
                        <p className="text-xs text-gray-600">{selection.marketName}</p>
                        <p className="text-sm text-blue-600">{selection.selectionName}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveSelection(selection.selectionId)}
                        className="text-red-500 hover:text-red-700 ml-2"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">
                          Stake: $
                        </span>
                        <input
                          type="number"
                          value={selection.stake || stake}
                          onChange={(e) => handleUpdateSelectionStake(selection.selectionId, parseFloat(e.target.value) || 0)}
                          className="w-16 text-xs border border-gray-300 rounded px-1 py-0.5"
                          min="0.01"
                          step="0.01"
                        />
                      </div>
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">
                        {formatOdds(selection.odds)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bet Type */}
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700">
                  {betSlip.length === 1 ? 'Single Bet' : `${betSlip.length}-Fold Accumulator`}
                </p>
              </div>

              {/* Stake Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stake Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                    $
                  </span>
                  <input
                    type="number"
                    value={stake}
                    onChange={(e) => setStake(parseFloat(e.target.value) || 0)}
                    min="0.01"
                    max="10000"
                    step="0.01"
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Available balance: {formatCurrency(balance)}
                </p>
              </div>

              {/* Quick Stake Buttons */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[5, 10, 25, 50].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setStake(amount)}
                    className="py-1 px-2 text-xs border border-gray-300 rounded hover:bg-gray-50"
                  >
                    ${amount}
                  </button>
                ))}
              </div>

              {/* Total Odds and Potential Win */}
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Total Odds:</span>
                  <span className="font-medium">
                    {formatOdds(betSlip.reduce((acc, selection) => acc * selection.odds, 1))}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Potential Win:</span>
                  <span className="font-bold text-green-600">
                    {formatCurrency(potentialWin)}
                  </span>
                </div>
              </div>

              {/* Validation Errors */}
              {validationErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <h4 className="text-sm font-medium text-red-800 mb-2">
                    Cannot place bet:
                  </h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Place Bet Button */}
              <button
                onClick={handlePlaceBet}
                disabled={
                  loading ||
                  isValidating ||
                  validationErrors.length > 0 ||
                  stake <= 0 ||
                  betSlip.length === 0
                }
                className={`w-full py-3 px-4 rounded-lg font-medium ${
                  loading ||
                  isValidating ||
                  validationErrors.length > 0 ||
                  stake <= 0 ||
                  betSlip.length === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {loading ? 'Placing Bet...' : isValidating ? 'Validating...' : 'Place Bet'}
              </button>

              {/* Terms */}
              <p className="text-xs text-gray-500 mt-3 text-center">
                By placing this bet, you agree to our terms and conditions
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};