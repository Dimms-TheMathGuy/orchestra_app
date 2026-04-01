"use client"

import { useEffect, useState } from "react"

export default function Profile() {
  const [user, setUser] = useState<any>(null)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [company, setCompany] = useState("")

  const userId = "74b4195b-541b-491a-92ed-1eee3487d3ce"

  // ✅ FETCH USER (FIXED)
  useEffect(() => {
    async function getUser() {
      try {
        const res = await fetch(`http://localhost:3000/users/${userId}`)

        console.log("STATUS:", res.status)

        if (!res.ok) {
          console.log("USER NOT FOUND")
          setUser({})
          return
        }

        const data = await res.json()
        console.log("DATA:", data)

        setUser(data)
        setName(data.name || "")
        setEmail(data.email || "")
        setCompany(data.company || "")
      } catch (err) {
        console.error("ERROR:", err)
        setUser({})
      }
    }

    getUser()
  }, [])

  // ✅ UPDATE PROFILE (FIXED)
  async function updateProfile() {
    try {
      const payload = { name, email, company }
      console.log("Sending data:", payload)

      const res = await fetch(`http://localhost:3000/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      const text = await res.text()
      console.log("STATUS:", res.status)
      console.log("RESPONSE:", text)

      if (!res.ok) {
        alert(text) // 🔥 tampilkan error asli
        return
      }

      const data = text ? JSON.parse(text) : null

      setUser(data || { name, email, company })
      alert("Profile updated!")
    } catch (err) {
      console.error("UPDATE ERROR:", err)
      alert("Something went wrong!")
    }
  }

  if (user === null) return <p>Loading...</p>

  return (
    <div className="flex min-h-screen bg-[#3f3b5b] items-center justify-center">
      <div className="w-[1100px] bg-white rounded-lg grid grid-cols-[250px_1fr]">
        {/* SIDEBAR */}
        <div className="border-r p-6">
          <h1 className="font-bold mb-6">LOGO</h1>

          <img src="https://i.pravatar.cc/150" className="w-20 h-20 rounded-full mb-3" />
          <h2 className="font-semibold">{user.name}</h2>
          <p className="text-sm text-gray-500 mb-6">{user.email}</p>

          <div className="space-y-3 text-sm text-gray-600">
            <p>Project & Task</p>
            <p>Add Project</p>
            <p>Meeting results</p>
            <p className="font-semibold">Setting</p>
          </div>
        </div>

        {/* PROFILE FORM */}
        <div className="p-10">
          <div className="flex items-center gap-4 mb-6">
            <img src="https://i.pravatar.cc/100" className="w-20 h-20 rounded-full" />
            <div>
              <h1 className="text-xl font-bold">{user.name}</h1>
              <p className="text-gray-500">{user.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-sm">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border rounded-full px-4 py-2"
              />
            </div>

            <div>
              <label className="text-sm">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border rounded-full px-4 py-2"
              />
            </div>

            <div>
              <label className="text-sm">Company</label>
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full border rounded-full px-4 py-2"
              />
            </div>
          </div>

          <div className="mt-8">
            <button
              onClick={updateProfile}
              className="px-6 py-2 border rounded-full bg-[#e8e3d3]"
            >
              Edit Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}