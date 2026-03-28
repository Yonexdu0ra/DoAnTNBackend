import GraphQLJSON from 'graphql-type-json'
import { DateResolver } from 'graphql-scalars'
import queryResolvers from './query/index.js'
import mutationResolvers from './mutation/index.js'
import subscriptionResolvers from './subscription/index.js'
import { GraphQLScalarType } from 'graphql'

export const resolvers = {
    Date: new GraphQLScalarType({
        name: 'Date',
        parseValue(value) {
            return new Date(value);
        },
        serialize(value) {
            return new Date(value)?.toISOString();
        },
    }),
    JSON: GraphQLJSON,
    Query: queryResolvers,
    Mutation: mutationResolvers,
    Subscription: subscriptionResolvers,
}

