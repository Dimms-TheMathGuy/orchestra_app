"use client"

import { useState } from "react"
import Link from "next/link"

export default function Register(){

  const [email,setEmail] = useState("")
  const [password,setPassword] = useState("")
  const [confirmPassword,setConfirmPassword] = useState("")
  const [message,setMessage] = useState("")

  async function handleRegister(){

    if(password !== confirmPassword){
      setMessage("Password not match")
      return
    }

    const res = await fetch("http://localhost:3001/auth/register",{
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        email,
        password,
        name: email
      })
    })

    const data = await res.json()

    if(!res.ok){
      setMessage(data.message || "Register failed")
      return
    }

    setMessage("Register success!")
  }

  return(
    <div className="flex items-center justify-center min-h-screen bg-[#3f3b5b]">

      <div className="bg-[#e8e3d3] w-[420px] p-10 rounded-md shadow-md">

        <h1 className="text-center text-gray-600 mb-6 text-lg">
          Make your Orchestra account
        </h1>

        <label className="text-sm text-gray-600">
          Email Address
        </label>

        <input
          type="email"
          placeholder="Enter Email Address"
          className="text-black w-full border rounded-full px-4 py-2 mb-4 outline-none"
          onChange={(e)=>setEmail(e.target.value)}
        />

        <label className="text-sm text-gray-600">
          Password
        </label>

        <input
          type="password"
          placeholder="Password must consist of 8 characters"
          className="text-black w-full border rounded-full px-4 py-2 mb-4 outline-none"
          onChange={(e)=>setPassword(e.target.value)}
        />

        <label className="text-sm text-gray-600">
          Confirm Password
        </label>

        <input
          type="password"
          placeholder="Enter Password"
          className="text-black w-full border rounded-full px-4 py-2 mb-6 outline-none"
          onChange={(e)=>setConfirmPassword(e.target.value)}
        />

        <p className="text-center text-sm text-gray-500 mb-4">
          Already have an account? 
          <Link href="/login" className="underline ml-1">
            Sign in
          </Link>
        </p>

        <div className="flex justify-center">
          <button
            onClick={handleRegister}
            className="text-black border border-gray-500 rounded-full px-6 py-2 hover:bg-gray-200"
          >
            Register
          </button>
        </div>

        <p className="text-center text-sm text-red-500 mt-4">
          {message}
        </p>

      </div>

    </div>
  )
}