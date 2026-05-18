"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts"

export default function DashboardPage() {
  const router = useRouter()

  const [dashboardData, setDashboardData] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("ongoing")

  useEffect(() => {
    async function fetchDashboard() {
      const userId = localStorage.getItem("userId")
      const token = localStorage.getItem("token")

      if (!token || !userId) {
        router.push("/login")
        return
      }

      const res = await fetch("http://localhost:3000/dashboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      })

      const data = await res.json()

      if (!res.ok) {
        router.push("/login")
        return
      }

      setDashboardData(data)
    }

    fetchDashboard()
  }, [router])

  async function handleOpenProject(projectId: string, isMember: boolean) {
    if (!isMember) {
      alert("You are not part of this project")
      return
    }

    try {
      const { startAuthentication } = await import("@simplewebauthn/browser")

      const optionsRes = await fetch("http://localhost:3001/passkey/auth/options", {
        method: "POST",
        credentials: "include",
      })

      const optionsJSON = await optionsRes.json()

      const authResponse = await startAuthentication({ optionsJSON })

      const verifyRes = await fetch("http://localhost:3001/passkey/auth/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(authResponse),
      })

      const result = await verifyRes.json()

      if (result.verified) {
        router.push(`/dashboard/project/${projectId}`)
      } else {
        alert("Biometric verification failed")
      }
    } catch (error) {
      console.error(error)
      alert("Biometric verification cancelled or failed")
    }
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-[#3f3b5b] flex items-center justify-center text-white">
        Loading dashboard...
      </div>
    )
  }

  const filteredProjects = dashboardData.projects.filter(
    (project: any) => project.status === activeTab
  )

  const colors = ["#7ed6c1", "#ff7675", "#555", "#f6c56f"]

  return (
    <div className="min-h-screen bg-[#3f3b5b] p-10">
      <p className="text-xs text-gray-300 mb-2">Project Dashboard</p>

      <div className="grid grid-cols-[220px_1fr_280px] bg-[#f7f7f7] rounded-sm overflow-hidden min-h-[720px]">
        <aside className="bg-white border-r p-8 flex flex-col items-center">
          <h1 className="text-xl font-bold mb-16 text-black">LOGO</h1>

          <div className="w-20 h-20 bg-gray-300 rounded-full mb-3" />

          <h2 className="font-bold text-sm text-black">
            {dashboardData.user.name}
          </h2>

          <p className="text-xs text-gray-500 mb-12">
            {dashboardData.user.email}
          </p>

          <nav className="text-sm text-center space-y-3">
            <p className="font-bold text-black">Project & Task</p>

            <button
              onClick={() => router.push("/dashboard/projects")}
              className="block text-gray-500 hover:text-black mx-auto"
            >
              List Project
            </button>

            <button
              onClick={() => router.push("/dashboard/add-project")}
              className="block text-gray-500 hover:text-black mx-auto"
            >
              Add Project
            </button>

            <button
              onClick={() => router.push("/dashboard/meeting-results")}
              className="block text-gray-500 hover:text-black mx-auto"
            >
              Meeting results
            </button>

            <button
              onClick={() => router.push("/dashboard/settings")}
              className="block text-gray-500 hover:text-black mx-auto"
            >
              Setting
            </button>
          </nav>
        </aside>

        <main className="p-10 bg-[#f7f7f7]">
          <h1 className="text-3xl font-bold text-black">
            Welcome to Orchestra,
          </h1>

          <p className="text-gray-500 mb-8">
            Hello {dashboardData.user.name}, welcome back!
          </p>

          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-lg p-5">
              <h2 className="font-bold text-sm mb-3 text-black">
                Your Performance
              </h2>

              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dashboardData.performanceData}>
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="performance"
                      stroke="#5b8def"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-5">
              <h2 className="font-bold text-sm mb-3 text-black">
                Your Contribution
              </h2>

              <div className="h-44 flex items-center">
                <ResponsiveContainer width="55%" height="100%">
                  <PieChart>
                    <Pie
                      data={dashboardData.contributionData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={65}
                    >
                      {dashboardData.contributionData.map((_: any, index: number) => (
                        <Cell
                          key={index}
                          fill={colors[index % colors.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>

                <div className="text-xs space-y-2 text-black">
                  {dashboardData.contributionData.map((item: any, index: number) => (
                    <p key={item.name}>
                      <span
                        className="inline-block w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: colors[index % colors.length] }}
                      />
                      {item.name}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center border-b mb-4">
            <h2 className="text-xl font-bold text-black">Project</h2>

            <div className="flex gap-5 text-sm">
              <button
                onClick={() => setActiveTab("ongoing")}
                className={
                  activeTab === "ongoing"
                    ? "font-bold text-purple-700 border-b-2 border-purple-700"
                    : "text-gray-500"
                }
              >
                On Going
              </button>

              <button
                onClick={() => setActiveTab("completed")}
                className={
                  activeTab === "completed"
                    ? "font-bold text-purple-700 border-b-2 border-purple-700"
                    : "text-gray-500"
                }
              >
                Completed
              </button>
            </div>
          </div>

          <div className="space-y-5">
            {filteredProjects.length === 0 ? (
              <p className="text-sm text-gray-500">
                No {activeTab} project.
              </p>
            ) : (
              filteredProjects.map((project: any) => (
                <div
                  key={project.id}
                  onClick={() => handleOpenProject(project.id, project.isMember)}
                  className="bg-[#fff3df] rounded-xl shadow-md p-6 cursor-pointer hover:scale-[1.01] transition"
                >
                  <h3 className="font-bold text-center text-black mb-4">
                    {project.name}
                  </h3>

                  <p className="text-sm text-black mb-3">
                    Team Leader:{" "}
                    <span className="text-gray-500">
                      {project.leader?.name || "Unknown"}
                    </span>
                  </p>

                  <div className="flex items-center gap-2 text-sm text-black mb-4">
                    <span>Member:</span>

                    {project.members.map((member: any) => (
                      <div
                        key={member.id}
                        title={member.name}
                        className="w-8 h-8 rounded-full bg-gray-300 border text-[10px] flex items-center justify-center"
                      >
                        {member.name?.charAt(0).toUpperCase()}
                      </div>
                    ))}
                  </div>

                  <p className="text-sm text-black">
                    Last Activity:{" "}
                    <span className="text-gray-500">
                      {new Date(project.lastActivity).toLocaleString()}
                    </span>
                  </p>

                  <div className="flex justify-between text-sm text-black mt-2">
                    <p>
                      Progress: {project.progress}%
                    </p>
                    <p className="font-bold text-xs">
                      *You are part of this project*
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>

        <aside className="bg-[#fff4e3] p-8">
          <div className="flex justify-end mb-8">
            <button className="bg-white p-2 rounded-md shadow">🔔</button>
          </div>

          <h2 className="text-xl font-bold text-black">On Going Meet</h2>

          {dashboardData.ongoingMeeting ? (
            <>
              <p className="text-sm text-gray-600 mb-2">
                {dashboardData.ongoingMeeting.title}
              </p>

              <div className="bg-blue-600 text-white rounded-lg p-4 flex justify-between items-center shadow-xl mb-8">
                <div className="w-12 h-12 bg-white rounded-sm" />
                <span className="text-sm">Live</span>
                <span>📞</span>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500 mb-8">
              Tidak ada meeting yang sedang berlangsung.
            </p>
          )}

          <h2 className="text-xl font-bold text-black mb-3">
            Upcoming Meet
          </h2>

          <div className="bg-white rounded-lg p-5 mb-8">
            <div className="flex justify-between font-bold text-sm mb-4 text-black">
              <p>MEETING</p>
              <p>SCHEDULE</p>
            </div>

            <div className="mt-5 space-y-2 text-xs text-gray-600">
              {dashboardData.meetingSchedule.length === 0 ? (
                <p>No meeting schedule.</p>
              ) : (
                dashboardData.meetingSchedule.map((meet: any) => (
                  <p key={meet.id}>
                    <b>{new Date(meet.date).toLocaleDateString()}</b> -{" "}
                    {meet.title}
                  </p>
                ))
              )}
            </div>
          </div>

          <h2 className="text-xl font-bold text-black mb-3">task</h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-red-100 rounded-lg p-4 row-span-2">
              <h3 className="text-2xl font-bold text-black">
                {dashboardData.tasks.plannedToday}
              </h3>
              <p className="font-bold text-sm text-black mb-8">
                Planned Today
              </p>
            </div>

            <div className="bg-purple-100 rounded-lg p-4">
              <h3 className="text-2xl font-bold text-black">
                {dashboardData.tasks.finishedYesterday}
              </h3>
              <p className="font-bold text-sm text-black">
                Finished
              </p>
            </div>

            <div className="bg-green-100 rounded-lg p-4">
              <h3 className="text-2xl font-bold text-black">
                {dashboardData.tasks.dueThisWeek}
              </h3>
              <p className="font-bold text-sm text-black">
                Due This Week
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}