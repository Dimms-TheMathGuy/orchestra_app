"use client";

export interface Member {
  id: string;
  name: string;
  role: string;
  email: string;
  avatarUrl?: string;
}

interface ProjectMembersListProps {
  members: Member[];
}

export default function ProjectMembersList({ members }: ProjectMembersListProps) {
  return (
    <div
      className="w-full flex-1 overflow-hidden flex flex-col"
      style={{
        background:
          "linear-gradient(118.3deg, rgba(255, 244, 229, 0.9) -41.98%, rgba(240, 240, 240, 0.09) 100%)",
        border: "1.5px solid rgba(255, 255, 255, 0.5)",
        boxShadow: "0px 4px 20px -1px rgba(0, 0, 0, 0.25)",
        backdropFilter: "blur(20px)",
        borderRadius: "17px",
        padding: "20px 20px 10px",
      }}
    >
      <h2
        className="text-center mb-5"
        style={{ fontFamily: "Inter", fontWeight: 700, fontSize: "30px", lineHeight: "36px", color: "#000000" }}
      >
        Project Members
      </h2>

      <div className="flex-1 overflow-y-auto pr-1 -mr-1">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center gap-4 rounded-lg hover:bg-black/[0.03] transition-colors px-2"
            style={{ height: "100px" }}
          >
            <div
              className="rounded-full overflow-hidden flex-shrink-0"
              style={{
                width: "80px",
                height: "80px",
                boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.25)",
              }}
            >
              {member.avatarUrl ? (
                <img
                  src={member.avatarUrl}
                  alt={member.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-orange-200 to-pink-200 flex items-center justify-center text-white font-bold text-xl">
                  {member.name.charAt(0)}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p
                className="truncate"
                style={{ fontFamily: "Inter", fontWeight: 700, fontSize: "20px", lineHeight: "24px", color: "#000000" }}
              >
                {member.name}
              </p>
              <p
                className="truncate"
                style={{ fontFamily: "Inter", fontWeight: 700, fontSize: "14px", lineHeight: "17px", color: "rgba(0, 0, 0, 0.65)" }}
              >
                {member.role}
              </p>
              <p
                className="truncate"
                style={{ fontFamily: "Inter", fontWeight: 400, fontSize: "13px", lineHeight: "16px", color: "#958E8E" }}
              >
                {member.email}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
