// Cutscene — fullscreen video overlay with auto-skip.
// Used for intro, character cutscenes, and end celebrations.

export class Cutscene {
  constructor() {
    this.overlay = null;
    this.video = null;
  }

  /**
   * Play a video clip fullscreen.
   * @param {string} src  - path to the mp4 (relative to index.html, e.g. "videos/v2-intro.mp4")
   * @param {object} opts
   *   @param {string} opts.title - small text shown at the bottom
   *   @param {number} opts.minDuration - ms minimum duration before skip is allowed (default 800)
   *   @param {() => void} opts.onComplete - called when video ends OR user skips
   *   @param {boolean} opts.allowSkip - default true
   */
  play(src, opts = {}) {
    return new Promise((resolve) => {
      const title = opts.title || '';
      const minDuration = opts.minDuration ?? 800;
      const allowSkip = opts.allowSkip !== false;
      let elapsed = 0;
      let done = false;

      const finish = () => {
        if (done) return;
        done = true;
        try { this.video.pause(); } catch (e) {}
        document.body.removeChild(this.overlay);
        this.overlay = null;
        this.video = null;
        if (opts.onComplete) opts.onComplete();
        resolve();
      };

      // Build overlay
      const overlay = document.createElement('div');
      overlay.id = 'cutscene-overlay';
      overlay.style.cssText = 'position:fixed;inset:0;background:#000;z-index:100;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer';
      const video = document.createElement('video');
      video.src = src;
      video.autoplay = true;
      video.muted = true; // autoplay-safe; user can unmute via controls
      video.playsInline = true;
      video.style.cssText = 'max-width:100vw;max-height:90vh;width:auto;height:auto;background:#000;outline:none';
      video.controls = false;
      overlay.appendChild(video);

      // Title bar
      const bar = document.createElement('div');
      bar.style.cssText = 'position:fixed;bottom:30px;left:50%;transform:translateX(-50%);color:#fff8e7;font-family:Quicksand,sans-serif;font-size:18px;letter-spacing:0.05em;text-align:center;text-shadow:0 2px 6px rgba(0,0,0,0.6);opacity:0;transition:opacity 0.4s ease';
      if (title) bar.textContent = title;
      overlay.appendChild(bar);

      // Skip hint
      const skip = document.createElement('div');
      skip.style.cssText = 'position:fixed;top:18px;right:24px;color:#fff8e7;font-family:Quicksand,sans-serif;font-size:13px;letter-spacing:0.1em;background:rgba(0,0,0,0.4);padding:6px 14px;border-radius:14px;text-transform:uppercase';
      skip.textContent = 'press ESC or click to skip';
      overlay.appendChild(skip);

      document.body.appendChild(overlay);
      this.overlay = overlay;
      this.video = video;

      // Show title after a short delay so it fades in
      setTimeout(() => { bar.style.opacity = '1'; }, 400);

      const onEnd = () => { bar.style.opacity = '0'; finish(); };
      video.addEventListener('ended', onEnd);
      video.addEventListener('error', () => finish());

      const trySkip = (e) => {
        if (e) e.preventDefault();
        if (!allowSkip) return;
        if (elapsed < minDuration) return;
        bar.style.opacity = '0';
        finish();
      };
      overlay.addEventListener('click', trySkip);

      const keyHandler = (e) => {
        if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
          trySkip();
        }
      };
      window.addEventListener('keydown', keyHandler);
      this._keyHandler = keyHandler;

      // Tick elapsed so minDuration applies even if user clicks immediately
      const tick = () => {
        if (done) return;
        elapsed += 100;
        setTimeout(tick, 100);
      };
      tick();
    });
  }
}
