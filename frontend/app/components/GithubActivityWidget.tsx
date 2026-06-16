"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

type Activity = {
  id: string;
  type: string;
  title?: string;
  createdAt?: string;
};

export default function GithubActivityWidget({
  projectId,
}: {
  projectId: string;
}) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    const socket: Socket = io(apiBaseUrl);

    socket.emit("joinProject", projectId);

    socket.on("newActivity", (activity: Activity) => {
      setActivities((prev) => [activity, ...prev]);
    });

    fetch(`${apiBaseUrl}/api/github/${projectId}/github-activity`)
      .then((res) => res.json())
      .then((data) => {
        setActivities(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch GitHub activities:", err);
        setLoading(false);
      });

    return () => {
      socket.disconnect();
    };
  }, [projectId]);

  return (
    <div style={{ border: "1px solid #ccc", padding: 12 }}>
      <h3>GitHub Activity</h3>

      {loading && <p>Loading...</p>}

      {!loading && activities.length === 0 && (
        <p>No activity yet.</p>
      )}

      <ul>
        {activities.map((a) => (
          <li key={a.id}>
            {a.type} — {a.title || "No title"}
          </li>
        ))}
      </ul>
    </div>
  );
}