import React from 'react';

interface SessionMonitorProps {
  onSessionEnd?: () => void;
}

const SessionMonitor: React.FC<SessionMonitorProps> = () => {
  // Temporarily disabled to prevent infinite API calls
  // TODO: Re-enable with proper throttling and dependency management
  return null;
};

export default SessionMonitor;