
// import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { PDFParse } from 'pdf-parse';
import supabase from '../configs/supabase.js';
import { ollama } from '../configs/ollama.js';
import prisma from '../configs/prismaClient.js';


export const createSignedUrlUpload = async (req, res) => {
    try {
        const { fileName, fileType } = req.body
        const link = await supabase.storage.from(process.env.SUPABASE_BUCKET_NAME).createSignedUploadUrl(fileName, {
            upsert: true
        })
        return res.json(link)
    } catch (error) {
        console.error('Error creating signed URL:', error);

        return res.status(500).json({ success: false, message: 'Failed to create signed URL', data: null });
    }
}

export const uploadSignedUrlCompleted = async (req, res) => {
    try {
        const { fileName } = req.body

        const { data, error } = await supabase.storage.from(process.env.SUPABASE_BUCKET_NAME).info(fileName)

        if (error) throw error
        const signedData = await supabase.storage.from(process.env.SUPABASE_BUCKET_NAME).createSignedUrl(data.name, 60)

        if (signedData.error) throw signedData.error

        const parser = new PDFParse({
            url: signedData.data.signedUrl
        })

        let totalText = ''

        const results = await parser.getText();
        for (const page of results.pages) {
            totalText += page.text
        }
        const prompt = `
Chia tài liệu thành các chunk tối ưu cho RAG.

Yêu cầu:
- Chỉ trả về JSON array
- Không markdown
- Không giải thích
- Mỗi item là 1 chunk text

Tài liệu:
${totalText}
`

        const { response } = await ollama.generate({
            model: "gpt-oss:120b-cloud",
            format: {
                type: "array",
                items: {
                    type: "string"
                }
            },
            prompt
        })
        const chunks = JSON.parse(response)
        console.log(`[upload] Chunked into ${chunks.length} pieces`);

        // Lưu Document vào DB
        const document = await prisma.document.create({
            data: {
                title: fileName,
            }
        })
        console.log(`[upload] Created document: ${document.id}`);

        // Tạo embedding và lưu DocumentChunk cho từng chunk
        for (let i = 0; i < chunks.length; i++) {
            const chunkText = chunks[i]

            // Tạo embedding bằng Cloudflare Workers Embedding API
            const embeddingResponse = await fetch('https://embedding-worker.qingusi1.workers.dev/api/v1/embedding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: `${document.id}_chunk_${i}`,
                    message: chunkText,
                }),
            })

            if (!embeddingResponse.ok) {
                throw new Error(`Embedding API lỗi: ${embeddingResponse.status} ${embeddingResponse.statusText}`)
            }

            const embeddingData = await embeddingResponse.json()
            const embedding = embeddingData.data[0]
            const vectorStr = `[${embedding.join(',')}]`

            // Insert bằng raw SQL vì Prisma không hỗ trợ trực tiếp kiểu vector
            await prisma.$executeRawUnsafe(
                `INSERT INTO "DocumentChunk" (id, document_id, content, "chunkIndex", embedding, created_at, updated_at)
                 VALUES (gen_random_uuid(), $1, $2, $3, $4::vector, NOW(), NOW())`,
                document.id,
                chunkText,
                i,
                vectorStr
            )

            console.log(`[upload] Saved chunk ${i + 1}/${chunks.length}`);
        }

        return res.json({
            success: true,
            message: 'Tải lên và xử lý tài liệu thành công',
            data: {
                documentId: document.id,
                totalChunks: chunks.length,
            }
        })
    } catch (error) {
        console.error('[upload] Error processing document:', error);
        return res.status(500).json({
            success: false,
            message: 'Xử lý tài liệu thất bại: ' + error.message,
            data: null
        });
    }
}


// export const uploadSignedUrl = async (req, res) => {}
export const getSignedUrl = async (req, res) => {
    try {

        const { fileName } = req.params
        const { data, error } = await supabase.storage.from(process.env.SUPABASE_BUCKET_NAME).createSignedUrl(fileName, 60)


        if (error) {
            throw error
        }


        return res.json({ success: true, message: '', data })
    } catch (error) {
        console.error('Error creating signed URL:', error);

        return res.status(500).json({ success: false, message: 'Failed to create signed URL', data: null });
    }
}

export const getListDocument = async (req, res) => {
    try {
        const { cursor = "", limit = 10, sortBy = 'desc' } = req.body
        const sort = sortBy === 'asc' ? 'asc' : 'desc'

        const { data, error } = await supabase.storage.from(process.env.SUPABASE_BUCKET_NAME).listV2({
            limit,
            cursor,
            // sortBy: ['created_at', sort]
            sortBy: {
                column: 'created_at',
                order: sort
            },
         

        })

        if (error) {
            throw error
        }
        // const filterData = data.objects.filter(item => item.name !== '.emptyFolderPlaceholder')
        return res.json({ success: true, message: '', data: { ...data,  } })
    }
    catch (error) {
        console.error('Error fetching document list:', error);
        return res.status(500).json({ success: false, message: error.message, data: [] });
    }
}
export const deleteDocument = async (req, res) => {
    try {
        const { fileName } = req.params

        // 1. Tìm Document trong DB theo title (title = fileName khi upload)
        const document = await prisma.document.findFirst({
            where: { title: fileName },
            include: { chunks: true }
        })

        if (document) {
           
            // 3. Xóa DocumentChunk trước (do foreign key), rồi xóa Document
            await prisma.documentChunk.deleteMany({
                where: { documentId: document.id }
            })
            await prisma.document.delete({
                where: { id: document.id }
            })
            console.log(`[delete] Đã xóa document ${document.id} và ${document.chunks.length} chunks`);
        }

        // 4. Xóa file trên Supabase Storage
        const { data, error } = await supabase.storage.from(process.env.SUPABASE_BUCKET_NAME).remove([fileName])
        if (error) {
            throw error
        }

        return res.json({ success: true, message: 'Xóa tài liệu thành công', data })
    } catch (error) {
        console.error('Error deleting document:', error);
        return res.status(500).json({ success: false, message: 'Failed to delete document', data: null });
    }
}

export const updateDocument = async (req, res) => {
    try {
        const { oldFileName, newFileName } = req.body;

        if (!oldFileName || !newFileName) {
            return res.status(400).json({ success: false, message: 'oldFileName and newFileName là bắt buộc', data: null });
        }

        // 1. Đổi tên file trên Supabase Storage
        const { data: moveData, error: moveError } = await supabase.storage
            .from(process.env.SUPABASE_BUCKET_NAME)
            .move(oldFileName, newFileName);

        if (moveError) {
            throw moveError;
        }

        // 2. Cập nhật tên (title) trong DB
        const document = await prisma.document.findFirst({
            where: { title: oldFileName }
        });

        if (document) {
            await prisma.document.update({
                where: { id: document.id },
                data: { title: newFileName }
            });
            console.log(`[update] Đã đổi tên document ${document.id} thành ${newFileName}`);
        }

        return res.json({ success: true, message: 'Cập nhật tên tài liệu thành công', data: moveData });
    } catch (error) {
        console.error('Error updating document:', error);
        return res.status(500).json({ success: false, message: 'Cập nhật tài liệu thất bại: ' + error.message, data: null });
    }
}


