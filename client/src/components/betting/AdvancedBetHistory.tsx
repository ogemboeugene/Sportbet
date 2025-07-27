import React, { useState, useEffect } from 'react';
import { 
  History, Search, Filter, TrendingUp, TrendingDown, 
  MoreVertical, Download, RefreshCw 
} from 'lucide-react';
import { Card, CardHeader, CardContent, Button, Input, Select, Badge } from '../ui';
import { dashboardApi } from '../../services/dashboardApi';

interface BetHistoryItem {
  id: string;
  type: string;
  sport: string;
  event: string;
  selection: string;
  odds: number;
  stake: number;
  potentialWin: number;
  status: 'pending' | 'won' | 'lost' | 'void' | 'cashed_out';
  placedAt: string;
  settledAt?: string;
  cashOutValue?: number;
}

interface BetHistoryFilters {
  statuses: string[];
  sports: string[];
  betTypes: string[];
  dateFrom?: string;
  dateTo?: string;
  minStake?: number;
  maxStake?: number;
}

interface AdvancedBetHistoryProps {
  userId?: string;
}

const AdvancedBetHistory: React.FC<AdvancedBetHistoryProps> = () => {
  const [bets, setBets] = useState<BetHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBets, setTotalBets] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<BetHistoryFilters>({
    statuses: [],
    sports: [],
    betTypes: []
  });
  const [availableFilters, setAvailableFilters] = useState({
    statuses: [] as string[],
    sports: [] as string[],
    betTypes: [] as string[]
  });
  const [error, setError] = useState<string | null>(null);

  const pageSize = 20;

  useEffect(() => {
    fetchBetHistory();
  }, [currentPage, searchTerm, filters]);

  const fetchBetHistory = async () => {
    try {
      setLoading(true);
      const response = await dashboardApi.getBetHistory({
        page: currentPage,
        limit: pageSize,
        search: searchTerm,
        ...filters
      });

      setBets(response.data.bets);
      setTotalPages(response.data.totalPages);
      setTotalBets(response.data.total);
      setAvailableFilters(response.data.filters);
      setError(null);
    } catch (err) {
      setError('Failed to load bet history');
      console.error('Error fetching bet history:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateFilter = (filterType: keyof BetHistoryFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      statuses: [],
      sports: [],
      betTypes: []
    });
    setSearchTerm('');
    setCurrentPage(1);
  };

  const exportBetHistory = async () => {
    try {
      // In a real app, this would trigger a download
      const response = await dashboardApi.getBetHistory({
        page: 1,
        limit: 1000, // Get all for export
        search: searchTerm,
        ...filters
      });
      
      const csvContent = [
        'Date,Type,Sport,Event,Selection,Odds,Stake,Status,Payout',
        ...response.data.bets.map((bet: BetHistoryItem) => 
          `${bet.placedAt},${bet.type},${bet.sport},"${bet.event}","${bet.selection}",${bet.odds},${bet.stake},${bet.status},${bet.status === 'won' ? bet.potentialWin : 0}`
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bet-history-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting bet history:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'won': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'lost': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'void': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
      case 'cashed_out': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'won': return <TrendingUp className="h-3 w-3" />;
      case 'lost': return <TrendingDown className="h-3 w-3" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Header and Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <History className="h-5 w-5 text-gray-500" />
              <h3 className="text-lg font-semibold">Bet History</h3>
              <Badge variant="secondary" className="text-xs">
                {totalBets} total bets
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportBetHistory}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchBetHistory}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by event, selection, or sport..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10"
            />
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Status</label>
                  <Select
                    value={filters.statuses[0] || ''}
                    onChange={(e) => updateFilter('statuses', e.target.value ? [e.target.value] : [])}
                    options={[
                      { value: '', label: 'All Statuses' },
                      ...availableFilters.statuses.map(status => ({
                        value: status,
                        label: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')
                      }))
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Sport</label>
                  <Select
                    value={filters.sports[0] || ''}
                    onChange={(e) => updateFilter('sports', e.target.value ? [e.target.value] : [])}
                    options={[
                      { value: '', label: 'All Sports' },
                      ...availableFilters.sports.map(sport => ({
                        value: sport,
                        label: sport.charAt(0).toUpperCase() + sport.slice(1)
                      }))
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Bet Type</label>
                  <Select
                    value={filters.betTypes[0] || ''}
                    onChange={(e) => updateFilter('betTypes', e.target.value ? [e.target.value] : [])}
                    options={[
                      { value: '', label: 'All Types' },
                      ...availableFilters.betTypes.map(type => ({
                        value: type,
                        label: type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')
                      }))
                    ]}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Date From</label>
                  <Input
                    type="date"
                    value={filters.dateFrom || ''}
                    onChange={(e) => updateFilter('dateFrom', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Date To</label>
                  <Input
                    type="date"
                    value={filters.dateTo || ''}
                    onChange={(e) => updateFilter('dateTo', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Bet History List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-center justify-between p-4 border-b">
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                    <div className="h-6 bg-gray-200 rounded w-20"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : bets.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No bets found matching your criteria.
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {bets.map((bet) => (
                <div key={bet.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                            {bet.event}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {bet.selection}
                          </p>
                        </div>
                        <div className="ml-4 flex items-center space-x-2">
                          <Badge className={getStatusColor(bet.status)}>
                            {getStatusIcon(bet.status)}
                            <span className="ml-1 capitalize">
                              {bet.status.replace('_', ' ')}
                            </span>
                          </Badge>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Sport:</span>
                          <span className="ml-1 capitalize">{bet.sport}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Type:</span>
                          <span className="ml-1 capitalize">{bet.type}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Odds:</span>
                          <span className="ml-1 font-medium">{bet.odds}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Stake:</span>
                          <span className="ml-1 font-medium">${bet.stake.toFixed(2)}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-3 text-sm">
                        <div className="text-gray-500">
                          Placed: {new Date(bet.placedAt).toLocaleDateString()} at {new Date(bet.placedAt).toLocaleTimeString()}
                        </div>
                        <div className="flex items-center space-x-4">
                          {bet.cashOutValue && (
                            <span className="text-blue-600 dark:text-blue-400">
                              Cash Out: ${bet.cashOutValue.toFixed(2)}
                            </span>
                          )}
                          <span className={`font-medium ${
                            bet.status === 'won' ? 'text-green-600 dark:text-green-400' :
                            bet.status === 'lost' ? 'text-red-600 dark:text-red-400' :
                            'text-gray-600 dark:text-gray-400'
                          }`}>
                            {bet.status === 'won' && `+$${bet.potentialWin.toFixed(2)}`}
                            {bet.status === 'lost' && `-$${bet.stake.toFixed(2)}`}
                            {bet.status === 'pending' && `Potential: $${bet.potentialWin.toFixed(2)}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalBets)} of {totalBets} bets
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "primary" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="w-8 h-8"
                  >
                    {page}
                  </Button>
                );
              })}
              {totalPages > 5 && <span className="text-gray-400">...</span>}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedBetHistory;
