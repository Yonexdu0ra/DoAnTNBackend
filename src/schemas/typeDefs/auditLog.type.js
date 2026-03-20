


export const auditLogType = `
type AuditLog {
  id: ID
  userId: ID
  action: String
  resource: String
  resourceId: ID
  oldValue: JSON
  newValue: JSON
  ipAddress: String
  userAgent: String
  status: String
  createdAt: Date
}
`