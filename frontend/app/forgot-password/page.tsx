"use client"

import { useState } from "react"
import Link from "next/link"

export default function ForgotPassword() {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")

  async function handleForgotPassword() {
    try {
      const res = await fetch(
        "http://localhost:3000/auth/forgot-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
          }),
        }
      )

      const data = await res.json()

      console.log(data)

      if (!res.ok) {
        setMessage(data.message || "Failed to send reset link")
        return
      }

      setMessage("Reset link generated! Check console/backend.")
    } catch (err) {
      console.error(err)
      setMessage("Cannot connect to server")
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#3f3b5b]">
      <div className="bg-[#e8e3d3] w-[400px] p-10 rounded-md shadow-md text-center">
        <h1 className="text-3xl font-bold text-gray-700 mb-2">
          Forgot Password
        </h1>

        <p className="text-gray-500 mb-6">
          Enter your email to reset your password.
        </p>

        <input
          type="email"
          placeholder="Enter Email Address"
          className="text-black w-full border rounded-full px-4 py-2 mb-5 outline-none"
          onChange={(e) => setEmail(e.target.value)}
        />

        <button
          onClick={handleForgotPassword}
          className="mt-4 text-black border border-gray-500 rounded-full px-6 py-2 hover:bg-gray-200"
        >
          Send Reset Link
        </button>

        <p className="text-sm text-gray-500 mt-5">
          Remember your password?
          <Link href="/login" className="underline ml-1">
            Login
          </Link>
        </p>

        <p className="text-red-500 text-sm mt-4">
          {message}
        </p>
      </div>
    </div>
  )
}