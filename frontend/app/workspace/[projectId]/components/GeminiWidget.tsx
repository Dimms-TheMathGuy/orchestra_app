"use client";

export default function GeminiWidget() {
  return (
    <div
      className="w-full overflow-hidden cursor-pointer hover:scale-[1.01] transition-transform"
      style={{
        background:
          "linear-gradient(256.37deg, rgba(231, 82, 96, 0.35) -2.82%, rgba(114, 189, 115, 0.15) 22.25%, rgba(23, 136, 255, 0.3) 64.03%)",
        opacity: 0.85,
        border: "1.5px solid rgba(255, 255, 255, 0.5)",
        boxShadow: "0px 4px 40px 1px rgba(0, 0, 0, 0.25)",
        backdropFilter: "blur(20px)",
        borderRadius: "17px",
        minHeight: "150px",
      }}
    >
      <div className="p-5 flex items-center gap-3">
        {/* Gemini multicolor sparkle icon */}
        <svg width="32" height="32" viewBox="0 0 28 28" fill="none">
          <path d="M14 0C14 7.732 7.732 14 0 14C7.732 14 14 20.268 14 28C14 20.268 20.268 14 28 14C20.268 14 14 7.732 14 0Z" fill="url(#gemini_grad)" />
          <defs>
            <linearGradient id="gemini_grad" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
              <stop stopColor="#4285F4" />
              <stop offset="0.33" stopColor="#9B72CB" />
              <stop offset="0.66" stopColor="#D96570" />
              <stop offset="1" stopColor="#D96570" />
            </linearGradient>
          </defs>
        </svg>
        <h3
          style={{
            fontFamily: "Inter",
            fontWeight: 700,
            fontSize: "20px",
            lineHeight: "24px",
            color: "rgba(0, 0, 0, 0.8)",
          }}
        >
          Gemini Assistant
        </h3>
      </div>
    </div>
  );
}
