import mongoose, { ConnectOptions, Document, Model, Schema } from 'mongoose'

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = global.mongo

if (!cached) {
   cached = global.mongo = { conn: undefined, promise: undefined }
}

async function database() {
   const { MONGODB_URI, MONGODB_DB } = process.env

   if (!MONGODB_URI) throw new Error('Please define the MONGODB_URI environment variable inside .env.local')
   if (!MONGODB_DB) throw new Error('Please define the MONGODB_DB environment variable inside .env.local')

   if (cached.conn) {
      return cached.conn
   }

   if (!cached.promise) {
      const opts: ConnectOptions = {
         bufferCommands: false,
         dbName: MONGODB_DB,
      }

      cached.promise = mongoose.connect(MONGODB_URI, opts)
   }
   cached.conn = await cached.promise
   return cached.conn
}

export function define<M>(name: string, schema: Schema<Document & M>): Model<M> {
   return mongoose.models[name] ?? mongoose.model<M>(name, schema)
}

export const serialize: {
   <M>(model?: M | null): M
   <M>(model: Array<M>): M[]
} = <M>(model?: Document | Document[]) => {
   if (model === null || model === undefined) return null
   if (Array.isArray(model)) return model.map(m => serialize(m)) as unknown as M[]

   if (typeof model === 'object' && '_id' in model) {
      const props = Object.entries(model instanceof Document ? model.toObject({ virtuals: true }) : model).reduce((o, [key, value]) => ({ ...o, [key]: serialize(value) }), {})
      const id = model._id?.toString()
      return { ...props, _id: id } as unknown as M
   }

   return model
}

export default database
