"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/app/lib/api";
import { ChevronDown, CheckSquare, Clock, BarChart3 } from "lucide-react";

interface NotionWidgetProps {
  projectId: string;
  blockId?: string;
}

interface NotionSchema {
  id: string;
  title: string;
  properties: Record<string, { type: string; name: string }>;
}

interface ProjectCard {
  id: string;
  title: string;
  status: string;
  progress: number;
  date: string;
  daysLeft?: number;
}

interface Assignment {
  id: string;
  name: string;
  date: string;
  score: string;
  status: string;
  completed: boolean;
}

interface TaskProgress {
  day: string;
  hours: number;
}

// Mock data that mimics what a Notion template would produce
const MOCK_PROJECT_CARDS: ProjectCard[] = [
  { id: "1", title: "Web Dashboard", status: "Designing", progress: 90, date: "Mar 2, 2024", daysLeft: 3 },
  { id: "2", title: "Mobile App", status: "Shopping", progress: 30, date: "Mar 6, 2024", daysLeft: 25 },
  { id: "3", title: "Animation", status: "Designing", progress: 75, date: "Mar 8, 2024", daysLeft: 7 },
];

const MOCK_ASSIGNMENTS: Assignment[] = [
  { id: "1", name: "Colour Theory", date: "01 Feb 2024", score: "86/100", status: "Grade", completed: true },
  { id: "2", name: "Design system", date: "01 Feb 2024", score: "90/100", status: "Grade", completed: true },
  { id: "3", name: "User persona", date: "13 Mar 2024", score: "0/100", status: "To Do", completed: false },
  { id: "4", name: "Prototyping", date: "16 Mar 2024", score: "0/100", status: "To Do", completed: false },
];

const MOCK_TASK_PROGRESS: TaskProgress[] = [
  { day: "O", hours: 1 },
  { day: "M", hours: 3 },
  { day: "T", hours: 5 },
  { day: "W", hours: 4 },
  { day: "T", hours: 3 },
  { day: "F", hours: 2 },
  { day: "S", hours: 4 },
  { day: "S", hours: 1 },
];

function ProgressBadge({ value }: { value: number }) {
  const color =
    value >= 100
      ? "bg-green-500"
      : value >= 70
        ? "bg-purple-500"
        : value >= 30
          ? "bg-blue-500"
          : "bg-orange-400";

  return (
    <span className={`${color} text-white text-[11px] font-medium px-2 py-0.5 rounded-full`}>
      {value}%
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Grade: "bg-purple-100 text-purple-700",
    "To Do": "bg-gray-100 text-gray-600",
    "In Progress": "bg-blue-100 text-blue-700",
    Done: "bg-green-100 text-green-700",
  };
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${colors[status] || "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

export default function NotionWidget({ projectId, blockId }: NotionWidgetProps) {
  const [schema, setSchema] = useState<NotionSchema | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!blockId) return;
    setLoading(true);
    apiFetch<NotionSchema>(`/notion/schema/${blockId}`)
      .then(setSchema)
      .catch((err) => console.error("Failed to fetch Notion schema:", err))
      .finally(() => setLoading(false));
  }, [blockId]);

  const maxHours = Math.max(...MOCK_TASK_PROGRESS.map((t) => t.hours), 1);

  return (
    <div
      className="w-full overflow-hidden"
      style={{
        background:
          "linear-gradient(179.47deg, rgba(255, 196, 166, 0.36) -12.25%, rgba(255, 221, 209, 0.28) 108.67%)",
        opacity: 0.95,
        border: "1.5px solid rgba(255, 255, 255, 0.5)",
        boxShadow: "0px 4px 40px rgba(0, 0, 0, 0.25)",
        backdropFilter: "blur(20px)",
        borderRadius: "17px",
        padding: "20px",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div style={{ width: "39px", height: "39px" }} className="flex items-center justify-center">
          {/* Notion logo */}
          <svg width="34" height="34" viewBox="0 0 100 100" fill="none">
            <path d="M6.017 4.313l55.333 -4.087c6.797 -0.583 8.543 -0.19 12.817 2.917l17.663 12.443c2.913 2.14 3.883 2.723 3.883 5.053v68.243c0 4.277 -1.553 6.807 -6.99 7.193L24.467 99.967c-4.08 0.193 -6.023 -0.39 -8.16 -3.113L3.3 79.94c-2.333 -3.113 -3.3 -5.443 -3.3 -8.167V11.113c0 -3.497 1.553 -6.413 6.017 -6.8z" fill="rgba(0,0,0,0.75)" />
            <path d="M61.35 0.227l-55.333 4.087C1.553 4.7 0 7.617 0 11.113v60.66c0 2.723 0.967 5.053 3.3 8.167l12.993 16.913c2.137 2.723 4.08 3.307 8.16 3.113l64.257 -3.89c5.433 -0.387 6.99 -2.917 6.99 -7.193V20.64c0 -2.21 -0.873 -2.847 -3.443 -4.733L75.933 3.36C71.393 0.04 69.57 -0.363 61.35 0.227zM25.663 19.07c-5.5 0.35 -6.747 0.417 -9.89 -2.003L8.927 11.507c-0.77 -0.78 -0.383 -1.753 1.557 -1.947l53.193 -3.887c4.467 -0.393 6.793 1.167 8.54 2.527l8.157 5.86c0.387 0.193 1.353 1.36 0.193 1.36l-54.903 3.65v0.003zM19.803 88.3V30.367c0 -2.53 0.777 -3.697 3.103 -3.893L86 22.78c2.14 -0.193 3.107 1.167 3.107 3.693v57.547c0 2.53 -0.39 4.667 -3.883 4.863l-60.377 3.5c-3.493 0.193 -5.043 -0.97 -5.043 -4.083zm59.6 -54.827c0.387 1.75 0 3.5 -1.75 3.7l-2.917 0.577v42.773c-2.53 1.36 -4.853 2.133 -6.797 2.133 -3.107 0 -3.883 -0.973 -6.21 -3.887l-19.03 -29.94v28.967l6.077 1.36s0 3.5 -4.853 3.5l-13.39 0.777c-0.387 -0.78 0 -2.723 1.357 -3.11l3.497 -0.97v-38.3L30.42 40.867c-0.387 -1.75 0.58 -4.277 3.3 -4.473l14.163 -0.967 19.8 30.327V37.747l-5.047 -0.58c-0.39 -2.143 1.163 -3.7 3.103 -3.89l13.667 -0.797z" fill="white" />
          </svg>
        </div>
        <h2
          style={{
            fontFamily: "Inter",
            fontWeight: 700,
            fontSize: "25px",
            lineHeight: "30px",
            color: "rgba(0, 0, 0, 0.79)",
          }}
        >
          Project and Task Manager
        </h2>
        {loading && <span className="text-xs text-black/40 ml-auto">Loading schema...</span>}
      </div>

      {/* Project Cards - Horizontal Scroll */}
      <div className="flex gap-3 overflow-x-auto pb-3 mb-4 -mx-1 px-1">
        {MOCK_PROJECT_CARDS.map((card) => (
          <div
            key={card.id}
            className="min-w-[210px] bg-white/80 rounded-xl p-4 shadow-sm flex-shrink-0"
          >
            <p className="text-[12px] text-black/40 font-medium mb-1">{card.date}</p>
            <h3 className="font-bold text-[16px] text-black/80 leading-tight">{card.title}</h3>
            <p className="text-[13px] text-black/50 mb-3">{card.status}</p>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] text-black/50">Progress</span>
              <span className="text-[13px] font-semibold text-black/70">{card.progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(card.progress, 100)}%`,
                  background: card.progress >= 70 ? "#7c3aed" : "#3b82f6",
                }}
              />
            </div>
            {card.daysLeft !== undefined && (
              <div className="flex items-center gap-2 mt-3">
                <div className="flex -space-x-1.5">
                  {[0, 1].map((i) => (
                    <div
                      key={i}
                      className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-300 to-pink-200 border-2 border-white"
                    />
                  ))}
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                  {card.daysLeft} days left
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bottom Section: Tasks Progress + Assignments side by side */}
      <div className="flex gap-4 flex-col lg:flex-row">
        {/* Tasks Progress Chart */}
        <div className="flex-1 bg-white/60 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-[16px] text-black/80 flex items-center gap-2">
              <BarChart3 size={16} className="text-purple-500" />
              Tasks Progress
            </h3>
            <button className="flex items-center gap-1 text-[12px] text-black/50 bg-white rounded-lg px-2 py-1 shadow-sm">
              Weekly
              <ChevronDown size={12} />
            </button>
          </div>

          {/* Bar Chart */}
          <div className="flex items-end gap-2 h-[120px] mb-2">
            {MOCK_TASK_PROGRESS.map((t, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-md transition-all"
                  style={{
                    height: `${(t.hours / maxHours) * 100}%`,
                    background:
                      i <= 3
                        ? "linear-gradient(180deg, #7c3aed 0%, #a78bfa 100%)"
                        : "#e5e7eb",
                    minHeight: "4px",
                  }}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            {MOCK_TASK_PROGRESS.map((t, i) => (
              <div key={i} className="flex-1 text-center text-[11px] text-black/40 font-medium">
                {t.day}
              </div>
            ))}
          </div>

          {/* Time Spent Stats */}
          <div className="mt-4 space-y-2">
            {[
              { label: "Time spent", value: "18h", pct: 120, row: "04" },
              { label: "Lesson Learnt", value: "15h", pct: 120, row: "03" },
              { label: "Exams Passed", value: "2h", pct: 100, row: "01" },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center justify-between text-[12px]">
                <span className="text-black/50 w-24">{stat.label}</span>
                <span className="font-semibold text-black/70">{stat.value}</span>
                <ProgressBadge value={stat.pct} />
              </div>
            ))}
          </div>
        </div>

        {/* Assignments */}
        <div className="w-full lg:w-[280px] bg-white/60 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-[16px] text-black/80">
              Assignments ({MOCK_ASSIGNMENTS.length})
            </h3>
          </div>
          <p className="text-[12px] text-black/50 mb-3 flex items-center gap-1">
            <CheckSquare size={12} className="text-orange-400" />
            {MOCK_ASSIGNMENTS.filter((a) => a.completed).length}/{MOCK_ASSIGNMENTS.length} completed
          </p>

          <div className="space-y-3">
            {MOCK_ASSIGNMENTS.map((a) => (
              <div key={a.id} className="flex items-start gap-2">
                <div
                  className={`w-4 h-4 rounded border-2 mt-0.5 flex-shrink-0 flex items-center justify-center ${
                    a.completed
                      ? "bg-purple-500 border-purple-500"
                      : "border-gray-300"
                  }`}
                >
                  {a.completed && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-[13px] text-black/80 truncate">{a.name}</p>
                    <span className="text-[12px] font-semibold text-black/60 ml-2 flex-shrink-0">
                      {a.score}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-black/40">{a.date}</p>
                    <StatusBadge status={a.status} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
