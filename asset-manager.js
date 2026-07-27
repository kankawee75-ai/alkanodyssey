/* Rendering resource loader. Keeps image loading independent from game logic. */
(function () {
  class AssetManager {
    constructor() { this.images = new Map(); this.ready = false; }
    load(name, source) {
      const image = new Image();
      image.onload = () => { this.ready = true; };
      image.src = source;
      this.images.set(name, image);
      return image;
    }
    get(name) { return this.images.get(name); }
  }
  window.AssetManager = AssetManager;
}());
