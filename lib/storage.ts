import { createBrowserClient } from '@supabase/ssr'

const BUCKET_NAME = 'problem-photos'

export async function ensureStorageBucketExists() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  try {
    // Check if bucket exists
    const { data: buckets, error } = await supabase.storage.listBuckets()
    
    if (error) {
      console.error('Error checking buckets:', error)
      return { exists: false, error: error.message, availableBuckets: [] }
    }

    console.log('Available buckets:', buckets?.map(b => b.name))
    
    const bucketExists = buckets?.some(bucket => bucket.name === BUCKET_NAME)
    
    if (bucketExists) {
      return { exists: true, error: null, availableBuckets: buckets?.map(b => b.name) || [] }
    }

    return { 
      exists: false, 
      error: `Storage bucket '${BUCKET_NAME}' does not exist. Available buckets: ${buckets?.map(b => b.name).join(', ') || 'none'}`,
      availableBuckets: buckets?.map(b => b.name) || []
    }
  } catch (error: any) {
    console.error('Bucket check error:', error)
    return { exists: false, error: error.message, availableBuckets: [] }
  }
}

export async function uploadProblemPhoto(file: File, userId: string) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Skip bucket check - try direct upload
  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
  const filePath = `${userId}/${fileName}`

  console.log('Attempting direct upload to:', BUCKET_NAME, 'path:', filePath)

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file)

  if (uploadError) {
    console.error('Upload error:', uploadError)
    throw new Error(`Photo upload failed: ${uploadError.message}`)
  }

  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath)

  console.log('Upload successful:', publicUrl)
  return publicUrl
}
