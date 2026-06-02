import { useState } from "react";
import { useNavigate } from "react-router";
import { Sidebar } from "../components/Sidebar";
import { mockUsers } from "../data/mockData";
import { toast } from "sonner";

export function AddProject() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [notionDbId, setNotionDbId] = useState("");
  const [githubRepo, setGithubRepo] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const navigate = useNavigate();

  const handleMemberToggle = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Project created successfully!");
    navigate("/dashboard");
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="max-w-2xl">
          <h1 className="mb-8">Add New Project</h1>
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
            <div>
              <label htmlFor="name" className="block mb-2">
                Project Name *
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="E.g., Mobile App Redesign"
              />
            </div>

            <div>
              <label htmlFor="description" className="block mb-2">
                Description *
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe your project..."
              />
            </div>

            <div>
              <label htmlFor="notionDbId" className="block mb-2">
                Notion Database ID *
              </label>
              <input
                id="notionDbId"
                type="text"
                value={notionDbId}
                onChange={(e) => setNotionDbId(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="paste-your-notion-database-id-here"
              />
            </div>

            <div>
              <label htmlFor="githubRepo" className="block mb-2">
                GitHub Repository (Optional)
              </label>
              <input
                id="githubRepo"
                type="text"
                value={githubRepo}
                onChange={(e) => setGithubRepo(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="username/repository"
              />
            </div>

            <div>
              <label className="block mb-3">
                Team Members (Registered Accounts Only)
              </label>
              <div className="space-y-2">
                {mockUsers.map((user) => (
                  <label
                    key={user.id}
                    className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(user.id)}
                      onChange={() => handleMemberToggle(user.id)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="w-8 h-8 rounded-full"
                    />
                    <div>
                      <div>{user.name}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
              >
                Create Project
              </button>
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
