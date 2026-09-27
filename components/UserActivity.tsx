'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { getCurrentUser } from '@/lib/auth'

interface Problem {
  id: string
  title: string
  description: string
  photo_url: string | null
  location: string
  category: string
  status: string
  created_at: string
  upvote_count?: number
}

export default function UserActivity() {
  const [problems, setProblems] = useState<Problem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchUserProblems()
  }, [])

  const fetchUserProblems = async () => {
    try {
      const user = await getCurrentUser()
      if (!user) {
        setError('You must be logged in to view your activity')
        return
      }

      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { data, error } = await supabase
        .from('problems')
        .select('*')
        .eq('submitted_by', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching problems:', error)
        throw error
      }

      console.log('Fetched problems:', data)
      setProblems(data || [])
    } catch (err: any) {
      console.error('Fetch error:', err)
      setError(err.message || 'Failed to fetch your problems')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'assigned':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
      case 'in_progress':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
      case 'resolved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  const getStatusLabel = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  if (loading) {
    return (
      <div className="mt-8">
        <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
          My Activity
        </h3>
        <div className="rounded-xl border border-[#d9d1b9] bg-[#eee8d6] p-5 text-sm text-[#6b8276]">Loading your problems...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mt-8">
        <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
          My Activity
        </h3>
        <div className="rounded-xl border border-[#e0b6a7] bg-[#f7e4dc] p-4 text-sm text-[#8a4533]">
          {error}
        </div>
      </div>
    )
  }

  if (problems.length === 0) {
    return (
      <div className="mt-8">
        <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
          My Activity
        </h3>
        <div className="rounded-xl border border-[#d9d1b9] bg-[#eee8d6] p-8 text-center">
          <p className="text-sm text-[#6b8276]">
            You haven't submitted any problems yet. Click "Report a New Issue" to get started!
          </p>
        </div>
      </div>
    )
  }

  return (
    <section className="mt-9">
      <h3 className="mb-4 text-xl font-extrabold text-[#123f36]">
        My Activity
      </h3>
      
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {problems.map((problem) => (
          <div
            key={problem.id}
            className="flex h-full flex-col overflow-hidden rounded-xl border border-[#d9d1b9] bg-[#eee8d6] shadow-[0_4px_12px_rgba(18,63,54,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(18,63,54,0.13)]"
          >
            {problem.photo_url && (
              <div className="h-44 shrink-0 bg-[#d9d1b9]">
                <img
                  src={problem.photo_url}
                  alt={problem.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            <div className="flex min-h-[230px] flex-1 flex-col p-5">
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-lg font-bold text-[#123f36] line-clamp-2">
                  {problem.title}
                </h4>
              </div>
              
              <p className="mb-3 line-clamp-2 text-sm text-[#45645c]">
                {problem.description}
              </p>
              
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="rounded-full bg-[#dce8d9] px-2 py-1 text-xs font-semibold text-[#155447]">
                  {problem.category}
                </span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(problem.status)}`}>
                  {getStatusLabel(problem.status)}
                </span>
              </div>
              
              <div className="mt-auto flex items-center justify-between text-xs text-[#6b8276]">
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
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
