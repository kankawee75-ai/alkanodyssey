/* Learning analytics stay local and turn attempts into useful feedback. */
(function(){
  class AnalyticsManager{
    constructor(){this.topics={};this.chapter={};}
    attempt(topic,correct,seconds=0,chapter=1){
      const row=this.topics[topic]||(this.topics[topic]={correct:0,wrong:0,time:0});
      row[correct?'correct':'wrong']++;row.time+=seconds;
      const c=this.chapter[chapter]||(this.chapter[chapter]={correct:0,wrong:0});c[correct?'correct':'wrong']++;
    }
    accuracy(){const rows=Object.values(this.topics);const good=rows.reduce((n,r)=>n+r.correct,0),all=good+rows.reduce((n,r)=>n+r.wrong,0);return all?Math.round(good/all*100):0;}
    weakest(){const rows=Object.entries(this.topics);if(!rows.length)return 'Explore a chapter to build your learning profile.';return rows.sort((a,b)=>a[1].correct/(a[1].correct+a[1].wrong)-b[1].correct/(b[1].correct+b[1].wrong))[0][0];}
    strongestChapter(){const rows=Object.entries(this.chapter);if(!rows.length)return 'Not enough answers yet';return `Chapter ${rows.sort((a,b)=>(b[1].correct-b[1].wrong)-(a[1].correct-a[1].wrong))[0][0]}`;}
    snapshot(){return {topics:this.topics,chapter:this.chapter};}
    restore(data){this.topics=(data&&data.topics)||{};this.chapter=(data&&data.chapter)||{};}
  }
  window.AnalyticsManager=AnalyticsManager;
}());
