


export const jobType = `

type Job {
  id: ID!
  title: String
  description: String
  address: String
  workStartTime: Date
  workEndTime: Date
  earlyCheckInMinutes: Int
  lateCheckInMinutes: Int
  lateCheckOutMinutes: Int
  earlyCheckOutMinutes: Int
  latitude: Float
  longitude: Float
  radius: Int
  maxMembers: Int
  updatedAt: Date
  createdAt: Date
  manager: [User]
}
  `