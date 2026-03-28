import commonMutations from './common.mutation.js'
import adminMutations from './admin.mutation.js'
import managerMutations from './manager.mutation.js'
import employeeMutations from './employee.mutation.js'

const mutationResolvers = {
	...commonMutations,
	...adminMutations,
	...managerMutations,
	...employeeMutations,
}

export default mutationResolvers
