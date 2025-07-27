import React, { useState, useEffect } from 'react';
import { Heart, Star, Plus, X, Search, Trophy, Calendar } from 'lucide-react';
import { Card, CardHeader, CardContent, Button, Input, Badge, Select } from '../ui';
import { dashboardApi, FavoriteTeam as ApiFavoriteTeam, FavoriteSport as ApiFavoriteSport } from '../../services/dashboardApi';

interface FavoriteTeam extends ApiFavoriteTeam {
  id: string;
  logo?: string;
  league?: string;
  upcomingGames?: number;
  record?: string;
}

interface FavoriteSport extends ApiFavoriteSport {
  name: string;
  activeEvents?: number;
  upcomingEvents?: number;
}

interface PopularSelection {
  teamName: string;
  sport: string;
  popularityScore: number;
  recentOdds?: number;
}

interface FavoritesManagementProps {
  onFavoritesUpdate?: () => void;
}

const FavoritesManagement: React.FC<FavoritesManagementProps> = ({ onFavoritesUpdate }) => {
  const [favoriteTeams, setFavoriteTeams] = useState<FavoriteTeam[]>([]);
  const [favoriteSports, setFavoriteSports] = useState<FavoriteSport[]>([]);
  const [popularSelections, setPopularSelections] = useState<PopularSelection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSport, setSelectedSport] = useState<string>('all');
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamSport, setNewTeamSport] = useState('');
  const [addingTeam, setAddingTeam] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableSports = [
    { value: 'football', label: 'Football' },
    { value: 'basketball', label: 'Basketball' },
    { value: 'baseball', label: 'Baseball' },
    { value: 'hockey', label: 'Hockey' },
    { value: 'soccer', label: 'Soccer' },
    { value: 'tennis', label: 'Tennis' },
    { value: 'mma', label: 'MMA' },
    { value: 'boxing', label: 'Boxing' }
  ];

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      const [teamsRes, sportsRes, popularRes] = await Promise.all([
        dashboardApi.getFavoriteTeams(),
        dashboardApi.getFavoriteSports(),
        dashboardApi.getPopularSelections(10)
      ]);

      setFavoriteTeams(teamsRes.data.map((team: ApiFavoriteTeam, index: number) => ({
        ...team,
        id: `${team.teamName}-${team.sportKey}-${index}`,
        league: `${team.sportKey.toUpperCase()} League`,
        upcomingGames: Math.floor(Math.random() * 5),
        record: '12-8'
      })));
      setFavoriteSports(sportsRes.data.map((sport: ApiFavoriteSport) => ({
        ...sport,
        name: sport.sportKey.charAt(0).toUpperCase() + sport.sportKey.slice(1),
        activeEvents: Math.floor(Math.random() * 10),
        upcomingEvents: Math.floor(Math.random() * 15)
      })));
      setPopularSelections(popularRes.data);
      setError(null);
    } catch (err) {
      setError('Failed to load favorites data');
      console.error('Error fetching favorites:', err);
    } finally {
      setLoading(false);
    }
  };

  const addFavoriteTeam = async () => {
    if (!newTeamName.trim() || !newTeamSport) return;

    try {
      setAddingTeam(true);
      await dashboardApi.addFavoriteTeam(newTeamName.trim(), newTeamSport);
      setNewTeamName('');
      setNewTeamSport('');
      setShowAddTeam(false);
      fetchFavorites();
      onFavoritesUpdate?.();
    } catch (err) {
      setError('Failed to add favorite team');
      console.error('Error adding favorite team:', err);
    } finally {
      setAddingTeam(false);
    }
  };

  const removeFavoriteTeam = async (teamName: string, sportKey: string) => {
    try {
      await dashboardApi.removeFavoriteTeam(teamName, sportKey);
      fetchFavorites();
      onFavoritesUpdate?.();
    } catch (err) {
      setError('Failed to remove favorite team');
      console.error('Error removing favorite team:', err);
    }
  };

  const toggleFavoriteSport = async (sportKey: string) => {
    try {
      const isFavorite = favoriteSports.some(sport => sport.sportKey === sportKey);
      
      if (isFavorite) {
        await dashboardApi.removeFavoriteSport(sportKey);
      } else {
        await dashboardApi.addFavoriteSport(sportKey);
      }
      
      fetchFavorites();
      onFavoritesUpdate?.();
    } catch (err) {
      setError('Failed to update favorite sport');
      console.error('Error updating favorite sport:', err);
    }
  };

  const filteredTeams = favoriteTeams.filter(team => {
    const matchesSearch = team.teamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         team.league?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSport = selectedSport === 'all' || team.sportKey === selectedSport;
    return matchesSearch && matchesSport;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Favorite Sports */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Star className="h-5 w-5 text-yellow-500" />
              <h3 className="text-lg font-semibold">Favorite Sports</h3>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {availableSports.map((sport) => {
              const isFavorite = favoriteSports.some(fav => fav.sportKey === sport.value);
              const favoriteData = favoriteSports.find(fav => fav.sportKey === sport.value);
              
              return (
                <div
                  key={sport.value}
                  onClick={() => toggleFavoriteSport(sport.value)}
                  className={`
                    p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
                    ${isFavorite 
                      ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' 
                      : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                    }
                  `}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{sport.label}</span>
                    {isFavorite && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
                  </div>
                  {favoriteData && (
                    <div className="text-xs text-gray-500 space-y-1">
                      {favoriteData.activeEvents && (
                        <div>{favoriteData.activeEvents} active events</div>
                      )}
                      {favoriteData.upcomingEvents && (
                        <div>{favoriteData.upcomingEvents} upcoming</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Favorite Teams */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Heart className="h-5 w-5 text-red-500" />
              <h3 className="text-lg font-semibold">Favorite Teams</h3>
            </div>
            <Button 
              onClick={() => setShowAddTeam(true)}
              size="sm"
              className="flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Team</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search teams or leagues..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select
                value={selectedSport}
                onChange={(e) => setSelectedSport(e.target.value)}
                options={[
                  { value: 'all', label: 'All Sports' },
                  ...availableSports
                ]}
              />
            </div>
          </div>

          {/* Add Team Form */}
          {showAddTeam && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
              <h4 className="font-medium">Add New Favorite Team</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  placeholder="Team name"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                />
                <Select
                  value={newTeamSport}
                  onChange={(e) => setNewTeamSport(e.target.value)}
                  options={[
                    { value: '', label: 'Select sport' },
                    ...availableSports
                  ]}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setShowAddTeam(false);
                    setNewTeamName('');
                    setNewTeamSport('');
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={addFavoriteTeam}
                  disabled={!newTeamName.trim() || !newTeamSport || addingTeam}
                >
                  {addingTeam ? 'Adding...' : 'Add Team'}
                </Button>
              </div>
            </div>
          )}

          {/* Teams List */}
          {filteredTeams.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {favoriteTeams.length === 0 
                ? "No favorite teams added yet. Click 'Add Team' to get started!"
                : "No teams match your search criteria."
              }
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTeams.map((team) => (
                <div 
                  key={`${team.teamName}-${team.sportKey}`}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-medium">{team.teamName}</h4>
                        <Badge variant="secondary" className="text-xs">
                          {availableSports.find(s => s.value === team.sportKey)?.label || team.sportKey}
                        </Badge>
                      </div>
                      {team.league && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {team.league}
                        </p>
                      )}
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        {team.record && (
                          <div className="flex items-center space-x-1">
                            <Trophy className="h-3 w-3" />
                            <span>{team.record}</span>
                          </div>
                        )}
                        {team.upcomingGames && (
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>{team.upcomingGames} upcoming</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFavoriteTeam(team.teamName, team.sportKey)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Popular Selections */}
      {popularSelections.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-orange-500" />
              <h3 className="text-lg font-semibold">Popular Selections</h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {popularSelections.map((selection, index) => (
                <div 
                  key={index}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                    // Quick add to favorites
                    if (!favoriteTeams.some(team => 
                      team.teamName === selection.teamName && 
                      team.sportKey === selection.sport
                    )) {
                      dashboardApi.addFavoriteTeam(selection.teamName, selection.sport)
                        .then(() => {
                          fetchFavorites();
                          onFavoritesUpdate?.();
                        })
                        .catch(console.error);
                    }
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium">{selection.teamName}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {selection.popularityScore}% popular
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400 capitalize">
                      {selection.sport}
                    </span>
                    {selection.recentOdds && (
                      <span className="font-medium">
                        {selection.recentOdds > 0 ? '+' : ''}{selection.recentOdds}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FavoritesManagement;
