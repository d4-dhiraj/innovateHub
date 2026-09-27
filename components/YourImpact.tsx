'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { getCurrentUser } from '@/lib/auth'
import { useLanguage } from '@/lib/language'

interface ImpactStats {
  totalSubmitted: number
  totalResolved: number
  resolutionRate: number
}

export default function YourImpact() {
  const { t } = useLanguage()
  const [stats, setStats] = useState<ImpactStats>({
    totalSubmitted: 0,
    totalResolved: 0,
    resolutionRate: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchImpactStats()
  }, [])

  const fetchImpactStats = async () => {
    try {
      const user = await getCurrentUser()
      if (!user) {
        return
      }

      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { data, error } = await supabase
        .from('problems')
        .select('status')
        .eq('submitted_by', user.id)

      if (error) throw error

      const totalSubmitted = data?.length || 0
      const totalResolved = data?.filter(p => p.status === 'resolved').length || 0
      const resolutionRate = totalSubmitted > 0 ? Math.round((totalResolved / totalSubmitted) * 100) : 0

      setStats({
        totalSubmitted,
        totalResolved,
        resolutionRate
      })
    } catch (err) {
      console.error('Error fetching impact stats:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="mb-8 rounded-xl border border-[#d9d1b9] bg-[#eee8d6] p-6 shadow-[0_4px_12px_rgba(18,63,54,0.08)]">
        <div className="text-center text-sm text-[#6b8276]">
          Loading your impact...
        </div>
      </div>
    )
  }

  return (
    <section className="mb-8">
      <h3 className="mb-3 text-xl font-extrabold text-[#123f36]">
        {t('citizen.yourImpact')}
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex min-h-32 items-center gap-5 rounded-xl border border-[#d9d1b9] bg-[#eee8d6] p-5 shadow-[0_4px_12px_rgba(18,63,54,0.08)] sm:justify-center sm:text-center">
          <span className="text-5xl leading-none text-[#155447]" aria-hidden="true">★</span>
          <div>
          <div className="text-3xl font-extrabold text-[#155447]">
            {stats.totalSubmitted}
          </div>
          <div className="mt-1 text-sm text-[#45645c]">
            Issues Submitted
          </div>
          </div>
        </div>
        
        <div className="flex min-h-32 items-center gap-5 rounded-xl border border-[#d9d1b9] bg-[#eee8d6] p-5 shadow-[0_4px_12px_rgba(18,63,54,0.08)] sm:justify-center sm:text-center">
          <span className="text-5xl leading-none text-[#155447]" aria-hidden="true">★</span>
          <div>
          <div className="text-3xl font-extrabold text-[#155447]">
            {stats.totalResolved}
          </div>
          <div className="mt-1 text-sm text-[#45645c]">
            Issues In Review
          </div>
          </div>
        </div>
        
        <div className="flex min-h-32 items-center gap-5 rounded-xl border border-[#d9d1b9] bg-[#eee8d6] p-5 shadow-[0_4px_12px_rgba(18,63,54,0.08)] sm:justify-center sm:text-center">
          <span className="text-5xl leading-none text-[#155447]" aria-hidden="true">★</span>
          <div>
          <div className="text-3xl font-extrabold text-[#155447]">
            {stats.resolutionRate}%
          </div>
          <div className="mt-1 text-sm text-[#45645c]">
            Success Rate
          </div>
          </div>
        </div>
      </div>
      
      {stats.totalSubmitted === 0 && (
        <p className="mt-4 text-center text-sm text-[#6b8276]">
          Start reporting issues to see your impact grow!
        </p>
      )}
    </section>
  )
}
