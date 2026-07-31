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
 * - Set `canMerge: true` for members allowed to merge into the default branch. This is only a
 *   fallback: when the token has push access, the live GitHub collaborator lookup takes
 *   precedence and these flags are ignored.
 */
export const teamConfig: TeamConfig = {
  frontend: [
    { login: "J0ris-K", displayName: "Joris Kosacki" },
    { login: "MelissaFrncJrg", displayName: "Mélissa Franca" },
    { login: "OlivierFL", displayName: "Olivier Floch" },
    { login: "pdonias", displayName: "Pierre Donias" },
    { login: "UnelDev", displayName: "Énée Di Iorio" },
    { login: "Elise-FZI", displayName: "Elise Franzini" },
    { login: "sylvere-a", displayName: "Sylvère Armange" },
    { login: "sandrine-bd", displayName: "Sandrine Barrucand" },
    { login: "MarieGarde", displayName: "Marie Garde" },
    { login: "AlineD-2912", displayName: "Aline Dvornyk" },
    { login: "ByScripts", displayName: "Thierry" },
    { login: "amouillard-vates", displayName: "Alexandre" },
  ],
  backend: [
    { login: "b-Nollet", displayName: "Bastien Nollet" },
    { login: "fbeauchamp", displayName: "Florent Beauchamp" },
    { login: "MathieuRA", displayName: "Mathieu Raisin" },
    { login: "pierrebrunet289", displayName: "Pierre Brunet" },
    { login: "mpiton", displayName: "Mathieu Piton" },
    { login: "spacotte-vates", displayName: "Simon Pacotte" },
    { login: "All-Ki", displayName: "Killian Allegrain" },
    { login: "ayoub-el-kajji-v", displayName: "Ayoub El Kajji" },
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
