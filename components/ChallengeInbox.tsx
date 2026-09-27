'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { getCurrentUser, getUserProfile } from '@/lib/auth'
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
  submitted_by?: string
}

export default function ChallengeInbox() {
  const [problems, setProblems] = useState<Problem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; problemId: string | null }>({ open: false, problemId: null })
  const [rejectReason, setRejectReason] = useState('')

  useEffect(() => {
    fetchChallenges()
  }, [])

  const fetchChallenges = async () => {
    try {
      const user = await getCurrentUser()
      if (!user) {
        setError('You must be logged in to view challenges')
        return
      }

      const profile = await getUserProfile(user.id)
      if (!profile || profile.role !== 'university') {
        setError('Only university users can view challenges')
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

      // Fetch university's expertise_tags from universities table
      const { data: universityData, error: universityError } = await supabase
        .from('universities')
        .select('expertise_tags')
        .eq('id', profile.university_id)
        .single()

      if (universityError) throw universityError

      const expertiseTags = universityData?.expertise_tags || []
      console.log('University expertise tags:', expertiseTags, 'University ID:', profile.university_id)

      // Fetch problems matching expertise categories and submitted status
      const { data, error } = await supabase
        .from('problems')
        .select('*, submitted_by')
        .eq('status', 'submitted')
        .in('category', expertiseTags.length > 0 ? expertiseTags : ['Education'])
        .order('created_at', { ascending: false })

      if (error) throw error

      console.log('Fetched challenges:', data)
      setProblems(data || [])
    } catch (err: any) {
      console.error('Error fetching challenges:', err)
      setError(err.message || 'Failed to fetch challenges')
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async (problemId: string) => {
    setProcessing(problemId)
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

      // Get problem details before updating
      const { data: problemData, error: problemError } = await supabase
        .from('problems')
        .select('title, submitted_by')
        .eq('id', problemId)
        .single()

      if (problemError) throw problemError

      // Get university name
      const { data: universityData, error: universityError } = await supabase
        .from('universities')
        .select('name')
        .eq('id', profile.university_id)
        .single()

      if (universityError) throw universityError

      const { error } = await supabase
        .from('problems')
        .update({ 
          status: 'assigned',
          assigned_university: profile.university_id
        })
        .eq('id', problemId)

      if (error) throw error

      // Create notification for the citizen
      if (problemData?.submitted_by) {
        try {
          await createNotification({
            userId: problemData.submitted_by,
            problemId: problemId,
            message: `Your issue "${problemData.title}" was accepted by ${universityData?.name || 'a university'}`,
            type: 'success'
          })
        } catch (notificationError) {
          console.error('Error creating notification:', notificationError)
          // Don't throw error - notification failure shouldn't break the main flow
        }
      }

      // Refresh the list
      await fetchChallenges()
    } catch (err: any) {
      console.error('Error accepting challenge:', err)
      setError(err.message || 'Failed to accept challenge')
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (problemId: string) => {
    setRejectDialog({ open: true, problemId })
  }

  const handleRejectConfirm = async () => {
    if (!rejectDialog.problemId) return

    setProcessing(rejectDialog.problemId)
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

      // Get problem details before updating
      const { data: problemData, error: problemError } = await supabase
        .from('problems')
        .select('title, submitted_by')
        .eq('id', rejectDialog.problemId)
        .single()

      if (problemError) throw problemError

      // Get university name
      const { data: universityData, error: universityError } = await supabase
        .from('universities')
        .select('name')
        .eq('id', profile.university_id)
        .single()

      if (universityError) throw universityError

      const { error } = await supabase
        .from('problems')
        .update({ 
          status: 'under_review',
          note: rejectReason
        })
        .eq('id', rejectDialog.problemId)

      if (error) throw error

      // Create notification for the citizen
      if (problemData?.submitted_by) {
        try {
          await createNotification({
            userId: problemData.submitted_by,
            problemId: rejectDialog.problemId,
            message: `Your issue "${problemData.title}" was rejected by ${universityData?.name || 'a university'}: ${rejectReason}`,
            type: 'warning'
          })
        } catch (notificationError) {
          console.error('Error creating notification:', notificationError)
          // Don't throw error - notification failure shouldn't break the main flow
        }
      }

      // Reset dialog and refresh
      setRejectDialog({ open: false, problemId: null })
      setRejectReason('')
      await fetchChallenges()
    } catch (err: any) {
      console.error('Error rejecting challenge:', err)
      setError(err.message || 'Failed to reject challenge')
    } finally {
      setProcessing(null)
    }
  }

  const handleRejectCancel = () => {
    setRejectDialog({ open: false, problemId: null })
    setRejectReason('')
  }

  if (loading) {
    return (
      <div className="mt-8">
        <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
          Challenge Inbox
        </h3>
        <div className="text-zinc-600 dark:text-zinc-400">Loading challenges...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mt-8">
        <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
          Challenge Inbox
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
          Challenge Inbox
        </h3>
        <div className="p-8 bg-white dark:bg-black rounded-lg border border-zinc-200 dark:border-zinc-800 text-center">
          <p className="text-zinc-600 dark:text-zinc-400">
            No new challenges available. Check back later!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-8">
      <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
        Challenge Inbox
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
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  {problem.category}
                </span>
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                  {problem.location}
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
                <button
                  onClick={() => handleAccept(problem.id)}
                  disabled={processing === problem.id}
                  className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing === problem.id ? 'Processing...' : 'Accept'}
                </button>
                <button
                  onClick={() => handleReject(problem.id)}
                  disabled={processing === problem.id}
                  className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing === problem.id ? 'Processing...' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Reject Confirmation Dialog */}
      {rejectDialog.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
              Reject Challenge
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Please provide a reason for rejecting this challenge:
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              rows={3}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleRejectCancel}
                className="px-4 py-2 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-900 dark:text-zinc-50 text-sm font-medium rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectConfirm}
                disabled={!rejectReason.trim() || processing === rejectDialog.problemId}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing === rejectDialog.problemId ? 'Processing...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
