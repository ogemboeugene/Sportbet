import React, { useState, useEffect } from 'react'
import { Shield, Upload, CheckCircle, XCircle, Clock, AlertTriangle, FileText, Camera, Home } from 'lucide-react'
import { kycApi, KycStatus } from '../services/kycApi'
import { useAppSelector } from '../hooks/redux'
import toast from 'react-hot-toast'

const KycPage: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth)
  const [kycStatus, setKycStatus] = useState<KycStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchKycStatus()
  }, [])

  const fetchKycStatus = async () => {
    try {
      const response = await kycApi.getKycStatus()
      setKycStatus(response.data)
    } catch (error: any) {
      if (error.response?.status === 404) {
        // KYC not initiated yet
        await initiateKyc()
      } else {
        toast.error('Failed to load KYC status')
      }
    } finally {
      setLoading(false)
    }
  }

  const initiateKyc = async () => {
    try {
      await kycApi.initiateKyc()
      await fetchKycStatus()
    } catch (error: any) {
      toast.error('Failed to initiate KYC process')
    }
  }

  const handleFileUpload = async (documentType: string, file: File) => {
    setUploading(documentType)
    try {
      await kycApi.uploadDocument(documentType, file)
      toast.success('Document uploaded successfully!')
      await fetchKycStatus()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to upload document')
    } finally {
      setUploading(null)
    }
  }

  const handleSubmitForReview = async () => {
    setSubmitting(true)
    try {
      await kycApi.submitForReview()
      toast.success('KYC documents submitted for review!')
      await fetchKycStatus()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit for review')
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="h-6 w-6 text-green-600" />
      case 'rejected':
        return <XCircle className="h-6 w-6 text-red-600" />
      case 'pending':
        return <Clock className="h-6 w-6 text-yellow-600" />
      default:
        return <AlertTriangle className="h-6 w-6 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'identity':
        return <FileText className="h-5 w-5" />
      case 'proof_of_address':
        return <Home className="h-5 w-5" />
      case 'selfie':
        return <Camera className="h-5 w-5" />
      default:
        return <FileText className="h-5 w-5" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!kycStatus) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Unable to load KYC status</p>
          <button 
            onClick={fetchKycStatus}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (user?.kycStatus === 'verified') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
          <div className="mx-auto h-16 w-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Identity Verified!
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Your identity has been successfully verified. You now have full access to all platform features.
          </p>
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-green-900 dark:text-green-300 mb-2">
              What's unlocked:
            </h3>
            <ul className="text-sm text-green-800 dark:text-green-400 space-y-1">
              <li>• Unlimited deposits and withdrawals</li>
              <li>• Access to all betting markets</li>
              <li>• Premium customer support</li>
              <li>• Higher betting limits</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Identity Verification</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Complete your identity verification to unlock all platform features and higher limits.
        </p>
      </div>

      {/* Status Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="p-3 bg-primary-100 dark:bg-primary-900 rounded-lg">
              <Shield className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Verification Status
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Current status of your identity verification
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {getStatusIcon(user?.kycStatus || 'pending')}
            <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor(user?.kycStatus || 'pending')}`}>
              {user?.kycStatus === 'approved' ? 'Verified' :
               user?.kycStatus === 'pending' ? 'Under Review' :
               user?.kycStatus === 'rejected' ? 'Rejected' : 'Not Started'}
            </span>
          </div>
        </div>

        {user?.kycStatus === 'rejected' && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center">
              <XCircle className="h-5 w-5 text-red-600 mr-2" />
              <h4 className="text-sm font-medium text-red-900 dark:text-red-300">
                Verification Rejected
              </h4>
            </div>
            <p className="mt-2 text-sm text-red-800 dark:text-red-400">
              Your documents were rejected. Please review the feedback below and resubmit with corrected documents.
            </p>
          </div>
        )}

        {/* Progress Steps */}
        <div className="space-y-4">
          <div className="flex items-center text-sm">
            <div className="flex-shrink-0 w-6 h-6 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <span className="ml-3 text-gray-900 dark:text-white">Account created</span>
          </div>
          
          <div className="flex items-center text-sm">
            <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
              kycStatus?.documents?.length ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-100 dark:bg-gray-700'
            }`}>
              {kycStatus?.documents?.length ? (
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              ) : (
                <span className="text-xs text-gray-500">2</span>
              )}
            </div>
            <span className={`ml-3 ${kycStatus?.documents?.length ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>
              Documents uploaded
            </span>
          </div>
          
          <div className="flex items-center text-sm">
            <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
              user?.kycStatus === 'approved' ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-100 dark:bg-gray-700'
            }`}>
              {user?.kycStatus === 'approved' ? (
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              ) : (
                <span className="text-xs text-gray-500">3</span>
              )}
            </div>
            <span className={`ml-3 ${user?.kycStatus === 'approved' ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>
              Identity verified
            </span>
          </div>
        </div>
      </div>

      {/* Document Upload */}
      {kycStatus && user?.kycStatus !== 'approved' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
            Required Documents
          </h3>
          
          <div className="space-y-6">
            {kycStatus?.requiredDocuments?.map((requiredDoc) => {
              const uploadedDoc = kycStatus?.documents?.find(doc => doc.type === requiredDoc.type)
              
              return (
                <div key={requiredDoc.type} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start">
                      <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        {getDocumentIcon(requiredDoc.type)}
                      </div>
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          {requiredDoc.name}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {requiredDoc.description}
                        </p>
                        
                        {uploadedDoc && (
                          <div className="mt-2 flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(uploadedDoc.status)}`}>
                              {uploadedDoc.status}
                            </span>
                            <span className="text-xs text-gray-500">
                              {uploadedDoc.fileName}
                            </span>
                          </div>
                        )}
                        
                        {uploadedDoc?.rejectionReason && (
                          <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                            Rejection reason: {uploadedDoc.rejectionReason}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex-shrink-0">
                      {uploadedDoc && uploadedDoc.status === 'approved' ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <label className="btn btn-sm btn-secondary cursor-pointer">
                          {uploading === requiredDoc.type ? (
                            <div className="loading-spinner w-4 h-4" />
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-2" />
                              {uploadedDoc ? 'Replace' : 'Upload'}
                            </>
                          )}
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*,.pdf"
                            disabled={uploading === requiredDoc.type}
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                handleFileUpload(requiredDoc.type, file)
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Submit Button */}
          {kycStatus.documents.length > 0 && user?.kycStatus !== 'pending' && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Ready to submit your documents for review?
                  </p>
                </div>
                <button
                  onClick={handleSubmitForReview}
                  disabled={submitting}
                  className="btn btn-primary"
                >
                  {submitting ? (
                    <div className="loading-spinner w-5 h-5" />
                  ) : (
                    'Submit for Review'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Help Section */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 dark:text-blue-300 mb-4">
          Need Help?
        </h3>
        <div className="space-y-3 text-sm text-blue-800 dark:text-blue-400">
          <p>• Ensure documents are clear, well-lit, and all corners are visible</p>
          <p>• Accepted formats: JPEG, PNG, PDF (max 10MB per file)</p>
          <p>• Documents must be valid and not expired</p>
          <p>• Selfie should clearly show your face and the ID document</p>
          <p>• Processing typically takes 1-3 business days</p>
        </div>
        
        <div className="mt-4">
          <button className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
            Contact Support →
          </button>
        </div>
      </div>
    </div>
  )
}

export default KycPage