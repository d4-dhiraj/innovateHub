'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser, getUserProfile, signOut } from '@/lib/auth'
import { useLanguage } from '@/lib/language'
import { createBrowserClient } from '@supabase/ssr'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import LanguageToggle from '@/components/LanguageToggle'
import AdminMap from '@/components/AdminMap'
import Notifications from '@/components/Notifications'

interface ProblemData {
  total: number
  totalUpvotes: number
  byCategory: { name: string; value: number; color: string }[]
  byStatus: { name: string; value: number }[]
}

interface PartnershipData {
  totalAccepted: number
  topOrgTypes: { type: string; count: number }[]
}

interface Problem {
  id: string
  title: string
  description: string
  category: string
  status: string
  latitude: number
  longitude: number
  location: string
}

const COLORS = ['#155447', '#3d7563', '#8e9d68', '#c48b54', '#8a6f58', '#6f9b8d', '#b5a46b', '#9d6654', '#4f8377', '#7f9270']

const CATEGORIES = [
  'Education', 'Healthcare', 'Agriculture', 'Water Resources', 
  'Environment', 'Energy', 'Urban Development', 'Accessibility', 
  'Public Administration', 'Rural Livelihoods'
]

const STATUS_COLORS: Record<string, string> = {
  'submitted': '#8a6f58',
  'under_review': '#b5a46b',
  'assigned': '#6f9b8d',
  'in_progress': '#c48b54',
  'resolved': '#155447'
}

export default function AdminDashboard() {
  const router = useRouter()
  const { t } = useLanguage()
  const [userName, setUserName] = useState('')
  const [loading, setLoading] = useState(true)
  const [problemData, setProblemData] = useState<ProblemData>({
    total: 0,
    totalUpvotes: 0,
    byCategory: [],
    byStatus: []
  })
  const [partnershipData, setPartnershipData] = useState<PartnershipData>({
    totalAccepted: 0,
    topOrgTypes: []
  })
  const [problems, setProblems] = useState<Problem[]>([])

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await getCurrentUser()
        if (!user) {
          router.push('/login')
          return
        }

        const profile = await getUserProfile(user.id)
        if (!profile || profile.role !== 'admin') {
          router.push('/login')
          return
        }

        setUserName(profile.name)
        await Promise.all([fetchProblemData(), fetchPartnershipData()])
      } catch (error) {
        console.error('Error in authentication or data fetching:', error)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  const fetchProblemData = async () => {
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      // Fetch all problems with location data
      const { data: problems, error } = await supabase
        .from('problems')
        .select('id, title, description, category, status, latitude, longitude, location, upvote_count')

      if (error) throw error

      const total = problems?.length || 0

      // Calculate total upvotes
      const totalUpvotes = problems?.reduce((sum, problem) => 
        sum + (problem.upvote_count || 0), 0) || 0

      // Group by category
      const categoryCount: Record<string, number> = {}
      CATEGORIES.forEach(cat => categoryCount[cat] = 0)
      problems?.forEach(problem => {
        if (problem.category) {
          categoryCount[problem.category] = (categoryCount[problem.category] || 0) + 1
        }
      })

      const byCategory = CATEGORIES.map((cat, index) => ({
        name: cat,
        value: categoryCount[cat] || 0,
        color: COLORS[index % COLORS.length]
      })).filter(item => item.value > 0)

      // Group by status
      const statusCount: Record<string, number> = {}
      problems?.forEach(problem => {
        if (problem.status) {
          statusCount[problem.status] = (statusCount[problem.status] || 0) + 1
        }
      })

      const byStatus = Object.entries(statusCount).map(([name, value]) => ({
        name: name.replace(/_/g, ' ').toUpperCase(),
        value
      }))

      setProblemData({
        total,
        totalUpvotes,
        byCategory,
        byStatus
      })

      // Set problems for map
      setProblems(problems || [])
    } catch (error) {
      console.error('Error fetching problem data:', error)
    }
  }

  const fetchPartnershipData = async () => {
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      // Fetch accepted partnerships with industry profiles
      const { data: partnerships, error } = await supabase
        .from('project_partners')
        .select('industry_id, collaboration_type, status')
        .eq('status', 'accepted')

      if (error) throw error

      const totalAccepted = partnerships?.length || 0

      // Fetch industry profiles to get organization types
      const industryIds = [...new Set(partnerships?.map(p => p.industry_id) || [])]
      const { data: industryProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, org_type')
        .in('id', industryIds)

      if (profilesError) throw profilesError

      // Count organization types
      const orgTypeCount: Record<string, number> = {}
      industryProfiles?.forEach(profile => {
        if (profile.org_type) {
          orgTypeCount[profile.org_type] = (orgTypeCount[profile.org_type] || 0) + 1
        }
      })

      const topOrgTypes = Object.entries(orgTypeCount)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5) // Top 5 organization types

      setPartnershipData({
        totalAccepted,
        topOrgTypes
      })
    } catch (error) {
      console.error('Error fetching partnership data:', error)
    }
  }

  const handleLogout = async () => {
    await signOut()
    router.push('/login')
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
              <Link
                href="/success-stories"
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                {t('nav.successStories')}
              </Link>
              <span className="text-sm text-zinc-600 dark:text-zinc-400">{t('common.welcome')}, {userName}</span>
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
          {t('admin.dashboard')}
        </h2>
        <p className="mt-4 text-zinc-600 dark:text-zinc-400">
          Welcome to the admin dashboard. Here you can view analytics, manage users, and monitor system performance.
        </p>

        {loading ? (
          <div className="mt-8 text-center text-zinc-600 dark:text-zinc-400">
            Loading analytics...
          </div>
        ) : (
          <div className="mt-8 space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Total Problems Card */}
              <div className="bg-white dark:bg-zinc-900 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
                  {t('admin.totalProblems')}
                </h3>
                <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                  {problemData.total}
                </p>
              </div>

              {/* Total Upvotes Card */}
              <div className="bg-white dark:bg-zinc-900 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
                  {t('admin.totalUpvotes')}
                </h3>
                <p className="text-4xl font-bold text-orange-600 dark:text-orange-400">
                  {problemData.totalUpvotes}
                </p>
              </div>

              {/* Industry Partnerships Card */}
              <div className="bg-white dark:bg-zinc-900 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
                  Industry Partnerships
                </h3>
                <p className="text-4xl font-bold text-green-600 dark:text-green-400">
                  {partnershipData.totalAccepted}
                </p>
                {partnershipData.topOrgTypes.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                      Top Organization Types:
                    </p>
                    {partnershipData.topOrgTypes.slice(0, 3).map((org, index) => (
                      <div key={index} className="flex justify-between text-xs text-zinc-600 dark:text-zinc-400">
                        <span>{org.type}</span>
                        <span className="font-medium">{org.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Map View */}
            <div className="bg-white dark:bg-zinc-900 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
                Problems Map
              </h3>
              <AdminMap problems={problems} />
              {/* Status Legend */}
              <div className="mt-4 flex flex-wrap gap-4">
                {Object.entries(STATUS_COLORS).map(([status, color]) => (
                  <div key={status} className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300 capitalize">
                      {status.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Pie Chart - Problems by Category */}
              <div className="bg-white dark:bg-zinc-900 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
                  {t('admin.problemsByCategory')}
                </h3>
                {problemData.byCategory.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={problemData.byCategory}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {problemData.byCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-zinc-500 dark:text-zinc-400 py-8">
                    No category data available
                  </p>
                )}
              </div>

              {/* Bar Chart - Problems by Status */}
              <div className="bg-white dark:bg-zinc-900 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
                  {t('admin.problemsByStatus')}
                </h3>
                {problemData.byStatus.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={problemData.byStatus}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fill: '#71717a' }}
                        angle={-45}
                        textAnchor="end"
                        height={100}
                      />
                      <YAxis tick={{ fill: '#71717a' }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-zinc-500 dark:text-zinc-400 py-8">
                    No status data available
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
