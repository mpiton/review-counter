import type { TeamConfig } from "../domain/types";

export type { TeamConfig, TeamMember } from "../domain/types";

// Login matching is case-insensitive in domain mapping; keep canonical GitHub spelling here.
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
