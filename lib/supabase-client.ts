import { createClient } from '@supabase/supabase-js'

// Configuração do cliente Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://auiidcxarcjjxvyswwhf.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1aWlkY3hhcmNqanh2eXN3d2hmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMjcxNjAsImV4cCI6MjA2ODkwMzE2MH0.KCMuEq5p1UHtZp-mJc5RKozEyWhpZg8J023lODrr3rY'

// Verificar se as variáveis estão definidas
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variáveis do Supabase não encontradas:', {
    url: !!supabaseUrl,
    key: !!supabaseAnonKey
  })
}

// Criar cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Cliente para uso em API routes (server-side)
export const createServerSupabaseClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// Função para verificar se o Supabase está configurado
export const isSupabaseConfigured = () => {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

// Função para debug da configuração
export const debugSupabaseConfig = () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 Configuração Supabase:', {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Configurado' : '❌ Não configurado',
      key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Configurado' : '❌ Não configurado',
      environment: process.env.NODE_ENV
    })
  }
} 