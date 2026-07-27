/* Campaign scene coordinator. It prevents navigation to locked chapters. */
(function () {
  class SceneManager {
    constructor() {
      this.currentScene = 'menu';
      this.currentChapter = 1;
      this.unlockedChapters = [1];
      this.order = ['menu','story','forest','mainChainHunter','canyon','branch','library','temple','ending'];
    }
    chapterScene(chapter) { return ['forest','canyon','branch','library','temple'][chapter - 1] || 'ending'; }
    unlock(chapter) { if (!this.unlockedChapters.includes(chapter)) this.unlockedChapters.push(chapter); }
    canLoad(scene) { const chapter = ['forest','canyon','branch','library','temple'].indexOf(scene) + 1; return chapter < 1 || this.unlockedChapters.includes(chapter); }
    set(scene, chapter) { if (!this.canLoad(scene)) return false; this.currentScene = scene; if (chapter) this.currentChapter = chapter; return true; }
    restore(state) { this.currentScene = state.currentScene || this.currentScene; this.currentChapter = state.currentChapter || this.currentChapter; this.unlockedChapters = state.unlockedChapters || this.unlockedChapters; }
    snapshot() { return {currentScene:this.currentScene,currentChapter:this.currentChapter,unlockedChapters:[...this.unlockedChapters]}; }
  }
  window.SceneManager = SceneManager;
}());
