import { NextApiHandler, NextApiRequest, NextApiResponse } from 'next'
import { Session } from 'next-auth'
import { getSession } from 'next-auth/react'
import { ApiError } from 'next/dist/server/api-utils'
import database from '../database'
import { tokenSession } from './token'

export interface AuthenticatedApiHandler {
   (req: NextApiRequest, res: NextApiResponse, session: Session): unknown | Promise<unknown>
}

export default function withSession(handler: AuthenticatedApiHandler): NextApiHandler {
   return async (req: NextApiRequest, res: NextApiResponse) => {
      await database()

      const session = tokenSession(req) ?? (await getSession({ req }))

      if (!session) throw new ApiError(403, 'Unauthorized')

      return handler(req, res, session)
   }
}

type Method = 'post' | 'get' | 'put' | 'delete' | 'head'
export function methodSwitch(handlers: Partial<Record<Method, NextApiHandler>>): NextApiHandler {
   return (req, res) => {
      const handler = (handlers as Record<string, NextApiHandler | undefined>)[req.method?.toLowerCase() ?? '']
      if (handler) return handler(req, res)
      throw new ApiError(404, 'Invalid Method')
   }
}

export function forMethod(method: Method, handler: NextApiHandler) {
   return methodSwitch({ [method]: handler })
}
