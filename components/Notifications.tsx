'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { getCurrentUser } from '@/lib/auth'
import { getUserNotifications, markNotificationAsRead } from '@/lib/notifications'

interface Notification {
  id: string
  user_id: string
  problem_id: string | null
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  is_read: boolean
  created_at: string
}

export default function Notifications() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNotifications()
    
    // Refresh notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.notification-dropdown')) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const fetchNotifications = async () => {
    try {
      const user = await getCurrentUser()
      if (!user) return

      const data = await getUserNotifications(user.id)
      setNotifications(data || [])
    } catch (err) {
      console.error('Error fetching notifications:', err)
      // Handle the case where the column might not exist yet
      if (err && typeof err === 'object' && 'message' in err && 
          (err.message as string).includes('is_read')) {
        console.warn('is_read column might not exist yet. Please run the migration script.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      // Optimistic update - update UI immediately
      setNotifications(prevNotifications => 
        prevNotifications.map(n => 
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      )
      
      // Then update in database
      await markNotificationAsRead(notificationId)
    } catch (err) {
      console.error('Error marking notification as read:', err)
      // Revert the optimistic update on error
      setNotifications(prevNotifications => 
        prevNotifications.map(n => 
          n.id === notificationId ? { ...n, is_read: false } : n
        )
      )
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.is_read) {
      await handleMarkAsRead(notification.id)
    }

    // Close dropdown
    setIsOpen(false)

    // Navigate to problem if available
    if (notification.problem_id) {
      // For now, just refresh the current page since we don't have a dedicated problem detail page
      // In the future, you can implement: router.push(`/problems/${notification.problem_id}`)
      // Or navigate to role-specific dashboards
      router.refresh()
    }
  }

  const getRelativeTime = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) {
      return 'just now'
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60)
      return `${minutes}m ago`
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600)
      return `${hours}h ago`
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400)
      return `${days}d ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'is-success'
      case 'warning':
        return 'is-warning'
      case 'error':
        return 'is-error'
      default:
        return 'is-info'
    }
  }

  return (
    <div className="relative notification-dropdown">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="notification-trigger relative rounded-full p-2 transition-colors"
        aria-label="Notifications"
      >
        <svg className="w-6 h-6 text-zinc-600 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-panel absolute right-0 z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border shadow-xl">
          <div className="notification-panel-header flex items-center justify-between border-b p-4">
            <div>
              <p className="notification-panel-kicker">Updates</p>
              <h3 className="notification-panel-title">Notifications</h3>
            </div>
            {unreadCount > 0 && (
              <span className="notification-unread-count">
                {unreadCount} unread
              </span>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="notification-empty p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-500 mx-auto mb-2"></div>
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
                <svg className="w-12 h-12 mx-auto mb-2 text-zinc-300 dark:text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                No notifications yet
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item cursor-pointer border-b ${!notification.is_read ? 'is-unread' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`notification-dot shrink-0 ${!notification.is_read ? 'is-unread' : ''}`} />
                    <div className="flex-1 min-w-0">
                      <div className={`notification-message ${getNotificationColor(notification.type)}`}>
                        <p className="notification-message-text">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="notification-time">
                            {getRelativeTime(notification.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {notifications.length > 0 && (
            <div className="notification-panel-footer border-t p-3">
              <button
                onClick={async () => {
                  const unreadNotifications = notifications.filter(n => !n.is_read)
                  if (unreadNotifications.length === 0) return
                  
                  // Optimistic update - mark all as read in UI immediately
                  setNotifications(prevNotifications => 
                    prevNotifications.map(n => ({ ...n, is_read: true }))
                  )
                  
                  // Then update in database
                  try {
                    await Promise.all(
                      unreadNotifications.map(n => markNotificationAsRead(n.id))
                    )
                  } catch (err) {
                    console.error('Error marking all as read:', err)
                    // Revert on error
                    await fetchNotifications()
                  }
                }}
                className="notification-mark-read w-full text-sm transition-colors"
              >
                Mark all as read
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
