

export const overtimeRequestType = `

type OvertimeRequest {
  id         :ID    
  userId     :ID     
  jobId      :ID    
  date       :Date
  startTime  :Date
  endTime    :Date
  minutes    :Int        
  reason     :String   
  status     :String 
  reply      :String    
  approvedBy :String
  approverAt :Date

  createdAt :Date
  updatedAt :Date
  approver  :User
  user      :User
  job       :Job

}
`