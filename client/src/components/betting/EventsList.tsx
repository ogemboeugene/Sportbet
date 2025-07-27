import React from 'react';
import { Event } from '../../types';
import { OddsDisplay } from './OddsDisplay';
import { CalendarIcon, ClockIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

interface EventsListProps {
  events: Event[];
  loading?: boolean;
}

export const EventsList: React.FC<EventsListProps> = ({
  events,
  loading = false,
}) => {
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      time: date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
    };
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {[...Array(6)].map((_, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-8 bg-gray-300 rounded w-full mb-2"></div>
            <div className="h-8 bg-gray-300 rounded w-full"></div>
            <div className="flex justify-between mt-4">
              <div className="h-10 bg-gray-200 rounded w-1/3"></div>
              <div className="h-10 bg-gray-200 rounded w-1/3"></div>
              <div className="h-10 bg-gray-200 rounded w-1/3"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="text-center text-gray-500 py-20 bg-white rounded-lg shadow-md">
        <ShieldCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-lg font-medium text-gray-900">No Events Found</h3>
        <p className="mt-1 text-sm text-gray-500">
          There are currently no events matching your criteria. Try selecting a different sport or clearing your search.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {events.map((event) => {
        const { date, time } = formatDateTime(event.startTime);
        const h2hMarket = event.markets?.find(m => m.marketName === 'h2h' || m.marketName === 'Match Winner');

        return (
          <div
            key={event.eventId || event.id}
            className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 flex flex-col"
          >
            <div className="p-4 border-b border-gray-200">
              <div className="flex justify-between items-center text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  <span>{date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ClockIcon className="h-4 w-4" />
                  <span>{time}</span>
                </div>
              </div>
            </div>

            <div className="p-4 flex-grow">
              <p className="text-xs text-gray-400 uppercase tracking-wider">{event.sportKey}</p>
              <h3 className="font-bold text-lg text-gray-800 mt-1">{event.homeTeam}</h3>
              <p className="text-sm text-gray-500">vs</p>
              <h3 className="font-bold text-lg text-gray-800">{event.awayTeam}</h3>
            </div>

            <div className="p-4 bg-gray-50 rounded-b-lg">
              {h2hMarket ? (
                <OddsDisplay
                  event={event}
                  market={h2hMarket}
                />
              ) : (
                <div className="text-center text-sm text-gray-400 py-4">
                  Odds not available
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};