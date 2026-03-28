import { withAuthorization, ROLE_ACCESS } from '../../utils/authroziredRole.js'
import getSelectPrisma from '../../utils/getSelectPrisma.js'
import holidayService from '../../services/holiday.service.js'
import userService from '../../services/user.service.js'

const commonQueries = {
    holidays: withAuthorization('holidays', ROLE_ACCESS.common, async (_parent, args, _context, info) => {
        const select = getSelectPrisma(info)
        return holidayService.getHolidays(args.startDate, args.endDate, select)
    }),

    me: withAuthorization('me', ROLE_ACCESS.common, async (_parent, _args, context, info) => {
        const select = getSelectPrisma(info)
        return userService.getMe(context.user.id, select)
    }),
}

export default commonQueries
