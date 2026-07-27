/* Quest state is data-driven so chapter logic only reports progress and completion. */
(function () {
  class QuestManager {
    constructor() { this.quests = {}; this.completedQuests = []; }
    start(id, title, objectives) { if (!this.quests[id]) this.quests[id] = {id,title,objectives,progress:0,active:true,completed:false}; return this.quests[id]; }
    update(id, progress) { const quest=this.quests[id]; if (quest && quest.active) quest.progress=Math.max(quest.progress,progress); return quest; }
    complete(id) { const quest=this.quests[id]; if (!quest) return null; quest.progress=quest.objectives; quest.active=false; quest.completed=true; if (!this.completedQuests.includes(id)) this.completedQuests.push(id); return quest; }
    get(id) { return this.quests[id]; }
    snapshot() { return {quests:this.quests,completedQuests:[...this.completedQuests]}; }
    restore(state) { this.quests=state.quests || {}; this.completedQuests=state.completedQuests || []; }
  }
  window.QuestManager = QuestManager;
}());
