import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

export async function getAllContacts() {
  let all = []
  let from = 0
  const step = 1000
  while (true) {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .range(from, from + step - 1)
    if (error || !data || data.length === 0) break
    all = [...all, ...data]
    if (data.length < step) break
    from += step
  }
  return all
}
