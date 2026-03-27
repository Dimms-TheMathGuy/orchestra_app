"use client"

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-[#3f3b5b] flex justify-center items-center p-6">

      {/* CONTAINER */}
      <div className="w-full max-w-[1200px] bg-white rounded-xl shadow-lg grid grid-cols-12 overflow-hidden">

        {/* SIDEBAR */}
        <div className="col-span-3 bg-[#4a4564] text-white p-6">

          <h1 className="font-bold text-xl mb-6">LOGO</h1>

          <img
            src="https://i.pravatar.cc/200"
            className="w-24 h-24 rounded-full mb-4"
          />

          <h2 className="font-semibold">Ina Kusuma</h2>

          <p className="text-sm text-gray-300 mb-6">
            ina.kusuma@example.com
          </p>

          <div className="space-y-3 text-gray-300">
            <p className="font-semibold">Project & Task</p>
            <p>Add Project</p>
            <p>Meeting Result</p>
            <p>Setting</p>
          </div>

        </div>

        {/* MAIN DASHBOARD */}
        <div className="col-span-6 p-8">

          <h1 className="text-2xl font-bold mb-1">
            Welcome to Planti.
          </h1>

          <p className="text-gray-500 mb-6">
            Hello Ina, welcome back!
          </p>

          {/* CHARTS */}
          <div className="grid grid-cols-2 gap-4 mb-6">

            <div className="bg-gray-100 p-4 rounded-lg shadow">
              Your Performance
            </div>

            <div className="bg-gray-100 p-4 rounded-lg shadow">
              Your Contribution
            </div>

          </div>

          {/* PROJECT CARD */}
          <div className="bg-[#efe9d6] p-5 rounded-xl shadow">

            <h2 className="font-semibold mb-2">
              Project A
            </h2>

            <p className="text-sm text-gray-600 mb-2">
              Team Leader
            </p>

            <div className="flex gap-2 mb-2">

              <img src="https://i.pravatar.cc/40?img=1" className="rounded-full"/>
              <img src="https://i.pravatar.cc/40?img=2" className="rounded-full"/>
              <img src="https://i.pravatar.cc/40?img=3" className="rounded-full"/>

            </div>

            <p className="text-sm text-gray-600">
              Progress 70%
            </p>

          </div>

        </div>

        {/* RIGHT PANEL */}
        <div className="col-span-3 bg-[#efe9d6] p-6">

          <h2 className="font-semibold mb-3">
            On Going Meet
          </h2>

          <div className="bg-blue-500 text-white rounded-lg p-4 mb-6">
            Project Daily Call
          </div>

          <h2 className="font-semibold mb-3">
            Upcoming Meet
          </h2>

          <div className="bg-white rounded-lg p-4 mb-6">
            Calendar
          </div>

          <h2 className="font-semibold mb-3">
            Task
          </h2>

          <div className="grid grid-cols-2 gap-3">

            <div className="bg-pink-200 p-3 rounded">
              18 Planned
            </div>

            <div className="bg-purple-200 p-3 rounded">
              12 Finished
            </div>

          </div>

        </div>

      </div>

    </div>
  )
}