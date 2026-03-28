import GraphQLJSON from 'graphql-type-json'
import { DateResolver } from 'graphql-scalars'
import queryResolvers from './query/index.js'
import mutationResolvers from './mutation/index.js'
import subscriptionResolvers from './subscription/index.js'

export const resolvers = {
    Date: DateResolver,
    JSON: GraphQLJSON,
    Query: queryResolvers,
    Mutation: mutationResolvers,
    Subscription: subscriptionResolvers,
}

