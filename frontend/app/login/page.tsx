"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import Link from "next/link"

export default function Login() {

  const [email,setEmail] = useState("")
  const [password,setPassword] = useState("")

  async function handleLogin(){

    await signIn("credentials",{
      email,
      password,
      redirect:true,
      callbackUrl:"/dashboard"
    })

  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#3f3b5b]">

      <div className="bg-[#e8e3d3] w-[400px] p-10 rounded-md shadow-md text-center">

        <h1 className="text-3xl font-bold text-gray-700 mb-2">
          Orchestra
        </h1>

        <p className="text-gray-500 mb-6">
          Organize your big projects with Planti.
        </p>

        <input
          type="email"
          placeholder="Enter Email Address"
          className="text-black w-full border rounded-full px-4 py-2 mb-3 outline-none"
          onChange={(e)=>setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Enter Password"
          className="text-black w-full border rounded-full px-4 py-2 mb-2 outline-none"
          onChange={(e)=>setPassword(e.target.value)}
        />

        <p className="text-sm text-gray-500 mb-4 cursor-pointer">
          Forgot password?
        </p>

        <p className="text-sm text-gray-500 mb-4">
          Don't have an account? 
          <Link href="/register" className="underline ml-1">
            Register
          </Link>
        </p>

        <button
          onClick={handleLogin}
          className="text-black border border-gray-500 rounded-full px-6 py-2 hover:bg-gray-200"
        >
          Login
        </button>

      </div>

    </div>
  )
}