/**
 * auth.js — Substituição do Basic Auth por Supabase JWT.
 * As funções mantêm a mesma assinatura para compatibilidade com o código existente.
 */
import { supabase } from './lib/supabase'

const AUTH_EVENT = 'painel:auth-changed'

/** Retorna o header Authorization com o Bearer token da sessão atual */
export async function getAuthHeader() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) return ''
  return `Bearer ${session.access_token}`
}

/** Retorna objeto de headers prontos para fetch */
export async function getAuthHeaders() {
  const authorization = await getAuthHeader()
  return authorization ? { Authorization: authorization } : {}
}

/** Dispara evento de mudança de auth (mantém compatibilidade) */
export function notifyAuthChange() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(AUTH_EVENT))
}

/** Registra listener de mudança de auth */
export function onAuthChange(handler) {
  if (typeof window === 'undefined') return () => {}

  // Escuta mudanças do Supabase
  const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
    handler()
  })

  // Mantém compatibilidade com evento legado
  window.addEventListener(AUTH_EVENT, handler)

  return () => {
    subscription.unsubscribe()
    window.removeEventListener(AUTH_EVENT, handler)
  }
}

/** Retorna a sessão atual */
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

/** Retorna true se há sessão válida */
export async function isAuthenticated() {
  const session = await getSession()
  return session !== null
}

/**
 * Verifica se há tokens na URL (passados pelo hub) e inicia a sessão.
 * Chamar uma vez no carregamento do app.
 */
export async function initSessionFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const accessToken = params.get('sb_access_token')
  const refreshToken = params.get('sb_refresh_token')

  if (accessToken && refreshToken) {
    await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
    // Remove tokens da URL sem recarregar a página
    params.delete('sb_access_token')
    params.delete('sb_refresh_token')
    const newUrl = [window.location.pathname, params.toString()].filter(Boolean).join('?')
    window.history.replaceState({}, '', newUrl)
  }
}

// Aliases de compatibilidade (funções que o código legado pode chamar)
export const saveAuth = () => {}
export const clearAuth = () => supabase.auth.signOut()
export const getStoredAuth = () => null
