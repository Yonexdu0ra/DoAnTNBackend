

export const leaveRequestType = `
type LeaveRequest {
  id: ID!
  userId: ID
  jobId: ID
  startDate: Date
  endDate: Date
  leaveType: String
  reason: String
  status: String
  reply: String
  approvedBy: String
  approverAt: Date
  approver: User
  user: User
  job: Job
  createdAt: Date
  updatedAt: Date
}
`