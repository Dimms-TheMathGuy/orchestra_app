import * as crypto from "crypto"

const algorithm = "aes-256-cbc"
const secretKey = process.env.CHAT_SECRET || "supersecretkey123456789"

export function encrypt(text: string) {

  const iv = crypto.randomBytes(16)

  const cipher = crypto.createCipheriv(
    algorithm,
    Buffer.from(secretKey.slice(0,32)),
    iv
  )

  let encrypted = cipher.update(text,"utf8","hex")
  encrypted += cipher.final("hex")

  return {
    content: encrypted,
    iv: iv.toString("hex")
  }

}

export function decrypt(content: string, iv: string){

  const decipher = crypto.createDecipheriv(
    algorithm,
    Buffer.from(secretKey.slice(0,32)),
    Buffer.from(iv,"hex")
  )

  let decrypted = decipher.update(content,"hex","utf8")
  decrypted += decipher.final("utf8")

  return decrypted
}