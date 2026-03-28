import { withAuthorization, ROLE_ACCESS } from '../../utils/authroziredRole.js'
import getSelectPrisma from '../../utils/getSelectPrisma.js'
import userService from '../../services/user.service.js'

const managerAdminQueries = {
    searchEmployee: withAuthorization('searchEmployee', ROLE_ACCESS.managerAdmin, async (_parent, args, _context, info) => {
        const select = getSelectPrisma(info)
        return userService.searchEmployee(args.search, select)
    }),
}

export default managerAdminQueries
