import { useState, useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { sessionApi, SessionStatus } from '../services/sessionApi';
import { selfExclusionApi, SelfExclusionStatus } from '../services/selfExclusionApi';
import { logout } from '../store/slices/authSlice';
import { RootState } from '../store';

export const useSession = () => {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
  const [selfExclusionStatus, setSelfExclusionStatus] = useState<SelfExclusionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);
  const lastActivityUpdate = useRef(0);

  const checkSelfExclusion = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const status = await selfExclusionApi.getSelfExclusionStatus();
      setSelfExclusionStatus(status);

      // If user is self-excluded, log them out
      if (status.isExcluded) {
        dispatch(logout() as any);
        window.location.href = '/self-excluded';
        return;
      }
    } catch (error) {
      console.error('Failed to check self-exclusion status:', error);
      // Don't throw error, as this might be a temporary network issue
    }
  }, [isAuthenticated, dispatch]);

  const startSession = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      await sessionApi.startSession();
      const status = await sessionApi.getSessionStatus();
      setSessionStatus(status);
    } catch (error) {
      console.error('Failed to start session:', error);
      // Don't throw error, session management is optional
    }
  }, [isAuthenticated]);

  const updateSessionStatus = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const status = await sessionApi.getSessionStatus();
      setSessionStatus(status);

      // If session is not active, user might have been logged out due to time limit
      if (!status.isActive && sessionStatus?.isActive) {
        dispatch(logout() as any);
      }
    } catch (error) {
      console.error('Failed to update session status:', error);
    }
  }, [isAuthenticated, dispatch]); // Removed sessionStatus dependency to prevent loops

  const endSession = useCallback(async () => {
    try {
      await sessionApi.endSession();
      setSessionStatus(null);
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  }, []);

  const updateActivity = useCallback(async () => {
    if (!isAuthenticated || !sessionStatus?.isActive) return;

    try {
      await sessionApi.updateActivity();
    } catch (error) {
      console.error('Failed to update activity:', error);
    }
  }, [isAuthenticated, sessionStatus?.isActive]);

  // Initialize session when user logs in (only once)
  useEffect(() => {
    if (isAuthenticated && !initialized.current) {
      initialized.current = true;
      checkSelfExclusion();
      startSession();
    } else if (!isAuthenticated) {
      initialized.current = false;
      setSessionStatus(null);
      setSelfExclusionStatus(null);
    }
    setLoading(false);
  }, [isAuthenticated, checkSelfExclusion, startSession]);

  // Check session status periodically (reduced frequency)
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(updateSessionStatus, 60000); // Check every 60 seconds instead of 30
    return () => clearInterval(interval);
  }, [isAuthenticated, updateSessionStatus]);

  // Update activity on user interactions (throttled)
  useEffect(() => {
    if (!isAuthenticated || !sessionStatus?.isActive) return;

    const handleUserActivity = () => {
      const now = Date.now();
      if (now - lastActivityUpdate.current > 300000) { // Update at most once per 5 minutes
        lastActivityUpdate.current = now;
        updateActivity();
      }
    };

    // Listen for user activity events
    const events = ['mousedown', 'keypress', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity, true);
      });
    };
  }, [isAuthenticated, sessionStatus?.isActive, updateActivity]);

  // Handle page visibility changes
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateSessionStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAuthenticated, updateSessionStatus]);

  // Handle beforeunload to end session
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleBeforeUnload = () => {
      if (sessionStatus?.isActive) {
        // Use sendBeacon for reliable session end on page unload
        navigator.sendBeacon('/api/users/session/end', JSON.stringify({}));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isAuthenticated, sessionStatus?.isActive]);

  return {
    sessionStatus,
    selfExclusionStatus,
    loading,
    startSession,
    endSession,
    updateActivity,
    updateSessionStatus,
    isSessionActive: sessionStatus?.isActive || false,
    isSelfExcluded: selfExclusionStatus?.isExcluded || false,
  };
};