import type { TeamConfig } from "../domain/types";

export type { TeamConfig, TeamMember } from "../domain/types";

const placeholderLoginPrefix = "replace-";

/**
 * Hardcoded team configuration used to map GitHub reviewer logins to Vates teams.
 *
 * @remarks
 * - Login matching is case-insensitive in domain mapping.
 * - Keep the canonical GitHub login spelling here.
 * - Replace placeholder members with real reviewers before production use.
 */
export const teamConfig: TeamConfig = {
  frontend: [
    { login: "replace-frontend-1", displayName: "Frontend reviewer 1" },
    { login: "replace-frontend-2", displayName: "Frontend reviewer 2" },
  ],
  backend: [
    { login: "replace-backend-1", displayName: "Backend reviewer 1" },
    { login: "replace-backend-2", displayName: "Backend reviewer 2" },
  ],
};

function hasPlaceholderTeamMembers(config: TeamConfig): boolean {
  return [...config.frontend, ...config.backend].some((member) =>
    member.login.startsWith(placeholderLoginPrefix),
  );
}

if (hasPlaceholderTeamMembers(teamConfig)) {
  console.warn(
    "[Vates Review Counter] teamConfig contains placeholder reviewers. Replace them with real GitHub logins before production use.",
  );
}
