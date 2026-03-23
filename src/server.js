import express from 'express';
import http from 'http';
import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { expressMiddleware } from '@as-integrations/express5';
import cors from 'cors';
import { ApolloServerPluginLandingPageLocalDefault, ApolloServerPluginLandingPageProductionDefault } from '@apollo/server/plugin/landingPage/default';
import routes from './routes/index.js'
import { typeDefs } from './schemas/index.js'
import { resolvers } from './resolvers/index.js'
import { verifyAccessToken } from './utils/token.js';
const PORT = process.env.PORT || 3002;

const app = express();

const httpServer = http.createServer(app);

const isProduction = process.env.PRODUCT_MODE === 'production';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: !isProduction,
  plugins: [
    ApolloServerPluginDrainHttpServer({ httpServer }),
    isProduction ? ApolloServerPluginLandingPageProductionDefault({
      graphRef: 'my-graph-id@my-graph-variant',
      footer: false,
    })
      : ApolloServerPluginLandingPageLocalDefault({ footer: false })
  ],
});


await server.start();



app.use(
  express.urlencoded({ extended: true }),
  cors({ origin: "*" }),
  express.json()
);

routes(app);

app.use(
  '/graphql',
  expressMiddleware(server, {
    context: async ({ req }) => {
      const token = req.headers.authorization || '';

      const isIntrospection =
        req.body?.operationName === 'IntrospectionQuery';

      if (!token && isIntrospection) {
        return {};
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
console.log(`Production: http://${process.env.HOST_PROD}`);
