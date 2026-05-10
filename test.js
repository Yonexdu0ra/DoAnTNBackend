import admin from "./src/configs/firebaseAdmin.js";
import prisma from './src/configs/prismaClient.js'
import { ollama } from "./src/configs/ollama.js";
import nodemailer  from 'nodemailer'


// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: process.env['SMTP_USERNAME'],
//     pass: process.env['SMTP_PASSWORD'], // KHÔNG dùng password thường
//   },
// });
// async function sendMail() {
//   await transporter.sendMail({
//     from: '"Your Name" <' + process.env['SMTP_USERNAME'] + '>',
//     to: "nguoidungemail1@gmail.com",
//     subject: "Test Email",
//     text: "Hello world",
//     html: "<b>Hello world</b>",
//   });
// }

// sendMail();
// admin.messaging().send({
//     token: "dVYcoe9kT0CNzSxXvVjlLF:APA91bE84Y_0qO9cNyQUXSwHWZWsnxDyi2bdMf83fiY7DXLPM_9sgDdN4Dd5qrfDnKykyTf6l1ASfvCD77b92ccjO6QRx7U_0juw02VimoIv_qOVB7zJy60",
//     notification: {
//         title: "Hello",
//         body: "This is a test notification from Firebase Admin SDK"
//     }
// })
// .then((response) => {
//     console.log("Successfully sent message:", response);
// })
// .catch((error) => {
//     console.error("Error sending message:", error);
// });


function getWeather(city) {
  return {
    city,
    temperature: '30°C',
    condition: 'Nắng'
  }
}

async function main() {
  const response = await ollama.chat({
    model: 'gpt-oss:120b-cloud',
    stream: true,

    messages: [
      {
        role: 'user',
        content: 'Thời tiết ở Hải Phòng thế nào?'
      }
    ],

    tools: [
      {
        type: 'function',
        function: {
          name: 'getWeather',
          description: 'Lấy thông tin thời tiết',
          parameters: {
            type: 'object',
            properties: {
              city: {
                type: 'string',
                description: 'Tên thành phố'
              }
            },
            required: ['city']
          }
        }
      }
    ]
  })

  let toolCalled = false

  for await (const chunk of response) {

    // Stream text bình thường
    if (chunk.message?.content) {
      process.stdout.write(chunk.message.content)
    }

    // Tool calling
    if (chunk.message?.tool_calls && !toolCalled) {
      
      toolCalled = true
      
      const tool = chunk.message.tool_calls[0]
      console.log(tool);

      if (tool.function.name === 'getWeather') {

        const args = tool.function.arguments

        const result = getWeather(args.city)

        console.log('\n\nTool Result:', result)

        // Gửi kết quả tool lại model
        const finalResponse = await ollama.chat({
          model: 'gpt-oss:120b-cloud',
          stream: true,

          messages: [
            {
              role: 'user',
              content: 'Thời tiết ở Hải Phòng thế nào?'
            },
            {
              role: 'assistant',
              tool_calls: [tool]
            },
            {
              role: 'tool',
              content: JSON.stringify(result)
            }
          ]
        })

        for await (const finalChunk of finalResponse) {
          if (finalChunk.message?.content) {
            process.stdout.write(finalChunk.message.content)
          }
        }
      }
    }
  }
}

main()