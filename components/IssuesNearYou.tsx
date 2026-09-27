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

export default function IssuesNearYou() {
  const [problems, setProblems] = useState<Problem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [upvoting, setUpvoting] = useState<string | null>(null)
  const [userLocations, setUserLocations] = useState<string[]>([])
  const [upvotedProblems, setUpvotedProblems] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchNearbyIssues()
    fetchUserUpvotes()
  }, [])

  const fetchUserUpvotes = async () => {
    try {
      const user = await getCurrentUser()
      if (!user) return

      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { data, error } = await supabase
        .from('problem_upvotes')
        .select('problem_id')
        .eq('user_id', user.id)

      if (error) throw error

      const upvotedIds = new Set(data?.map(u => u.problem_id) || [])
      setUpvotedProblems(upvotedIds)
    } catch (err) {
      console.error('Error fetching user upvotes:', err)
    }
  }

  const fetchNearbyIssues = async () => {
    try {
      const user = await getCurrentUser()
      if (!user) {
        setError('You must be logged in to view issues near you')
        return
      }

      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      // First, get the user's submitted problems to know their locations
      const { data: userProblems, error: userProblemsError } = await supabase
        .from('problems')
        .select('location')
        .eq('submitted_by', user.id)

      if (userProblemsError) throw userProblemsError

      // Extract unique locations from user's submissions
      const locations = [...new Set(userProblems?.map(p => p.location).filter(Boolean) || [])]
      setUserLocations(locations)

      // Use the user's locations when available; otherwise keep the section useful
      // for new citizens by showing the latest community issues.
      let issuesQuery = supabase
        .from('problems')
        .select('*')
        .neq('submitted_by', user.id)

      if (locations.length > 0) {
        issuesQuery = issuesQuery.in('location', locations)
      }

      const { data, error } = await issuesQuery
        .order('upvote_count', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(12)

      if (error) throw error

      console.log('Fetched nearby issues:', data)
      setProblems(data || [])
    } catch (err: any) {
      console.error('Error fetching nearby issues:', err)
      setError(err.message || 'Failed to fetch issues near you')
    } finally {
      setLoading(false)
    }
  }

  const handleUpvote = async (problemId: string) => {
    // Check if already upvoted
    if (upvotedProblems.has(problemId)) {
      return // Already upvoted, do nothing
    }

    setUpvoting(problemId)
    try {
      const user = await getCurrentUser()
      if (!user) {
        setError('You must be logged in to upvote')
        return
      }

      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      // Insert upvote record (will fail if already exists due to UNIQUE constraint)
      const { error: upvoteError } = await supabase
        .from('problem_upvotes')
        .insert({
          problem_id: problemId,
          user_id: user.id
        })

      if (upvoteError) {
        // If it's a duplicate error, just ignore it
        if (upvoteError.code === '23505') {
          console.log('Already upvoted')
          return
        }
        throw upvoteError
      }

      // Increment upvote count
      const { error } = await supabase
        .from('problems')
        .update({ upvote_count: (problems.find(p => p.id === problemId)?.upvote_count || 0) + 1 })
        .eq('id', problemId)

      if (error) throw error

      // Update local state
      setProblems(problems.map(p =>
        p.id === problemId
          ? { ...p, upvote_count: (p.upvote_count || 0) + 1 }
          : p
      ))

      // Add to upvoted set
      setUpvotedProblems(prev => new Set(prev).add(problemId))
    } catch (err: any) {
      console.error('Error upvoting:', err)
      setError(err.message || 'Failed to upvote')
    } finally {
      setUpvoting(null)
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
      <div className="mt-9">
        <h3 className="mb-4 text-xl font-extrabold text-[#123f36]">
          Issues Near You
        </h3>
        <div className="rounded-xl border border-[#d9d1b9] bg-[#eee8d6] p-5 text-sm text-[#6b8276]">Loading issues near you...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mt-8">
        <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
          Issues Near You
        </h3>
        <div className="rounded-xl border border-[#e0b6a7] bg-[#f7e4dc] p-4 text-sm text-[#8a4533]">
          {error}
        </div>
      </div>
    )
  }

  if (userLocations.length === 0 && problems.length === 0) {
    return (
      <div className="mt-8">
        <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
          Issues Near You
        </h3>
        <div className="rounded-xl border border-[#d9d1b9] bg-[#eee8d6] p-8 text-center">
          <p className="text-sm text-[#6b8276]">
            Report an issue with your location to see problems from your area!
          </p>
        </div>
      </div>
    )
  }

  if (problems.length === 0) {
    return (
      <div className="mt-8">
        <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
          Issues Near You
        </h3>
        <div className="p-8 bg-white dark:bg-black rounded-lg border border-zinc-200 dark:border-zinc-800 text-center">
          <p className="text-zinc-600 dark:text-zinc-400">
            No other issues found in your area yet. Be the first to report problems in your location!
          </p>
        </div>
      </div>
    )
  }

  return (
    <section className="mt-9">
      <div className="mb-4 flex items-end justify-between gap-4">
      <div>
      <h3 className="text-xl font-extrabold text-[#123f36]">
        Issues Near You
      </h3>
      <p className="mt-1 text-sm text-[#6b8276]">
        See what other citizens in your area are reporting and upvote issues that matter to you
      </p>
      </div>
      <span className="hidden rounded-full bg-[#dce8d9] px-3 py-1 text-xs font-bold text-[#155447] sm:inline-block">Community feed</span>
      </div>
      
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {problems.map((problem) => (
          <div
            key={problem.id}
            className="citizen-issue-card flex h-full flex-col overflow-hidden rounded-xl border border-[#d9d1b9] bg-[#eee8d6] shadow-[0_4px_12px_rgba(18,63,54,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(18,63,54,0.13)]"
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
            
            <div className="flex min-h-[300px] flex-1 flex-col p-5">
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
              
              <div className="mb-4 flex items-center justify-between gap-3 text-xs text-[#6b8276]">
                <span className="min-w-0 truncate">{problem.location}</span>
                <span>{new Date(problem.created_at).toLocaleDateString()}</span>
              </div>

              <button
                onClick={() => handleUpvote(problem.id)}
                disabled={upvoting === problem.id || upvotedProblems.has(problem.id)}
                className={`mt-auto flex min-h-12 w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold transition-all ${
                  upvotedProblems.has(problem.id)
                    ? 'cursor-not-allowed bg-[#cfd6c9] text-[#587064]'
                    : 'bg-[#155447] text-white hover:bg-[#0f4035]'
                }`}
              >
                <svg
                  className="h-5 w-5 shrink-0"
                  fill={upvotedProblems.has(problem.id) ? "currentColor" : "none"}
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 15l7-7 7 7"
                  />
                </svg>
                <span>{upvotedProblems.has(problem.id) ? 'Upvoted' : 'Upvote'}</span>
                <span className="min-w-7 rounded-full bg-white/20 px-2 py-0.5 text-center tabular-nums">
                  {problem.upvote_count || 0}
                </span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}