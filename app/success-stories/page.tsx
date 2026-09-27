'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useLanguage } from '@/lib/language'
import LanguageToggle from '@/components/LanguageToggle'

interface Problem {
  id: string
  title: string
  description: string
  photo_url: string | null
  after_photo_url: string | null
  location: string
  category: string
  status: string
  created_at: string
  upvote_count?: number
}

export default function SuccessStories() {
  const { t } = useLanguage()
  const [problems, setProblems] = useState<Problem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null)

  useEffect(() => {
    fetchResolvedProblems()
  }, [])

  const fetchResolvedProblems = async () => {
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { data: resolvedProblems, error } = await supabase
        .from('problems')
        .select('*')
        .eq('status', 'resolved')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Keep the gallery discoverable while a project is waiting to be resolved.
      // Resolved stories remain first, with photo-backed community posts as a fallback.
      if (resolvedProblems && resolvedProblems.length > 0) {
        setProblems(resolvedProblems)
      } else {
        const { data: photoProblems, error: photoError } = await supabase
          .from('problems')
          .select('*')
          .or('photo_url.not.is.null,after_photo_url.not.is.null')
          .order('created_at', { ascending: false })
          .limit(24)

        if (photoError) throw photoError
        setProblems(photoProblems || [])
      }
    } catch (err: any) {
      console.error('Error fetching resolved problems:', err)
      setError(err.message || 'Failed to fetch success stories')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="success-stories-page min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-end mb-4">
            <LanguageToggle />
          </div>
          <h1 className="success-stories-title mb-4">
            {t('successStories.title')}
          </h1>
          <div className="success-stories-state">{t('common.loading')}</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="success-stories-page min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-end mb-4">
            <LanguageToggle />
          </div>
          <h1 className="success-stories-title mb-4">
            {t('successStories.title')}
          </h1>
          <div className="success-stories-error">
            {error}
          </div>
        </div>
      </div>
    )
  }

  if (problems.length === 0) {
    return (
      <div className="success-stories-page min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-end mb-4">
            <LanguageToggle />
          </div>
          <h1 className="success-stories-title mb-4">
            {t('successStories.title')}
          </h1>
          <div className="success-stories-empty">
            <p>
              {t('successStories.noStories')}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="success-stories-page min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-end mb-4">
          <LanguageToggle />
        </div>
        <div className="success-stories-hero mb-8">
          <p className="success-stories-kicker">Community progress</p>
          <h1 className="success-stories-title mb-2">
            {t('successStories.title')}
          </h1>
          <p className="success-stories-subtitle">
            {t('successStories.subtitle')}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {problems.map((problem) => (
            <div
              key={problem.id}
              className="success-story-card overflow-hidden cursor-pointer"
              onClick={() => setSelectedProblem(problem)}
            >
              {/* Before and After Photos */}
              <div className="success-story-images grid grid-cols-2 h-52">
                {problem.photo_url ? (
                  <div className="relative">
                    <img
                      src={problem.photo_url}
                      alt={`${problem.title} - Before`}
                      className="w-full h-full object-cover"
                    />
                    <div className="success-story-label is-before absolute bottom-0 left-0 right-0">
                      {t('issues.before')}
                    </div>
                  </div>
                ) : (
                  <div className="success-story-placeholder flex items-center justify-center">
                    <span>No {t('issues.before')} Photo</span>
                  </div>
                )}
                
                {problem.after_photo_url ? (
                  <div className="relative">
                    <img
                      src={problem.after_photo_url}
                      alt={`${problem.title} - After`}
                      className="w-full h-full object-cover"
                    />
                    <div className="success-story-label is-after absolute bottom-0 left-0 right-0">
                      {t('issues.after')}
                    </div>
                  </div>
                ) : (
                  <div className="success-story-placeholder flex items-center justify-center">
                    <span>No {t('issues.after')} Photo</span>
                  </div>
                )}
              </div>
              
              <div className="success-story-content p-5">
                <h4 className="success-story-card-title mb-2 line-clamp-2">
                  {problem.title}
                </h4>
                
                <p className="success-story-description mb-3 line-clamp-2">
                  {problem.description}
                </p>
                
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="success-story-tag">
                    {problem.category}
                  </span>
                  <span className="success-story-location">
                    {problem.location}
                  </span>
                </div>
                
                <div className="success-story-meta flex items-center justify-between text-xs">
                  <span>{t('issues.resolvedOn')} {new Date(problem.created_at).toLocaleDateString()}</span>
                  {problem.upvote_count !== undefined && (
                    <div className="flex items-center gap-1">
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
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

        {/* Detail Modal */}
        {selectedProblem && (
          <div className="success-story-modal fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="success-story-modal-panel max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="success-story-modal-title">
                    {selectedProblem.title}
                  </h2>
                  <button
                    onClick={() => setSelectedProblem(null)}
                    className="success-story-modal-close"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Before and After Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2 flex items-center gap-2">
                      <span className="success-story-label is-before">{t('issues.before')}</span>
                    </h3>
                    {selectedProblem.photo_url ? (
                      <img
                        src={selectedProblem.photo_url}
                        alt={`${selectedProblem.title} - Before`}
                        className="success-story-modal-image w-full h-64 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="success-story-placeholder w-full h-64 rounded-lg flex items-center justify-center">
                        <span>No {t('issues.before')} Photo</span>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2 flex items-center gap-2">
                      <span className="success-story-label is-after">{t('issues.after')}</span>
                    </h3>
                    {selectedProblem.after_photo_url ? (
                      <img
                        src={selectedProblem.after_photo_url}
                        alt={`${selectedProblem.title} - After`}
                        className="success-story-modal-image w-full h-64 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="success-story-placeholder w-full h-64 rounded-lg flex items-center justify-center">
                        <span>No {t('issues.after')} Photo</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="success-story-modal-section-title mb-2">{t('issues.description')}</h3>
                    <p className="success-story-description">
                      {selectedProblem.description}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="success-story-tag">
                      {selectedProblem.category}
                    </span>
                    <span className="success-story-location">
                      {selectedProblem.location}
                    </span>
                    <span className="success-story-resolved">
                      {t('status.resolved')}
                    </span>
                  </div>

                  <div className="success-story-meta text-sm">
                    {t('issues.resolvedOn')} {new Date(selectedProblem.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}