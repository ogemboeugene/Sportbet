import React, { useState, useEffect } from 'react';
import { selfExclusionApi, SelfExclusionStatus } from '../services/selfExclusionApi';

const SelfExcludedPage: React.FC = () => {
  const [status, setStatus] = useState<SelfExclusionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReactivationForm, setShowReactivationForm] = useState(false);
  const [reactivationReason, setReactivationReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const statusData = await selfExclusionApi.getSelfExclusionStatus();
      setStatus(statusData);
    } catch (error) {
      console.error('Failed to load self-exclusion status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReactivationRequest = async () => {
    if (!reactivationReason.trim()) {
      alert('Please provide a reason for reactivation.');
      return;
    }

    setSubmitting(true);
    try {
      await selfExclusionApi.requestReactivation({
        reason: reactivationReason.trim()
      });
      
      alert('Reactivation request submitted successfully. It will be reviewed by our team.');
      setShowReactivationForm(false);
      setReactivationReason('');
      await loadStatus();
    } catch (error) {
      console.error('Failed to submit reactivation request:', error);
      alert('Failed to submit reactivation request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDaysRemaining = (excludedUntil: string) => {
    const endDate = new Date(excludedUntil);
    const now = new Date();
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
              <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Account Self-Excluded</h1>
            <p className="text-gray-600">
              Your account is currently restricted due to self-exclusion.
            </p>
          </div>

          {status && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
              <h2 className="text-lg font-semibold text-red-900 mb-4">Exclusion Details</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-red-700 font-medium">Excluded Since:</span>
                  <span className="text-red-900">
                    {status.excludedAt ? formatDate(status.excludedAt) : 'N/A'}
                  </span>
                </div>
                
                {status.isPermanent ? (
                  <div className="flex justify-between">
                    <span className="text-red-700 font-medium">Type:</span>
                    <span className="text-red-900 font-semibold">Permanent Exclusion</span>
                  </div>
                ) : status.excludedUntil ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-red-700 font-medium">Exclusion Ends:</span>
                      <span className="text-red-900">{formatDate(status.excludedUntil)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-700 font-medium">Days Remaining:</span>
                      <span className="text-red-900 font-semibold">
                        {getDaysRemaining(status.excludedUntil)} days
                      </span>
                    </div>
                  </>
                ) : null}
                
                {status.reason && (
                  <div className="flex justify-between">
                    <span className="text-red-700 font-medium">Reason:</span>
                    <span className="text-red-900">{status.reason}</span>
                  </div>
                )}
              </div>

              {/* Reactivation Request Status */}
              {status.reactivationRequest && (
                <div className="mt-6 pt-4 border-t border-red-200">
                  <h3 className="font-medium text-red-900 mb-2">Reactivation Request</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-red-700">Status:</span>
                      <span className={`font-medium ${
                        status.reactivationRequest.status === 'pending' ? 'text-yellow-600' :
                        status.reactivationRequest.status === 'approved' ? 'text-green-600' :
                        'text-red-600'
                      }`}>
                        {status.reactivationRequest.status.charAt(0).toUpperCase() + 
                         status.reactivationRequest.status.slice(1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-700">Requested:</span>
                      <span className="text-red-900">
                        {formatDate(status.reactivationRequest.requestedAt)}
                      </span>
                    </div>
                    {status.reactivationRequest.status === 'rejected' && status.reactivationRequest.rejectionReason && (
                      <div className="mt-2 p-2 bg-red-100 rounded">
                        <span className="text-red-700 font-medium">Rejection Reason:</span>
                        <p className="text-red-900 mt-1">{status.reactivationRequest.rejectionReason}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reactivation Options */}
          {status && !status.isPermanent && !status.reactivationRequest && status.excludedUntil && 
           getDaysRemaining(status.excludedUntil) === 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Request Account Reactivation</h2>
              <p className="text-gray-600 mb-4">
                Your exclusion period has ended. You can request to reactivate your account.
              </p>
              
              {!showReactivationForm ? (
                <button
                  onClick={() => setShowReactivationForm(true)}
                  className="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  Request Reactivation
                </button>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
                      Reason for Reactivation
                    </label>
                    <textarea
                      id="reason"
                      value={reactivationReason}
                      onChange={(e) => setReactivationReason(e.target.value)}
                      rows={4}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Please explain why you want to reactivate your account..."
                      required
                    />
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={handleReactivationRequest}
                      disabled={submitting || !reactivationReason.trim()}
                      className="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {submitting ? 'Submitting...' : 'Submit Request'}
                    </button>
                    <button
                      onClick={() => {
                        setShowReactivationForm(false);
                        setReactivationReason('');
                      }}
                      disabled={submitting}
                      className="bg-gray-300 text-gray-700 py-2 px-6 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Help Resources */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-blue-900 mb-4">Need Support?</h2>
            <p className="text-blue-800 mb-4">
              If you're struggling with gambling, these resources can provide help and support:
            </p>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white rounded border">
                <div>
                  <h3 className="font-medium text-gray-900">National Problem Gambling Helpline</h3>
                  <p className="text-sm text-gray-600">24/7 confidential support</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-blue-600">1-800-522-4700</p>
                  <a 
                    href="https://www.ncpgambling.org" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Visit Website →
                  </a>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-white rounded border">
                <div>
                  <h3 className="font-medium text-gray-900">Gamblers Anonymous</h3>
                  <p className="text-sm text-gray-600">Fellowship and support groups</p>
                </div>
                <div className="text-right">
                  <a 
                    href="https://www.gamblersanonymous.org" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Visit Website →
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Self-exclusion is a responsible gambling tool designed to help you take control.
            </p>
            <p className="text-sm text-gray-500 mt-1">
              If you have questions, please contact our support team.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelfExcludedPage;