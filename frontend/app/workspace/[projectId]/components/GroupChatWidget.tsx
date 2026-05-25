"use client";

interface ChatMessage {
  id: string;
  sender: string;
  message: string;
  time: string;
}

const MOCK_MESSAGES: ChatMessage[] = [
  {
    id: "1",
    sender: "Ina Kusuma",
    message: "I have some technical difficulty with the prototype, could you fix the motions, Dina?",
    time: "08:45 PM",
  },
  {
    id: "2",
    sender: "Dinda Sali",
    message: "Sure, inform me which page you found problematic.",
    time: "Just now",
  },
];

export default function GroupChatWidget() {
  return (
    <div
      className="w-full"
      style={{
        background: "#EFEEF0",
        opacity: 0.85,
        border: "1.5px solid rgba(255, 255, 255, 0.5)",
        boxShadow: "0px 4px 40px 1px rgba(0, 0, 0, 0.25)",
        backdropFilter: "blur(20px)",
        borderRadius: "17px",
        padding: "14px 16px",
      }}
    >
      <h3
        style={{
          fontFamily: "Inter",
          fontWeight: 600,
          fontSize: "18px",
          lineHeight: "22px",
          color: "rgba(0, 0, 0, 0.7)",
          marginBottom: "12px",
        }}
      >
        Group Chat
      </h3>

      <div className="space-y-3 mb-3">
        {MOCK_MESSAGES.map((msg) => (
          <div key={msg.id} className="flex items-start gap-2.5">
            <div
              className="rounded-full bg-gradient-to-br from-orange-200 to-pink-200 flex-shrink-0 flex items-center justify-center text-white font-bold"
              style={{
                width: "36px",
                height: "36px",
                fontSize: "12px",
                boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.25)",
              }}
            >
              {msg.sender.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  style={{ fontFamily: "Inter", fontWeight: 700, fontSize: "9px", lineHeight: "11px", color: "#000000" }}
                >
                  {msg.sender}
                </span>
                <span
                  style={{ fontFamily: "Inter", fontWeight: 700, fontSize: "5px", lineHeight: "6px", color: "rgba(0, 0, 0, 0.65)" }}
                >
                  {msg.time}
                </span>
              </div>
              <p
                className="mt-0.5"
                style={{ fontFamily: "Inter", fontWeight: 700, fontSize: "7px", lineHeight: "8px", color: "rgba(0, 0, 0, 0.65)" }}
              >
                {msg.message}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          style={{
            background: "#F9F9F9",
            boxShadow: "0px 4px 10px -3px rgba(0, 0, 0, 0.25)",
            borderRadius: "15px",
            padding: "3px 10px",
            fontFamily: "Lato",
            fontWeight: 500,
            fontSize: "8px",
            lineHeight: "10px",
            color: "#49257E",
          }}
        >
          Enter chat
        </button>
      </div>
    </div>
  );
}
