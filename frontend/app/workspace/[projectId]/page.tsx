"use client";

import { use } from "react";
import WorkspaceHeader from "./components/WorkspaceHeader";
import PersonalInfoCard from "./components/PersonalInfoCard";
import ProjectMembersList from "./components/ProjectMembersList";
import NotionWidget from "./components/NotionWidget";
import ZoomWidget from "./components/ZoomWidget";
import GroupChatWidget from "./components/GroupChatWidget";
import GithubWidget from "./components/GithubWidget";
import GeminiWidget from "./components/GeminiWidget";
import type { Member } from "./components/ProjectMembersList";

const MOCK_USER = {
  name: "Ina Kusuma",
  role: "Project Manager",
  email: "ina.kusuma@perusahaan1",
  company: "PT. Belum Mandiri Finance",
  division: "Staff Divisi IT",
};

const MOCK_MEMBERS: Member[] = [
  { id: "1", name: "Ina Kusuma", role: "Project Manager", email: "ina.kusuma@perusahaan1" },
  { id: "2", name: "Ina Kusuma", role: "Vice Project Manager", email: "ina.kusuma@perusahaan1" },
  { id: "3", name: "Inara Rusli", role: "Cloud Engineer", email: "ina.kusuma@perusahaan1" },
  { id: "4", name: "Ina Kusuma", role: "Cloud Engineer", email: "ina.kusuma@perusahaan1" },
  { id: "5", name: "Ina Kusuma", role: "Cloud Engineer", email: "ina.kusuma@perusahaan1" },
  { id: "6", name: "Inara Jule", role: "Cloud Engineer", email: "ina.kusuma@perusahaan1" },
  { id: "7", name: "Ina Kusuma", role: "Cloud Engineer", email: "ina.kusuma@perusahaan1" },
  { id: "8", name: "Ina Kusuma", role: "Cloud Engineer", email: "ina.kusuma@perusahaan1" },
  { id: "9", name: "Ina Kusuma", role: "Cloud Engineer", email: "ina.kusuma@perusahaan1" },
];

export default function ProjectWorkspace({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);

  return (
    <div className="min-h-screen bg-white">
      <WorkspaceHeader projectName="Project A" />

      <div className="px-6 pb-8">
        {/* Main layout: Left sidebar + Content area */}
        <div className="grid grid-cols-[320px_1fr] gap-5 items-start">
          {/* ── Left Column: Personal Info + Members ── */}
          <div className="flex flex-col gap-5 row-span-2">
            <PersonalInfoCard {...MOCK_USER} />
            <ProjectMembersList members={MOCK_MEMBERS} />
          </div>

          {/* ── Right Content Area ── */}
          <div className="flex flex-col gap-5">
            {/* Notion Widget — spans full center+right width */}
            <NotionWidget projectId={projectId} />

            {/* Below Notion: split into Zoom (left) + Chat/GitHub/Gemini (right) */}
            <div className="grid grid-cols-[1fr_340px] gap-5">
              {/* Center-bottom: Zoom */}
              <ZoomWidget projectId={projectId} />

              {/* Right-bottom: Chat + GitHub + Gemini stacked */}
              <div className="flex flex-col gap-5">
                <GroupChatWidget />
                <GithubWidget projectId={projectId} />
                <GeminiWidget />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}