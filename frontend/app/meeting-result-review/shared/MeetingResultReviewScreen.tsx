"use client";

import type { CSSProperties, ReactNode } from "react";
import { useDeferredValue, useEffect, useState } from "react";

type ThemeMode = "light" | "dark";

type MeetingReviewResponse = {
  project: {
    id: string;
    name: string;
    description: string | null;
    createdAt: string;
    owner: {
      id: string;
      name: string;
      email: string;
      initials: string;
    };
    members: Array<{
      id: string;
      role: string;
      joinedAt: string;
      user: {
        id: string;
        name: string;
        email: string;
        avatarUrl: string | null;
        initials: string;
      };
    }>;
    repositories: Array<{
      id: string;
      githubOwner: string;
      githubRepo: string;
      githubUrl: string;
      label: string;
    }>;
  };
  sections: {
    topNav: Array<{
      id: string;
      label: string;
      meta: string;
    }>;
    sideNav: Array<{
      id: string;
      label: string;
      active?: boolean;
    }>;
  };
  history: Array<{
    id: string;
    label: string;
    dayLabel: string;
    isActive: boolean;
  }>;
  review: {
    breadcrumb: string[];
    title: string;
    aiSummary: string;
    keyDecisions: string[];
    transcript: {
      title: string;
      searchPlaceholder: string;
      messages: Array<{
        id: string;
        speaker: string;
        role: string;
        timestamp: string | null;
        text: string;
        initials: string;
        avatarUrl: string | null;
      }>;
    };
    drafts: {
      title: string;
      badge: string;
      items: Array<{
        id: string;
        status: string;
        templateLabel: string;
        entryCount: number;
        fields: Array<{
          label: string;
          value: string;
        }>;
      }>;
    };
  };
};

type MeetingResultReviewScreenProps = {
  mode: ThemeMode;
  projectId: string;
};

type ThemeTokens = {
  pageBg: string;
  shellBg: string;
  shellBorder: string;
  sidebarBg: string;
  transcriptBg: string;
  panelBg: string;
  panelAltBg: string;
  textStrong: string;
  textBody: string;
  textMuted: string;
  accent: string;
  accentSoft: string;
  accentGlow: string;
  divider: string;
  historyActiveBg: string;
  historyHoverBg: string;
  inputBg: string;
  successBg: string;
  successText: string;
  shadow: string;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

const DEFAULT_SIDE_NAV = [
  { id: "dashboard", label: "Dashboard" },
  { id: "projects", label: "Projects" },
  { id: "sessions", label: "Sessions", active: true },
  { id: "integrations", label: "Integrations" },
  { id: "settings", label: "Settings" },
] as const;

const THEME_TOKENS: Record<ThemeMode, ThemeTokens> = {
  light: {
    pageBg: "#eef2fb",
    shellBg: "#f8f9ff",
    shellBorder: "rgba(45, 58, 107, 0.12)",
    sidebarBg: "#ffffff",
    transcriptBg: "#ffffff",
    panelBg: "#eef1fb",
    panelAltBg: "#ffffff",
    textStrong: "#29304c",
    textBody: "#4e5676",
    textMuted: "#8a90aa",
    accent: "#4d63d8",
    accentSoft: "rgba(77, 99, 216, 0.12)",
    accentGlow: "rgba(77, 99, 216, 0.2)",
    divider: "rgba(77, 99, 216, 0.1)",
    historyActiveBg: "#ebefff",
    historyHoverBg: "#f1f4ff",
    inputBg: "#f4f6fb",
    successBg: "#edf8ef",
    successText: "#4f8f61",
    shadow: "0 38px 80px rgba(42, 52, 91, 0.12)",
  },
  dark: {
    pageBg: "#070b16",
    shellBg: "#0b1020",
    shellBorder: "rgba(121, 91, 215, 0.18)",
    sidebarBg: "#090d1b",
    transcriptBg: "#0a0e1d",
    panelBg: "#13182a",
    panelAltBg: "#101525",
    textStrong: "#f6f7fb",
    textBody: "#b8bfd9",
    textMuted: "#7e86a7",
    accent: "#6e41d8",
    accentSoft: "rgba(110, 65, 216, 0.22)",
    accentGlow: "rgba(110, 65, 216, 0.28)",
    divider: "rgba(255, 255, 255, 0.08)",
    historyActiveBg: "#171d31",
    historyHoverBg: "#111729",
    inputBg: "#14192b",
    successBg: "rgba(102, 211, 153, 0.12)",
    successText: "#9ee6bc",
    shadow: "0 42px 90px rgba(0, 0, 0, 0.48)",
  },
};

export default function MeetingResultReviewScreen({
  mode,
  projectId,
}: MeetingResultReviewScreenProps) {
  const [data, setData] = useState<MeetingReviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionSearch, setSessionSearch] = useState("");
  const [transcriptSearch, setTranscriptSearch] = useState("");

  const deferredSessionSearch = useDeferredValue(sessionSearch);
  const deferredTranscriptSearch = useDeferredValue(transcriptSearch);
  const theme = THEME_TOKENS[mode];

  useEffect(() => {
    let active = true;

    async function loadMeetingReview() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${API_BASE_URL}/meeting-review/${encodeURIComponent(projectId)}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload = (await response.json()) as MeetingReviewResponse;

        if (active) {
          setData(payload);
        }
      } catch (requestError) {
        if (active) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load meeting review data.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadMeetingReview();

    return () => {
      active = false;
    };
  }, [projectId]);

  const filteredHistory = data
    ? data.history.filter((item) =>
        item.label
          .toLowerCase()
          .includes(deferredSessionSearch.trim().toLowerCase()),
      )
    : [];

  const filteredTranscript = data
    ? data.review.transcript.messages.filter((message) => {
        const query = deferredTranscriptSearch.trim().toLowerCase();
        if (!query) {
          return true;
        }

        return (
          message.speaker.toLowerCase().includes(query) ||
          message.text.toLowerCase().includes(query)
        );
      })
    : [];

  return (
    <div
      className="min-h-screen overflow-hidden bg-[var(--page-bg)] font-[family:var(--font-geist-sans)] text-[var(--text-strong)]"
      style={
        {
          "--page-bg": theme.pageBg,
          "--shell-bg": theme.shellBg,
          "--shell-border": theme.shellBorder,
          "--sidebar-bg": theme.sidebarBg,
          "--transcript-bg": theme.transcriptBg,
          "--panel-bg": theme.panelBg,
          "--panel-alt-bg": theme.panelAltBg,
          "--text-strong": theme.textStrong,
          "--text-body": theme.textBody,
          "--text-muted": theme.textMuted,
          "--accent": theme.accent,
          "--accent-soft": theme.accentSoft,
          "--accent-glow": theme.accentGlow,
          "--divider": theme.divider,
          "--history-active-bg": theme.historyActiveBg,
          "--history-hover-bg": theme.historyHoverBg,
          "--input-bg": theme.inputBg,
          "--success-bg": theme.successBg,
          "--success-text": theme.successText,
          "--shadow": theme.shadow,
        } as CSSProperties
      }
    >
      <div className="relative isolate min-h-screen px-4 py-5 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute left-[-8%] top-[-8%] h-72 w-72 rounded-full bg-[radial-gradient(circle_at_center,var(--accent-glow),transparent_72%)] blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-10%] right-[-4%] h-80 w-80 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.18),transparent_68%)] blur-3xl" />

        <div
          className="relative mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-[1720px] overflow-hidden rounded-[2rem] border border-[color:var(--shell-border)] bg-[var(--shell-bg)]"
          style={{ boxShadow: "var(--shadow)" }}
        >
          <aside className="w-full border-b border-[color:var(--divider)] bg-[var(--sidebar-bg)] xl:w-[230px] xl:flex-none xl:border-b-0 xl:border-r xl:border-[color:var(--divider)]">
            <div className="flex h-full flex-col p-4 sm:p-5">
              <div className="flex items-center gap-3 border-b border-[color:var(--divider)] pb-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)] text-sm font-semibold text-white shadow-[0_12px_30px_var(--accent-glow)]">
                  UI
                </div>
                <div>
                  <p className="text-[1.05rem] font-semibold tracking-tight text-[var(--text-strong)]">
                    ORCHESTRA
                  </p>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">
                    Project Sync
                  </p>
                </div>
              </div>

              <button className="mt-5 inline-flex items-center justify-center rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_32px_var(--accent-glow)] transition-transform hover:-translate-y-0.5">
                + New Session
              </button>

              <nav className="mt-5 space-y-1.5">
                {(data?.sections.sideNav ?? DEFAULT_SIDE_NAV).map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors ${
                      item.active
                        ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                        : "text-[var(--text-body)] hover:bg-[var(--history-hover-bg)]"
                    }`}
                  >
                    <NavGlyph name={item.id} active={Boolean(item.active)} />
                    <span>{item.label}</span>
                  </div>
                ))}
              </nav>

              <div className="mt-8 flex-1">
                <div className="flex items-center justify-between border-t border-[color:var(--divider)] pt-5">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.26em] text-[var(--text-muted)]">
                    History
                  </p>
                </div>

                <div className="mt-4 rounded-2xl bg-[var(--input-bg)] px-3 py-2.5">
                  <div className="flex items-center gap-2.5 text-[var(--text-muted)]">
                    <SearchGlyph />
                    <input
                      value={sessionSearch}
                      onChange={(event) => setSessionSearch(event.target.value)}
                      placeholder="Search sessions..."
                      className="w-full bg-transparent text-sm text-[var(--text-strong)] outline-none placeholder:text-[var(--text-muted)]"
                    />
                  </div>
                </div>

                <div className="mt-4 space-y-5">
                  {loading ? (
                    <HistorySkeleton />
                  ) : (
                    renderHistoryGroups(filteredHistory)
                  )}
                </div>
              </div>
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="border-b border-[color:var(--divider)] px-4 py-4 sm:px-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex w-full max-w-xl items-center gap-3 rounded-2xl bg-[var(--input-bg)] px-4 py-3">
                  <SearchGlyph />
                  <input
                    value={sessionSearch}
                    onChange={(event) => setSessionSearch(event.target.value)}
                    placeholder="Search sessions..."
                    className="w-full bg-transparent text-sm text-[var(--text-strong)] outline-none placeholder:text-[var(--text-muted)]"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {data?.sections.topNav.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-full border border-[color:var(--divider)] bg-[var(--panel-alt-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--text-body)]"
                    >
                      {item.label}
                      <span className="ml-2 text-[var(--text-muted)]">
                        {item.meta}
                      </span>
                    </div>
                  ))}

                  <button className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white shadow-[0_14px_32px_var(--accent-glow)]">
                    Share Workspace
                  </button>

                  <div className="hidden items-center gap-2 sm:flex">
                    <IconBubble>
                      <BellGlyph />
                    </IconBubble>
                    <IconBubble>
                      <HelpGlyph />
                    </IconBubble>
                  </div>

                  <Avatar
                    name={data?.project.owner.name ?? "Owner"}
                    initials={data?.project.owner.initials ?? "OR"}
                    avatarUrl={null}
                    size="sm"
                  />
                </div>
              </div>
            </header>

            <div className="grid min-h-0 flex-1 xl:grid-cols-[minmax(0,1.68fr)_360px]">
              <main className="min-w-0 border-b border-[color:var(--divider)] xl:border-b-0 xl:border-r xl:border-[color:var(--divider)]">
                <div className="h-full overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
                  {loading ? (
                    <ReviewSkeleton />
                  ) : error ? (
                    <InlineState
                      title="Meeting review unavailable"
                      message={error}
                    />
                  ) : data ? (
                    <>
                      <div className="flex flex-wrap items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-[var(--text-muted)]">
                        {data.review.breadcrumb.map((crumb, index) => (
                          <span key={`${crumb}-${index}`} className="flex items-center gap-2">
                            {index > 0 ? <span className="text-[var(--text-muted)]">/</span> : null}
                            {crumb}
                          </span>
                        ))}
                      </div>

                      <h1 className="mt-4 max-w-4xl text-3xl font-semibold tracking-tight text-[var(--text-strong)] sm:text-[2.55rem]">
                        {data.review.title}
                      </h1>

                      <section className="mt-8 rounded-[1.75rem] border border-[color:var(--divider)] bg-[var(--panel-bg)] p-6">
                        <SectionEyebrow
                          icon={<SparkleGlyph />}
                          label="AI Summary"
                        />
                        <p className="mt-5 max-w-3xl text-[0.98rem] leading-8 text-[var(--text-body)]">
                          {data.review.aiSummary}
                        </p>
                      </section>

                      <section className="mt-5 rounded-[1.75rem] border border-[color:var(--divider)] bg-[var(--panel-bg)] p-6">
                        <SectionEyebrow
                          icon={<DecisionsGlyph />}
                          label="Key Decisions"
                        />
                        <div className="mt-5 space-y-4">
                          {data.review.keyDecisions.map((decision, index) => (
                            <div key={`${decision}-${index}`} className="flex items-start gap-3">
                              <div className="mt-1 h-5 w-5 flex-none rounded-full border border-[color:var(--divider)] bg-[var(--panel-alt-bg)] p-1 text-[var(--accent)]">
                                <CheckGlyph />
                              </div>
                              <p className="text-[0.96rem] leading-7 text-[var(--text-body)]">
                                {decision}
                              </p>
                            </div>
                          ))}
                        </div>
                      </section>

                      <section className="mt-8">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <SectionHeader
                            icon={<DatabaseGlyph />}
                            title={data.review.drafts.title}
                          />
                          <span className="rounded-full border border-[color:var(--divider)] bg-[var(--panel-alt-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--text-muted)]">
                            {data.review.drafts.badge}
                          </span>
                        </div>

                        <div className="mt-5 space-y-4">
                          {data.review.drafts.items.map((draft) => {
                            const pending =
                              draft.status === "pending" || draft.status === "linked";

                            return (
                              <article
                                key={draft.id}
                                className="rounded-[1.5rem] border border-[color:var(--divider)] bg-[var(--panel-alt-bg)] p-5"
                              >
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                  <div>
                                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
                                      Notion Template
                                    </p>
                                    <h3 className="mt-2 text-lg font-semibold text-[var(--text-strong)]">
                                      {draft.templateLabel}
                                    </h3>
                                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                                      {draft.entryCount} draft{" "}
                                      {draft.entryCount === 1 ? "entry" : "entries"}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-3">
                                    <span
                                      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                                        pending
                                          ? "bg-[var(--success-bg)] text-[var(--success-text)]"
                                          : "bg-[var(--accent-soft)] text-[var(--accent)]"
                                      }`}
                                    >
                                      {pending ? "Ready to Sync" : toTitleCase(draft.status)}
                                    </span>

                                    <button className="flex items-center gap-2 rounded-full border border-[color:var(--divider)] bg-[var(--input-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--text-body)]">
                                      <span
                                        className={`h-4 w-7 rounded-full p-0.5 ${
                                          pending
                                            ? "bg-[var(--accent)]"
                                            : "bg-[color:var(--divider)]"
                                        }`}
                                      >
                                        <span
                                          className={`block h-3 w-3 rounded-full bg-white transition-transform ${
                                            pending ? "translate-x-3" : "translate-x-0"
                                          }`}
                                        />
                                      </span>
                                      Sync
                                    </button>
                                  </div>
                                </div>

                                <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                  {draft.fields.map((field) => (
                                    <div
                                      key={`${draft.id}-${field.label}`}
                                      className="rounded-2xl border border-[color:var(--divider)] bg-[var(--panel-bg)] px-4 py-3"
                                    >
                                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                                        {field.label}
                                      </p>
                                      <p className="mt-2 text-sm font-medium text-[var(--text-strong)]">
                                        {field.value}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      </section>
                    </>
                  ) : (
                    <InlineState
                      title="No meeting review loaded"
                      message="The backend did not return any Meeting Result Review payload."
                    />
                  )}
                </div>
              </main>

              <aside className="flex min-h-0 min-w-0 flex-col bg-[var(--transcript-bg)]">
                <div className="flex items-center justify-between border-b border-[color:var(--divider)] px-4 py-5 sm:px-5">
                  <h2 className="text-[0.78rem] font-semibold uppercase tracking-[0.24em] text-[var(--text-strong)]">
                    Transcript
                  </h2>
                  <IconBubble compact>
                    <MenuGlyph />
                  </IconBubble>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
                  {loading ? (
                    <TranscriptSkeleton />
                  ) : error ? (
                    <div className="rounded-[1.4rem] border border-[color:var(--divider)] bg-[var(--panel-alt-bg)] p-5 text-sm leading-7 text-[var(--text-body)]">
                      Transcript could not be loaded because the review request failed.
                    </div>
                  ) : (
                    <div className="space-y-7">
                      {filteredTranscript.map((message) => (
                        <article key={message.id} className="flex gap-3">
                          <Avatar
                            name={message.speaker}
                            initials={message.initials}
                            avatarUrl={message.avatarUrl}
                            size="md"
                          />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                              <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--text-strong)]">
                                {message.speaker}
                              </h3>
                              <span className="text-[0.68rem] font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">
                                {message.timestamp
                                  ? formatTranscriptTime(message.timestamp)
                                  : message.role}
                              </span>
                            </div>
                            <p className="mt-2 text-[0.98rem] leading-8 text-[var(--text-body)]">
                              {message.text}
                            </p>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-[color:var(--divider)] px-4 py-4 sm:px-5">
                  <div className="flex items-center gap-3 rounded-2xl bg-[var(--input-bg)] px-4 py-3">
                    <SearchGlyph />
                    <input
                      value={transcriptSearch}
                      onChange={(event) =>
                        setTranscriptSearch(event.target.value)
                      }
                      placeholder={
                        data?.review.transcript.searchPlaceholder ??
                        "Search transcript..."
                      }
                      className="w-full bg-transparent text-sm text-[var(--text-strong)] outline-none placeholder:text-[var(--text-muted)]"
                    />
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function renderHistoryGroups(
  items: MeetingReviewResponse["history"],
) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-[color:var(--divider)] bg-[var(--panel-alt-bg)] px-4 py-3 text-sm text-[var(--text-muted)]">
        No sessions match this search.
      </div>
    );
  }

  const groups = items.reduce<Record<string, typeof items>>((collection, item) => {
    collection[item.dayLabel] = collection[item.dayLabel]
      ? [...collection[item.dayLabel], item]
      : [item];
    return collection;
  }, {});

  return Object.entries(groups).map(([label, groupedItems]) => (
    <div key={label}>
      <p className="mb-2 text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">
        {label}
      </p>
      <div className="space-y-1">
        {groupedItems.map((item) => (
          <div
            key={item.id}
            className={`rounded-xl px-3 py-2.5 text-sm transition-colors ${
              item.isActive
                ? "bg-[var(--history-active-bg)] text-[var(--accent)]"
                : "text-[var(--text-body)] hover:bg-[var(--history-hover-bg)]"
            }`}
          >
            {item.label}
          </div>
        ))}
      </div>
    </div>
  ));
}

function SectionEyebrow({
  icon,
  label,
}: {
  icon: ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2.5 text-[0.76rem] font-semibold uppercase tracking-[0.22em] text-[var(--text-strong)]">
      <span className="text-[var(--accent)]">{icon}</span>
      <span>{label}</span>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
}: {
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2.5 text-[0.76rem] font-semibold uppercase tracking-[0.24em] text-[var(--text-strong)]">
      <span className="text-[var(--accent)]">{icon}</span>
      <span>{title}</span>
    </div>
  );
}

function InlineState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="rounded-[1.7rem] border border-[color:var(--divider)] bg-[var(--panel-bg)] p-6">
      <h2 className="text-xl font-semibold text-[var(--text-strong)]">{title}</h2>
      <p className="mt-3 max-w-2xl text-[0.98rem] leading-8 text-[var(--text-body)]">
        {message}
      </p>
    </div>
  );
}

function ReviewSkeleton() {
  return (
    <div className="space-y-5">
      <div className="h-4 w-40 rounded-full bg-[var(--panel-bg)]" />
      <div className="h-12 w-3/4 rounded-full bg-[var(--panel-bg)]" />
      <div className="h-48 rounded-[1.75rem] bg-[var(--panel-bg)]" />
      <div className="h-64 rounded-[1.75rem] bg-[var(--panel-bg)]" />
      <div className="h-56 rounded-[1.75rem] bg-[var(--panel-bg)]" />
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="space-y-5">
      {Array.from({ length: 2 }).map((_, groupIndex) => (
        <div key={`history-group-${groupIndex}`}>
          <div className="mb-2 h-3 w-14 rounded-full bg-[var(--panel-bg)]" />
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((__, itemIndex) => (
              <div
                key={`history-item-${groupIndex}-${itemIndex}`}
                className="h-10 rounded-xl bg-[var(--panel-bg)]"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TranscriptSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={`skeleton-${index}`} className="flex gap-3">
          <div className="h-11 w-11 rounded-full bg-[var(--panel-bg)]" />
          <div className="flex-1 space-y-3">
            <div className="h-3 w-32 rounded-full bg-[var(--panel-bg)]" />
            <div className="h-16 rounded-3xl bg-[var(--panel-bg)]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function Avatar({
  name,
  initials,
  avatarUrl,
  size,
}: {
  name: string;
  initials: string;
  avatarUrl: string | null;
  size: "sm" | "md";
}) {
  const sizes =
    size === "sm"
      ? "h-10 w-10 text-xs"
      : "h-11 w-11 text-sm";

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`${sizes} rounded-full object-cover ring-1 ring-[color:var(--divider)]`}
      />
    );
  }

  return (
    <div
      className={`${sizes} flex items-center justify-center rounded-full bg-[var(--accent-soft)] font-semibold text-[var(--accent)] ring-1 ring-[color:var(--divider)]`}
    >
      {initials}
    </div>
  );
}

function IconBubble({
  children,
  compact = false,
}: {
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-center rounded-full border border-[color:var(--divider)] bg-[var(--panel-alt-bg)] text-[var(--text-body)] ${
        compact ? "h-9 w-9" : "h-10 w-10"
      }`}
    >
      {children}
    </div>
  );
}

function NavGlyph({
  name,
  active,
}: {
  name: string;
  active: boolean;
}) {
  const className = active ? "text-[var(--accent)]" : "text-[var(--text-muted)]";

  switch (name) {
    case "dashboard":
      return (
        <svg viewBox="0 0 24 24" className={`h-4 w-4 ${className}`} fill="none">
          <path d="M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z" fill="currentColor" />
        </svg>
      );
    case "projects":
      return (
        <svg viewBox="0 0 24 24" className={`h-4 w-4 ${className}`} fill="none">
          <path d="M4 6h7v12H4zM13 10h7v8h-7zM13 6h7v2h-7z" fill="currentColor" />
        </svg>
      );
    case "sessions":
      return (
        <svg viewBox="0 0 24 24" className={`h-4 w-4 ${className}`} fill="none">
          <path d="M12 4a8 8 0 108 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 8v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "integrations":
      return (
        <svg viewBox="0 0 24 24" className={`h-4 w-4 ${className}`} fill="none">
          <path d="M8 6h12M4 12h12M8 18h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="6" cy="6" r="2" fill="currentColor" />
          <circle cx="18" cy="12" r="2" fill="currentColor" />
          <circle cx="6" cy="18" r="2" fill="currentColor" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className={`h-4 w-4 ${className}`} fill="none">
          <path d="M12 8a4 4 0 100 8 4 4 0 000-8zm0-4v2m0 12v2m8-8h-2M6 12H4m11.3 5.3l-1.4-1.4M8.1 8.1 6.7 6.7m8.6 0-1.4 1.4m-5.8 7.8-1.4 1.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
  }
}

function SearchGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 flex-none text-[var(--text-muted)]"
      fill="none"
    >
      <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.8" />
      <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SparkleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
      <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3zm6 10 1 2.8 2.8 1L19 18l-1 2.8-1-2.8-2.8-1 2.8-1L18 13zM6 14l.8 2.2L9 17l-2.2.8L6 20l-.8-2.2L3 17l2.2-.8L6 14z" fill="currentColor" />
    </svg>
  );
}

function DecisionsGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
      <path d="M6 5h12M6 9h12M6 13h8M6 17h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="m16 15 2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DatabaseGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
      <ellipse cx="12" cy="6" rx="6.5" ry="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5.5 6v6c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5V6M5.5 12v6c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5v-6" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function CheckGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" fill="none">
      <path d="m7 12.5 3 3 7-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BellGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
      <path d="M7 10a5 5 0 1110 0v4l1.5 2h-13L7 14v-4zM10 18a2 2 0 004 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HelpGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9.6 9.3a2.6 2.6 0 015-0.5c0 2.1-2.6 2.4-2.6 4.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="17.2" r="1" fill="currentColor" />
    </svg>
  );
}

function MenuGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
      <circle cx="12" cy="5" r="1.8" fill="currentColor" />
      <circle cx="12" cy="12" r="1.8" fill="currentColor" />
      <circle cx="12" cy="19" r="1.8" fill="currentColor" />
    </svg>
  );
}

function formatTranscriptTime(value: string) {
  if (value.includes("AM") || value.includes("PM")) {
    return value;
  }

  return value.replace(".000", "").trim();
}

function toTitleCase(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
