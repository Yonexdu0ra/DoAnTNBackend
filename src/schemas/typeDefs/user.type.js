
export const userType = `
type User {
  id:               ID    
  email:         String   
  phone:            String   
  code:         String  
  biometricEnabled: Boolean   
  role:    String      
  deletedAt:     Date
  profile:      Profile
  createdAt: Date
  updatedAt: Date
}

`