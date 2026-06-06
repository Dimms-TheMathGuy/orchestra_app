"use client"

import { useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"

export default function ResetPassword() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const token = searchParams.get("token")

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [message, setMessage] = useState("")

  async function handleResetPassword() {
    if (!token) {
      setMessage("Reset token not found")
      return
    }

    if (newPassword !== confirmPassword) {
      setMessage("Password not match")
      return
    }

    try {
      const res = await fetch("http://localhost:3000/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          newPassword,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.message || "Reset password failed")
        return
      }

      setMessage("Password reset successfully!")

      setTimeout(() => {
        router.push("/login")
      }, 1000)
    } catch (err) {
      console.error(err)
      setMessage("Cannot connect to server")
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#3f3b5b]">
      <div className="bg-[#e8e3d3] w-[400px] p-10 rounded-md shadow-md text-center">
        <h1 className="text-3xl font-bold text-gray-700 mb-2">
          Reset Password
        </h1>

        <p className="text-gray-500 mb-6">
          Create your new Orchestra password.
        </p>

        <input
          type="password"
          placeholder="Enter New Password"
          className="text-black w-full border rounded-full px-4 py-2 mb-3 outline-none"
          onChange={(e) => setNewPassword(e.target.value)}
        />

        <input
          type="password"
          placeholder="Confirm New Password"
          className="text-black w-full border rounded-full px-4 py-2 mb-5 outline-none"
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <button
          onClick={handleResetPassword}
          className="mt-4 text-black border border-gray-500 rounded-full px-6 py-2 hover:bg-gray-200"
        >
          Reset Password
        </button>

        <p className="text-red-500 text-sm mt-4">
          {message}
        </p>
      </div>
    </div>
  )
}