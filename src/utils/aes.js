import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const SECRET_KEY = Buffer.from(process.env.AES_SECRET_KEY, "hex"); // 32 bytes

export const encryptAES = (text) => {
  const iv = crypto.randomBytes(12); // GCM dùng 12 bytes
  const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const tag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`;
};

export const decryptAES = (data) => {
  try {
    const [ivHex, tagHex, encrypted] = data.split(":");

    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");

    const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch {
    return null;
  }
};