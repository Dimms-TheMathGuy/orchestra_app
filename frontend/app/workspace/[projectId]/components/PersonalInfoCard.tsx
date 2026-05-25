"use client";

interface PersonalInfoProps {
  name: string;
  role: string;
  email: string;
  company: string;
  division: string;
  avatarUrl?: string;
}

export default function PersonalInfoCard({
  name,
  role,
  email,
  company,
  division,
  avatarUrl,
}: PersonalInfoProps) {
  return (
    <div
      className="w-full"
      style={{
        background:
          "linear-gradient(117.18deg, rgba(219, 255, 246, 0.9) -2.39%, rgba(240, 240, 240, 0.09) 100%)",
        border: "1.5px solid rgba(255, 255, 255, 0.5)",
        boxShadow: "0px 4px 20px -1px rgba(0, 0, 0, 0.25)",
        backdropFilter: "blur(25px)",
        borderRadius: "17px",
        padding: "20px",
      }}
    >
      <div className="flex items-center gap-4">
        <div
          className="rounded-full overflow-hidden flex-shrink-0"
          style={{
            width: "80px",
            height: "80px",
            boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.25)",
          }}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-300 to-orange-200 flex items-center justify-center text-white font-bold text-2xl">
              {name.charAt(0)}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <h2
            className="truncate"
            style={{ fontFamily: "Inter", fontWeight: 700, fontSize: "20px", lineHeight: "24px", color: "#000000" }}
          >
            {name}
          </h2>
          <p
            className="truncate"
            style={{ fontFamily: "Inter", fontWeight: 700, fontSize: "14px", lineHeight: "17px", color: "rgba(0, 0, 0, 0.65)" }}
          >
            {role}
          </p>
          <p
            className="truncate"
            style={{ fontFamily: "Inter", fontWeight: 400, fontSize: "13px", lineHeight: "16px", color: "#958E8E" }}
          >
            {email}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <p style={{ fontFamily: "Inter", fontWeight: 700, fontSize: "18px", lineHeight: "22px", color: "rgba(0, 0, 0, 0.54)" }}>
          {company}
        </p>
        <p style={{ fontFamily: "Inter", fontWeight: 700, fontSize: "13px", lineHeight: "16px", color: "rgba(0, 0, 0, 0.57)" }}>
          {division}
        </p>
      </div>
    </div>
  );
}
