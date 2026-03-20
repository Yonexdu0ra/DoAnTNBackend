

export const userJoinedJobType = `
type UserJoinedJob {
  id:        ID    
  userId:    ID    
  jobId:     ID     
  status:    String
  createdAt: Date
  updatedAt: Date
  job: Job
  user: User
}`