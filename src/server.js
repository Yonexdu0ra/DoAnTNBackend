import express from 'express';
import http from 'http';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import cors from 'cors';
import { ApolloServerPluginLandingPageLocalDefault, ApolloServerPluginLandingPageProductionDefault } from '@apollo/server/plugin/landingPage/default';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/use/ws';
import routes from './routes/index.js'
import { typeDefs } from './schemas/index.js'
import { resolvers } from './resolvers/index.js'
import { getToken, verifyAccessToken } from './utils/token.js';

const PORT = process.env.PORT || 3002;

const app = express();

const httpServer = http.createServer(app);

const isProduction = process.env.PRODUCT_MODE === 'production';

// Tạo schema từ typeDefs và resolvers
const schema = makeExecutableSchema({ typeDefs, resolvers });

// WebSocket server cho Subscriptions
const wsServer = new WebSocketServer({
  server: httpServer,
  path: '/api/v1/graphql',
});

const serverCleanup = useServer({
  schema,
  context: async (ctx) => {
    const token = getToken({
      headers: ctx.extra?.request?.headers,
      cookies: ctx.extra.request.headers.cookie,
      cookieName: 'access_token',
    });

    
    if (!token) return {};
    const tokenDecoded = verifyAccessToken(token);

    return tokenDecoded ? { user: tokenDecoded } : {};
  },
}, wsServer);

const server = new ApolloServer({
  schema,
  introspection: true,
  plugins: [
    ApolloServerPluginDrainHttpServer({ httpServer }),
    ApolloServerPluginLandingPageLocalDefault({
      footer: false,
      embed: { endpointIsEditable: true },
    }),
    {
      async serverWillStart() {
        return {
          async drainServer() {
            await serverCleanup.dispose();
          },
        };
      },
    },
  ],
});


await server.start();



app.use(
  express.urlencoded({ extended: true }),
  cors({
    origin: [
      'https://qujs.online',
    ], credentials: true
  }),
  express.json()
);

routes(app);

app.use(
  '/api/v1/graphql',
  expressMiddleware(server, {
    context: async ({ req }) => {
      const token = getToken({ headers: req.headers, cookies: req.cookies });

      const isIntrospection =
        req.body?.operationName === 'IntrospectionQuery';
      if (isIntrospection) {
        return {}; // 👈 luôn cho qua
      }


      if (!token) throw new Error('Unauthorized');
      const tokenDecoded = verifyAccessToken(token);

      if (!tokenDecoded) throw new Error('Unauthorized');
      return { user: tokenDecoded };
    },
  }),
);

await new Promise((resolve) =>
  httpServer.listen({ port: PORT }, resolve),
);
console.log(`Server ready at http://${process.env.HOST_LOCAL}:${PORT}/graphql`);
console.log(`WebSocket subscriptions at ws://${process.env.HOST_LOCAL}:${PORT}/graphql`);
console.log(`Production: http://${process.env.HOST_PROD}`);
