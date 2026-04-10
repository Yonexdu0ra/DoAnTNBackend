import {
	AUTH_ERROR_REASON,
	createForbiddenGraphQLError,
	createUnauthenticatedGraphQLError,
} from './graphqlAuthError.js'

export const ROLE = {
	ADMIN: 'ADMIN',
	MANAGER: 'MANAGER',
	EMPLOYEE: 'EMPLOYEE',
}

export const ROLE_ACCESS = {
	common: [ROLE.ADMIN, ROLE.MANAGER, ROLE.EMPLOYEE],
	admin: [ROLE.ADMIN],
	manager: [ROLE.MANAGER],
	employee: [ROLE.EMPLOYEE],
	managerAdmin: [ROLE.MANAGER, ROLE.ADMIN],
}

const normalizeRole = (role) => {
	if (!role) return null

	const normalized = String(role).trim().toUpperCase()
	return normalized
}
// lấy role từ context từ header authorization đã được verify token và decode ra thông tin user
export const getRoleFromContext = (context) => {
	return normalizeRole(context?.user?.role)
}
// kiểm tra xem role có nằm trong allowedRoles hay không, trả về true nếu có, false nếu không
export const hasAnyRole = (context, allowedRoles = []) => {
	const role = getRoleFromContext(context)
	if (!role) return false

	const normalizedAllowed = allowedRoles.map((item) => normalizeRole(item))
	return normalizedAllowed.includes(role)
}
// đảm bảo rằng role có quyền truy cập vào operation, nếu không sẽ ném lỗi Unauthorized hoặc Forbidden
export const ensureAuthorized = (context, allowedRoles = [], operationName = 'operation') => {
	if (!allowedRoles || allowedRoles.length === 0) return

	const role = getRoleFromContext(context)
	if (!role) {
		throw createUnauthenticatedGraphQLError(
			AUTH_ERROR_REASON.TOKEN_MISSING,
			'Unauthorized',
			{ operation: operationName },
		)
	}

	const normalizedAllowed = allowedRoles.map((item) => normalizeRole(item))
	if (!normalizedAllowed.includes(role)) {
		throw createForbiddenGraphQLError('Forbidden', {
			operation: operationName,
		})
	}
}
// một hàm wrapper để bảo vệ resolver bằng cách kiểm tra authorization trước khi gọi handler thực sự
export const withAuthorization = (operationName, allowedRoles, handler) => {
	return async (parent, args, context, info) => {
		ensureAuthorized(context, allowedRoles, operationName)
		return handler(parent, args, context, info)
	}
}
// một hàm tiện ích để tạo resolver stub chưa được triển khai, sẽ ném lỗi nếu được gọi
export const createResolverStub = (operationName, allowedRoles, area = 'Resolver') => {
	return withAuthorization(operationName, allowedRoles, async () => {
		throw new Error(`${area} ${operationName} is not implemented yet`)
	})
}

