/* Persistent release achievements. */
(function(){class AchievementManager{constructor(){this.unlocked=[];}unlock(id){if(!this.unlocked.includes(id)){this.unlocked.push(id);return true;}return false;}snapshot(){return {unlocked:this.unlocked};}restore(state){this.unlocked=(state&&state.unlocked)||[];}}
window.AchievementManager=AchievementManager;}());
