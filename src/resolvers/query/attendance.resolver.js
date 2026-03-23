import prisma from '../../configs/prismaClient.js'

export const attendance = async (parent, { id }, context) => {
  // const user = context.user
  // const role = user.role
  const attendance = await prisma.attendance.findUnique({
    where: { id },
  })
  // if(user.id !== attendance.userId && role !== 'admin' && role !== 'manager') {
  //   throw new Error("Bạn không có quyền truy cập thông tin này")
  // }
  return attendance
}
export const attendances = async (parent, { pagination, filter, orderBy }, context) => {
  // const user = context.user
  // const role = user.role
  // if(role !== 'admin' && role !== 'manager') {
  //   throw new Error("Bạn không có quyền truy cập thông tin này")
  // }
  const { page = 1, pageSize = 10 } = pagination
  const skip = (page - 1) * pageSize
  const take = pageSize


  const where = filter?.keyword
    ? {
        OR: [
          { status: { contains: filter.keyword, mode: 'insensitive' } },
          { type: { contains: filter.keyword, mode: 'insensitive' } },
        ],
      }
    : {}

  const order = orderBy
    ? {
        [orderBy.field]: orderBy.direction,
      }
    : { createdAt: 'desc' }

  const [data, total] = await Promise.all([
    prisma.attendance.findMany({
      where,
      orderBy: order,
      skip,
      take,
    }),
    prisma.attendance.count({ where }),
  ])

  return {
    data,
    total,
    page,
  }
}

export const attendancesCursor = async (parent, { pagination, filter, orderBy }, context) => {
  throw new Error('Resolver attendancesCursor is not implemented yet')
}

export const attendancesByJob = async (parent, { jobId, pagination, filter, orderBy }, context) => {
  throw new Error('Resolver attendancesByJob is not implemented yet')
}

export const attendancesCursorByJob = async (parent, { jobId, pagination, filter, orderBy }, context) => {
  throw new Error('Resolver attendancesCursorByJob is not implemented yet')
}

export const attendancesByUser = async (parent, { pagination, filter, orderBy }, context) => {
  throw new Error('Resolver attendancesByUser is not implemented yet')
}

export const attendancesCursorByUser = async (parent, { pagination, filter, orderBy }, context) => {
  throw new Error('Resolver attendancesCursorByUser is not implemented yet')
}