import { useState } from "react";
import { useNavigate } from "react-router";
import { Sidebar } from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { Camera } from "lucide-react";

export function EditProfile() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [company, setCompany] = useState("Acme Corp");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || "");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({ name, email, avatarUrl });
    toast.success("Profile updated successfully!");
    navigate("/dashboard");
  };

  const handleAvatarChange = () => {
    const newSeed = prompt("Enter a name for your avatar:");
    if (newSeed) {
      setAvatarUrl(`https://api.dicebear.com/7.x/avataaars/svg?seed=${newSeed}`);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="max-w-2xl">
          <h1 className="mb-8">Edit Profile</h1>
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
            <div className="flex flex-col items-center mb-6">
              <div className="relative">
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="w-24 h-24 rounded-full border-4 border-gray-200"
                />
                <button
                  type="button"
                  onClick={handleAvatarChange}
                  className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700"
                >
                  <Camera size={16} />
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-2">Click camera to change avatar</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block mb-2">
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={name.split(" ")[0]}
                  onChange={(e) =>
                    setName(`${e.target.value} ${name.split(" ").slice(1).join(" ")}`)
                  }
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block mb-2">
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={name.split(" ").slice(1).join(" ")}
                  onChange={(e) => setName(`${name.split(" ")[0]} ${e.target.value}`)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="company" className="block mb-2">
                Company / Organization
              </label>
              <input
                id="company"
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
              >
                Save Changes
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
