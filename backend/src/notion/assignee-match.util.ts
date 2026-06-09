/**
 * Decide whether a cached Notion task belongs to an Orchestra user.
 *
 * Notion only exposes an assignee's email when the integration has the
 * "read user information including email addresses" capability enabled, so we
 * match on email first and fall back to display name. Matching is
 * case-insensitive and trimmed to survive minor formatting differences between
 * the Orchestra account and the Notion person.
 */
export function userMatchesAssignee(
  task: { assigneeEmails: string[]; assigneeNames: string[] },
  user: { email?: string | null; name?: string | null },
): boolean {
  const email = user.email?.trim().toLowerCase();
  if (email && task.assigneeEmails.some((e) => e?.trim().toLowerCase() === email)) {
    return true;
  }

  const name = user.name?.trim().toLowerCase();
  if (name && task.assigneeNames.some((n) => n?.trim().toLowerCase() === name)) {
    return true;
  }

  return false;
}
