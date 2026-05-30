


const tools = [
    {
        type: 'function',
        function: {
          name: 'getNextHoliday',
          description: 'Lấy thông tin ngày nghỉ lễ tiếp theo trong vòng 30 ngày tới',
          parameters: {
            type: 'object',
            required: [],
            properties: {
              startDate: {
                type: 'string',
                description: 'Ngày bắt đầu lấy thông tin ngày nghỉ lễ, định dạng YYYY-MM-DD (tùy chọn) nếu không yêu cầu cụ thể thì sẽ là ngày hôm nay'
              },
              endDate: {
                type: 'string',
                description: 'Ngày kết thúc lấy thông tin ngày nghỉ lễ, định dạng YYYY-MM-DD (tùy chọn)'
              },
              month: {
                type: 'number',
                description: 'Tháng cần lấy thông tin ngày nghỉ lễ'
              },
              year: {
                type: 'number',
                description: 'Năm cần lấy thông tin ngày nghỉ lễ'
              },
              limit: {
                type: 'number',
                description: 'Số lượng ngày nghỉ lễ cần lấy trong khoảng từ 1-10 phải là số nguyên'
              },
            }
          }
        }
    },
    {
        type: 'function',
        function: {
          name: 'getMyJob',
          description: 'Lấy thông tin chi tiết và danh sách công việc của tôi. Sử dụng tool này để tra cứu thông tin dự án, lịch làm việc (giờ bắt đầu, giờ kết thúc, mấy giờ vào làm, mấy giờ tan làm), địa chỉ, quy định check-in/out, hoặc khi cần lấy jobId cho các truy vấn khác.',
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
                description: 'Trạng thái của đơn xin nghỉ phép (PENDING, APPROVED, REJECTED)'
              },
              limit: {
                type: 'number',
                description: 'Số lượng đơn xin nghỉ phép cần lấy chỉ được lấy trong khoảng từ 1-10 phải là số nguyên'
              }
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
              },
              limit: {
                type: 'number',
                description: 'Số lượng đơn xin tăng ca cần lấy chỉ được lấy trong khoảng từ 1-10 phải là số nguyên'
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
              },
              limit: {
                type: 'number',
                description: 'Số lượng dữ liệu chấm công cần lấy chỉ được lấy trong khoảng từ 1-10 phải là số nguyên'
              }
            }
          }
        }
    },
    {
        type: 'function',
        function: {
          name: 'searchDocuments',
          description: 'Tìm kiếm thông tin trong kho tài liệu nội bộ công ty (quy định, nội quy, chính sách, hướng dẫn, thông báo...). Sử dụng tool này khi người dùng hỏi về quy định công ty, chính sách nhân sự, nội quy, hướng dẫn quy trình, hoặc bất kỳ thông tin nào có thể nằm trong tài liệu đã được tải lên hệ thống.',
          parameters: {
            type: 'object',
            required: ['query'],
            properties: {
              query: {
                type: 'string',
                description: 'Câu hỏi hoặc từ khóa tìm kiếm trong tài liệu. Nên viết rõ ràng, đầy đủ ý nghĩa để tìm kiếm chính xác hơn.'
              },
              limit: {
                type: 'number',
                description: 'Số lượng đoạn tài liệu liên quan cần lấy (mặc định 5, tối đa 10)'
              }
            }
          }
        }
    }
]



export default tools