import express from 'express';
import http from 'http';
import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { expressMiddleware } from '@as-integrations/express5';
import cors from 'cors';
import { ApolloServerPluginLandingPageLocalDefault, ApolloServerPluginLandingPageProductionDefault } from '@apollo/server/plugin/landingPage/default';

import { typeDefs, resolvers } from './schemas/index.js'
const PORT = process.env.PORT || 4000;

const app = express();
const httpServer = http.createServer(app);

const isProduction = process.env.PRODUCT_MODE === 'production';

const server = new ApolloServer({
  typeDefs,
  resolvers,
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
  '/graphql',
  cors({ origin: "*" }),
  express.json(),
  expressMiddleware(server, {
    context: async ({ req }) => ({ token: req.headers.token }),
  }),
);

await new Promise((resolve) =>
  httpServer.listen({ port: PORT }, resolve),
);
console.log(`Server ready at http://${process.env.HOST_LOCAL}:${PORT}/graphql`);
console.log(`Production: http://${process.env.HOST_PROD}`);
