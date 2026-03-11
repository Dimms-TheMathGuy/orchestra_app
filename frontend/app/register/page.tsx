"use client"

import { useState } from "react"

export default function Register() {

  const [email,setEmail] = useState("")
  const [password,setPassword] = useState("")
  const [name,setName] = useState("")
  const [message,setMessage] = useState("")

  async function register(){

    try{

      const res = await fetch("http://localhost:3001/auth/register",{
        method:"POST",
        headers:{
          "Content-Type":"application/json"
        },
        body: JSON.stringify({
          email,
          password,
          name
        })
      })

      const data = await res.json()

      if(!res.ok){
        setMessage(data.message || "Register failed")
        return
      }

      setMessage("Register success!")

      setEmail("")
      setPassword("")
      setName("")

    }catch(error){
      setMessage("Server error")
    }
  }

  return (
    <div>

      <h1>Register</h1>

      <input
        placeholder="name"
        value={name}
        onChange={(e)=>setName(e.target.value)}
      />

      <input
        placeholder="email"
        value={email}
        onChange={(e)=>setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="password"
        value={password}
        onChange={(e)=>setPassword(e.target.value)}
      />

      <button onClick={register}>
        Register
      </button>

      <p>{message}</p>

    </div>
  )
}