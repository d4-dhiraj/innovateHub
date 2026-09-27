'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { getCurrentUser, getUserProfile } from '@/lib/auth'
import { uploadProblemPhoto } from '@/lib/storage'
import { createNotification } from '@/lib/notifications'

interface Problem {
  id: string
  title: string
  description: string
  photo_url: string | null
  location: string
  category: string
  status: string
  created_at: string
  note?: string
  upvote_count?: number
}

interface IndustryPartner {
  id: string
  problem_id: string
  industry_id: string
  collaboration_type: string
  status: string
  org_name: string
  org_type: string
  problem_title?: string
}

export default function AssignedChallenges() {
  const [problems, setProblems] = useState<Problem[]>([])
  const [industryPartners, setIndustryPartners] = useState<Map<string, IndustryPartner[]>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)
  const [resolveDialog, setResolveDialog] = useState<{ open: boolean; problemId: string | null }>({ open: false, problemId: null })
  const [afterPhoto, setAfterPhoto] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [partnerProcessing, setPartnerProcessing] = useState<string | null>(null)

  useEffect(() => {
    fetchAssignedChallenges()
  }, [])

  const fetchAssignedChallenges = async () => {
    try {
      const user = await getCurrentUser()
      if (!user) {
        setError('You must be logged in to view assigned challenges')
        return
      }

      const profile = await getUserProfile(user.id)
      if (!profile || profile.role !== 'university') {
        setError('Only university users can view assigned challenges')
        return
      }

      if (!profile.university_id) {
        setError('University ID not found in profile')
        return
      }

      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      // Fetch problems assigned to this university
      const { data, error } = await supabase
        .from('problems')
        .select('*')
        .eq('assigned_university', profile.university_id)
        .in('status', ['assigned', 'in_progress'])
        .order('created_at', { ascending: false })

      if (error) throw error

      console.log('Fetched assigned challenges:', data)
      setProblems(data || [])

      // Fetch industry partners for these problems
      if (data && data.length > 0) {
        const problemIds = data.map(p => p.id)
        const { data: partnersData, error: partnersError } = await supabase
          .from('project_partners')
          .select('id, problem_id, industry_id, collaboration_type, status')
          .in('problem_id', problemIds)
          .order('created_at', { ascending: false })

        if (partnersError) throw partnersError

        // Fetch industry profiles to get org names and types
        const industryIds = [...new Set(partnersData?.map(p => p.industry_id) || [])]
        const { data: industryProfiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, org_name, org_type')
          .in('id', industryIds)

        if (profilesError) throw profilesError

        // Create a map of problem titles
        const problemTitleMap = new Map(data.map(p => [p.id, p.title]))

        // Map industry profiles to partners
        const industryMap = new Map(industryProfiles?.map(p => [p.id, p]) || [])
        const partnersWithDetails = (partnersData || []).map(partner => ({
          ...partner,
          org_name: industryMap.get(partner.industry_id)?.org_name || 'Unknown Organization',
          org_type: industryMap.get(partner.industry_id)?.org_type || 'Unknown Type',
          problem_title: problemTitleMap.get(partner.problem_id) || 'Unknown Project'
        }))

        // Group partners by problem_id
        const partnersByProblem = new Map<string, IndustryPartner[]>()
        partnersWithDetails.forEach(partner => {
          const existing = partnersByProblem.get(partner.problem_id) || []
          partnersByProblem.set(partner.problem_id, [...existing, partner])
        })

        setIndustryPartners(partnersByProblem)
      }
    } catch (err: any) {
      console.error('Error fetching assigned challenges:', err)
      setError(err.message || 'Failed to fetch assigned challenges')
    } finally {
      setLoading(false)
    }
  }

  const handleMarkResolved = async (problemId: string) => {
    setResolveDialog({ open: true, problemId })
  }

  const handleResolveConfirm = async () => {
    if (!resolveDialog.problemId) return

    setProcessing(resolveDialog.problemId)
    setUploading(true)
    try {
      const user = await getCurrentUser()
      if (!user) return

      const profile = await getUserProfile(user.id)
      if (!profile || !profile.university_id) {
        setError('University ID not found in profile')
        return
      }

      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      let afterPhotoUrl = null

      // Upload after photo if provided
      if (afterPhoto) {
        try {
          afterPhotoUrl = await uploadProblemPhoto(afterPhoto, user.id)
          console.log('After photo uploaded successfully:', afterPhotoUrl)
        } catch (uploadError: any) {
          throw new Error(uploadError.message)
        }
      }

      const { error } = await supabase
        .from('problems')
        .update({ 
          status: 'resolved',
          after_photo_url: afterPhotoUrl
        })
        .eq('id', resolveDialog.problemId)

      if (error) throw error

      // Reset dialog and refresh
      setResolveDialog({ open: false, problemId: null })
      setAfterPhoto(null)
      await fetchAssignedChallenges()
    } catch (err: any) {
      console.error('Error marking as resolved:', err)
      setError(err.message || 'Failed to mark as resolved')
    } finally {
      setProcessing(null)
      setUploading(false)
    }
  }

  const handleResolveCancel = () => {
    setResolveDialog({ open: false, problemId: null })
    setAfterPhoto(null)
  }

  const handleSetInProgress = async (problemId: string) => {
    setProcessing(problemId)
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { error } = await supabase
        .from('problems')
        .update({ status: 'in_progress' })
        .eq('id', problemId)

      if (error) throw error

      await fetchAssignedChallenges()
    } catch (err: any) {
      console.error('Error setting in progress:', err)
      setError(err.message || 'Failed to update status')
    } finally {
      setProcessing(null)
    }
  }

  const handleAcceptPartner = async (partnerId: string, problemTitle: string) => {
    setPartnerProcessing(partnerId)
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      // Get partnership details before updating
      const { data: partnershipData, error: partnershipError } = await supabase
        .from('project_partners')
        .select('industry_id, problem_id')
        .eq('id', partnerId)
        .single()

      if (partnershipError) throw partnershipError

      const { error } = await supabase
        .from('project_partners')
        .update({ status: 'accepted' })
        .eq('id', partnerId)

      if (error) throw error

      // Create notification for the industry partner
      if (partnershipData?.industry_id) {
        try {
          await createNotification({
            userId: partnershipData.industry_id,
            problemId: partnershipData.problem_id,
            message: `Your interest in "${problemTitle}" was accepted`,
            type: 'success'
          })
        } catch (notificationError) {
          console.error('Error creating notification:', notificationError)
          // Don't throw error - notification failure shouldn't break the main flow
        }
      }

      await fetchAssignedChallenges()
      
      console.log(`Partner ${partnerId} accepted successfully`)
    } catch (err: any) {
      console.error('Error accepting partner:', err)
      setError(err.message || 'Failed to accept partnership')
    } finally {
      setPartnerProcessing(null)
    }
  }

  const handleDeclinePartner = async (partnerId: string, problemTitle: string) => {
    setPartnerProcessing(partnerId)
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      // Get partnership details before updating
      const { data: partnershipData, error: partnershipError } = await supabase
        .from('project_partners')
        .select('industry_id, problem_id')
        .eq('id', partnerId)
        .single()

      if (partnershipError) throw partnershipError

      const { error } = await supabase
        .from('project_partners')
        .update({ status: 'declined' })
        .eq('id', partnerId)

      if (error) throw error

      // Create notification for the industry partner
      if (partnershipData?.industry_id) {
        try {
          await createNotification({
            userId: partnershipData.industry_id,
            problemId: partnershipData.problem_id,
            message: `Your interest in "${problemTitle}" was declined`,
            type: 'warning'
          })
        } catch (notificationError) {
          console.error('Error creating notification:', notificationError)
          // Don't throw error - notification failure shouldn't break the main flow
        }
      }

      await fetchAssignedChallenges()
      
      console.log(`Partner ${partnerId} declined successfully`)
    } catch (err: any) {
      console.error('Error declining partner:', err)
      setError(err.message || 'Failed to decline partnership')
    } finally {
      setPartnerProcessing(null)
    }
  }

  if (loading) {
    return (
      <div className="mt-8">
        <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
          Assigned Challenges
        </h3>
        <div className="text-zinc-600 dark:text-zinc-400">Loading assigned challenges...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mt-8">
        <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
          Assigned Challenges
        </h3>
        <div className="p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 rounded">
          {error}
        </div>
      </div>
    )
  }

  if (problems.length === 0) {
    return (
      <div className="mt-8">
        <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
          Assigned Challenges
        </h3>
        <div className="p-8 bg-white dark:bg-black rounded-lg border border-zinc-200 dark:border-zinc-800 text-center">
          <p className="text-zinc-600 dark:text-zinc-400">
            No assigned challenges yet. Accept challenges from the inbox to get started!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-8">
      <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
        Assigned Challenges
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {problems.map((problem) => (
          <div
            key={problem.id}
            className="bg-white dark:bg-black rounded-lg shadow border border-zinc-200 dark:border-zinc-800 overflow-hidden hover:shadow-lg transition-shadow"
          >
            {problem.photo_url && (
              <div className="h-48 bg-zinc-100 dark:bg-zinc-800">
                <img
                  src={problem.photo_url}
                  alt={problem.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 line-clamp-2">
                  {problem.title}
                </h4>
              </div>
              
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3 line-clamp-2">
                {problem.description}
              </p>
              
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="university-category-tag">
                  {problem.category}
                </span>
                <span className={`university-status-tag ${
                  problem.status === 'assigned' 
                    ? 'is-assigned'
                    : 'is-progress'
                }`}>
                  {problem.status === 'assigned' ? 'Assigned' : 'In Progress'}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-500 mb-4">
                <span>{new Date(problem.created_at).toLocaleDateString()}</span>
                {problem.upvote_count !== undefined && (
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M5 15l7-7 7 7" />
                    </svg>
                    <span className="font-medium">{problem.upvote_count}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {problem.status === 'assigned' && (
                  <button
                    onClick={() => handleSetInProgress(problem.id)}
                    disabled={processing === problem.id}
                    className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing === problem.id ? 'Processing...' : 'Start Work'}
                  </button>
                )}
                <button
                  onClick={() => handleMarkResolved(problem.id)}
                  disabled={processing === problem.id}
                  className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing === problem.id ? 'Processing...' : 'Mark Resolved'}
                </button>
              </div>

              {/* Industry Partners Section */}
              {industryPartners.get(problem.id) && industryPartners.get(problem.id)!.length > 0 && (
                <div className="university-partners mt-4 border-t pt-4">
                  <h5 className="university-partners-title mb-3">
                    <span className="university-partners-icon">↗</span>
                    Industry Partner Interest
                  </h5>
                  <div className="space-y-2">
                    {industryPartners.get(problem.id)!.map((partner) => (
                      <div
                        key={partner.id}
                        className="university-partner-card"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <div>
                            <p className="university-partner-name">
                              {partner.org_name}
                            </p>
                            <p className="university-partner-detail">
                              {partner.org_type} <span aria-hidden="true">|</span> {partner.collaboration_type}
                            </p>
                          </div>
                          <span className={`university-partner-status ${
                            partner.status === 'pending' || partner.status === 'interested'
                              ? 'is-interested'
                              : partner.status === 'accepted'
                              ? 'is-accepted'
                              : 'is-declined'
                          }`}>
                            {partner.status.charAt(0).toUpperCase() + partner.status.slice(1)}
                          </span>
                        </div>
                        {(partner.status === 'pending' || partner.status === 'interested') && (
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => handleAcceptPartner(partner.id, partner.problem_title || 'project')}
                              disabled={partnerProcessing === partner.id}
                              className="university-partner-action is-accept flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {partnerProcessing === partner.id ? 'Processing...' : 'Accept'}
                            </button>
                            <button
                              onClick={() => handleDeclinePartner(partner.id, partner.problem_title || 'project')}
                              disabled={partnerProcessing === partner.id}
                              className="university-partner-action is-decline flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {partnerProcessing === partner.id ? 'Processing...' : 'Decline'}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Mark Resolved Dialog */}
      {resolveDialog.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
              Mark as Resolved
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Upload an after photo to show the resolved state (optional):
            </p>
            
            <div className="mb-4">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setAfterPhoto(e.target.files?.[0] || null)}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={handleResolveCancel}
                disabled={uploading}
                className="px-4 py-2 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-900 dark:text-zinc-50 text-sm font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleResolveConfirm}
                disabled={uploading}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'Uploading...' : 'Confirm Resolved'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}