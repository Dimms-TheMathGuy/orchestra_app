"use client"

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

const performanceData = [
  { month: "Jan", performance: 80 },
  { month: "Feb", performance: 65 },
  { month: "Mar", performance: 72 },
  { month: "Apr", performance: 60 },
  { month: "May", performance: 85 },
]

const contributionData = [
  { name: "Project A", value: 35 },
  { name: "Project B", value: 25 },
  { name: "Project C", value: 20 },
  { name: "Project D", value: 20 },
]

const projects = [
  {
    id: "project-a",
    name: "Project A",
    leader: "Ina Kusuma",
    members: ["Ina", "Ayu", "Bima", "Citra", "Dina"],
    lastActivity: "2 Hours Ago",
    progress: 70,
    isMember: true,
  },
  {
    id: "project-b",
    name: "Project B",
    leader: "Ina Kusuma",
    members: ["Ina", "Raka", "Nina", "Dimas"],
    lastActivity: "2 Hours Ago",
    progress: 70,
    isMember: true,
  },
]

const ongoingMeeting = {
  title: "Project Discovery Call",
  time: "28:35",
}

const meetingSchedule = [
  { date: "12 Jan", title: "Project A Meeting" },
  { date: "18 Jan", title: "Sprint Review" },
  { date: "24 Jan", title: "Project B Discussion" },
]

export default function DashboardPage() {
  const router = useRouter()

  async function handleOpenProject(projectId: string, isMember: boolean) {
    if (!isMember) {
      alert("You are not part of this project")
      return
    }

    /**
     * NANTI biometric jalan di sini:
     * 1. call /passkey/auth/options
     * 2. startAuthentication()
     * 3. call /passkey/auth/verify
     * 4. kalau verified, masuk ke dashboard project
     */

    router.push(`/dashboard/project/${projectId}`)
  }

  return (
    <div className="min-h-screen bg-[#3f3b5b] p-10">
      <p className="text-xs text-gray-300 mb-2">Project Dashboard</p>

      <div className="grid grid-cols-[220px_1fr_280px] bg-[#f7f7f7] rounded-sm overflow-hidden min-h-[720px]">
        {/* SIDEBAR */}
        <aside className="bg-white border-r p-8 flex flex-col items-center">
          <h1 className="text-xl font-bold mb-16">LOGO</h1>

          <div className="w-20 h-20 bg-gray-300 rounded-full mb-3" />

          <h2 className="font-bold text-sm">Ina Kusuma</h2>
          <p className="text-xs text-gray-500 mb-12">
            Ina.kusuma@perusahaan1
          </p>

          <nav className="text-sm text-center space-y-3">
            <p className="font-bold">Project & Task</p>
            <p className="text-gray-500">List Project</p>
            <p className="text-gray-500">Add Project</p>
            <p className="text-gray-500">Meeting results</p>
            <p className="text-gray-500">Setting</p>
          </nav>
        </aside>

        {/* MAIN CONTENT */}
        <main className="p-10 bg-[#f7f7f7]">
          <h1 className="text-3xl font-bold text-black">
            Welcome to Planti,
          </h1>
          <p className="text-gray-500 mb-8">Hello Ina, welcome back!</p>

          {/* CHARTS */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-lg p-5">
              <h2 className="font-bold text-sm mb-3 text-black">
                Your Performance
              </h2>

              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={performanceData}>
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
                      data={contributionData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={65}
                    >
                      {contributionData.map((_, index) => (
                        <Cell
                          key={index}
                          fill={["#7ed6c1", "#ff7675", "#555", "#f6c56f"][index]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>

                <div className="text-xs space-y-2 text-black">
                  {contributionData.map((item, index) => (
                    <p key={item.name}>
                      <span
                        className="inline-block w-3 h-3 rounded-full mr-2"
                        style={{
                          backgroundColor: ["#7ed6c1", "#ff7675", "#555", "#f6c56f"][index],
                        }}
                      />
                      {item.name}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* PROJECT LIST */}
          <div className="flex justify-between items-center border-b mb-4">
            <h2 className="text-xl font-bold text-black">Project</h2>

            <div className="flex gap-5 text-sm">
              <button className="font-bold text-purple-700 border-b-2 border-purple-700">
                On Going
              </button>
              <button className="text-gray-500">Completed</button>
            </div>
          </div>

          <p className="text-sm text-gray-500 mb-3">3 Feb</p>

          <div className="space-y-5">
            {projects.map((project) => (
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
                  <span className="inline-block bg-gray-300 rounded-full w-8 h-8 align-middle ml-2" />
                </p>

                <div className="flex items-center gap-2 text-sm text-black mb-4">
                  <span>Member:</span>
                  {project.members.map((member) => (
                    <div
                      key={member}
                      className="w-8 h-8 rounded-full bg-gray-300 border"
                    />
                  ))}
                </div>

                <p className="text-sm text-black">
                  Last Activity:{" "}
                  <span className="text-gray-500">{project.lastActivity}</span>
                </p>

                <div className="flex justify-between text-sm text-black">
                  <p>
                    Progress: {project.progress}%{" "}
                    <span className="text-gray-500">(almost Done)</span>
                  </p>
                  <p className="font-bold text-xs">
                    *You are part of this project*
                  </p>
                </div>
              </div>
            ))}
          </div>
        </main>

        {/* RIGHT PANEL */}
        <aside className="bg-[#fff4e3] p-8">
          <div className="flex justify-end mb-8">
            <button className="bg-white p-2 rounded-md shadow">🔔</button>
          </div>

          <h2 className="text-xl font-bold text-black">On Going Meet</h2>

          {ongoingMeeting ? (
            <>
              <p className="text-sm text-gray-600 mb-2">
                {ongoingMeeting.title}
              </p>

              <div className="bg-blue-600 text-white rounded-lg p-4 flex justify-between items-center shadow-xl mb-8">
                <div className="w-12 h-12 bg-white rounded-sm" />
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full bg-gray-300 border-2 border-white"
                    />
                  ))}
                </div>
                <span className="text-sm">{ongoingMeeting.time}</span>
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
              <p>JANUARY</p>
              <p>2026</p>
            </div>

            <div className="grid grid-cols-7 text-center text-xs gap-2 text-gray-700">
              {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((d) => (
                <p key={d} className="font-bold">{d}</p>
              ))}
              {Array.from({ length: 31 }, (_, i) => (
                <p
                  key={i}
                  className={
                    [6, 12, 18, 24].includes(i + 1)
                      ? "bg-pink-200 rounded-full"
                      : ""
                  }
                >
                  {i + 1}
                </p>
              ))}
            </div>

            <div className="mt-5 space-y-2 text-xs text-gray-600">
              {meetingSchedule.map((meet) => (
                <p key={meet.date}>
                  <b>{meet.date}</b> - {meet.title}
                </p>
              ))}
            </div>
          </div>

          <h2 className="text-xl font-bold text-black mb-3">task</h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-red-100 rounded-lg p-4 row-span-2">
              <h3 className="text-2xl font-bold text-black">18</h3>
              <p className="font-bold text-sm text-black mb-8">
                Planned Today
              </p>
              <p className="text-xs text-gray-500">4 Overdue</p>
              <p className="text-xs text-gray-500">5 Due Today</p>
              <p className="text-xs text-gray-500">9 New Task</p>
            </div>

            <div className="bg-purple-100 rounded-lg p-4">
              <h3 className="text-2xl font-bold text-black">12</h3>
              <p className="font-bold text-sm text-black">
                Finished Yesterday
              </p>
            </div>

            <div className="bg-green-100 rounded-lg p-4">
              <h3 className="text-2xl font-bold text-black">24</h3>
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