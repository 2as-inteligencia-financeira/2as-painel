/**
 * auth.js — Supabase JWT + handshake seguro via postMessage com o hub.
 *
 * Fluxo de abertura a partir do hub:
 *   1. Hub abre o painel via window.open() — sem token na URL
 *   2. Painel carrega → initSessionFromUrl() detecta window.opener e envia { type: 'painel:ready' }
 *   3. Hub verifica a origem, responde com { type: 'painel:token', access_token, refresh_token }
 *   4. Painel valida a origem do hub, chama supabase.auth.setSession()
 *   5. Token nunca aparece em URL, histórico ou logs de servidor
 */
import { supabase } from './lib/supabase'

const AUTH_EVENT = 'painel:auth-changed'

// Origens autorizadas a enviar o token para este painel
// BAIXO-04: localhost apenas em dev (import.meta.env.DEV = false em produção Vite)
const TRUSTED_HUB_ORIGINS = [
  'https://hub.luniqfinancas.com',
  ...(import.meta.env.DEV ? [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
  ] : []),
]

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

/** Dispara evento de mudança de auth */
export function notifyAuthChange() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(AUTH_EVENT))
}

/** Registra listener de mudança de auth */
export function onAuthChange(handler) {
  if (typeof window === 'undefined') return () => {}
  const { data: { subscription } } = supabase.auth.onAuthStateChange(() => handler())
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
  return (await getSession()) !== null
}

/**
 * Inicializa sessão de forma segura:
 *  - Se veio do hub (window.opener existe): handshake postMessage
 *  - Fallback: sessão já existente no Supabase (refresh automático)
 *  - Compatibilidade: ainda aceita token na URL, mas remove imediatamente
 *
 * Retorna uma Promise que resolve quando a sessão está pronta.
 */
export async function initSessionFromUrl() {
  if (typeof window === 'undefined') return

  // ── Compatibilidade legada: token na URL (remover após migração completa) ──
  const params = new URLSearchParams(window.location.search)
  const legacyAccess  = params.get('sb_access_token')
  const legacyRefresh = params.get('sb_refresh_token')

  if (legacyAccess && legacyRefresh) {
    // Aceita mas remove da URL imediatamente
    await supabase.auth.setSession({
      access_token:  legacyAccess,
      refresh_token: legacyRefresh,
    })
    params.delete('sb_access_token')
    params.delete('sb_refresh_token')
    const clean = [window.location.pathname, params.toString()].filter(Boolean).join('?')
    window.history.replaceState({}, '', clean)
    return
  }

  // ── Fluxo seguro via postMessage ──────────────────────────────────────────
  if (window.opener && !window.opener.closed) {
    await new Promise((resolve) => {
      const timeout = setTimeout(resolve, 10_000) // resolve em 10s mesmo sem resposta

      const handler = async (event) => {
        // Valida origem — só aceita do hub
        if (!TRUSTED_HUB_ORIGINS.includes(event.origin)) return
        if (event.data?.type !== 'painel:token') return

        clearTimeout(timeout)
        window.removeEventListener('message', handler)

        const { access_token, refresh_token } = event.data
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token })
        }
        resolve()
      }

      window.addEventListener('message', handler)

      // Notifica o hub que o painel está pronto
      // Enviamos para '*' pois ainda não sabemos a origem do hub —
      // o segredo (token) nunca viaja nesta direção, apenas a sinalização
      try {
        window.opener.postMessage({ type: 'painel:ready' }, '*')
      } catch {
        // opener pode ter sido fechado entre window.open e o postMessage
        clearTimeout(timeout)
        window.removeEventListener('message', handler)
        resolve()
      }
    })
  }

  // Se chegou aqui sem sessão, o Supabase tentará usar a sessão salva localmente (refresh token)
}

// Aliases de compatibilidade
export const saveAuth      = () => {}
export const clearAuth     = () => supabase.auth.signOut()
export const getStoredAuth = () => null
