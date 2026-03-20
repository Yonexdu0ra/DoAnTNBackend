

export const attendanceType = `

type Attendance {
  id: ID
  userId: ID
  jobId: ID
  date: Date
  status: String
  type: String
  isFraud: Boolean
  fraudReason: String
  checkInAt: Date
  checkOutAt: Date
  checkInMeta: JSON
  checkOutMeta: JSON
  job: Job
  user: User
  createdAt: Date
  updatedAt: Date
}




`