import { useParams } from "react-router";
import { Sidebar } from "../components/Sidebar";
import { mockProjects, mockGithubActivities, mockMeetings } from "../data/mockData";
import { GitBranch, Video, Calendar, Users, ExternalLink, Sparkles } from "lucide-react";
import { useState } from "react";

export function Workspace() {
  const { projectId } = useParams();
  const project = mockProjects.find((p) => p.id === projectId);
  const activities = mockGithubActivities.filter((a) => a.projectId === projectId);
  const upcomingMeetings = [
    {
      id: "upcoming-1",
      topic: "Weekly Standup",
      time: "2026-06-02 10:00 AM",
      joinUrl: "https://zoom.us/j/123456789",
    },
    {
      id: "upcoming-2",
      topic: "Client Review",
      time: "2026-06-05 2:00 PM",
      joinUrl: "https://zoom.us/j/987654321",
    },
  ];
  const pastMeetings = mockMeetings.filter((m) => m.projectId === projectId);
  const [notionPrompt, setNotionPrompt] = useState("");
  const [geminiPrompt, setGeminiPrompt] = useState("");
  const [geminiResponse, setGeminiResponse] = useState("");

  if (!project) return <div>Project not found</div>;

  const handleNotionSync = () => {
    alert("Syncing with Notion database: " + project.notionDbId);
  };

  const handleGeminiQuery = () => {
    setGeminiResponse(
      `Based on your project "${project.name}", here are some insights:\n\n• The team is making steady progress on payment integration\n• Consider prioritizing mobile responsiveness\n• GitHub activity shows good collaboration\n• Next sprint should focus on testing`
    );
  };

  const handleCreateZoom = () => {
    alert("Creating new Zoom meeting for project: " + project.name);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar isWorkspace />
      <div className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="mb-2">{project.name}</h1>
          <p className="text-gray-600">{project.description}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <GitBranch className="text-gray-700" />
                <h2>GitHub Activity</h2>
              </div>
              <ExternalLink size={20} className="text-gray-400" />
            </div>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {activities.map((activity) => (
                <div key={activity.id} className="border-l-4 border-blue-500 pl-4 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {activity.type}
                    </span>
                    <span className="text-xs text-gray-500">
                      {activity.createdAt.toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="text-sm mb-1">{activity.title}</h4>
                  <p className="text-sm text-gray-600">{activity.description}</p>
                  <p className="text-xs text-gray-500 mt-1">by {activity.author}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4 4h16v16H4V4z" />
              </svg>
              <h2>Notion Database</h2>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded">
                <p className="text-sm text-gray-600 mb-2">Database ID:</p>
                <p className="text-sm break-all">{project.notionDbId || "Not connected"}</p>
              </div>
              <button
                onClick={handleNotionSync}
                className="w-full bg-gray-800 text-white py-2 rounded-lg hover:bg-gray-900"
              >
                Sync with Notion
              </button>
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="p-3 bg-blue-50 rounded">
                  <div className="text-2xl mb-1">12</div>
                  <div className="text-gray-600">Tasks</div>
                </div>
                <div className="p-3 bg-green-50 rounded">
                  <div className="text-2xl mb-1">8</div>
                  <div className="text-gray-600">Done</div>
                </div>
                <div className="p-3 bg-yellow-50 rounded">
                  <div className="text-2xl mb-1">4</div>
                  <div className="text-gray-600">In Progress</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="text-purple-600" />
              <h2>Gemini AI Assistant</h2>
            </div>
            <div className="space-y-4">
              <textarea
                value={geminiPrompt}
                onChange={(e) => setGeminiPrompt(e.target.value)}
                placeholder="Ask Gemini about your project..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                rows={3}
              />
              <button
                onClick={handleGeminiQuery}
                className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700"
              >
                Ask Gemini
              </button>
              {geminiResponse && (
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm whitespace-pre-line">{geminiResponse}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-2 mb-4">
              <Video className="text-blue-600" />
              <h2>Zoom Meetings</h2>
            </div>
            <button
              onClick={handleCreateZoom}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 mb-4"
            >
              Create New Meeting
            </button>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm mb-2">Upcoming</h3>
                <div className="space-y-2">
                  {upcomingMeetings.map((meeting) => (
                    <div key={meeting.id} className="p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm">{meeting.topic}</h4>
                        <Calendar size={16} className="text-gray-400" />
                      </div>
                      <p className="text-xs text-gray-500 mb-2">{meeting.time}</p>
                      <a
                        href={meeting.joinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Join Meeting
                      </a>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm mb-2">Past Meetings</h3>
                <div className="space-y-2">
                  {pastMeetings.slice(0, 2).map((meeting) => (
                    <div key={meeting.id} className="p-3 bg-gray-50 rounded-lg">
                      <h4 className="text-sm mb-1">{meeting.topic}</h4>
                      <p className="text-xs text-gray-500">
                        {meeting.createdAt.toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="text-gray-700" />
            <h2>Team Members</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {project.members.map((member) => (
              <div key={member.id} className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg">
                <img
                  src={member.user.avatarUrl}
                  alt={member.user.name}
                  className="w-12 h-12 rounded-full"
                />
                <div>
                  <h4 className="text-sm">{member.user.name}</h4>
                  <p className="text-xs text-gray-500">{member.role}</p>
                  <p className="text-xs text-gray-400">{member.user.email}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
