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
            const date = new Date(value)
            if (!process.env.TZ) {
                date.setHours(date.getHours() + 7)
            }
            return date
        },
        serialize(value) {
            return new Date(value)?.toISOString();
        },
    }),
    JSON: GraphQLJSON,

    // Type resolvers cho field mapping
    User: {
        deleteAt: (parent) => parent.deletedAt || null,
    },

    Query: queryResolvers,
    Mutation: mutationResolvers,
    Subscription: subscriptionResolvers,
}
