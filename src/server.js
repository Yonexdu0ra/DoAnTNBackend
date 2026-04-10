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
import { getToken, verifyAccessTokenDetailed } from './utils/token.js';
import { CloseCode } from 'graphql-ws';
import {
  AUTH_ERROR_REASON,
  buildWsUnauthenticatedReason,
  createUnauthenticatedGraphQLError,
} from './utils/graphqlAuthError.js';

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
  keepAlive: 10000, // 10 giây
  onConnect: async (ctx) => {
    const token = getToken({
      headers: ctx.extra?.request?.headers,
      cookies: ctx.extra?.request?.headers?.cookie,
      connectionParams: ctx.connectionParams,
      cookieName: 'access_token',
    });

    if (!token) {
      ctx.extra.socket.close(
        CloseCode.Unauthorized,
        AUTH_ERROR_REASON.TOKEN_MISSING
      );
      return false;
    }
    const { decoded, reason } = verifyAccessTokenDetailed(token);

    if (!decoded) {
      ctx.extra.socket.close(
        CloseCode.Unauthorized,
        reason
      );
      return false;
    }
  },

  context: async (ctx) => {
    const token = getToken({
      headers: ctx.extra?.request?.headers,
      cookies: ctx.extra?.request?.headers?.cookie,
      connectionParams: ctx.connectionParams,
      cookieName: 'access_token',
    });
    if (!token) {
      throw createUnauthenticatedGraphQLError(
        AUTH_ERROR_REASON.TOKEN_MISSING,
        'Unauthorized',
      );
    }
    const { decoded, reason } = verifyAccessTokenDetailed(token);

    if (!decoded) {
      throw createUnauthenticatedGraphQLError(
        reason || AUTH_ERROR_REASON.TOKEN_INVALID,
      );
    }

    return { user: decoded };
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
      const token = getToken({
        headers: req.headers,
        cookies: req.cookies,
        cookieName: 'access_token',
      });

      const isIntrospection =
        req.body?.operationName === 'IntrospectionQuery';
      if (isIntrospection) {
        return {}; // 👈 luôn cho qua
      }

      const { decoded, reason } = verifyAccessTokenDetailed(token);

      if (!decoded) {
        throw createUnauthenticatedGraphQLError(
          reason || AUTH_ERROR_REASON.TOKEN_INVALID,
        );
      }

      return { user: decoded };
    },
  }),
);

await new Promise((resolve) =>
  httpServer.listen({ port: PORT }, resolve),
);
console.log(`Server ready at http://${process.env.HOST_LOCAL}:${PORT}/graphql`);
console.log(`WebSocket subscriptions at ws://${process.env.HOST_LOCAL}:${PORT}/graphql`);
console.log(`Production: http://${process.env.HOST_PROD}`);
