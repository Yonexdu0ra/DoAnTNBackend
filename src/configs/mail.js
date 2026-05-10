import nodemailer  from 'nodemailer'


const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env['SMTP_USERNAME'],
    pass: process.env['SMTP_PASSWORD'], // KHÔNG dùng password thường
  },
});


export const sendMail = async (to, subject, text, html) => {
   return transporter.sendMail({
        from: `Quản lý chấm cong <${process.env['SMTP_USERNAME']}>`,
        to,
        subject,
        text,
        html,
    })
}