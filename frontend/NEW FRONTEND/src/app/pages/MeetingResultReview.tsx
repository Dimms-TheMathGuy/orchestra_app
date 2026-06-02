import { useState } from "react";
import { useParams } from "react-router";
import { Sidebar } from "../components/Sidebar";
import { mockMeetings } from "../data/mockData";
import { FileText, CheckCircle, Send } from "lucide-react";
import { toast } from "sonner";

export function MeetingResultReview() {
  const { projectId } = useParams();
  const meetings = mockMeetings.filter((m) => m.projectId === projectId);
  const [selectedMeeting, setSelectedMeeting] = useState(meetings[0] || null);
  const [selectedTranscriptParts, setSelectedTranscriptParts] = useState<string[]>([]);

  if (!selectedMeeting) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar isWorkspace />
        <div className="flex-1 p-8 flex items-center justify-center">
          <p className="text-gray-500">No meetings found for this project</p>
        </div>
      </div>
    );
  }

  const transcriptLines = selectedMeeting.transcriptVtt?.split("\n\n").filter((line) => line.trim()) || [];

  const toggleTranscriptSelection = (line: string) => {
    setSelectedTranscriptParts((prev) =>
      prev.includes(line) ? prev.filter((l) => l !== line) : [...prev, line]
    );
  };

  const handleTransferToNotion = () => {
    toast.success(`Transferred ${selectedTranscriptParts.length} items to Notion!`);
    setSelectedTranscriptParts([]);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar isWorkspace />
      <div className="flex-1 p-8">
        <h1 className="mb-8">Meeting Result Review</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white rounded-lg shadow-md p-6">
            <h2 className="mb-4">Meeting History</h2>
            <div className="space-y-2">
              {meetings.map((meeting) => (
                <button
                  key={meeting.id}
                  onClick={() => {
                    setSelectedMeeting(meeting);
                    setSelectedTranscriptParts([]);
                  }}
                  className={`w-full text-left p-4 rounded-lg border transition-colors ${
                    selectedMeeting.id === meeting.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-start gap-2 mb-2">
                    <FileText size={16} className="mt-1 flex-shrink-0" />
                    <h3 className="text-sm">{meeting.topic}</h3>
                  </div>
                  <p className="text-xs text-gray-500">
                    {meeting.createdAt.toLocaleDateString()}
                  </p>
                  <span className="inline-block mt-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                    {meeting.status}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="mb-4">AI Summary & Key Decisions</h2>
              <div className="prose max-w-none">
                <div className="p-4 bg-blue-50 rounded-lg mb-4">
                  <h3 className="text-sm mb-2">Summary</h3>
                  <div className="text-sm whitespace-pre-line">{selectedMeeting.aiSummary}</div>
                </div>
                {selectedMeeting.actionItems && (
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h3 className="text-sm mb-3">Action Items</h3>
                    <div className="space-y-2">
                      {(selectedMeeting.actionItems as any[]).map((item, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <CheckCircle size={16} className="text-green-600 mt-1 flex-shrink-0" />
                          <div className="text-sm">
                            <p className="mb-1">{item.task}</p>
                            <p className="text-xs text-gray-600">
                              Assigned to: {item.assignee} | Due: {item.deadline}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2>Transcript</h2>
                {selectedTranscriptParts.length > 0 && (
                  <button
                    onClick={handleTransferToNotion}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    <Send size={16} />
                    Transfer to Notion ({selectedTranscriptParts.length})
                  </button>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Click on transcript parts to select them for meeting notes
              </p>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {transcriptLines.map((line, index) => {
                  const isSelected = selectedTranscriptParts.includes(line);
                  return (
                    <button
                      key={index}
                      onClick={() => toggleTranscriptSelection(line)}
                      className={`w-full text-left p-4 rounded-lg border transition-all ${
                        isSelected
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <div className="text-sm whitespace-pre-line">{line}</div>
                      {isSelected && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-blue-600">
                          <CheckCircle size={14} />
                          Selected for meeting notes
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

