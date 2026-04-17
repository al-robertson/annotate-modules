/**
 * Modules configuration.
 *
 * MODULES_BASE_URL controls where the app fetches module content from.
 * Default: GitHub raw content from the annotate-modules repo (main branch).
 *
 * To use a different source (e.g. local dev, CDN, GitHub Pages), change this URL.
 * The URL must serve:
 *   - {base}/index.json              (module listing)
 *   - {base}/{moduleId}/module.json  (module config + lessons)
 *   - {base}/{moduleId}/files/{file} (source files for code view)
 */
export const MODULES_BASE_URL =
  import.meta.env.VITE_MODULES_BASE_URL ||
  "https://raw.githubusercontent.com/al-robertson/annotate-modules/main";
