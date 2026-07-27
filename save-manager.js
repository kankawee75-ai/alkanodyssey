/* Local persistence adapter. Existing gameplay decides when to save; this owns storage access. */
(function () {
  class SaveManager {
    constructor(key) { this.key=key; }
    save(data) { localStorage.setItem(this.key, JSON.stringify(data)); }
    load() { try { return JSON.parse(localStorage.getItem(this.key) || 'null'); } catch (_) { return null; } }
  }
  window.SaveManager = SaveManager;
}());
