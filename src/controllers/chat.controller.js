
import holidayServices from '../services/holiday.service.js'
import jobServices from '../services/job.service.js'
import tools from '../utils/chatTools.js'
import leaveRequestServices from '../services/leaveRequest.service.js'
import overtimeRequestServices from '../services/overtimeRequest.service.js'
import attendanceServices from '../services/attendance.service.js'
import { ollama } from '../configs/ollama.js'


const COMPANY_NAME = "Công ty TNHH Tuyến Công CB";

const userConversations = new Map()
const userToolStates = new Map()
const MODEL_NAME = "gpt-oss:120b-cloud"
// const MODEL_NAME = "qwen3.5:397b-cloud"

const writeSse = (res, payload) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`)
}

const parseToolArguments = (rawArguments) => {
    if (!rawArguments) return {}
    if (typeof rawArguments === 'object') return rawArguments
    if (typeof rawArguments === 'string') {
        try {
            return JSON.parse(rawArguments)
        } catch {
            return {}
        }
    }
    return {}
}

const getConversation = (userId) => {
    if (!userConversations.has(userId)) {
        userConversations.set(userId, [])
    }
    return userConversations.get(userId)
}

const getUserToolState = (userId) => {
    if (!userToolStates.has(userId)) {
        userToolStates.set(userId, {
            jobs: [],
            currentJobId: null,
            jobsLoadedAt: null,
        })
    }
    return userToolStates.get(userId)
}

const loadJobsByEmployee = async (userId) => {
    const result = await jobServices.getJobsByEmployee(
        userId,
        { page: 1, limit: 100 },
        { field: 'workStartTime', order: 'DESC' },
    )
    return result?.nodes || []
}

const normalizeStatus = (status) => {
    if (!status || typeof status !== 'string') return null
    const normalized = status.toUpperCase()
    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELED']
    return validStatuses.includes(normalized) ? normalized : null
}

const STATUS_LABELS = {
    PENDING: 'Chờ duyệt',
    APPROVED: 'Đã duyệt',
    REJECTED: 'Từ chối',
    CANCELED: 'Đã hủy',
}

const LEAVE_TYPE_LABELS = {
    ANNUAL: 'Nghỉ phép năm',
    SICK: 'Nghỉ ốm',
    MATERNITY: 'Nghỉ thai sản',
    PERSONAL_PAID: 'Nghỉ cá nhân có lương',
    PERSONAL_UNPAID: 'Nghỉ cá nhân không lương',
    UNPAID: 'Nghỉ không lương',
    PUBLIC_HOLIDAY: 'Nghỉ lễ',
    COMPENSATORY: 'Nghỉ bù',
    BUSINESS_TRIP: 'Công tác',
    WORK_FROM_HOME: 'Làm việc từ xa',
    OTHER: 'Khác',
}

const ATTENDANCE_TYPE_LABELS = {
    PRESENT: 'Đi làm đúng giờ',
    ABSENT: 'Vắng mặt',
    LATE: 'Đi muộn',
    EARLY_LEAVE: 'Về sớm',
    LATE_AND_EARLY: 'Đi muộn và về sớm',
    MISSING_CHECKIN: 'Thiếu check-in',
    MISSING_CHECKOUT: 'Thiếu check-out',
    ON_LEAVE: 'Nghỉ có phép',
    HOLIDAY: 'Nghỉ lễ',
    OVERTIME: 'Làm thêm giờ',
    WORK_FROM_HOME: 'Làm việc từ xa',
    BUSINESS_TRIP: 'Đi công tác',
    HALF_DAY: 'Nửa ngày',
    ON_LEAVE_PAID: 'Nghỉ có lương',
    UNKNOWN: 'Chưa xác định',
}

const formatDate = (dateLike) => {
    if (!dateLike) return 'N/A'
    const date = new Date(dateLike)
    if (Number.isNaN(date.getTime())) return 'N/A'
    return date.toLocaleDateString('vi-VN')
}

const formatTime = (dateLike) => {
    if (!dateLike) return 'N/A'
    const date = new Date(dateLike)
    if (Number.isNaN(date.getTime())) return 'N/A'
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

const formatDateTime = (dateLike) => {
    if (!dateLike) return 'N/A'
    const date = new Date(dateLike)
    if (Number.isNaN(date.getTime())) return 'N/A'
    return date.toLocaleString('vi-VN', {
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    })
}

const formatStatus = (status) => STATUS_LABELS[status] || status || 'N/A'

const formatLeaveType = (leaveType) => LEAVE_TYPE_LABELS[leaveType] || leaveType || 'N/A'

const formatAttendanceType = (type) => ATTENDANCE_TYPE_LABELS[type] || type || 'N/A'

const buildJobCardContent = (job, index, isCurrent) => {
    const currentTag = isCurrent ? ' (đang chọn)' : ''
    const checkInRule = `Sớm ${job.earlyCheckInMinutes ?? 15} phút, muộn ${job.lateCheckInMinutes ?? 15} phút`
    const checkOutRule = `Sớm ${job.earlyCheckOutMinutes ?? 15} phút, muộn ${job.lateCheckOutMinutes ?? 15} phút`

    return `\n\n#### ${index}. ${job.title}${currentTag}
- Địa điểm: **${job.address || 'Chưa cập nhật'}**
- Lịch làm việc: **${formatDateTime(job.workStartTime)}** đến **${formatDateTime(job.workEndTime)}**
- Quy định check-in: ${checkInRule}
- Quy định check-out: ${checkOutRule}
- Mô tả: ${job.description || 'Không có mô tả'}
`
}

const buildLeaveRequestCardContent = (request, index) => {
    return `\n\n#### ${index}. ${formatLeaveType(request.leaveType)}
- Trạng thái: **${formatStatus(request.status)}**
- Thời gian nghỉ: **${formatDate(request.startDate)}** đến **${formatDate(request.endDate)}**
- Lý do: ${request.reason || 'Không có'}
- Phản hồi quản lý: ${request.reply || 'Chưa có phản hồi'}
- Thời điểm phản hồi: ${request.approverAt ? formatDateTime(request.approverAt) : 'Chưa phản hồi'}
- Ngày tạo yêu cầu: ${formatDateTime(request.createdAt)}
`
}

const buildOvertimeRequestCardContent = (request, index) => {
    return `\n\n#### ${index}. Yêu cầu OT ngày ${formatDate(request.date)}
- Trạng thái: **${formatStatus(request.status)}**
- Khung giờ OT: **${formatTime(request.startTime)}** - **${formatTime(request.endTime)}**
- Tổng thời lượng: **${request.minutes || 0} phút**
- Lý do: ${request.reason || 'Không có'}
- Phản hồi quản lý: ${request.reply || 'Chưa có phản hồi'}
- Thời điểm phản hồi: ${request.approverAt ? formatDateTime(request.approverAt) : 'Chưa phản hồi'}
- Ngày tạo yêu cầu: ${formatDateTime(request.createdAt)}
`
}

const buildAttendanceCardContent = (attendance, index) => {
    return `\n\n#### ${index}. Chấm công ngày ${formatDate(attendance.date)}
- Loại chấm công: **${formatAttendanceType(attendance.type)}**
- Thời gian check-in: **${formatDateTime(attendance.checkInAt)}**
- Thời gian check-out: **${formatDateTime(attendance.checkOutAt)}**
- Trạng thái gian lận: **${attendance.isFraud ? 'Nghi ngờ gian lận' : 'Bình thường'}**
- Ghi chú gian lận: ${attendance.fraudReason || 'Không có'}
- Thời điểm ghi nhận: ${formatDateTime(attendance.createdAt)}
`
}

const normalizeAttendanceType = (type) => {
    if (!type || typeof type !== 'string') return null
    const normalized = type.toUpperCase()
    const validTypes = [
        'PRESENT',
        'ABSENT',
        'LATE',
        'EARLY_LEAVE',
        'LATE_AND_EARLY',
        'MISSING_CHECKIN',
        'MISSING_CHECKOUT',
        'ON_LEAVE',
        'HOLIDAY',
        'OVERTIME',
        'WORK_FROM_HOME',
        'BUSINESS_TRIP',
        'HALF_DAY',
        'ON_LEAVE_PAID',
        'UNKNOWN',
    ]

    return validTypes.includes(normalized) ? normalized : null
}

const toValidDate = (dateLike) => {
    if (!dateLike) return null
    const date = new Date(dateLike)
    if (Number.isNaN(date.getTime())) return null
    return date
}

const resolveAttendanceDateRange = (startDate, endDate) => {
    const now = new Date()
    const start = toValidDate(startDate)
    const end = toValidDate(endDate)

    if (!start && !end) {
        const defaultStart = new Date(now)
        defaultStart.setDate(defaultStart.getDate() - 30)
        return { startDate: defaultStart, endDate: now }
    }

    if (start && !end) {
        return { startDate: start, endDate: now }
    }

    if (!start && end) {
        const inferredStart = new Date(end)
        inferredStart.setDate(inferredStart.getDate() - 30)
        return { startDate: inferredStart, endDate: end }
    }

    if (start > end) {
        return { startDate: end, endDate: start }
    }

    return { startDate: start, endDate: end }
}

const inferStatusFromMessage = (messageContent) => {
    const normalizedText = normalizeSearchText(messageContent)
    if (!normalizedText) return null

    if (
        normalizedText.includes('cho duyet') ||
        normalizedText.includes('dang cho') ||
        normalizedText.includes('pending')
    ) {
        return 'PENDING'
    }

    if (
        normalizedText.includes('da duyet') ||
        normalizedText.includes('duoc duyet') ||
        normalizedText.includes('approved')
    ) {
        return 'APPROVED'
    }

    if (
        normalizedText.includes('tu choi') ||
        normalizedText.includes('bi tu choi') ||
        normalizedText.includes('rejected')
    ) {
        return 'REJECTED'
    }

    if (
        normalizedText.includes('huy') ||
        normalizedText.includes('da huy') ||
        normalizedText.includes('cancel') ||
        normalizedText.includes('canceled')
    ) {
        return 'CANCELED'
    }

    return null
}

const isLeaveRequestIntent = (messageContent) => {
    const normalizedText = normalizeSearchText(messageContent)
    if (!normalizedText) return false

    return (
        normalizedText.includes('nghi phep') ||
        normalizedText.includes('don nghi') ||
        normalizedText.includes('leave request') ||
        normalizedText.includes('leave')
    )
}

const isOvertimeRequestIntent = (messageContent) => {
    const normalizedText = normalizeSearchText(messageContent)
    if (!normalizedText) return false

    return (
        normalizedText.includes('tang ca') ||
        normalizedText.includes('lam them') ||
        normalizedText.includes('ot') ||
        normalizedText.includes('overtime')
    )
}

const isAttendanceIntent = (messageContent) => {
    const normalizedText = normalizeSearchText(messageContent)
    if (!normalizedText) return false

    return (
        normalizedText.includes('cham cong') ||
        normalizedText.includes('diem danh') ||
        normalizedText.includes('attendance') ||
        normalizedText.includes('check in') ||
        normalizedText.includes('check out')
    )
}

const inferAttendanceTypeFromMessage = (messageContent) => {
    const normalizedText = normalizeSearchText(messageContent)
    if (!normalizedText) return null

    if (normalizedText.includes('di muon') || normalizedText.includes('muon gio') || normalizedText.includes('late')) {
        return 'LATE'
    }

    if (normalizedText.includes('ve som') || normalizedText.includes('som gio') || normalizedText.includes('early')) {
        return 'EARLY_LEAVE'
    }

    if (normalizedText.includes('vang') || normalizedText.includes('absent')) {
        return 'ABSENT'
    }

    if (normalizedText.includes('tang ca') || normalizedText.includes('lam them') || normalizedText.includes('overtime')) {
        return 'OVERTIME'
    }

    if (
        normalizedText.includes('dung gio') ||
        normalizedText.includes('co mat') ||
        normalizedText.includes('day du')
    ) {
        return 'PRESENT'
    }

    return null
}

const normalizeSearchText = (text) => {
    if (!text || typeof text !== 'string') return ''
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}

const findJobByMentionedTitle = (jobs, text) => {
    if (!Array.isArray(jobs) || jobs.length === 0) return null
    const normalizedText = normalizeSearchText(text)
    if (!normalizedText) return null

    for (const job of jobs) {
        const normalizedTitle = normalizeSearchText(job.title)
        if (!normalizedTitle || normalizedTitle.length < 3) continue
        if (normalizedText.includes(normalizedTitle)) {
            return job
        }
    }

    const textTokens = new Set(normalizedText.split(' ').filter(Boolean))
    let bestMatchedJob = null
    let bestScore = 0

    for (const job of jobs) {
        const normalizedTitle = normalizeSearchText(job.title)
        const titleTokens = normalizedTitle.split(' ').filter(Boolean)
        if (titleTokens.length < 2) continue

        const overlap = titleTokens.filter((token) => textTokens.has(token)).length
        const score = overlap / titleTokens.length

        if (overlap >= 2 && score >= 0.6 && score > bestScore) {
            bestScore = score
            bestMatchedJob = job
        }
    }

    return bestMatchedJob
}

const resolveSelectedJob = async ({ userId, state, requestedJobId, requestedJobName, userMessageContent, res }) => {
    let jobs = state.jobs
    if (!jobs.length) {
        jobs = await loadJobsByEmployee(userId)
        state.jobs = jobs
        state.jobsLoadedAt = Date.now()
    }

    if (!jobs.length) {
        writeSse(res, { content: '## Dạ anh/chị hiện chưa tham gia công việc nào ạ.' })
        state.currentJobId = null
        return null
    }

    if (requestedJobId) {
        const requestedJob = jobs.find((job) => job.id === requestedJobId)
        if (!requestedJob) {
            writeSse(res, { content: '## Dạ em chưa tìm thấy công việc phù hợp trong danh sách công việc của anh/chị ạ.' })
            return null
        }
        state.currentJobId = requestedJob.id
        return requestedJob
    }

    const jobMatchedByName =
        findJobByMentionedTitle(jobs, requestedJobName) ||
        findJobByMentionedTitle(jobs, userMessageContent)
    if (jobMatchedByName) {
        state.currentJobId = jobMatchedByName.id
        writeSse(res, { content: `## Dạ em đã nhận diện công việc: **${jobMatchedByName.title}** ạ.` })
        return jobMatchedByName
    }

    if (state.currentJobId) {
        const currentJob = jobs.find((job) => job.id === state.currentJobId)
        if (currentJob) return currentJob
    }

    if (jobs.length === 1) {
        state.currentJobId = jobs[0].id
        writeSse(res, { content: `## Dạ em đã tự động chọn công việc: **${jobs[0].title}** ạ.` })
        return jobs[0]
    }

    writeSse(res, { content: '## Dạ anh/chị đang tham gia nhiều công việc. Anh/chị vui lòng nêu rõ tên công việc để em lọc Leave/Overtime Request chính xác hơn ạ:' })
    for (const [index, job] of jobs.entries()) {
        writeSse(res, {
            content: `\n\n- **${index + 1}. ${job.title}** tại **${job.address || 'Chưa cập nhật'}**`,
        })
    }
    return null
}

const streamLeaveRequestsBySelectedJob = async ({ userId, selectedJob, status, res }) => {
    const filter = {
        jobId: { eq: selectedJob.id },
    }
    if (status) {
        filter.statusIn = [status]
    }

    const leaveResult = await leaveRequestServices.getLeaveRequestsByEmployee(
        userId,
        { limit: 20 },
        { field: 'createdAt', order: 'DESC' },
        filter,
    )

    if (leaveResult.nodes.length <= 0) {
        writeSse(res, { content: `## Dạ hiện tại anh/chị chưa có đơn xin nghỉ phép nào cho công việc **${selectedJob.title}** ạ.` })
        return
    }

    writeSse(res, {
        content: `### Dạ em gửi chi tiết đơn nghỉ phép - **${selectedJob.title}**
Tổng số đơn: **${leaveResult.nodes.length}**`,
    })
    for (const [index, request] of leaveResult.nodes.entries()) {
        writeSse(res, {
            content: buildLeaveRequestCardContent(request, index + 1),
        })
    }
}

const streamOvertimeRequestsBySelectedJob = async ({ userId, selectedJob, status, res }) => {
    const filter = {
        jobId: { eq: selectedJob.id },
    }
    if (status) {
        filter.statusIn = [status]
    }

    const overtimeResult = await overtimeRequestServices.getOvertimeRequestsByEmployee(
        userId,
        { limit: 20 },
        { field: 'createdAt', order: 'DESC' },
        filter,
    )

    if (overtimeResult.nodes.length <= 0) {
        writeSse(res, { content: `## Dạ hiện tại anh/chị chưa có đơn OT nào cho công việc **${selectedJob.title}** ạ.` })
        return
    }

    writeSse(res, {
        content: `### Dạ em gửi chi tiết đơn OT - **${selectedJob.title}**
Tổng số đơn: **${overtimeResult.nodes.length}**`,
    })
    for (const [index, request] of overtimeResult.data.entries()) {
        writeSse(res, {
            content: buildOvertimeRequestCardContent(request, index + 1),
        })
    }
}

const streamAttendancesBySelectedJob = async ({ userId, selectedJob, startDate, endDate, attendanceType, res }) => {
    const dateRange = resolveAttendanceDateRange(startDate, endDate)
    const filter = {
        jobId: { eq: selectedJob.id },
    }
    if (attendanceType) {
        filter.typeIn = [attendanceType]
    }

    const attendanceResult = await attendanceServices.getAttendancesByEmployeeByTime(
        userId,
        dateRange.startDate,
        dateRange.endDate,
        filter,
    )

    if (attendanceResult.nodes.length <= 0) {
        writeSse(res, {
            content: `## Dạ hiện tại anh/chị chưa có dữ liệu chấm công cho công việc **${selectedJob.title}** trong khoảng **${formatDate(dateRange.startDate)}** đến **${formatDate(dateRange.endDate)}** ạ.`,
        })
        return
    }

    writeSse(res, {
        content: `### Dạ em gửi chi tiết chấm công - **${selectedJob.title}**
Khoảng thời gian: **${formatDate(dateRange.startDate)}** đến **${formatDate(dateRange.endDate)}**
Tổng số bản ghi: **${attendanceResult.nodes.length}**`,
    })

    for (const [index, attendance] of attendanceResult.nodes.entries()) {
        writeSse(res, {
            content: buildAttendanceCardContent(attendance, index + 1),
        })
    }
}

export const chat = async (req, res) => {
    const { user } = req
    const userId = user?.id
    const messages = getConversation(userId)
    const toolState = getUserToolState(userId)

    const prompt = {
        role: "system",
        content: `
Bạn là trợ lý ảo của ${COMPANY_NAME}.

Bạn có quyền sử dụng các tools được cung cấp để lấy dữ liệu chính xác.

QUY TẮC BẮT BUỘC:
1. LUÔN ưu tiên sử dụng tools nếu câu hỏi liên quan đến dữ liệu có thể tra cứu (ngày nghỉ lễ, dữ liệu hệ thống, API, số liệu...).
2. KHÔNG tự bịa câu trả lời nếu có thể dùng tool.
3. Nếu dùng tool, phải truyền đầy đủ tham số cần thiết.
4. Nếu thiếu thông tin để gọi tool, hãy hỏi lại người dùng trước khi trả lời.
5. Không mô tả cách hoạt động của tool.
6. Không trả lời thay cho tool nếu tool có thể dùng được.
7. Khi không cần tool, trả lời ngắn gọn, chính xác bằng tiếng Việt.

PHONG CÁCH GIAO TIẾP BẮT BUỘC (CHĂM SÓC KHÁCH HÀNG):
- Luôn xưng "em" và gọi người dùng là "anh/chị".
- Giọng điệu phải lễ phép, nhẹ nhàng, bình tĩnh và chuyên nghiệp.
- Ưu tiên mở câu bằng "Dạ" hoặc "Dạ anh/chị" khi phản hồi.
- Khi dữ liệu trống hoặc có lỗi, dùng ngôn từ lịch sự, mang tính hỗ trợ.
- Tránh từ ngữ cộc lốc, mệnh lệnh, tranh luận hoặc đổ lỗi.

QUY TẮC TOOL CALL:
- Chỉ gọi tool khi thật sự cần dữ liệu.
- Luôn chọn đúng tool phù hợp với câu hỏi.
- Không được tạo tool giả hoặc gọi tool không tồn tại.
- Với leave request, overtime request hoặc attendance: ưu tiên gọi trực tiếp getMyLeaveRequests/getMyOvertimeRequests/getMyAttendances.
- Nếu người dùng đã nêu tên công việc, hãy truyền jobName để hệ thống tự nhận diện công việc.
- Chỉ gọi getMyJobInfo khi không xác định được công việc hoặc người dùng yêu cầu xem danh sách công việc.

Thông tin về người dùng:
- Tên: ${user.profile?.fullName}
- ID: ${user.id} 
- Vai trò: ${user.role}

Quy tắc về thông tin người dùng:
- Không bao giờ tiết lộ ID người dùng cho bất kỳ ai, kể cả khi gọi tool. ID chỉ được sử dụng nội bộ để truy xuất dữ liệu khi cần thiết.
- Nếu cần thông tin về người dùng để trả lời, chỉ sử dụng tên và vai trò.
- Tuyệt đối không chia sẻ thông tin cá nhân của người dùng nếu không cần thiết cho câu trả lời.
`}
    const { message } = req.body
    const userMessage = typeof message === 'string' ? { role: 'user', content: message } : message

    const today = new Date()
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    if (!userMessage?.content) {
        writeSse(res, { content: "Dạ anh/chị vui lòng nhập tin nhắn giúp em ạ." })
        res.write(`event: close\ndata: done\n\n`);
        res.end();
        return;
    }

    if (!messages.length || messages[0]?.role !== 'system') {
        messages.unshift(prompt)
    } else {
        messages[0] = prompt
    }

    messages.push(userMessage)
    const response = await ollama.chat({
        model: MODEL_NAME,
        messages,
        stream: true,
        think: true,
        tools,
        // format: 'json'
    })
    let thinking = ''
    let content = ''
    const toolCalls = []
    let doneThinking = false

    for await (const chunk of response) {
        if (chunk.message.thinking) {
            thinking += chunk.message.thinking
            writeSse(res, { thinking: chunk.message.thinking })
        }
        if (chunk.message.content) {
            if (!doneThinking) {
                doneThinking = true
                process.stdout.write('\n')
            }
            content += chunk.message.content
            writeSse(res, { content: chunk.message.content })
        }
        if (chunk.message.tool_calls?.length) {
            toolCalls.push(...chunk.message.tool_calls)
        }
    }

    if (thinking || content || toolCalls.length) {
        messages.push({ role: 'assistant', thinking, content, tool_calls: toolCalls })
    }


    for (const call of toolCalls) {
        const args = parseToolArguments(call.function.arguments)

        try {
            switch (call.function.name) {
                case 'getNextHoliday': {
                    const endDate = new Date(today)
                    endDate.setDate(endDate.getDate() + 30)
                    const holidayResult = await holidayServices.getHolidays(today, endDate, null, null, userId)

                    if (holidayResult.nodes.length <= 0) {
                        writeSse(res, { content: "## Dạ trong vòng 30 ngày tới hiện chưa có ngày nghỉ lễ nào ạ." })
                        break
                    }

                    writeSse(res, { content: "### Dạ em gửi anh/chị danh sách các ngày lễ sắp tới:\n" })
                    for (const { name, startDate, endDate: holidayEndDate } of holidayResult.nodes) {
                        writeSse(res, { content: `\n\n- **${startDate.toLocaleDateString()}** - **${holidayEndDate.toLocaleDateString()}**: **${name}**` })
                    }
                    break
                }
                case 'getMyJobInfo': {
                    const jobs = await loadJobsByEmployee(userId)
                    toolState.jobs = jobs
                    toolState.jobsLoadedAt = Date.now()

                    if (jobs.length <= 0) {
                        toolState.currentJobId = null
                        writeSse(res, { content: "## Dạ anh/chị hiện chưa tham gia công việc nào ạ." })
                        break
                    }

                    const inferredStatus = inferStatusFromMessage(userMessage.content)
                    const leaveIntent = isLeaveRequestIntent(userMessage.content)
                    const overtimeIntent = isOvertimeRequestIntent(userMessage.content)
                    const attendanceIntent = isAttendanceIntent(userMessage.content)
                    if (leaveIntent || overtimeIntent || attendanceIntent) {
                        const selectedJobByIntent = await resolveSelectedJob({
                            userId,
                            state: toolState,
                            requestedJobId: args.jobId,
                            requestedJobName: args.jobName,
                            userMessageContent: userMessage.content,
                            res,
                        })
                        if (!selectedJobByIntent) break

                        if (leaveIntent) {
                            await streamLeaveRequestsBySelectedJob({
                                userId,
                                selectedJob: selectedJobByIntent,
                                status: inferredStatus,
                                res,
                            })
                        }

                        if (overtimeIntent) {
                            await streamOvertimeRequestsBySelectedJob({
                                userId,
                                selectedJob: selectedJobByIntent,
                                status: inferredStatus,
                                res,
                            })
                        }

                        if (attendanceIntent) {
                            const attendanceType = normalizeAttendanceType(args.type) || inferAttendanceTypeFromMessage(userMessage.content)
                            await streamAttendancesBySelectedJob({
                                userId,
                                selectedJob: selectedJobByIntent,
                                startDate: args.startDate,
                                endDate: args.endDate,
                                attendanceType,
                                res,
                            })
                        }
                        break
                    }

                    if (args.jobId) {
                        const selectedJob = jobs.find((job) => job.id === args.jobId)
                        if (selectedJob) {
                            toolState.currentJobId = selectedJob.id
                        } else {
                            writeSse(res, { content: '## Dạ em chưa tìm thấy công việc được yêu cầu trong danh sách công việc của anh/chị ạ.' })
                        }
                    } else if (!toolState.currentJobId && jobs.length === 1) {
                        toolState.currentJobId = jobs[0].id
                    }

                    writeSse(res, {
                        content: `### Dạ em gửi danh sách công việc của anh/chị
Tổng số công việc: **${jobs.length}**`,
                    })
                    for (const [index, job] of jobs.entries()) {
                        const isCurrent = toolState.currentJobId === job.id
                        writeSse(res, {
                            content: buildJobCardContent(job, index + 1, isCurrent),
                        })
                    }
                    break
                }
                case 'setCurrentJob': {
                    const requestedJobId = args.jobId
                    const requestedJobName = args.jobName
                    if (!requestedJobId && !requestedJobName) {
                        writeSse(res, { content: '## Dạ anh/chị vui lòng cung cấp thông tin công việc cần chọn giúp em ạ.' })
                        break
                    }

                    const selectedJob = await resolveSelectedJob({
                        userId,
                        state: toolState,
                        requestedJobId,
                        requestedJobName,
                        userMessageContent: userMessage.content,
                        res,
                    })
                    if (!selectedJob) break

                    toolState.currentJobId = selectedJob.id
                    writeSse(res, { content: `## Dạ em đã chọn công việc hiện tại: **${selectedJob.title}** ạ.` })
                    break
                }
                case 'getMyLeaveRequests': {
                    const selectedJob = await resolveSelectedJob({
                        userId,
                        state: toolState,
                        requestedJobId: args.jobId,
                        requestedJobName: args.jobName,
                        userMessageContent: userMessage.content,
                        res,
                    })
                    if (!selectedJob) break

                    const status = normalizeStatus(args.status) || inferStatusFromMessage(userMessage.content)
                    await streamLeaveRequestsBySelectedJob({ userId, selectedJob, status, res })
                    break
                }
                case 'getMyOvertimeRequests': {
                    const selectedJob = await resolveSelectedJob({
                        userId,
                        state: toolState,
                        requestedJobId: args.jobId,
                        requestedJobName: args.jobName,
                        userMessageContent: userMessage.content,
                        res,
                    })
                    if (!selectedJob) break

                    const status = normalizeStatus(args.status) || inferStatusFromMessage(userMessage.content)
                    await streamOvertimeRequestsBySelectedJob({ userId, selectedJob, status, res })
                    break
                }
                case 'getMyAttendances': {
                    const selectedJob = await resolveSelectedJob({
                        userId,
                        state: toolState,
                        requestedJobId: args.jobId,
                        requestedJobName: args.jobName,
                        userMessageContent: userMessage.content,
                        res,
                    })
                    if (!selectedJob) break

                    const attendanceType = normalizeAttendanceType(args.type) || inferAttendanceTypeFromMessage(userMessage.content)
                    await streamAttendancesBySelectedJob({
                        userId,
                        selectedJob,
                        startDate: args.startDate,
                        endDate: args.endDate,
                        attendanceType,
                        res,
                    })
                    break
                }
                default:
                    writeSse(res, { content: `## Dạ hiện tại em chưa hỗ trợ công cụ: ${call.function.name} ạ.` })
                    break
            }

            writeSse(res, { tool_result: { tool_name: call.function.name, result: 'ok' } })
        } catch (error) {
            writeSse(res, { content: `## Dạ em xin lỗi, đã có lỗi khi xử lý yêu cầu **${call.function.name}**: ${error.message}` })
            writeSse(res, { tool_result: { tool_name: call.function.name, result: 'error' } })
            console.error(`[chat-tool-error] ${call.function.name}:`, error)
        }
    }

    if (messages.length > 40) {
        const systemPrompt = messages[0]
        const recentMessages = messages.slice(-39)
        userConversations.set(userId, [systemPrompt, ...recentMessages.filter((msg) => msg !== systemPrompt)])
    }

    res.write(`event: close\ndata: done\n\n`)
    res.end()
}