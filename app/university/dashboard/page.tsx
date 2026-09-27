'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser, getUserProfile, signOut } from '@/lib/auth'
import { useLanguage } from '@/lib/language'
import ChallengeInbox from '@/components/ChallengeInbox'
import AssignedChallenges from '@/components/AssignedChallenges'
import LanguageToggle from '@/components/LanguageToggle'
import Notifications from '@/components/Notifications'

export default function UniversityDashboard() {
  const router = useRouter()
  const { t } = useLanguage()
  const [userName, setUserName] = useState('')
  const [department, setDepartment] = useState('')

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/login')
        return
      }

      const profile = await getUserProfile(user.id)
      if (!profile || profile.role !== 'university') {
        router.push('/login')
        return
      }

      setUserName(profile.name)
      setDepartment(profile.department || '')
    }

    checkAuth()
  }, [router])

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
              <div className="text-right">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">{t('common.welcome')}, {userName}</span>
                {department && (
                  <div className="text-xs text-zinc-500 dark:text-zinc-500">{department}</div>
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
          {t('university.dashboard')}
        </h2>
        <p className="mt-4 text-zinc-600 dark:text-zinc-400">
          Welcome to your university dashboard. Here you can view assigned challenges, manage team formations, and track project progress.
        </p>

        {/* Challenge Inbox */}
        <ChallengeInbox />

        {/* Assigned Challenges */}
        <AssignedChallenges />

        {/* Placeholder for future features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <div className="bg-white dark:bg-black p-6 rounded-lg shadow border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
              {t('university.teamFormation')}
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm">
              Manage teams for your assigned projects
            </p>
          </div>
          
          <div className="bg-white dark:bg-black p-6 rounded-lg shadow border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
              {t('university.activeProjects')}
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm">
              Track ongoing projects and their status
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
