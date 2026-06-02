export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  githubUsername?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  createdAt: Date;
  notionDbId?: string;
  status: "ongoing" | "completed";
  members: ProjectMember[];
}

export interface ProjectMember {
  id: string;
  userId: string;
  projectId: string;
  role: string;
  user: User;
}

export interface MeetingLog {
  id: string;
  projectId: string;
  zoomMeetingId: string;
  topic: string;
  recordingUrl?: string;
  transcriptVtt?: string;
  aiSummary?: string;
  actionItems?: any;
  status: string;
  createdAt: Date;
}

export interface GithubActivity {
  id: string;
  projectId: string;
  type: string;
  githubId?: string;
  title: string;
  description?: string;
  author: string;
  url: string;
  createdAt: Date;
}

export const mockUsers: User[] = [
  {
    id: "user-1",
    email: "john@example.com",
    name: "John Doe",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=John",
  },
  {
    id: "user-2",
    email: "sarah@example.com",
    name: "Sarah Smith",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
  },
  {
    id: "user-3",
    email: "mike@example.com",
    name: "Mike Johnson",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mike",
  },
];

export const mockProjects: Project[] = [
  {
    id: "project-1",
    name: "E-commerce Platform",
    description: "Building a modern e-commerce platform with React and Node.js",
    ownerId: "user-1",
    createdAt: new Date("2026-01-15"),
    notionDbId: "notion-db-1",
    status: "ongoing",
    members: [
      {
        id: "member-1",
        userId: "user-1",
        projectId: "project-1",
        role: "Team Leader",
        user: mockUsers[0],
      },
      {
        id: "member-2",
        userId: "user-2",
        projectId: "project-1",
        role: "Developer",
        user: mockUsers[1],
      },
    ],
  },
  {
    id: "project-2",
    name: "Mobile App Redesign",
    description: "Redesigning the mobile app UI/UX",
    ownerId: "user-1",
    createdAt: new Date("2025-11-20"),
    status: "completed",
    members: [
      {
        id: "member-3",
        userId: "user-1",
        projectId: "project-2",
        role: "Team Leader",
        user: mockUsers[0],
      },
      {
        id: "member-4",
        userId: "user-3",
        projectId: "project-2",
        role: "Designer",
        user: mockUsers[2],
      },
    ],
  },
  {
    id: "project-3",
    name: "API Integration",
    description: "Integrating third-party APIs for payment processing",
    ownerId: "user-2",
    createdAt: new Date("2026-03-10"),
    status: "ongoing",
    members: [
      {
        id: "member-5",
        userId: "user-2",
        projectId: "project-3",
        role: "Team Leader",
        user: mockUsers[1],
      },
      {
        id: "member-6",
        userId: "user-1",
        projectId: "project-3",
        role: "Developer",
        user: mockUsers[0],
      },
    ],
  },
];

export const mockMeetings: MeetingLog[] = [
  {
    id: "meeting-1",
    projectId: "project-1",
    zoomMeetingId: "zoom-123",
    topic: "Sprint Planning - Q2 2026",
    recordingUrl: "https://example.com/recording1",
    transcriptVtt: `00:00:00.000 --> 00:00:05.000
John Doe: Good morning everyone. Let's start with our sprint planning.

00:00:05.000 --> 00:00:15.000
Sarah Smith: I've completed the user authentication module. We should review it today.

00:00:15.000 --> 00:00:25.000
John Doe: Great work! Let's prioritize the payment integration next.

00:00:25.000 --> 00:00:35.000
Sarah Smith: Agreed. I'll need access to the Stripe API documentation.

00:00:35.000 --> 00:00:45.000
John Doe: I'll share that right after this meeting. Any blockers?`,
    aiSummary: `**Meeting Summary:**
- Reviewed completed user authentication module
- Decided to prioritize payment integration using Stripe
- Team leader to share API documentation post-meeting
- No major blockers reported`,
    actionItems: [
      { task: "Review authentication module", assignee: "John Doe", deadline: "2026-06-05" },
      { task: "Share Stripe API docs", assignee: "John Doe", deadline: "2026-06-02" },
      { task: "Start payment integration", assignee: "Sarah Smith", deadline: "2026-06-10" },
    ],
    status: "completed",
    createdAt: new Date("2026-06-01"),
  },
  {
    id: "meeting-2",
    projectId: "project-1",
    zoomMeetingId: "zoom-456",
    topic: "Design Review Session",
    recordingUrl: "https://example.com/recording2",
    transcriptVtt: `00:00:00.000 --> 00:00:10.000
John Doe: Today we'll review the new checkout flow designs.

00:00:10.000 --> 00:00:20.000
Sarah Smith: I've noticed the mobile view needs some adjustments.

00:00:20.000 --> 00:00:30.000
John Doe: Good catch. Let's make sure it's responsive across all devices.`,
    aiSummary: `**Meeting Summary:**
- Reviewed checkout flow designs
- Identified mobile responsiveness issues
- Agreed to implement responsive design improvements`,
    actionItems: [
      { task: "Fix mobile checkout view", assignee: "Sarah Smith", deadline: "2026-05-28" },
      { task: "Test on multiple devices", assignee: "Mike Johnson", deadline: "2026-05-30" },
    ],
    status: "completed",
    createdAt: new Date("2026-05-25"),
  },
];

export const mockGithubActivities: GithubActivity[] = [
  {
    id: "activity-1",
    projectId: "project-1",
    type: "commit",
    githubId: "abc123",
    title: "Add user authentication",
    description: "Implemented JWT-based authentication",
    author: "johndoe",
    url: "https://github.com/example/repo/commit/abc123",
    createdAt: new Date("2026-05-30"),
  },
  {
    id: "activity-2",
    projectId: "project-1",
    type: "pr",
    githubId: "42",
    title: "Feature: Payment integration",
    description: "Added Stripe payment processing",
    author: "sarahsmith",
    url: "https://github.com/example/repo/pull/42",
    createdAt: new Date("2026-05-29"),
  },
  {
    id: "activity-3",
    projectId: "project-1",
    type: "merge",
    githubId: "41",
    title: "Merged: Fix checkout bug",
    description: "Fixed critical checkout flow issue",
    author: "johndoe",
    url: "https://github.com/example/repo/pull/41",
    createdAt: new Date("2026-05-28"),
  },
];
