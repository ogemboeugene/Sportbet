import React, { useState, useEffect } from 'react';
import { sessionApi } from '../../services/sessionApi';

interface SessionWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTakeBreak: () => void;
  warningType: 'time_limit' | 'break_reminder' | 'daily_limit';
  message: string;
  remainingTime?: number;
  suggestedBreak?: number;
}

const SessionWarningModal: React.FC<SessionWarningModalProps> = ({
  isOpen,
  onClose,
  onTakeBreak,
  warningType,
  message,
  remainingTime,
  suggestedBreak
}) => {
  const [countdown, setCountdown] = useState(remainingTime || 0);
  const [autoCloseIn, setAutoCloseIn] = useState(30); // Auto-close warning after 30 seconds

  useEffect(() => {
    if (!isOpen) return;

    // Log warning event to session
    sessionApi.updateActivity();

    const interval = setInterval(() => {
      if (warningType === 'time_limit' && countdown > 0) {
        setCountdown(prev => prev - 1);
      }
      
      setAutoCloseIn(prev => {
        if (prev <= 1) {
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, countdown, warningType, onClose]);

  useEffect(() => {
    setCountdown(remainingTime || 0);
    setAutoCloseIn(30);
  }, [remainingTime, isOpen]);

  if (!isOpen) return null;

  const getWarningIcon = () => {
    switch (warningType) {
      case 'time_limit':
        return (
          <svg className="h-8 w-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'break_reminder':
        return (
          <svg className="h-8 w-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'daily_limit':
        return (
          <svg className="h-8 w-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getWarningTitle = () => {
    switch (warningType) {
      case 'time_limit':
        return 'Session Time Limit';
      case 'break_reminder':
        return 'Break Reminder';
      case 'daily_limit':
        return 'Daily Limit Notice';
      default:
        return 'Notice';
    }
  };

  const getWarningColor = () => {
    switch (warningType) {
      case 'time_limit':
        return 'border-red-200 bg-red-50';
      case 'break_reminder':
        return 'border-blue-200 bg-blue-50';
      case 'daily_limit':
        return 'border-yellow-200 bg-yellow-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getPrimaryButtonColor = () => {
    switch (warningType) {
      case 'time_limit':
        return 'bg-red-600 hover:bg-red-700 focus:ring-red-500';
      case 'break_reminder':
        return 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';
      case 'daily_limit':
        return 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500';
      default:
        return 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-lg shadow-xl max-w-md w-full border-2 ${getWarningColor()}`}>
        <div className="p-6">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0">
              {getWarningIcon()}
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-gray-900">
                {getWarningTitle()}
              </h3>
              <p className="text-sm text-gray-500">
                Auto-closing in {autoCloseIn}s
              </p>
            </div>
          </div>
          
          <div className="mb-6">
            <p className="text-gray-700 mb-4">{message}</p>
            
            {warningType === 'time_limit' && countdown > 0 && (
              <div className="bg-red-100 border border-red-200 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-red-800 font-medium">Time Remaining:</span>
                  <span className="text-red-900 font-bold text-lg">
                    {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
                  </span>
                </div>
                <div className="mt-2 w-full bg-red-200 rounded-full h-2">
                  <div 
                    className="bg-red-600 h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${Math.max(0, (countdown / (remainingTime || 1)) * 100)}%` }}
                  ></div>
                </div>
              </div>
            )}

            {suggestedBreak && (
              <div className="text-sm text-gray-600 bg-gray-100 rounded-lg p-3">
                <strong>Suggested break:</strong> {suggestedBreak} minutes
              </div>
            )}
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={onTakeBreak}
              className={`flex-1 text-white py-3 px-4 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${getPrimaryButtonColor()}`}
            >
              {warningType === 'time_limit' ? 'End Session' : 'Take a Break'}
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-md font-medium hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              {warningType === 'time_limit' ? 'Continue' : 'Remind Later'}
            </button>
          </div>

          {warningType === 'time_limit' && countdown <= 60 && (
            <div className="mt-4 text-center">
              <p className="text-sm text-red-600 font-medium">
                ⚠️ Your session will automatically end when the timer reaches zero
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionWarningModal;