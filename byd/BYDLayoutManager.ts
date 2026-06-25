/**
 * EVDx — BYD Landscape Layout Adapter
 *
 * BYD head units have landscape screens (typically 1920×720 or 2152×1032).
 * EVDx is designed as a portrait phone app (max-w-md = 448px).
 *
 * This module detects when running on a landscape car display and
 * applies a two-column layout: left column shows the main content,
 * right column shows a secondary panel (live data / alerts / vehicle info).
 *
 * The layout switch is done by adding a `byd-landscape` CSS class to the
 * root container, which triggers landscape-specific CSS rules in globals.css.
 *
 * Fix #6: Race condition on BYD DiLink 3.0.
 * The orientation API may report incorrectly at app startup before the
 * first frame is painted. Some DiLink 3.0 builds report portrait orientation
 * for the first ~100-300ms before settling on landscape. The one-shot
 * checkLayout() in startMonitoring() may fire during this window and never
 * re-check. Fix: add delayed re-checks at 200ms and 500ms after startup.
 */

export class BYDLayoutManager {
  private static instance: BYDLayoutManager;
  private isLandscapeMode = false;

  static getInstance(): BYDLayoutManager {
    if (!BYDLayoutManager.instance) {
      BYDLayoutManager.instance = new BYDLayoutManager();
    }
    return BYDLayoutManager.instance;
  }

  /**
   * Check if we're on a landscape display (car head unit).
   * Triggers landscape layout if width > height AND width > 800px.
   */
  checkLayout(): boolean {
    const isWide = window.innerWidth > 800 && window.innerWidth > window.innerHeight;

    if (isWide && !this.isLandscapeMode) {
      this.enableLandscape();
    } else if (!isWide && this.isLandscapeMode) {
      this.disableLandscape();
    }

    return this.isLandscapeMode;
  }

  private enableLandscape(): void {
    this.isLandscapeMode = true;
    document.documentElement.classList.add('byd-landscape');
    console.log('[BYD] Landscape layout enabled');
  }

  private disableLandscape(): void {
    this.isLandscapeMode = false;
    document.documentElement.classList.remove('byd-landscape');
    console.log('[BYD] Landscape layout disabled');
  }

  /**
   * Start monitoring for orientation changes.
   * Called once on app startup.
   *
   * Fix #6: On BYD DiLink 3.0, the screen orientation may report incorrectly
   * at startup before the first frame settles. We add delayed re-checks at
   * 200ms and 500ms to catch the correct orientation after the display
   * has fully initialized.
   */
  startMonitoring(): void {
    // First check immediately (may fail on BYD DiLink if orientation hasn't settled)
    this.checkLayout();
    // Re-check after 200ms — BYD DiLink screen orientation report is sometimes
    // delayed during app startup.
    setTimeout(() => this.checkLayout(), 200);
    // Re-check again at 500ms as a second safety net.
    setTimeout(() => this.checkLayout(), 500);
    // Listen for runtime orientation/size changes.
    window.addEventListener('resize', () => this.checkLayout());
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.checkLayout(), 150);
    });
  }

  isLandscape(): boolean {
    return this.isLandscapeMode;
  }
}

export const bydLayoutManager = BYDLayoutManager.getInstance();
