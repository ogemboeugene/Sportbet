import React, { useState, useEffect } from 'react'
import { Eye, CheckCircle, XCircle, Clock, Download, Filter } from 'lucide-react'
import toast from 'react-hot-toast'

interface KycSubmission {
  _id: string
  userId: {
    _id: string
    email: string
    profile: {
      firstName: string
      lastName: string
    }
  }
  documentType: string
  fileName: string
  status: string
  submittedAt: string
  rejectionReason?: string
  reviewedAt?: string
}

const KycManagementPage: React.FC = () => {
  const [submissions, setSubmissions] = useState<KycSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [reviewingId, setReviewingId] = useState<string | null>(null)

  useEffect(() => {
    fetchSubmissions()
  }, [currentPage, selectedStatus])

  const fetchSubmissions = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
      })
      
      if (selectedStatus) {
        params.append('status', selectedStatus)
      }

      // Note: This would need to be implemented in the kycApi
      // const response = await kycApi.getAdminSubmissions(params.toString())
      // For now, we'll use mock data
      const mockData = {
        documents: [
          {
            _id: '1',
            userId: {
              _id: 'user1',
              email: 'john.doe@example.com',
              profile: {
                firstName: 'John',
                lastName: 'Doe'
              }
            },
            documentType: 'identity',
            fileName: 'passport.jpg',
            status: 'pending',
            submittedAt: new Date().toISOString(),
          },
          {
            _id: '2',
            userId: {
              _id: 'user2',
              email: 'jane.smith@example.com',
              profile: {
                firstName: 'Jane',
                lastName: 'Smith'
              }
            },
            documentType: 'proof_of_address',
            fileName: 'utility_bill.pdf',
            status: 'pending',
            submittedAt: new Date().toISOString(),
          }
        ],
        pagination: {
          totalPages: 1
        }
      }
      
      setSubmissions(mockData.documents as KycSubmission[])
      setTotalPages(mockData.pagination.totalPages)
    } catch (error: any) {
      toast.error('Failed to load KYC submissions')
    } finally {
      setLoading(false)
    }
  }

  const handleReview = async (documentId: string, action: 'approve' | 'reject', _reason?: string) => {
    setReviewingId(documentId)
    try {
      // Note: This would need to be implemented in the kycApi
      // await kycApi.reviewDocument(documentId, action, reason)
      
      toast.success(`Document ${action}ed successfully`)
      await fetchSubmissions()
    } catch (error: any) {
      toast.error(`Failed to ${action} document`)
    } finally {
      setReviewingId(null)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  const formatDocumentType = (type: string) => {
    const typeMap: Record<string, string> = {
      identity: 'Government ID',
      proof_of_address: 'Proof of Address',
      selfie: 'Selfie with ID',
      additional: 'Additional Document'
    };
    return typeMap[type] || type;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">KYC Management</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Review and manage user identity verification submissions
          </p>
        </div>
        
        <button className="btn btn-secondary">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <Filter className="h-4 w-4 text-gray-400 mr-2" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by status:</span>
          </div>
          
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value)
              setCurrentPage(1)
            }}
            className="input w-auto"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            KYC Submissions
          </h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="loading-spinner w-8 h-8"></div>
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center p-8 text-gray-500 dark:text-gray-400">
            No KYC submissions found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Document Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {submissions.map((submission) => (
                  <tr key={submission._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {submission.userId.profile.firstName} {submission.userId.profile.lastName}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {submission.userId.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {formatDocumentType(submission.documentType)}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {submission.fileName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(submission.status)}
                        <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getStatusColor(submission.status)}`}>
                          {submission.status}
                        </span>
                      </div>
                      {submission.rejectionReason && (
                        <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                          {submission.rejectionReason}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(submission.submittedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button className="text-primary-600 hover:text-primary-900 dark:text-primary-400">
                          <Eye className="h-4 w-4" />
                        </button>
                        
                        {submission.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleReview(submission._id, 'approve')}
                              disabled={reviewingId === submission._id}
                              className="text-green-600 hover:text-green-900 dark:text-green-400 disabled:opacity-50"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            
                            <button
                              onClick={() => {
                                const reason = prompt('Enter rejection reason:')
                                if (reason) {
                                  handleReview(submission._id, 'reject', reason)
                                }
                              }}
                              disabled={reviewingId === submission._id}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 disabled:opacity-50"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="btn btn-sm btn-secondary disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="btn btn-sm btn-secondary disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default KycManagementPage