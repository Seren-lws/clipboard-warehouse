import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

// ========== Records ==========

export async function fetchRecords() {
  const { data, error } = await supabase
    .from('records')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createRecord({ content, tags, images, pinned, notes }) {
  const { data, error } = await supabase
    .from('records')
    .insert([{ content, tags, images, pinned: pinned || false, notes: notes || '' }])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateRecord(id, updates) {
  const { data, error } = await supabase
    .from('records')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteRecord(id) {
  const { error } = await supabase
    .from('records')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ========== Custom Tags ==========

export async function fetchCustomTags() {
  const { data, error } = await supabase
    .from('custom_tags')
    .select('name')
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data || []).map(t => t.name)
}

export async function addCustomTag(name) {
  const { error } = await supabase
    .from('custom_tags')
    .insert([{ name }])
  if (error) throw error
}

export async function deleteCustomTag(name) {
  const { error } = await supabase
    .from('custom_tags')
    .delete()
    .eq('name', name)
  if (error) throw error
}

// ========== Image Upload ==========

export async function uploadImage(file) {
  const ext = file.name.split('.').pop()
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const filePath = `uploads/${fileName}`

  const { error } = await supabase.storage
    .from('clipboard-images')
    .upload(filePath, file)
  if (error) throw error

  const { data } = supabase.storage
    .from('clipboard-images')
    .getPublicUrl(filePath)

  return data.publicUrl
}

export async function deleteImage(url) {
  const path = url.split('/clipboard-images/')[1]
  if (path) {
    await supabase.storage.from('clipboard-images').remove([path])
  }
}
