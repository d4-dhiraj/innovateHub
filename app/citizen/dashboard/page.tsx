'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser, getUserProfile, signOut } from '@/lib/auth'
import { useLanguage } from '@/lib/language'
import ReportIssueForm from '@/components/ReportIssueForm'
import UserActivity from '@/components/UserActivity'
import IssuesNearYou from '@/components/IssuesNearYou'
import YourImpact from '@/components/YourImpact'
import LanguageToggle from '@/components/LanguageToggle'
import Notifications from '@/components/Notifications'

export default function CitizenDashboard() {
  const router = useRouter()
  const { t } = useLanguage()
  const [userName, setUserName] = useState('')
  const [showReportForm, setShowReportForm] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/login')
        return
      }

      const profile = await getUserProfile(user.id)
      if (!profile || profile.role !== 'citizen') {
        router.push('/login')
        return
      }

      setUserName(profile.name)
    }

    checkAuth()
  }, [router])

  const handleLogout = async () => {
    await signOut()
    router.push('/login')
  }

  const handleReportSuccess = () => {
    // Refresh the page or update state to show new issue
    setShowReportForm(false)
  }

  return (
    <div className="citizen-dashboard min-h-screen bg-[#f5f1e3] text-[#123f36]">
      <nav className="border-b border-[#d9d1b9] bg-[#f8f4e8]/95 shadow-[0_2px_10px_rgba(18,63,54,0.08)]">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <h1 className="text-xl font-extrabold tracking-tight text-[#123f36]">InnovateHub</h1>
            <div className="flex items-center gap-3 text-[#123f36]">
              <LanguageToggle />
              <Notifications />
              <span className="hidden text-sm text-[#45645c] sm:inline">{t('common.welcome')}, {userName}</span>
              <button
                onClick={handleLogout}
                className="text-sm font-semibold text-[#45645c] transition-colors hover:text-[#123f36]"
              >
                {t('common.logout')}
              </button>
            </div>
        </div>
      </nav>
      
      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-9 flex flex-col gap-7 border-b border-[#ddd5bf] pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-[#6b8276]">Citizen portal</p>
            <h2 className="text-4xl font-extrabold tracking-tight text-[#123f36] sm:text-5xl">
            {t('citizen.dashboard')}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#45645c] sm:text-lg">
              Welcome back, {userName || 'citizen'}. Track your submissions and help your community move forward.
            </p>
          </div>
          <button
            onClick={() => setShowReportForm(true)}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#155447] px-6 py-3.5 text-base font-bold text-white shadow-[0_5px_12px_rgba(18,63,54,0.2)] transition hover:bg-[#0f4035]"
          >
            <span className="text-lg leading-none">+</span>
            {t('citizen.reportIssue')}
          </button>
        </div>

        {/* Your Impact Stats */}
        <YourImpact />

        {/* User Activity Section */}
        <UserActivity />

        {/* Issues Near You Section */}
        <IssuesNearYou />

        {/* Photo Gallery Link */}
        <div className="mt-9">
          <Link href="/success-stories" className="group block overflow-hidden rounded-xl border border-[#d9d1b9] bg-[#e9e2cc] shadow-[0_5px_14px_rgba(18,63,54,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_9px_20px_rgba(18,63,54,0.14)]">
            <div className="flex min-h-36 flex-col justify-between gap-5 p-6 sm:flex-row sm:items-center sm:p-7">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#6b8276]">Community progress</p>
                <h3 className="text-2xl font-extrabold text-[#123f36]">{t('citizen.photoGallery')}</h3>
                <p className="mt-2 text-sm text-[#45645c]">Browse before-and-after stories from issues resolved across the community.</p>
              </div>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#155447] text-xl text-white transition group-hover:translate-x-1">→</span>
            </div>
          </Link>
        </div>
      </main>

      {showReportForm && (
        <ReportIssueForm
          onClose={() => setShowReportForm(false)}
          onSuccess={handleReportSuccess}
        />
      )}
    </div>
  )
}
