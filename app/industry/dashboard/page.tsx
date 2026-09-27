'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, getUserProfile, signOut } from '@/lib/auth'
import { useLanguage } from '@/lib/language'
import { createBrowserClient } from '@supabase/ssr'
import LanguageToggle from '@/components/LanguageToggle'
import Notifications from '@/components/Notifications'
import { createNotification } from '@/lib/notifications'

interface Problem {
  id: string
  title: string
  description: string
  category: string
  status: string
  assigned_university: string
  university_name?: string
  created_at: string
  hasExpressedInterest?: boolean
  partnershipStatus?: string
}

interface Partnership {
  id: string
  problem_id: string
  problem_title: string
  problem_description: string
  problem_category: string
  problem_status: string
  university_name: string
  collaboration_type: string
  partnership_status: string
  created_at: string
}

export default function IndustryDashboard() {
  const router = useRouter()
  const { t } = useLanguage()
  const [userName, setUserName] = useState('')
  const [orgName, setOrgName] = useState('')
  const [problems, setProblems] = useState<Problem[]>([])
  const [partnerships, setPartnerships] = useState<Partnership[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [collaborationModal, setCollaborationModal] = useState<{ open: boolean; problemId: string | null }>({ open: false, problemId: null })
  const [selectedCollaboration, setSelectedCollaboration] = useState('')
  const [submittingCollaboration, setSubmittingCollaboration] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/login')
        return
      }

      const profile = await getUserProfile(user.id)
      if (!profile || profile.role !== 'industry') {
        router.push('/login')
        return
      }

      setUserName(profile.name)
      setOrgName(profile.org_name || '')
      await fetchActiveProjects()
      await fetchPartnerships()
    }

    checkAuth()
  }, [router])

  const fetchActiveProjects = async () => {
    try {
      const user = await getCurrentUser()
      if (!user) return

      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      // Fetch problems with assigned or in_progress status
      const { data: problemsData, error: problemsError } = await supabase
        .from('problems')
        .select('id, title, description, category, status, assigned_university, created_at')
        .in('status', ['assigned', 'in_progress'])
        .order('created_at', { ascending: false })

      if (problemsError) throw problemsError

      // Fetch university names for assigned universities
      const universityIds = [...new Set(problemsData?.map(p => p.assigned_university) || [])]
      const { data: universitiesData, error: universitiesError } = await supabase
        .from('universities')
        .select('id, name')
        .in('id', universityIds)

      if (universitiesError) throw universitiesError

      // Fetch current user's expressed interests with status
      const { data: interestsData, error: interestsError } = await supabase
        .from('project_partners')
        .select('problem_id, status')
        .eq('industry_id', user.id)

      if (interestsError) throw interestsError

      const interestedProblemIds = new Set(interestsData?.map(i => i.problem_id) || [])
      const partnershipStatusMap = new Map(interestsData?.map(i => [i.problem_id, i.status]) || [])

      // Map university names to problems and add interest status
      const universityMap = new Map(universitiesData?.map(u => [u.id, u.name]) || [])
      const problemsWithUniversityNames = (problemsData || []).map(problem => ({
        ...problem,
        university_name: universityMap.get(problem.assigned_university) || 'Unknown University',
        hasExpressedInterest: interestedProblemIds.has(problem.id),
        partnershipStatus: partnershipStatusMap.get(problem.id)
      }))

      setProblems(problemsWithUniversityNames)
    } catch (err: any) {
      console.error('Error fetching active projects:', err)
      setError(err.message || 'Failed to fetch active projects')
    } finally {
      setLoading(false)
    }
  }

  const fetchPartnerships = async () => {
    try {
      const user = await getCurrentUser()
      if (!user) return

      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      // Fetch all partnerships for the current industry user with problem details
      const { data: partnershipsData, error: partnershipsError } = await supabase
        .from('project_partners')
        .select(`
          id,
          problem_id,
          collaboration_type,
          status,
          created_at,
          problems!inner(
            id,
            title,
            description,
            category,
            status,
            assigned_university
          )
        `)
        .eq('industry_id', user.id)
        .order('created_at', { ascending: false })

      if (partnershipsError) throw partnershipsError

      // Type cast to handle nested relationship data
      const typedPartnershipsData = partnershipsData as any[]

      // Fetch university names for the assigned universities
      const universityIds = [...new Set(typedPartnershipsData?.map((p: any) => p.problems?.assigned_university) || [])]
      const { data: universitiesData, error: universitiesError } = await supabase
        .from('universities')
        .select('id, name')
        .in('id', universityIds)

      if (universitiesError) throw universitiesError

      // Map university names to partnerships
      const universityMap = new Map(universitiesData?.map(u => [u.id, u.name]) || [])
      const partnershipsWithDetails = typedPartnershipsData.map((partnership: any) => ({
        id: partnership.id,
        problem_id: partnership.problem_id,
        problem_title: partnership.problems?.title || 'Unknown Project',
        problem_description: partnership.problems?.description || '',
        problem_category: partnership.problems?.category || 'Unknown',
        problem_status: partnership.problems?.status || 'unknown',
        university_name: universityMap.get(partnership.problems?.assigned_university) || 'Unknown University',
        collaboration_type: partnership.collaboration_type,
        partnership_status: partnership.status,
        created_at: partnership.created_at
      }))

      setPartnerships(partnershipsWithDetails)
    } catch (err: any) {
      console.error('Error fetching partnerships:', err)
      setError(err.message || 'Failed to fetch partnerships')
    }
  }

  const handleLogout = async () => {
    await signOut()
    router.push('/login')
  }

  const handleExpressInterest = (problemId: string) => {
    setCollaborationModal({ open: true, problemId })
    setSelectedCollaboration('')
  }

  const handleCollaborationSubmit = async () => {
    if (!collaborationModal.problemId || !selectedCollaboration) return

    setSubmittingCollaboration(true)
    try {
      const user = await getCurrentUser()
      if (!user) return

      const profile = await getUserProfile(user.id)
      if (!profile) return

      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      // Get problem details to find assigned university
      const { data: problemData, error: problemError } = await supabase
        .from('problems')
        .select('title, assigned_university')
        .eq('id', collaborationModal.problemId)
        .single()

      if (problemError) throw problemError

      // Insert into project_partners table
      const { error: insertError } = await supabase
        .from('project_partners')
        .insert({
          problem_id: collaborationModal.problemId,
          industry_id: user.id,
          collaboration_type: selectedCollaboration,
          status: 'interested'
        })

      if (insertError) {
        // Check if it's a duplicate entry error
        if (insertError.code === '23505') {
          setError('You have already expressed interest in this project.')
        } else {
          throw insertError
        }
      } else {
        // Create notification for the university
        if (problemData?.assigned_university) {
          try {
            // Find a user with this university_id
            const { data: universityUsers, error: usersError } = await supabase
              .from('profiles')
              .select('id')
              .eq('university_id', problemData.assigned_university)
              .eq('role', 'university')
              .limit(1)

            if (usersError) throw usersError

            if (universityUsers && universityUsers.length > 0) {
              await createNotification({
                userId: universityUsers[0].id,
                problemId: collaborationModal.problemId,
                message: `${profile.org_name || 'An organization'} is interested in "${problemData.title}" as ${selectedCollaboration}`,
                type: 'info'
              })
            }
          } catch (notificationError) {
            console.error('Error creating notification:', notificationError)
            // Don't throw error - notification failure shouldn't break the main flow
          }
        }

        // Success
        setCollaborationModal({ open: false, problemId: null })
        setSelectedCollaboration('')
        alert('Interest expressed successfully! The university will be notified.')
        // Refresh the projects list to update the interest status
        await fetchActiveProjects()
        await fetchPartnerships()
      }
    } catch (err: any) {
      console.error('Error expressing interest:', err)
      setError(err.message || 'Failed to express interest')
    } finally {
      setSubmittingCollaboration(false)
    }
  }

  const handleCollaborationCancel = () => {
    setCollaborationModal({ open: false, problemId: null })
    setSelectedCollaboration('')
  }

  return (
    <div className="portal-dashboard min-h-screen bg-[#f5f1e3] text-[#123f36]">
      <nav className="bg-white dark:bg-black border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">InnovateHub</h1>
            <div className="flex items-center gap-4">
              <LanguageToggle />
              <Notifications />
              <div className="text-right">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">{t('common.welcome')}, {userName}</span>
                {orgName && (
                  <div className="text-xs text-zinc-500 dark:text-zinc-500">{orgName}</div>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
              >
                {t('common.logout')}
              </button>
            </div>
          </div>
        </div>
      </nav>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          Industry Dashboard
        </h2>
        <p className="mt-4 text-zinc-600 dark:text-zinc-400">
          Welcome to your industry dashboard. Browse active projects that universities are working on and express your interest in collaboration.
        </p>

        {error && (
          <div className="mt-6 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 rounded">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-8 text-zinc-600 dark:text-zinc-400">
            Loading active projects...
          </div>
        ) : problems.length === 0 ? (
          <div className="mt-8 p-8 bg-white dark:bg-black rounded-lg border border-zinc-200 dark:border-zinc-800 text-center">
            <p className="text-zinc-600 dark:text-zinc-400">
              No active projects currently. Check back later when universities start working on challenges!
            </p>
          </div>
        ) : (
          <div className="mt-8">
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
              Active Projects
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {problems.map((problem) => (
                <div
                  key={problem.id}
                  className="bg-white dark:bg-black rounded-lg shadow border border-zinc-200 dark:border-zinc-800 p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="mb-4">
                    <h4 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2 line-clamp-2">
                      {problem.title}
                    </h4>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3 line-clamp-3">
                      {problem.description}
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                      {problem.category}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      problem.status === 'assigned' 
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
                        : 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
                    }`}>
                      {problem.status === 'assigned' ? 'Assigned' : 'In Progress'}
                    </span>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-xs text-zinc-500 dark:text-zinc-500">
                      <span className="font-medium">Assigned to:</span> {problem.university_name}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
                      <span className="font-medium">Started:</span> {new Date(problem.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  {problem.hasExpressedInterest ? (
                    <div className={`industry-partnership-status w-full ${
                      problem.partnershipStatus === 'interested'
                        ? 'is-pending'
                        : problem.partnershipStatus === 'accepted'
                        ? 'is-accepted'
                        : 'is-declined'
                    }`}>
                      {problem.partnershipStatus === 'interested' ? 'Pending' : 
                       problem.partnershipStatus === 'accepted' ? 'Accepted' : 'Declined'}
                    </div>
                  ) : (
                    <button
                      onClick={() => handleExpressInterest(problem.id)}
                      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
                    >
                      Express Interest
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My Partnerships Section */}
        {partnerships.length > 0 && (
          <div className="mt-12">
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
              My Partnerships
            </h3>
            <div className="bg-white dark:bg-black rounded-lg shadow border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        Project
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        University
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        Collaboration Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                    {partnerships.map((partnership) => (
                      <tr key={partnership.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                            {partnership.problem_title}
                          </div>
                          <div className="text-sm text-zinc-500 dark:text-zinc-400">
                            {partnership.problem_category}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-zinc-900 dark:text-zinc-50">
                            {partnership.university_name}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-zinc-900 dark:text-zinc-50">
                            {partnership.collaboration_type}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`industry-partnership-status ${
                            partnership.partnership_status === 'interested'
                              ? 'is-pending'
                              : partnership.partnership_status === 'accepted'
                              ? 'is-accepted'
                              : 'is-declined'
                          }`}>
                            {partnership.partnership_status === 'interested' ? 'Pending' : 
                             partnership.partnership_status === 'accepted' ? 'Accepted' : 'Declined'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-zinc-500 dark:text-zinc-400">
                            {new Date(partnership.created_at).toLocaleDateString()}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Collaboration Type Modal */}
      {collaborationModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
              Select Collaboration Type
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              What kind of collaboration would you like to offer for this project?
            </p>
            
            <div className="space-y-3 mb-6">
              {['Mentorship', 'Funding', 'Prototyping Support', 'Technology Transfer'].map((type) => (
                <label
                  key={type}
                  className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedCollaboration === type
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="collaboration_type"
                    value={type}
                    checked={selectedCollaboration === type}
                    onChange={(e) => setSelectedCollaboration(e.target.value)}
                    className="mr-3"
                  />
                  <span className="text-sm text-zinc-900 dark:text-zinc-50">{type}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCollaborationCancel}
                disabled={submittingCollaboration}
                className="px-4 py-2 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-900 dark:text-zinc-50 text-sm font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleCollaborationSubmit}
                disabled={!selectedCollaboration || submittingCollaboration}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingCollaboration ? 'Submitting...' : 'Submit Interest'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
