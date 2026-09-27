'use client'

import { useState } from 'react'
import { signIn, getDashboardPath } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/language'
import LanguageToggle from '@/components/LanguageToggle'

export default function LoginPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    console.log('Attempting login with:', formData.email)

    const result = await signIn(formData.email, formData.password)

    console.log('Login result:', result)

    if (result.success) {
      console.log('Login successful, getting dashboard path...')
      const dashboardPath = await getDashboardPath()
      console.log('Dashboard path:', dashboardPath)
      router.push(dashboardPath)
    } else {
      console.error('Login failed:', result.error)
      setError(result.error || 'An error occurred during login')
    }

    setLoading(false)
  }

  return (
    <div className="auth-page min-h-screen flex items-center justify-center px-4 py-8">
      <div className="auth-panel max-w-md w-full p-8 rounded-xl shadow-lg">
        <div className="flex justify-end mb-4">
          <LanguageToggle />
        </div>
        <div className="auth-kicker">Welcome back</div>
        <h1 className="auth-title mb-7 text-center">
          {t('login.title')}
        </h1>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="auth-label block mb-1">
              {t('login.email')}
            </label>
            <input
              type="email"
              id="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          <div>
            <label htmlFor="password" className="auth-label block mb-1">
              {t('login.password')}
            </label>
            <input
              type="password"
              id="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t('login.loggingIn') : t('login.title')}
          </button>
        </form>

        <p className="auth-footnote mt-5 text-center">
          {t('login.noAccount')}{' '}
          <a href="/signup" className="auth-link">
            {t('login.signUpLink')}
          </a>
        </p>
      </div>
    </div>
  )
}
