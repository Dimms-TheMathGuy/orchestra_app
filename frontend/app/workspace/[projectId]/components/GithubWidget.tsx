"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/app/lib/api";
import { GitBranch, Link } from "lucide-react";

interface GithubWidgetProps {
  projectId: string;
}

interface RepoInfo {
  id: string;
  githubOwner: string;
  githubRepo: string;
}

interface Activity {
  id: string;
  type: string;
  title?: string;
  createdAt?: string;
}

export default function GithubWidget({ projectId }: GithubWidgetProps) {
  const [repo, setRepo] = useState<RepoInfo | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch GitHub activities for this project
    apiFetch<Activity[]>(`/api/github/projects/${projectId}/github-activity`)
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setActivities(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  const hasRepo = repo !== null || activities.length > 0;

  return (
    <div
      className="w-full overflow-hidden flex flex-col items-center justify-center"
      style={{
        background: "#1E1E1E",
        opacity: 0.75,
        border: "1.5px solid rgba(255, 249, 249, 0.5)",
        boxShadow: "0px 4px 40px 1px rgba(0, 0, 0, 0.25)",
        backdropFilter: "blur(20px)",
        borderRadius: "17px",
        minHeight: "260px",
      }}
    >
      {!hasRepo ? (
        /* No Repo Linked State */
        <div className="flex flex-col items-center justify-center py-8 px-6 text-center">
          <svg width="82" height="82" viewBox="0 0 24 24" fill="white" className="mb-4" style={{ filter: "drop-shadow(inset 0px 4px 10px rgba(0, 0, 0, 0.25))" }}>
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
          </svg>
          <p
            style={{
              fontFamily: "'Geist Mono', monospace",
              fontWeight: 600,
              fontSize: "18px",
              lineHeight: "23px",
              textAlign: "center",
              color: "#FFFFFF",
              marginBottom: "4px",
            }}
          >
            No Repository Linked
          </p>
          <button
            className="hover:text-white transition-colors"
            style={{
              fontFamily: "'Geist Mono', monospace",
              fontWeight: 400,
              fontSize: "12px",
              lineHeight: "16px",
              textAlign: "center",
              color: "#FFFFFF",
            }}
          >
            Link your repo? →
          </button>
        </div>
      ) : (
        /* Repo Activity State */
        <div className="w-full p-4">
          <div className="flex items-center gap-2 mb-3">
            <GitBranch size={18} className="text-white" />
            <span className="text-white font-semibold text-sm" style={{ fontFamily: "'Geist Mono', monospace" }}>
              {repo ? `${repo.githubOwner}/${repo.githubRepo}` : "Repository"}
            </span>
          </div>
          <div className="space-y-2 max-h-[180px] overflow-y-auto">
            {activities.slice(0, 5).map((a) => (
              <div key={a.id} className="flex items-center gap-2 text-white/70 text-xs">
                <Link size={10} className="flex-shrink-0" />
                <span className="truncate">{a.type} — {a.title || "No title"}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
