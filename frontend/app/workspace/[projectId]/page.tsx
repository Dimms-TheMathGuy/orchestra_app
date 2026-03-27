"use client";

import { use } from "react";
import GithubActivityWidget from "@/app/components/GithubActivityWidget";

export default function ProjectWorkspace({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);  

  return (
    <div style={{ padding: "20px" }}>
      <h1>Project Development Page</h1>
      <p>Project ID: {projectId}</p>

      <GithubActivityWidget projectId={projectId} />
    </div>
  );
}