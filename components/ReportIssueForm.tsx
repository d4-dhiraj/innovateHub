'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { getCurrentUser } from '@/lib/auth'
import { uploadProblemPhoto } from '@/lib/storage'
import LocationPicker from '@/components/LocationPicker'

interface ReportIssueFormProps {
  onClose: () => void
  onSuccess: () => void
}

export default function ReportIssueForm({ onClose, onSuccess }: ReportIssueFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    category: 'Education' as const,
    latitude: null as number | null,
    longitude: null as number | null
  })
  const [photo, setPhoto] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [classifying, setClassifying] = useState(false)
  const [autoCategory, setAutoCategory] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [checkingDuplicate, setCheckingDuplicate] = useState(false)
  const [duplicateWarning, setDuplicateWarning] = useState<any>(null)
  const [forceSubmit, setForceSubmit] = useState(false)
  const aiServiceUrl = process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'http://localhost:8000'

  const categories = [
    'Education', 'Healthcare', 'Agriculture', 'Water Resources', 
    'Environment', 'Energy', 'Urban Development', 'Accessibility', 
    'Public Administration', 'Rural Livelihoods'
  ]

  const classifyDescription = async (description: string) => {
    if (!description.trim()) {
      setAutoCategory(null)
      return
    }

    setClassifying(true)
    try {
      const response = await fetch(`${aiServiceUrl}/classify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: description }),
      })

      if (!response.ok) {
        console.warn('Classification service unavailable, using manual category')
        return
      }

      const data = await response.json()
      setAutoCategory(data.category)
      setFormData(prev => ({ ...prev, category: data.category as any }))

      // After classification, check for duplicates
      await checkForDuplicate(description, data.category)
    } catch (err) {
      console.warn('Classification service unavailable, using manual category:', err)
      // Don't show error to user, just don't auto-classify
    } finally {
      setClassifying(false)
    }
  }

  const checkForDuplicate = async (description: string, category: string) => {
    if (!description.trim() || !category) {
      setDuplicateWarning(null)
      return
    }

    setCheckingDuplicate(true)
    try {
      const response = await fetch(`${aiServiceUrl}/check-duplicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: description, category }),
      })

      if (!response.ok) {
        console.warn('Duplicate check service unavailable, skipping duplicate check')
        setDuplicateWarning(null)
        return
      }

      const data = await response.json()
      if (data.duplicate) {
        setDuplicateWarning(data.duplicate)
      } else {
        setDuplicateWarning(null)
      }
    } catch (err) {
      console.warn('Duplicate check service unavailable, skipping duplicate check:', err)
      // Don't show error to user, just don't check for duplicates
      setDuplicateWarning(null)
    } finally {
      setCheckingDuplicate(false)
    }
  }

  // Auto-classify when description changes (debounced)
  let classificationTimer: NodeJS.Timeout
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newDescription = e.target.value
    setFormData({ ...formData, description: newDescription })
    setForceSubmit(false) // Reset force submit when description changes

    // Clear previous timer
    if (classificationTimer) {
      clearTimeout(classificationTimer)
    }

    // Set new timer for classification
    classificationTimer = setTimeout(() => {
      classifyDescription(newDescription)
    }, 500)
  }

  const handleDescriptionBlur = () => {
    // Trigger duplicate check when user leaves the description field
    if (formData.description.trim() && formData.category) {
      checkForDuplicate(formData.description, formData.category)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate location
    if (!formData.latitude || !formData.longitude) {
      setError('Please select a location using the "Use My Current Location" button')
      return
    }

    // Check for duplicate warning if not force submitting
    if (duplicateWarning && !forceSubmit) {
      setForceSubmit(true)
      return
    }

    setUploading(true)
    setError('')

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const user = await getCurrentUser()
      if (!user) {
        throw new Error('You must be logged in to report an issue')
      }

      // Classify the description using AI service
      let predictedCategory = formData.category
      try {
        const response = await fetch(`${aiServiceUrl}/classify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: formData.description }),
        })

        if (response.ok) {
          const data = await response.json()
          predictedCategory = data.category
          console.log('AI classified as:', predictedCategory)
        }
      } catch (classifyError) {
        console.error('Classification failed, using manual category:', classifyError)
        // Fall back to manually selected category
      }

      let photoUrl = null

      // Upload photo if provided
      if (photo) {
        try {
          photoUrl = await uploadProblemPhoto(photo, user.id)
          console.log('Photo uploaded successfully:', photoUrl)
        } catch (uploadError: any) {
          throw new Error(uploadError.message)
        }
      }

      // Insert problem into database with AI-classified category
      const { error: insertError } = await supabase
        .from('problems')
        .insert({
          title: formData.title,
          description: formData.description,
          photo_url: photoUrl,
          location: formData.location || 'Unknown location',
          latitude: formData.latitude,
          longitude: formData.longitude,
          category: predictedCategory,
          status: 'submitted',
          submitted_by: user.id
        })

      if (insertError) throw insertError

      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to submit issue')
    } finally {
      setUploading(false)
      setForceSubmit(false)
    }
  }

  return (
    <div className="issue-modal fixed inset-0 flex items-center justify-center z-50 p-4">
      <div className="issue-modal-panel max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-xl shadow-xl">
        <div className="issue-modal-header">
          <div>
            <p className="issue-modal-kicker">Community action</p>
            <h2 className="issue-modal-title">Report a New Issue</h2>
          </div>
          <button
            onClick={onClose}
            className="issue-modal-close"
            aria-label="Close report issue form"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 rounded">
              {error}
            </div>
          )}

          {duplicateWarning && (
            <div className="mb-4 p-4 bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-400 dark:border-yellow-800 rounded">
              <div className="flex items-start gap-3">
                <div className="text-yellow-600 dark:text-yellow-400 mt-0.5">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                    A similar issue may already exist: <span className="font-semibold">{duplicateWarning.title}</span>
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-3">
                    Similarity score: {(duplicateWarning.similarity_score * 100).toFixed(1)}%
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDuplicateWarning(null)}
                      className="px-3 py-1.5 text-xs font-medium bg-white hover:bg-yellow-50 text-yellow-800 border border-yellow-300 rounded-md transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Title *
              </label>
              <input
                type="text"
                id="title"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-800 dark:text-zinc-100"
                placeholder="Brief title of the issue"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Description *
              </label>
              <textarea
                id="description"
                required
                rows={4}
                value={formData.description}
                onChange={handleDescriptionChange}
                onBlur={handleDescriptionBlur}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-800 dark:text-zinc-100"
                placeholder="Detailed description of the issue"
              />
              {classifying && (
                <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">
                  AI classifying category...
                </p>
              )}
              {checkingDuplicate && (
                <p className="mt-1 text-sm text-yellow-600 dark:text-yellow-400">
                  Checking for similar issues...
                </p>
              )}
              {autoCategory && !classifying && (
                <p className="mt-1 text-sm text-green-600 dark:text-green-400">
                  AI suggested category: {autoCategory}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Category *
              </label>
              <select
                id="category"
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-800 dark:text-zinc-100"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Location *
              </label>
              <LocationPicker
                onLocationChange={(lat, lng) => {
                  setFormData({ ...formData, latitude: lat, longitude: lng })
                }}
                initialLat={formData.latitude || undefined}
                initialLng={formData.longitude || undefined}
              />
            </div>

            <div>
              <label htmlFor="photo" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Photo (optional)
              </label>
              <input
                type="file"
                id="photo"
                accept="image/*"
                onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-800 dark:text-zinc-100"
              />
              {photo && (
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  Selected: {photo.name}
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={uploading}
                className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading || checkingDuplicate}
                className={`flex-1 px-4 py-2 rounded-md disabled:opacity-50 ${
                  duplicateWarning && !forceSubmit
                    ? 'bg-orange-600 hover:bg-orange-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {uploading ? 'Submitting...' :
                 checkingDuplicate ? 'Checking...' :
                 duplicateWarning && !forceSubmit ? 'Submit Anyway' :
                 'Submit Issue'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
