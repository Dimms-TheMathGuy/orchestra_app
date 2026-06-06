"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  user: {
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Project & Task",
      href: "/dashboard",
    },
    {
      label: "List Project",
      href: "/projects",
    },
    {
      label: "Add Project",
      href: "/add-project",
    },
    {
      label: "Meeting Results",
      href: "/meeting-result-review",
    },
    {
      label: "Edit Profile",
      href: "/edit-profile",
    },
    {
      label: "Settings",
      href: "/settings",
    },
  ];

  return (
    <aside className="w-64 min-h-screen border-r border-zinc-200 dark:border-zinc-800 bg-[#f2f2f2] dark:bg-[#090909] p-6">
      {/* Logo */}
      <div className="mb-10">
        <h1 className="font-semibold text-zinc-900 dark:text-white">
          Orchestra
        </h1>
      </div>

      {/* User */}
      <div className="flex flex-col items-center mb-10">
        <img
          src={
            user.avatarUrl ||
            "https://ui-avatars.com/api/?name=User"
          }
          alt="avatar"
          className="w-16 h-16 rounded-full object-cover"
        />

        <h2 className="mt-3 text-sm font-semibold text-zinc-900 dark:text-white">
          {user.name}
        </h2>

        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {user.email}
        </p>
      </div>

      {/* Navigation */}
      <nav className="space-y-3">
        {navItems.map((item) => {
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                block rounded-xl px-4 py-3 transition
                ${
                  active
                    ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                }
              `}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}