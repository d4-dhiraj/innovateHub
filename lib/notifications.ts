import { createBrowserClient } from '@supabase/ssr'

export async function createNotification(params: {
  userId: string
  problemId?: string
  message: string
  type?: 'info' | 'success' | 'warning' | 'error'
}) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: params.userId,
      problem_id: params.problemId || null,
      message: params.message,
      type: params.type || 'info'
    })

  if (error) {
    console.error('Error creating notification:', error)
    throw error
  }

  return { success: true }
}

export async function markNotificationAsRead(notificationId: string) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)

  if (error) {
    console.error('Error marking notification as read:', error)
    console.error('Notification ID:', notificationId)
    console.error('Error details:', JSON.stringify(error, null, 2))
    throw error
  }

  return { success: true }
}

export async function getUserNotifications(userId: string) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching notifications:', error)
    throw error
  }

  return data
}
