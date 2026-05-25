"use client";

import { useRouter } from "next/navigation";

interface WorkspaceHeaderProps {
  projectName: string;
}

export default function WorkspaceHeader({ projectName }: WorkspaceHeaderProps) {
  const router = useRouter();

  return (
    <header className="flex items-center justify-between px-10 py-6">
      {/* Back arrow — matches design icon at left:40, top:35 */}
      <button
        onClick={() => router.back()}
        className="p-2 rounded-lg hover:bg-black/5 transition-colors"
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "rgba(0,0,0,0.8)" }}>
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
          <polyline points="10 17 15 12 10 7" />
          <line x1="15" y1="12" x2="3" y2="12" />
        </svg>
      </button>

      {/* Project title — Plus Jakarta Sans, 40px, bold */}
      <h1
        style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontWeight: 700,
          fontSize: "40px",
          lineHeight: "50px",
          color: "#000000",
          opacity: 0.8,
          textShadow: "0px 4px 40px rgba(0, 0, 0, 0.25)",
        }}
      >
        {projectName}
      </h1>

      {/* Settings gear icon — 55x55 area */}
      <button className="p-2 rounded-lg hover:bg-black/5 transition-colors">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" fill="rgba(0,0,0,0.72)" />
          <circle cx="12" cy="12" r="3" fill="white" />
        </svg>
      </button>
    </header>
  );
}
