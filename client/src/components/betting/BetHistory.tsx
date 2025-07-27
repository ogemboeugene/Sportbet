import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { fetchUserBets } from '../../store/slices/bettingSlice';
import { cancelBet } from '../../services/bettingApi';
import { Bet } from '../../types';

interface BetHistoryProps {
  userId?: string;
}

export const BetHistory: React.FC<BetHistoryProps> = ({ userId: _userId }) => {
  const dispatch = useDispatch();
  const { userBets, loading, totalBets } = useSelector((state: RootState) => state.betting);
  
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedBets, setExpandedBets] = useState<Set<string>>(new Set());

  // Use userId for filtering if provided, otherwise show all user's bets
  const limit = 20;

  useEffect(() => {
    loadBets();
  }, [selectedStatus, currentPage]);

  const loadBets = () => {
    const offset = (currentPage - 1) * limit;
    dispatch(fetchUserBets({ 
      status: selectedStatus === 'all' ? undefined : selectedStatus, 
      limit, 
      offset 
    }) as any);
  };

  const handleCancelBet = async (betId: string) => {
    if (window.confirm('Are you sure you want to cancel this bet?')) {
      try {
        await cancelBet(betId);
        loadBets(); // Reload bets after cancellation
        alert('Bet cancelled successfully');
      } catch (error: any) {
        alert(error.response?.data?.message || 'Failed to cancel bet');
      }
    }
  };

  const toggleBetExpansion = (betId: string) => {
    const newExpanded = new Set(expandedBets);
    if (newExpanded.has(betId)) {
      newExpanded.delete(betId);
    } else {
      newExpanded.add(betId);
    }
    setExpandedBets(newExpanded);
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'won':
        return 'bg-green-100 text-green-800';
      case 'lost':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'void':
        return 'bg-gray-100 text-gray-800';
      case 'cashout':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const canCancelBet = (bet: Bet) => {
    if (bet.status !== 'pending') return false;
    
    // Check if any selection has started
    const now = new Date();
    return bet.selections.every(selection => 
      new Date(selection.startTime) > now
    );
  };

  const totalPages = Math.ceil(totalBets / limit);

  if (loading && userBets.length === 0) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, index) => (
          <div key={index} className="animate-pulse bg-gray-200 rounded-lg h-32" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Bet History</h2>
        
        <div className="flex items-center space-x-4">
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Bets</option>
            <option value="pending">Pending</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
            <option value="void">Void</option>
            <option value="cashout">Cashed Out</option>
          </select>
        </div>
      </div>

      {/* Bets List */}
      {userBets.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📊</div>
          <p className="text-lg text-gray-600">No bets found</p>
          <p className="text-sm text-gray-500 mt-2">
            {selectedStatus === 'all' 
              ? 'You haven\'t placed any bets yet'
              : `No ${selectedStatus} bets found`
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {userBets.map((bet) => (
            <div
              key={bet._id}
              className="bg-white rounded-lg border border-gray-200 shadow-sm"
            >
              {/* Bet Header */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="font-medium text-gray-900">
                        {bet.reference}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(bet.status)}`}>
                        {bet.status.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500">
                        {bet.betType === 'single' ? 'Single' : `${bet.selections.length}-Fold`}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Stake:</span>
                        <span className="ml-1 font-medium">{formatCurrency(bet.stake)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Potential Win:</span>
                        <span className="ml-1 font-medium">{formatCurrency(bet.potentialWin)}</span>
                      </div>
                      {bet.winAmount && (
                        <div>
                          <span className="text-gray-500">Win Amount:</span>
                          <span className="ml-1 font-medium text-green-600">
                            {formatCurrency(bet.winAmount)}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-500">Placed:</span>
                        <span className="ml-1">{formatDateTime(bet.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    {canCancelBet(bet) && (
                      <button
                        onClick={() => handleCancelBet(bet._id)}
                        className="px-3 py-1 text-xs text-red-600 border border-red-600 rounded hover:bg-red-50"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      onClick={() => toggleBetExpansion(bet._id)}
                      className="px-3 py-1 text-xs text-blue-600 border border-blue-600 rounded hover:bg-blue-50"
                    >
                      {expandedBets.has(bet._id) ? 'Hide' : 'Details'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Bet Details (Expandable) */}
              {expandedBets.has(bet._id) && (
                <div className="p-4 bg-gray-50">
                  <h4 className="font-medium text-gray-900 mb-3">Selections</h4>
                  <div className="space-y-3">
                    {bet.selections.map((selection, index) => (
                      <div
                        key={selection.selectionId || `selection-${index}`}
                        className="bg-white rounded-lg p-3 border border-gray-200"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{selection.eventName}</p>
                            <p className="text-xs text-gray-600">{selection.marketName}</p>
                            <p className="text-sm text-blue-600">{selection.selectionName}</p>
                            <p className="text-xs text-gray-500">Selection #{index + 1}</p>
                          </div>
                          <div className="text-right">
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">
                              {selection.odds.toFixed(2)}
                            </span>
                            {selection.status !== 'pending' && (
                              <div className={`mt-1 px-2 py-1 rounded text-xs font-medium ${getStatusColor(selection.status)}`}>
                                {selection.status.toUpperCase()}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDateTime(selection.startTime)}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {bet.settledAt && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-500">
                        Settled: {formatDateTime(bet.settledAt)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Previous
          </button>
          
          <span className="px-3 py-2 text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};