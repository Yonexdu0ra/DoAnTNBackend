import commonQueries from './common.query.js'
import managerAdminQueries from './managerAdmin.query.js'
import adminQueries from './admin.query.js'
import managerQueries from './manager.query.js'
import employeeQueries from './employee.query.js'

const queryResolvers = {
	...commonQueries,
	...managerAdminQueries,
	...adminQueries,
	...managerQueries,
	...employeeQueries,
}

export default queryResolvers
