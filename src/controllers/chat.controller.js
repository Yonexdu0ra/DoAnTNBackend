
import holidayServices from '../services/holiday.service.js'
import jobServices from '../services/job.service.js'
import tools from '../utils/chatTools.js'
import leaveRequestServices from '../services/leaveRequest.service.js'
import overtimeRequestServices from '../services/overtimeRequest.service.js'
import attendanceServices from '../services/attendance.service.js'
import { ollama } from '../configs/ollama.js'
import prisma from '../configs/prismaClient.js'


const COMPANY_NAME = "Công ty TNHH Tuyến Công CB";

const userConversations = new Map()
const MODEL_NAME = "gpt-oss:120b-cloud"

const writeSse = (res, payload) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`)
}

const getConversation = (userId) => {
    if (!userConversations.has(userId)) {
        userConversations.set(userId, [])
    }
    return userConversations.get(userId)
}

const getUserToolState = (userId) => {
    if (!userConversations.has(userId)) {
        userConversations.set(userId, [])
    }
    return userConversations.get(userId)
}

/**
 * Tìm kiếm tài liệu bằng vector similarity (RAG)
 * @param {string} query - Câu hỏi cần tìm kiếm
 * @param {number} limit - Số lượng kết quả trả về
 * @returns {Promise<Array>} Danh sách các đoạn tài liệu liên quan
 */
const searchDocuments = async (query, limit = 5) => {
    // 1. Tạo embedding cho câu hỏi bằng Cloudflare Workers API
    const embeddingResponse = await fetch('https://embedding-worker.qingusi1.workers.dev/api/v1/embedding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            id: `search_${Date.now()}`,
            message: query,
        }),
    })

    if (!embeddingResponse.ok) {
        throw new Error(`Embedding API lỗi: ${embeddingResponse.status}`)
    }

    const embeddingData = await embeddingResponse.json()
    const embedding = embeddingData.data[0]
    const vectorStr = `[${embedding.join(',')}]`

    // 2. Tìm kiếm các chunk tương tự bằng cosine similarity
    const results = await prisma.$queryRawUnsafe(`
        SELECT 
            dc.id,
            dc.content,
            dc."chunkIndex",
            d.title AS "documentTitle",
            1 - (dc.embedding <=> $1::vector) AS similarity
        FROM "DocumentChunk" dc
        JOIN "Document" d ON d.id = dc.document_id
        ORDER BY dc.embedding <=> $1::vector
        LIMIT $2
    `, vectorStr, limit)

    return results.map(r => ({
        documentTitle: r.documentTitle,
        content: r.content,
        similarity: Number(r.similarity).toFixed(4),
    }))
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
Bạn cũng có thể tìm kiếm trong kho tài liệu nội bộ công ty (quy định, nội quy, chính sách, hướng dẫn...) bằng tool searchDocuments.

QUY TẮC BẮT BUỘC:
1. LUÔN ưu tiên sử dụng tools nếu câu hỏi liên quan đến dữ liệu có thể tra cứu (ngày nghỉ lễ, dữ liệu hệ thống, API, số liệu, quy định, chính sách...).
2. KHÔNG tự bịa câu trả lời nếu có thể dùng tool.
3. Nếu dùng tool, phải truyền đầy đủ tham số cần thiết.
4. Nếu thiếu thông tin để gọi tool, hãy hỏi lại người dùng trước khi trả lời.
5. Không mô tả cách hoạt động của tool.
6. Không trả lời thay cho tool nếu tool có thể dùng được.
7. Khi không cần tool, trả lời ngắn gọn, chính xác bằng tiếng Việt.
8. Khi người dùng hỏi về quy định, nội quy, chính sách, hướng dẫn của công ty, LUÔN sử dụng tool searchDocuments để tìm kiếm trước khi trả lời.
9. Khi trả lời dựa trên tài liệu tìm được, hãy trích dẫn nguồn tài liệu (tên file) để người dùng tin tưởng.
10. Không phản hồi dạng bảng do hiển thị ở mobile sẽ rất khó đọc. Hãy tóm tắt hoặc liệt kê ngắn gọn thay vì dùng bảng.
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

    // Xóa RAG context cũ khỏi conversation history (tránh tích lũy)
    for (let i = messages.length - 2; i >= 1; i--) {
        if (messages[i].role === 'system' && messages[i].content?.startsWith('TÀI LIỆU NỘI BỘ LIÊN QUAN')) {
            messages.splice(i, 1)
        }
    }

    // Auto-RAG: Tự động tìm kiếm tài liệu liên quan trước khi gửi cho AI
    try {
        const userText = typeof userMessage.content === 'string' ? userMessage.content : ''
        if (userText.length > 2) {
            const ragResults = await searchDocuments(userText, 5)
            // Lọc kết quả có độ tương đồng đủ cao
            const relevantDocs = ragResults.filter(r => Number(r.similarity) > 0.3)

            if (relevantDocs.length > 0) {
                const docContext = relevantDocs.map((doc, i) =>
                    `[Tài liệu: ${doc.documentTitle}]\n${doc.content}`
                ).join('\n\n---\n\n')

                // Inject context tài liệu vào messages trước message của user
                const ragMessage = {
                    role: 'system',
                    content: `TÀI LIỆU NỘI BỘ LIÊN QUAN (tự động tra cứu từ kho tài liệu công ty):\n\n${docContext}\n\nHãy sử dụng thông tin từ tài liệu trên để trả lời câu hỏi của người dùng nếu liên quan. Luôn trích dẫn nguồn tài liệu (tên file) khi sử dụng.`
                }
                // Chèn trước message cuối (user message)
                messages.splice(messages.length - 1, 0, ragMessage)
                console.log(`[chat-rag] Found ${relevantDocs.length} relevant documents for: "${userText.substring(0, 50)}..."`)
            }
        }
    } catch (ragError) {
        // Không để lỗi RAG ảnh hưởng đến chat chính
        console.error('[chat-rag] Auto-RAG error:', ragError.message)
    }

    const response = await ollama.chat({
        model: MODEL_NAME,
        messages,
        stream: true,
        think: true,
        tools,
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
        // const args = parseToolArguments(call.function.arguments)
        const args = call.function.arguments
        const name = call.function.name
        let resultData = null;

        try {
            switch (name) {
                case 'getNextHoliday': {
                    const holidays = await holidayServices.getHolidaysForAI(args);
                    resultData = holidays;
                    break;
                }
                case 'getMyJob': {
                    console.log("AI Arguments (getMyJob):", args);
                    const jobs = await jobServices.getJobsForAI(userId, args);
                    resultData = jobs;
                    break;
                }
                case 'getMyLeaveRequests': {
                    console.log("AI Arguments (getMyLeaveRequests):", args);
                    const leaves = await leaveRequestServices.getLeaveRequestsForAI(userId, args);
                    resultData = leaves;
                    break;
                }
                case 'getMyOvertimeRequests': {
                    console.log("AI Arguments (getMyOvertimeRequests):", args);
                    const ots = await overtimeRequestServices.getOvertimeRequestsForAI(userId, args);
                    resultData = ots;
                    break;
                }
                case 'getMyAttendances': {
                    console.log("AI Arguments (getMyAttendances):", args);
                    const attendances = await attendanceServices.getAttendancesForAI(userId, args);
                    resultData = attendances;
                    break;
                }
                case 'searchDocuments': {
                    console.log("AI Arguments (searchDocuments):", args);
                    const searchLimit = Math.min(Math.max(args.limit || 5, 1), 10);
                    const docs = await searchDocuments(args.query, searchLimit);
                    if (docs.length === 0) {
                        resultData = { message: 'Không tìm thấy tài liệu nào liên quan đến câu hỏi.' };
                    } else {
                        resultData = {
                            message: `Tìm thấy ${docs.length} đoạn tài liệu liên quan.`,
                            documents: docs,
                        };
                    }
                    break;
                }
                default:
                    resultData = { error: `Công cụ ${name} không được hỗ trợ.` };
                    writeSse(res, { content: `## Dạ hiện tại em chưa hỗ trợ công cụ: ${call.function.name} ạ.` })
                    break
            }

            messages.push({ role: 'tool', content: JSON.stringify(resultData) });
            writeSse(res, { tool_result: { tool_name: call.function.name, result: 'ok' } })
        } catch (error) {
            messages.push({ role: 'tool', content: JSON.stringify({ error: error.message }) });
            writeSse(res, { content: `\n\n## Dạ em xin lỗi, đã có lỗi khi xử lý yêu cầu **${call.function.name}**: ${error.message}` })
            writeSse(res, { tool_result: { tool_name: call.function.name, result: 'error' } })
            console.error(`[chat-tool-error] ${call.function.name}:`, error)
        }
    }

    if (toolCalls.length > 0) {
        writeSse(res, { content: `\n\n` });
        
        try {
            const finalResponse = await ollama.chat({
                model: MODEL_NAME,
                messages,
                stream: true,
                think: true,
            });

            let finalThinking = '';
            let finalContent = '';
            let doneFinalThinking = false;

            for await (const chunk of finalResponse) {
                if (chunk.message.thinking) {
                    finalThinking += chunk.message.thinking;
                    writeSse(res, { thinking: chunk.message.thinking });
                }
                if (chunk.message.content) {
                    if (!doneFinalThinking) {
                        doneFinalThinking = true;
                    }
                    finalContent += chunk.message.content;
                    writeSse(res, { content: chunk.message.content });
                }
            }
            
            messages.push({ role: 'assistant', thinking: finalThinking, content: finalContent });
        } catch (err) {
            console.error("[chat-final-response-error]:", err);
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