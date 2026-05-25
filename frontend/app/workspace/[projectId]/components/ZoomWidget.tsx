"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/app/lib/api";
import { Video, Calendar, ChevronDown } from "lucide-react";

interface Meeting {
  id: string;
  topic: string;
  start_time: string;
  start_time_sub?: string;
  duration: number;
  join_url?: string;
  tag?: string;
  tagColor?: string;
}

interface ZoomWidgetProps {
  projectId: string;
}

const MOCK_MEETINGS: Meeting[] = [
  {
    id: "1",
    topic: "API Integration Plan",
    start_time: "Tomorrow, 8:00 - 10:00 WIB",
    duration: 120,
    tag: "Back-End",
    tagColor: "#B18BB8",
  },
  {
    id: "2",
    topic: "UI Realization",
    start_time: "Thursday, 35 March",
    start_time_sub: "13:00 - 16:00 WIB",
    duration: 180,
    tag: "Front-End",
    tagColor: "#FF7240",
  },
  {
    id: "3",
    topic: "UX Revision",
    start_time: "Thursday, 35 March",
    start_time_sub: "13:00 - 16:00 WIB",
    duration: 180,
    tag: "Front-End",
    tagColor: "#FF7240",
  },
];

function AttendeeAvatars({ color }: { color: string }) {
  return (
    <div
      className="flex items-center"
      style={{ borderRadius: "60px", background: color, padding: "2px 10px 2px 2px", gap: "0px" }}
    >
      <div className="flex" style={{ marginRight: "-4px" }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-full bg-gradient-to-br from-orange-200 to-pink-300 border-2 border-white"
            style={{
              width: "35px",
              height: "35px",
              marginLeft: i > 0 ? "-12px" : "0",
              boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.25)",
            }}
          />
        ))}
      </div>
      <span
        style={{
          fontFamily: "Inter",
          fontWeight: 500,
          fontSize: "11px",
          lineHeight: "13px",
          color: "rgba(255, 255, 255, 0.8)",
          marginLeft: "8px",
        }}
      >
        +15
      </span>
    </div>
  );
}

export default function ZoomWidget({ projectId }: ZoomWidgetProps) {
  const [meetings, setMeetings] = useState<Meeting[]>(MOCK_MEETINGS);
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiFetch<{ meetings?: Meeting[] }>("/zoom/meetings")
      .then((data) => {
        if (data.meetings && data.meetings.length > 0) {
          setMeetings(data.meetings);
        }
      })
      .catch((err) => console.error("Failed to fetch Zoom meetings:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col w-full overflow-hidden relative">
      {/* Blue Header — matches Rectangle 22 */}
      <div
        className="relative z-10 px-6 pt-5 pb-6"
        style={{
          background: "rgba(43, 94, 214, 0.8)",
          border: "1.5px solid rgba(255, 255, 255, 0.4)",
          boxShadow: "0px 4px 35px rgba(0, 0, 0, 0.58)",
          backdropFilter: "blur(20px)",
          borderRadius: "17px 17px 30px 30px",
          height: "170px",
        }}
      >
        <div className="flex items-center gap-3 mb-5">
          <h2
            style={{
              fontFamily: "Lato",
              fontWeight: 700,
              fontSize: "35px",
              lineHeight: "42px",
              textAlign: "center",
              color: "rgba(253, 253, 253, 0.98)",
            }}
          >
            Zoom Meetings
          </h2>
          <Video size={22} className="text-white/85" fill="white" fillOpacity={0.85} />
        </div>

        <div className="flex gap-3">
          <button
            style={{
              background: "#F9F9F9",
              boxShadow: "0px 4px 10px -3px rgba(0, 0, 0, 0.25)",
              borderRadius: "15px",
              padding: "6px 16px",
              fontFamily: "Lato",
              fontWeight: 500,
              fontSize: "12px",
              lineHeight: "14px",
              color: "#49257E",
            }}
          >
            Start new meeting
          </button>
          <button
            className="flex items-center gap-1.5"
            style={{
              background: "#F9F9F9",
              boxShadow: "0px 4px 10px -3px rgba(0, 0, 0, 0.25)",
              borderRadius: "15px",
              padding: "6px 16px",
              fontFamily: "Lato",
              fontWeight: 500,
              fontSize: "12px",
              lineHeight: "14px",
              color: "#49257E",
            }}
          >
            <Calendar size={12} />
            Schedule a meeting
          </button>
        </div>
      </div>

      {/* Meetings List Area — matches Rectangle 27 */}
      <div
        className="flex-1 px-4 pb-4 -mt-5"
        style={{
          background:
            "linear-gradient(339.32deg, rgba(83, 124, 221, 0.9) -97.75%, rgba(240, 240, 240, 0.09) 175.04%)",
          border: "1.5px solid rgba(255, 255, 255, 0.5)",
          boxShadow: "0px 4px 20px -1px rgba(0, 0, 0, 0.25)",
          backdropFilter: "blur(25px)",
          borderRadius: "17px",
          paddingTop: "28px",
        }}
      >
        {/* Tabs */}
        <div className="flex gap-3 mb-4">
          <button
            onClick={() => setActiveTab("upcoming")}
            style={{
              width: "111px",
              height: "27px",
              background: activeTab === "upcoming" ? "#537DDE" : "#B0B0B0",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: "9px",
              fontFamily: "Inter",
              fontWeight: 700,
              fontSize: "13px",
              lineHeight: "16px",
              textAlign: "center",
              color: activeTab === "upcoming" ? "rgba(255, 255, 255, 0.8)" : "#4A4A4A",
            }}
          >
            Upcomings
          </button>
          <button
            onClick={() => setActiveTab("past")}
            style={{
              width: "111px",
              height: "27px",
              background: activeTab === "past" ? "#537DDE" : "#B0B0B0",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: "9px",
              fontFamily: "Inter",
              fontWeight: 700,
              fontSize: "13px",
              lineHeight: "16px",
              textAlign: "center",
              color: activeTab === "past" ? "rgba(255, 255, 255, 0.8)" : "#4A4A4A",
            }}
          >
            Past
          </button>
        </div>

        {/* Meeting Cards */}
        <div className="space-y-4">
          {loading && <p className="text-sm text-black/40">Loading meetings...</p>}
          {meetings.map((meeting) => (
            <div
              key={meeting.id}
              className="relative overflow-hidden"
              style={{ borderRadius: "9px", height: "171px" }}
            >
              {/* Full gradient background (Rectangle 30) */}
              <div
                className="absolute inset-0"
                style={{
                  background: "linear-gradient(180deg, #527CDD 0%, #BCD0FF 100%)",
                  backdropFilter: "blur(20px)",
                  borderRadius: "9px",
                }}
              />

              {/* White card body overlapping from 9px left (Rectangle 31) */}
              <div
                className="absolute top-0 bottom-0 right-0"
                style={{
                  left: "9px",
                  background: "#FFFFFF",
                  boxShadow: "0px 4px 5px rgba(0, 0, 0, 0.25)",
                  backdropFilter: "blur(20px)",
                  borderRadius: "0px 9px 9px 0px",
                }}
              />

              {/* Card content */}
              <div className="relative z-10 p-4" style={{ marginLeft: "9px" }}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3
                      style={{
                        fontFamily: "Inter",
                        fontWeight: 600,
                        fontSize: "18px",
                        lineHeight: "22px",
                        color: "rgba(0, 0, 0, 0.7)",
                      }}
                    >
                      {meeting.topic}
                    </h3>
                    <p
                      className="mt-1"
                      style={{
                        fontFamily: "Inter",
                        fontWeight: 400,
                        fontSize: "13px",
                        lineHeight: "16px",
                        color: "rgba(0, 0, 0, 0.54)",
                      }}
                    >
                      {meeting.start_time}
                    </p>
                    {meeting.start_time_sub && (
                      <p
                        style={{
                          fontFamily: "Inter",
                          fontWeight: 400,
                          fontSize: "11px",
                          lineHeight: "13px",
                          color: "rgba(0, 0, 0, 0.54)",
                        }}
                      >
                        {meeting.start_time_sub}
                      </p>
                    )}
                  </div>
                  <ChevronDown size={20} style={{ color: "rgba(0, 0, 0, 0.7)" }} />
                </div>

                {/* Attendee avatars pill */}
                <div className="mt-2">
                  <AttendeeAvatars color={meeting.tagColor || "#B18BB8"} />
                </div>

                {/* Bottom row: tag + icons */}
                <div className="flex items-center justify-between mt-2">
                  {meeting.tag && (
                    <span
                      style={{
                        fontFamily: "Inter",
                        fontWeight: 400,
                        fontSize: "13px",
                        lineHeight: "16px",
                        color: "rgba(0, 0, 0, 0.54)",
                        background: "#FFFFFF",
                        border: `1px solid ${meeting.tagColor || "#B18BB8"}`,
                        borderRadius: "60px",
                        padding: "3px 14px",
                      }}
                    >
                      {meeting.tag}
                    </span>
                  )}
                  <div className="flex items-center gap-2 ml-auto">
                    {/* Hang-up icon */}
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path d="M3.5 10.5C5.5 8 8.5 6.5 12 6.5s6.5 1.5 8.5 4l-2.5 2.5c-.5-.8-1.5-1.5-3-2v3h-6v-3c-1.5.5-2.5 1.2-3 2L3.5 10.5z" fill="rgba(179, 21, 23, 0.85)" />
                    </svg>
                    {/* Video icon */}
                    <Video size={22} style={{ color: "#2D62DA" }} fill="#2D62DA" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
