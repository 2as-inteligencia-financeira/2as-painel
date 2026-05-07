/* global process */

/**
 * Verifica um JWT Supabase chamando a API de auth.
 * Retorna o usuário se válido, null se inválido.
 */
export async function verifySupabaseToken(token) {
  if (!token) return null

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.SUPABASE_ANON_KEY
    || process.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.warn('[supabaseAuth] SUPABASE_URL/VITE_SUPABASE_URL ou chave Supabase não configurados')
    return null
  }

  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: supabaseKey,
      },
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/**
 * Extrai o Bearer token do header Authorization.
 */
export function extractBearerToken(headers = {}) {
  const header = headers.authorization || headers.Authorization || ''
  if (!header.startsWith('Bearer ')) return null
  return header.slice('Bearer '.length).trim() || null
}

/**
 * isAuthorized — substitui o Basic Auth.
 * Verifica JWT Supabase via header Authorization: Bearer <token>
 */
export async function isAuthorized(headers = {}) {
  // Em dev sem Supabase configurado, libera
  if (!process.env.SUPABASE_URL && !process.env.VITE_SUPABASE_URL) {
    return process.env.VERCEL_ENV !== 'production'
  }

  const token = extractBearerToken(headers)
  if (!token) return false

  const user = await verifySupabaseToken(token)
  return user !== null
}
