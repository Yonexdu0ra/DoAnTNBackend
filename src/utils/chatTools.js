


const tools = [
    {
        type: 'function',
        function: {
          name: 'getNextHoliday',
          description: 'Lấy thông tin ngày nghỉ lễ tiếp theo trong vòng 30 ngày tới',
          parameters: {
            type: 'object',
            required: [],
            properties: {}
          }
        }
    },
    {
        type: 'function',
        function: {
          name: 'getMyJobInfo',
          description: 'Lấy danh sách công việc của tôi. Có thể truyền jobId để chọn công việc hiện tại cho các truy vấn leave/overtime sau đó.',
          parameters: {
            type: 'object',
            required: [],
            properties: {
              jobId: {
                type: 'string',
                description: 'ID công việc cần chọn làm ngữ cảnh hiện tại (nếu có)'
              },
              jobName: {
                type: 'string',
                description: 'Tên công việc cần chọn làm ngữ cảnh hiện tại (có thể nhập gần đúng, không dấu)'
              }
            }
          }
        }
    },
    {
        type: 'function',
        function: {
          name: 'setCurrentJob',
          description: 'Đặt công việc hiện tại để dùng cho các truy vấn leave request và overtime request',
          parameters: {
            type: 'object',
            required: [],
            properties: {
              jobId: {
                type: 'string',
                description: 'ID của công việc cần chọn'
              },
              jobName: {
                type: 'string',
                description: 'Tên công việc cần chọn (có thể nhập gần đúng, không dấu)'
              }
            }
          }
        }
    },
    {
        type: 'function',
        function: {
          name: 'getMyLeaveRequests',
          description: 'Lấy thông tin đơn xin nghỉ phép của tôi theo công việc hiện tại. Có thể truyền jobId để ghi đè công việc hiện tại.',
          parameters: {
            type: 'object',
            required: [],
            properties: {
              jobId: {
                type: 'string',
                description: 'ID công việc. Nếu bỏ trống sẽ dùng công việc hiện tại đã chọn'
              },
              jobName: {
                type: 'string',
                description: 'Tên công việc. Nếu truyền sẽ ưu tiên tự nhận diện công việc theo tên'
              },
              status: {
                type: 'string',
                description: 'Trạng thái của đơn xin nghỉ phép (PENDING, APPROVED, REJECTED)'}
            }
          }
        }
    },
    {
        type: 'function',
        function: {
          name: 'getMyOvertimeRequests',
          description: 'Lấy thông tin đơn xin tăng ca (OT) của tôi theo công việc hiện tại. Có thể truyền jobId để ghi đè công việc hiện tại.',
          parameters: {
            type: 'object',
            required: [],
            properties: {
              jobId: {
                type: 'string',
                description: 'ID công việc. Nếu bỏ trống sẽ dùng công việc hiện tại đã chọn'
              },
              jobName: {
                type: 'string',
                description: 'Tên công việc. Nếu truyền sẽ ưu tiên tự nhận diện công việc theo tên'
              },
              status: {
                type: 'string',
                description: 'Trạng thái (PENDING, APPROVED, REJECTED, CANCELED). Nếu không truyền thì lấy tất cả'
              }
            }
          }
        }
    },
    {
        type: 'function',
        function: {
          name: 'getMyAttendances',
          description: 'Lấy thông tin chấm công của tôi theo công việc hiện tại. Có thể truyền jobId để ghi đè công việc hiện tại.',
          parameters: {
            type: 'object',
            required: [],
            properties: {
              jobId: {
                type: 'string',
                description: 'ID công việc. Nếu bỏ trống sẽ dùng công việc hiện tại đã chọn'
              },
              jobName: {
                type: 'string',
                description: 'Tên công việc. Nếu truyền sẽ ưu tiên tự nhận diện công việc theo tên'
              },
              startDate: {
                type: 'string',
                description: 'Ngày bắt đầu lọc dữ liệu chấm công, định dạng YYYY-MM-DD (tùy chọn)'
              },
              endDate: {
                type: 'string',
                description: 'Ngày kết thúc lọc dữ liệu chấm công, định dạng YYYY-MM-DD (tùy chọn)'
              },
              type: {
                type: 'string',
                description: 'Loại chấm công (PRESENT, ABSENT, LATE, EARLY_LEAVE, LATE_AND_EARLY, MISSING_CHECKIN, MISSING_CHECKOUT, ON_LEAVE, HOLIDAY, OVERTIME, WORK_FROM_HOME, BUSINESS_TRIP, HALF_DAY, ON_LEAVE_PAID, UNKNOWN)'
              }
            }
          }
        }
    }
]



export default tools