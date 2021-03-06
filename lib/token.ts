import jwt from 'jsonwebtoken'
import { NextApiHandler, NextApiRequest } from 'next'
import { Session } from 'next-auth'
import { ApiError } from 'next/dist/server/api-utils'
import Pack, { IPack } from '../database/models/Pack'
import withSession, { AuthenticatedApiHandler } from './wrapper'

const KEY = process.env.JWT_SECRET

export interface Token {
   pack: string
   created: number
}

export async function getAuthorizedPack(session: Session | undefined | null, packId: string, keys?: (keyof IPack)[]) {
   if (!session) return false

   const projection = keys?.reduce((o, k) => ({ ...o, [k]: true }), {})
   const pack = await Pack.findById(packId, projection)
   if (!pack) throw new ApiError(404, 'Pack not found')

   if (pack.id === session.packToken?.pack) return pack
   if (session.user?.email === pack.author) return pack
   return false
}

export async function authorizedPack(session: Session | undefined | null, packId: string, keys?: (keyof IPack)[]) {
   const pack = await getAuthorizedPack(session, packId, keys)
   if (!pack) throw new ApiError(403, 'Unauthorized')
   return pack
}

export function createToken(pack: string) {
   if (!KEY) throw new ApiError(500, 'No JWT Secret defined')
   const data: Token = { pack, created: Date.now() }
   return jwt.sign(data, KEY)
}

function decode(token: string) {
   if (!KEY) throw new ApiError(500, 'No JWT Secret defined')
   try {
      return jwt.verify(token, KEY) as Token
   } catch {
      throw new ApiError(400, 'Invalid pack token')
   }
}

export function tokenSession(req: NextApiRequest): Session | null {
   const [type, token] = req.headers.authorization?.split(' ') ?? []
   if (type === 'Bearer' || type === 'Token') {
      if (token) return { packToken: decode(token) }
   }
   return null
}

export function forwardTokenRequest(handler: AuthenticatedApiHandler | NextApiHandler, key = 'id'): NextApiHandler {
   return withSession((req, res, session) => {
      if (!session.packToken) throw new ApiError(403, 'Pack token required')
      req.query[key] = session.packToken.pack
      return handler(req, res, session)
   })
}
