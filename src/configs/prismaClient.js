import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from '@prisma/adapter-pg'
import { fileURLToPath } from 'url'
import fs from 'fs'
import path from 'path'
import { generateId } from "../utils/generateId.js";
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const certficateFile = fs.readFileSync(path.join(__dirname, '../ssl/certficate.pem')).toString()
// const connectionString = `${process.env.AIVEN_DATABASE_SERVICE_URI}&sslrootcert=${certficateFile}`
const connectionString = `${process.env.DATABASE_URL}`

const adapter = new PrismaPg({
    connectionString,
    // user: process.env.AIVEN_DATABASE_USERNAME,
    // password: process.env.AIVEN_DATABASE_PASSWORD,
    // host: process.env.AIVEN_DATABASE_HOST,
    // port: Number(process.env.AIVEN_DATABASE_PORT),
    // database: process.env.AIVEN_DATABASE_NAME,
    // ssl: {
    //     ca: certficateFile,
    //     rejectUnauthorized: true
    // },
    max: 10,                 // Giữ tối đa 10 kết nối trong pool
    idleTimeoutMillis: 300000, // Đợi 300s không dùng mới đóng kết nối (mặc định 10s)
    connectionTimeoutMillis: 2000, // Nếu sau 2s không kết nối được thì báo lỗi ngay
    keepAlive: true,         // Gửi gói tin "nuôi" kết nối liên tục
    // onConnect: () => {
    //     console.log('Connected to prisma database');
    // },


})


const prisma = new PrismaClient({
    adapter,
    // log: ['']
}).$extends({
    query: {
        user: {
            create: async ({ args, query, operation, model}) => {
                const id = generateId(8)
                args.data.code = `${process.env.PREFIX_COMPAPY}${id}`
                return query(args);
            }
        }
    }
})

export default prisma;
