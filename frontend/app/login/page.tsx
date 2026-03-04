"use client"

import { useState } from "react"

export default function LoginPage() {

  const [email,setEmail] = useState("")
  const [password,setPassword] = useState("")
  const [result,setResult] = useState("")

  async function login(){

    const res = await fetch("http://localhost:3000/auth/login",{
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body: JSON.stringify({
        email,
        password
      })
    })

    const data = await res.json()

    setResult(JSON.stringify(data))
  }

  return (
    <div style={{padding:40}}>
      <h1>Login</h1>

      <input
        placeholder="email"
        onChange={(e)=>setEmail(e.target.value)}
      />

      <br/><br/>

      <input
        type="password"
        placeholder="password"
        onChange={(e)=>setPassword(e.target.value)}
      />

      <br/><br/>

      <button onClick={login}>
        Login
      </button>

      <p>{result}</p>

    </div>
  )
}