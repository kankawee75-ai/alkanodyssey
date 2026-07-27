/* Player-owned avatar data and presentation helpers. */
(function(){
  const HAIR=Array.from({length:12},(_,i)=>`Style ${i+1}`);
  class AvatarManager{
    constructor(){this.avatar={face:'Round',hair:'Style 1',hairColor:'#1e2230',eyes:'Round',eyeColor:'#4cc9ff',eyebrows:'Natural',skin:'#d99a6c',mouth:'Smile',clothing:'Blue Lab Coat',shoes:'Brown Boots',gloves:'None',cape:'None',accessory:'Safety Goggles',pet:'None'};}
    styles(){return HAIR;}
    update(key,value){if(Object.hasOwn(this.avatar,key))this.avatar[key]=value;}
    snapshot(){return {...this.avatar};}
    restore(data){Object.assign(this.avatar,data||{});}
    label(){return `${this.avatar.clothing} · ${this.avatar.accessory}`;}
  }
  window.AvatarManager=AvatarManager;
}());
