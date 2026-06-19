/**
 * Single source of truth for the EVDx app version.
 *
 * Bump this in lockstep with:
 *   - package.json `version`
 *   - android/app/build.gradle `versionName` (and `versionCode`)
 *
 * Components that need to display the version (SettingsView, PDF report
 * generator, etc.) import from here instead of hardcoding a string — that
 * way the version shown to the user always matches the version reported by
 * Android's package manager.
 */
export const APP_VERSION = "1.5.3";

/**
 * Build identifier — bumped when we ship a new APK even if the semantic
 * version hasn't changed (e.g. pre-release builds).
 */
export const APP_BUILD = 'pre';
