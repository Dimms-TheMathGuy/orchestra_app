"use client";

import Sidebar from "../components/Sidebar";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useState } from "react";

export default function AddProjectPage() {
  const { theme, setTheme } = useTheme();

  const [form, setForm] = useState({
    name: "",
    description: "",
    notionDbId: "",
    members: "",
    githubUrl: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen flex bg-[#e8e8e8] dark:bg-[#141414] transition-colors">
      <Sidebar
        user={{
          name: "Ina Kusuma",
          email: "ina.kusuma@gmail.com",
          avatarUrl:
            "https://i.pravatar.cc/150?img=5",
        }}
      />

      <main className="flex-1 p-12">
        <div className="flex items-center justify-between mb-10">
          <h1 className="text-3xl font-semibold text-zinc-900 dark:text-white">
            Add Project
          </h1>

          <button
            onClick={() =>
              setTheme(theme === "dark" ? "light" : "dark")
            }
            className="p-3 rounded-full border border-zinc-300 dark:border-zinc-700"
          >
            {theme === "dark" ? (
              <Sun size={18} />
            ) : (
              <Moon size={18} />
            )}
          </button>
        </div>

        <div className="bg-white dark:bg-[#090909] rounded-3xl p-10 shadow-sm border border-zinc-200 dark:border-zinc-800">
          <div className="grid grid-cols-2 gap-10">
            {/* Left */}
            <div className="space-y-6">
              <Input
                label="Name *"
                name="name"
                placeholder="Enter Project Name"
                value={form.name}
                onChange={handleChange}
              />

              <TextArea
                label="Description *"
                name="description"
                placeholder="Enter Project Description"
                value={form.description}
                onChange={handleChange}
              />
            </div>

            {/* Right */}
            <div className="space-y-6">
              <Input
                label="Notion Database ID *"
                name="notionDbId"
                placeholder="Enter Existing Notion Database ID"
                value={form.notionDbId}
                onChange={handleChange}
              />

              <Input
                label="Members *"
                name="members"
                placeholder="Add members email"
                value={form.members}
                onChange={handleChange}
              />

              <Input
                label="Github Repository URL"
                name="githubUrl"
                placeholder="Add Github Repository Link"
                value={form.githubUrl}
                onChange={handleChange}
              />

              <div className="flex justify-end pt-6">
                <button className="px-8 py-3 rounded-full bg-[#f3e7ff] dark:bg-[#f6ebff] text-purple-700 font-semibold hover:opacity-90 transition">
                  Create Project
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Input({ label, ...props }: any) {
  return (
    <div>
      <p className="mb-2 text-sm text-zinc-700 dark:text-zinc-300">
        {label}
      </p>

      <input
        {...props}
        className="w-full px-4 py-3 rounded-xl bg-transparent border border-[#8c6bc9] dark:border-zinc-700 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-400 transition"
      />
    </div>
  );
}

function TextArea({ label, ...props }: any) {
  return (
    <div>
      <p className="mb-2 text-sm text-zinc-700 dark:text-zinc-300">
        {label}
      </p>

      <textarea
        {...props}
        rows={6}
        className="w-full px-4 py-3 rounded-xl bg-transparent border border-[#8c6bc9] dark:border-zinc-700 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-400 transition"
      />
    </div>
  );
}