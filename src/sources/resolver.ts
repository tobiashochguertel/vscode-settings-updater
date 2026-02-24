import { getGiteaBaseUrl } from '../config'

/**
 * Resolve a source URL shorthand or full URL to a raw file URL.
 *
 * Supported shorthands:
 *   github:owner/repo@branch/path/to/file
 *   codeberg:owner/repo@branch/path/to/file
 *   gitlab:owner/repo@branch/path/to/file
 *   gitea:owner/repo@branch/path/to/file  (requires settingsUpdater.giteaBaseUrl)
 *   https://...  (used as-is)
 */
export function resolveUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url

  const colonIdx = url.indexOf(':')
  if (colonIdx === -1) throw new Error(`Invalid source URL (missing host prefix): ${url}`)

  const host = url.slice(0, colonIdx)
  const rest = url.slice(colonIdx + 1)

  // Parse: owner/repo@branch/path
  const atIdx = rest.indexOf('@')
  if (atIdx === -1) throw new Error(`Invalid source URL (missing @branch): ${url}`)

  const repoPath = rest.slice(0, atIdx) // owner/repo
  const branchAndFile = rest.slice(atIdx + 1) // branch/path/to/file
  const slashIdx = branchAndFile.indexOf('/')
  if (slashIdx === -1)
    throw new Error(`Invalid source URL (missing file path after branch): ${url}`)

  const branch = branchAndFile.slice(0, slashIdx)
  const filePath = branchAndFile.slice(slashIdx + 1)
  const [owner, repo] = repoPath.split('/')

  switch (host) {
    case 'github':
      return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`
    case 'codeberg':
      return `https://codeberg.org/${owner}/${repo}/raw/branch/${branch}/${filePath}`
    case 'gitlab':
      return `https://gitlab.com/${owner}/${repo}/-/raw/${branch}/${filePath}`
    case 'gitea': {
      const base = getGiteaBaseUrl()
      if (!base) throw new Error('settingsUpdater.giteaBaseUrl must be set for gitea: URLs')
      return `${base}/${owner}/${repo}/raw/branch/${branch}/${filePath}`
    }
    default:
      throw new Error(
        `Unknown URL host shorthand: ${host}. Use github, codeberg, gitlab, gitea, or a full https:// URL.`,
      )
  }
}
