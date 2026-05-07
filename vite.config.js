/* global process */

import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fetchSheetCsv, isAuthorized } from './src/server/sheetsProxy.js'
import {
  fetchGranatumContasPagarLabs,
  fetchGranatumContasPagasLabs,
  fetchGranatumContasVencidasLabs,
  fetchGranatumFluxoProjetadoLabs,
} from './src/server/granatumLabs.js'

function sheetsApiMiddleware() {
  return {
    name: 'sheets-api-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split('?')[0] || ''
        const match = path.match(/^\/api\/sheets\/([^/]+)$/)
        if (!match) return next()

        if (req.method !== 'GET' && req.method !== 'HEAD') {
          res.statusCode = 405
          res.setHeader('Allow', 'GET, HEAD')
          res.end('Method not allowed')
          return
        }

        if (!isAuthorized(req.headers)) {
          res.statusCode = 401
          res.setHeader('WWW-Authenticate', 'Basic realm="Luniq Painel", charset="UTF-8"')
          res.setHeader('Cache-Control', 'no-store')
          res.end('Authentication required')
          return
        }

        const requestUrl = new URL(req.url || path, 'http://localhost')
        const result = await fetchSheetCsv(
          decodeURIComponent(match[1]),
          requestUrl.searchParams.get('empresa') || ''
        )
        res.statusCode = result.status
        Object.entries(result.headers).forEach(([key, value]) => res.setHeader(key, value))
        res.end(req.method === 'HEAD' ? undefined : result.body)
      })
    },
  }
}

function granatumApiMiddleware() {
  return {
    name: 'granatum-api-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split('?')[0] || ''
        const granatumRoutes = new Set([
          '/api/granatum/contas-pagar-labs',
          '/api/granatum/contas-pagas-labs',
          '/api/granatum/contas-vencidas-labs',
          '/api/granatum/fluxo-projetado-labs',
        ])
        if (!granatumRoutes.has(path)) return next()

        if (req.method !== 'GET' && req.method !== 'HEAD') {
          res.statusCode = 405
          res.setHeader('Allow', 'GET, HEAD')
          res.end('Method not allowed')
          return
        }

        if (!isAuthorized(req.headers)) {
          res.statusCode = 401
          res.setHeader('WWW-Authenticate', 'Basic realm="Luniq Painel", charset="UTF-8"')
          res.setHeader('Cache-Control', 'no-store')
          res.end('Authentication required')
          return
        }

        try {
          const requestUrl = new URL(req.url || path, 'http://localhost')
          const empresa = requestUrl.searchParams.get('empresa') || ''
          const payload = path === '/api/granatum/contas-pagas-labs'
            ? await fetchGranatumContasPagasLabs({
                dataInicio: requestUrl.searchParams.get('dataInicio') || '',
                dataFim: requestUrl.searchParams.get('dataFim') || '',
                companyId: empresa,
              })
            : path === '/api/granatum/fluxo-projetado-labs'
            ? await fetchGranatumFluxoProjetadoLabs(empresa)
            : path === '/api/granatum/contas-vencidas-labs'
            ? await fetchGranatumContasVencidasLabs(empresa)
            : await fetchGranatumContasPagarLabs(empresa)
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.setHeader('Cache-Control', 'no-store')
          res.end(req.method === 'HEAD' ? undefined : JSON.stringify(payload))
        } catch (error) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.setHeader('Cache-Control', 'no-store')
          res.end(req.method === 'HEAD' ? undefined : JSON.stringify({
            error: error?.message || 'Could not fetch Granatum data',
          }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))

  return {
    plugins: [react(), sheetsApiMiddleware(), granatumApiMiddleware()],
  }
})
