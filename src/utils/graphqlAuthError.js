import { GraphQLError } from 'graphql/error/GraphQLError.js'

export const AUTH_ERROR_REASON = {
  TOKEN_MISSING: 'TOKEN_MISSING',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  TOKEN_NOT_ACTIVE: 'TOKEN_NOT_ACTIVE',
}

const REFRESHABLE_AUTH_REASONS = new Set([
  AUTH_ERROR_REASON.TOKEN_EXPIRED,
])

export const shouldRefreshToken = (reason) => REFRESHABLE_AUTH_REASONS.has(reason)

export const buildUnauthenticatedExtensions = (
  reason = AUTH_ERROR_REASON.TOKEN_INVALID,
  authMeta = {},
) => ({
  code: 'UNAUTHENTICATED',
  http: { status: 401 },
  auth: {
    reason,
    shouldRefreshToken: shouldRefreshToken(reason),
    ...authMeta,
  },
})

export const createUnauthenticatedGraphQLError = (
  reason = AUTH_ERROR_REASON.TOKEN_INVALID,
  message = 'Unauthorized',
  authMeta = {},
) => new GraphQLError(message, {
  extensions: buildUnauthenticatedExtensions(reason, authMeta),
})

export const createForbiddenGraphQLError = (
  message = 'Forbidden',
  extensionMeta = {},
) => new GraphQLError(message, {
  extensions: {
    code: 'FORBIDDEN',
    http: { status: 403 },
    ...extensionMeta,
  },
})

export const buildWsUnauthenticatedReason = (
  reason = AUTH_ERROR_REASON.TOKEN_INVALID,
  message = 'Unauthorized',
) => {
  const payload = JSON.stringify({
    message,
    code: 'UNAUTHENTICATED',
    reason,
    shouldRefreshToken: shouldRefreshToken(reason),
  })

  // WebSocket close reason allows at most 123 bytes.
  if (payload.length <= 123) {
    return payload
  }

  return JSON.stringify({
    code: 'UNAUTHENTICATED',
    reason,
  })
}