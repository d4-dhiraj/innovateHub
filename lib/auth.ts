import { createBrowserClient } from '@supabase/ssr'

export interface SignUpData {
  email: string
  password: string
  name: string
  role: 'citizen' | 'university' | 'admin' | 'industry'
  department?: string
  university_id?: string
  org_name?: string
  org_type?: string
}

export interface Profile {
  id: string
  name: string
  role: 'citizen' | 'university' | 'admin' | 'industry'
  department?: string
  university_id?: string
  org_name?: string
  org_type?: string
  created_at: string
  updated_at: string
}

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

export async function signUp({ email, password, name, role, department, university_id, org_name, org_type }: SignUpData) {
  try {
    const supabase = getSupabaseClient()
    
    // Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role,
          department: role === 'university' ? department : null,
          university_id: role === 'university' ? university_id : null,
          org_name: role === 'industry' ? org_name : null,
          org_type: role === 'industry' ? org_type : null
        }
      }
    })

    if (authError) throw authError

    if (authData.user) {
      // Create profile entry
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          name,
          role,
          department: role === 'university' ? department : null,
          university_id: role === 'university' ? university_id : null,
          org_name: role === 'industry' ? org_name : null,
          org_type: role === 'industry' ? org_type : null
        })

      if (profileError) throw profileError

      return { success: true, user: authData.user, emailConfirmation: !authData.session }
    }

    return { success: false, error: 'User creation failed' }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function signIn(email: string, password: string) {
  try {
    const supabase = getSupabaseClient()
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) throw error

    return { success: true, user: data.user }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function signOut() {
  try {
    const supabase = getSupabaseClient()
    
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getCurrentUser() {
  try {
    const supabase = getSupabaseClient()
    
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw error
    return user
  } catch (error: any) {
    console.error('Error getting current user:', error)
    return null
  }
}

export async function getUserProfile(userId: string): Promise<Profile | null> {
  try {
    const supabase = getSupabaseClient()
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) throw error
    return data
  } catch (error: any) {
    console.error('Error getting user profile:', error)
    return null
  }
}

export async function getDashboardPath() {
  const user = await getCurrentUser()
  if (!user) return '/login'

  const profile = await getUserProfile(user.id)
  if (!profile) return '/login'

  switch (profile.role) {
    case 'citizen':
      return '/citizen/dashboard'
    case 'university':
      return '/university/dashboard'
    case 'industry':
      return '/industry/dashboard'
    case 'admin':
      return '/admin/dashboard'
    default:
      return '/'
  }
}
