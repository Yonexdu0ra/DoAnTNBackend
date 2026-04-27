
// import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { PDFParse } from 'pdf-parse';
import supabse from '../configs/supabase.js';
import { ollama } from '../configs/ollama.js';


export const createSignedUrlUpload = async (req, res) => {
    try {
        const { fileName, fileType } = req.body
        const link = await supabse.storage.from(process.env.SUPABASE_BUCKET_NAME).createSignedUploadUrl(fileName, {
            upsert: true
        })
        return res.json(link)
    } catch (error) {
        console.error('Error creating signed URL:', error);

        return res.status(500).json({ success: false, message: 'Failed to create signed URL', data: null });
    }
}

export const uploadSignedUrlCompleted = async (req, res) => {
    const { fileName } = req.body

    const { data, error} = await supabse.storage.from(process.env.SUPABASE_BUCKET_NAME).info(fileName)
    if(error) throw error
    
    const parser = new PDFParse({
        url: data.signedUrl
    })
    //1. dùng ai chunk document hợp lý
    const pdfData = (await parser.getText()).getPageText
    const totalPage = (await parser.getText()).total
    const prompt = ``
    for (let page = 1; page <= totalPage; page++) {
        const pageData = await (await parser.getText()).getPageText(page)
        console.log(pageData);

    }

    // xử lý rag document
    return res.json({ success: true, message: '', data: null })

}

// export const uploadSignedUrl = async (req, res) => {}
export const getSignedUrl = async (req, res) => {
    try {

        const { fileName } = req.params
        const { data, error } = await supabse.storage.from(process.env.SUPABASE_BUCKET_NAME).createSignedUrl(fileName, 60)


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

        const { data, error } = await supabse.storage.from(process.env.SUPABASE_BUCKET_NAME).listV2({
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
        const filterData = data.objects.filter(item => item.name !== '.emptyFolderPlaceholder')
        return res.json({ success: true, message: '', data: { ...data, objects: filterData } })
    }
    catch (error) {
        console.error('Error fetching document list:', error);
        return res.status(500).json({ success: false, message: error.message, data: [] });
    }
}
export const deleteDocument = async (req, res) => {
    try {
        const { fileName } = req.params
        const { data, error } = await supabse.storage.from(process.env.SUPABASE_BUCKET_NAME).remove([fileName])
        if (error) {
            throw error
        }
        return res.json({ success: true, message: 'Xóa tài liệu thành công', data })
    } catch (error) {
        console.error('Error deleting document:', error);
        return res.status(500).json({ success: false, message: 'Failed to delete document', data: null });
    }
}
