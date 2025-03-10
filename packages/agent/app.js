'use strict'

import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import AutoLoad from '@fastify/autoload'
import cors from '@fastify/cors'

// Create the equivalent of __dirname for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Pass --options via CLI arguments in command to enable these options.
const options = {}

export default async function (fastify, opts) {
  // Place here your custom code!
  await fastify.register(cors, {
     // You can configure CORS options here
     origin: true, // Allow all origins
     methods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS'], // Allowed methods
     allowedHeaders: ['content-type', 'authorization'],
     exposedHeaders: ["X-Experimental-Stream-Data", 'x-vercel-ai-data-stream']
     // allowedHeaders: ['Content-Type', 'Authorization'], // Allowed headers
     // credentials: true // Allow credentials
   })
  // Do not touch the following lines

  // This loads all plugins defined in plugins
  // those should be support plugins that are reused
  // through your application
  // fastify.register(AutoLoad, {
  //   dir: join(__dirname, 'plugins'),
  //   options: Object.assign({}, opts)
  // })

  // This loads all plugins defined in routes
  // define your routes in one of these
  fastify.register(AutoLoad, {
    dir: join(__dirname, 'routes'),
    options: Object.assign({}, opts)
  })
}

const _options = options
export { _options as options }
