import { api } from './api';
import { Sport, Event } from '../types';

// Get all sports
export const getSports = async (): Promise<Sport[]> => {
  const response = await api.get('/odds/sports');
  return response.data;
};

// Get events by sport
export const getEventsBySport = async (
  sportKey: string,
  limit: number = 50,
  status: string = 'upcoming'
): Promise<Event[]> => {
  const params = new URLSearchParams();
  params.append('limit', limit.toString());
  params.append('status', status);

  const response = await api.get(`/odds/sports/${sportKey}/events?${params.toString()}`);
  return response.data;
};

// Get event by ID
export const getEventById = async (eventId: string): Promise<Event> => {
  const response = await api.get(`/odds/events/${eventId}`);
  return response.data;
};

// Get popular events
export const getPopularEvents = async (): Promise<Event[]> => {
  const response = await api.get('/odds/popular');
  return response.data;
};

// Search events
export const searchEvents = async (query: string): Promise<Event[]> => {
  const response = await api.get(`/odds/search?q=${encodeURIComponent(query)}`);
  return response.data;
};

// Get odds for sport (uses direct API data)
export const getOddsForSport = async (
  sportKey: string, 
  region: string = 'eu', 
  market: string = 'h2h'
): Promise<any[]> => {
  const response = await api.get(`/odds/sports/${sportKey}/odds?region=${region}&market=${market}`);
  return response.data;
};

// Get live events
export const getLiveEvents = async (): Promise<Event[]> => {
  const response = await api.get('/odds/live');
  return response.data;
};

// Get upcoming events
export const getUpcomingEvents = async (
  limit: number = 100,
  hours: number = 24
): Promise<Event[]> => {
  const params = new URLSearchParams();
  params.append('limit', limit.toString());
  params.append('hours', hours.toString());

  const response = await api.get(`/odds/upcoming?${params.toString()}`);
  return response.data;
};

// Sync sports (admin only)
export const syncSports = async (): Promise<{ message: string }> => {
  const response = await api.post('/odds/sync/sports');
  return response.data;
};

// Sync odds for sport (admin only)
export const syncOddsForSport = async (sportKey: string): Promise<{ message: string }> => {
  const response = await api.post(`/odds/sync/odds/${sportKey}`);
  return response.data;
};