'use client'

import { useState, useEffect, Fragment } from 'react'
import { signUp } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { useLanguage } from '@/lib/language'
import LanguageToggle from '@/components/LanguageToggle'

interface University {
  id: string
  name: string
}

export default function SignupPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'citizen' as 'citizen' | 'university' | 'admin' | 'industry',
    department: '',
    university_id: '',
    org_name: '',
    org_type: ''
  })
  const [universities, setUniversities] = useState<University[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const roleParam = new URLSearchParams(window.location.search).get('role')
    const validRoles = ['citizen', 'university', 'admin', 'industry'] as const
    if (roleParam && validRoles.includes(roleParam as typeof validRoles[number])) {
      setFormData(prev => ({ ...prev, role: roleParam as typeof prev.role }))
    }
    fetchUniversities()
  }, [])

  const fetchUniversities = async () => {
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { data, error } = await supabase
        .from('universities')
        .select('id, name')
        .order('name')

      if (error) throw error
      setUniversities(data || [])
    } catch (err: any) {
      console.error('Error fetching universities:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    const result = await signUp({
      email: formData.email,
      password: formData.password,
      name: formData.name,
      role: formData.role,
      department: formData.role === 'university' ? formData.department : undefined,
      university_id: formData.role === 'university' ? formData.university_id : undefined,
      org_name: formData.role === 'industry' ? formData.org_name : undefined,
      org_type: formData.role === 'industry' ? formData.org_type : undefined
    })

    if (result.success) {
      if (result.emailConfirmation) {
        setSuccess(true)
      } else {
        router.push('/login')
      }
    } else {
      // Provide better error messages for common issues
      if (result.error?.includes('rate limit') || result.error?.includes('Too Many Requests')) {
        setError('Too many signup attempts. Please wait a few minutes and try again, or use a different email address.')
      } else if (result.error?.includes('already registered')) {
        setError('This email is already registered. Please login instead.')
      } else {
        setError(result.error || 'An error occurred during signup')
      }
    }

    setLoading(false)
  }

  return (
    <div className="auth-page min-h-screen flex items-center justify-center px-4 py-8">
      <div className="auth-panel max-w-xl w-full p-8 rounded-xl shadow-lg">
        <div className="flex justify-end mb-4">
          <LanguageToggle />
        </div>
        <div className="auth-kicker">Join the community</div>
        <h1 className="auth-title mb-7 text-center">
          {t('signup.title')}
        </h1>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/20 border border-green-400 dark:border-green-800 text-green-700 dark:text-green-300 rounded">
            Account created successfully! Please check your email to confirm your account, then login.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="auth-label block mb-1">
              {t('signup.name')}
            </label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          <div>
            <label htmlFor="email" className="auth-label block mb-1">
              {t('signup.email')}
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
              {t('signup.password')}
            </label>
            <input
              type="password"
              id="password"
              required
              minLength={6}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          <div>
            <label htmlFor="role" className="auth-label block mb-1">
              {t('signup.role')}
            </label>
            <select
              id="role"
              required
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-800 dark:text-zinc-100"
            >
              <option value="citizen">{t('signup.citizen')}</option>
              <option value="university">{t('signup.university')}</option>
              <option value="industry">Industry</option>
              <option value="admin">{t('signup.admin')}</option>
            </select>
          </div>

          {formData.role === 'university' && (
            <Fragment>
              <div>
                <label htmlFor="university" className="auth-label block mb-1">
                  {t('signup.university')}
                </label>
                <select
                  id="university"
                  required
                  value={formData.university_id}
                  onChange={(e) => setFormData({ ...formData, university_id: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-800 dark:text-zinc-100"
                >
                  <option value="">Select University</option>
                  {universities.map((university) => (
                    <option key={university.id} value={university.id}>
                      {university.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="department" className="auth-label block mb-1">
                  {t('signup.department')}
                </label>
                <select
                  id="department"
                  required
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-800 dark:text-zinc-100"
                >
                  <option value="">Select Department</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Medicine">Medicine</option>
                  <option value="Agriculture">Agriculture</option>
                  <option value="Environmental Science">Environmental Science</option>
                  <option value="Public Administration">Public Administration</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Social Work">Social Work</option>
                  <option value="Urban Planning">Urban Planning</option>
                </select>
              </div>
            </Fragment>
          )}

          {formData.role === 'industry' && (
            <Fragment>
              <div>
                <label htmlFor="org_name" className="auth-label block mb-1">
                  Organization Name
                </label>
                <input
                  type="text"
                  id="org_name"
                  required
                  value={formData.org_name}
                  onChange={(e) => setFormData({ ...formData, org_name: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>

              <div>
                <label htmlFor="org_type" className="auth-label block mb-1">
                  Organization Type
                </label>
                <select
                  id="org_type"
                  required
                  value={formData.org_type}
                  onChange={(e) => setFormData({ ...formData, org_type: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-800 dark:text-zinc-100"
                >
                  <option value="">Select Organization Type</option>
                  <option value="Startup">Startup</option>
                  <option value="MSME">MSME</option>
                  <option value="CSR Organization">CSR Organization</option>
                  <option value="Research Lab">Research Lab</option>
                  <option value="Large Enterprise">Large Enterprise</option>
                </select>
              </div>
            </Fragment>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t('signup.signingUp') : t('signup.title')}
          </button>
        </form>

        <p className="auth-footnote mt-5 text-center">
          {t('signup.haveAccount')}{' '}
          <a href="/login" className="auth-link">
            {t('signup.loginLink')}
          </a>
        </p>
      </div>
    </div>
  )
}
