/* Adaptive records drive recommendations, non-repeating practice, and reports. */
(function(){
  const TOPICS=['parent','numbering','branches','prefixes','alphabetical','naming'];
  const LABELS={parent:'Longest Main Chain',numbering:'Numbering',branches:'Alkyl Branches',prefixes:'Prefixes',alphabetical:'Alphabetical Order',naming:'Complete IUPAC Naming',mastery:'Complete IUPAC Naming'};
  class AdaptiveLearningManager{
    constructor(){this.records={};this.incorrect=[];this.daily={date:'',completed:0,streak:0,questions:0};}
    row(topic){topic=topic==='mastery'?'naming':topic;return this.records[topic]||(this.records[topic]={correct:0,wrong:0,time:0,hints:0,retries:0,seen:[]});}
    attempt(topic,correct,seconds=0,meta={}){const row=this.row(topic);row[correct?'correct':'wrong']++;row.time+=Math.max(0,seconds||0);if(meta.hint)row.hints++;if(!correct)row.retries++;if(meta.key&&!row.seen.includes(meta.key))row.seen.push(meta.key);if(!correct&&meta.question)this.incorrect.push({topic:topic==='mastery'?'naming':topic,question:meta.question,answer:meta.answer,explanation:meta.explanation||'Review the related IUPAC rule and retry.',rule:LABELS[topic]||topic});this.incorrect=this.incorrect.slice(-50);}
    mastery(topic){const r=this.row(topic),total=r.correct+r.wrong;return total?Math.round(r.correct/total*100):0;}
    weakTopics(limit=2){return TOPICS.slice().sort((a,b)=>this.mastery(a)-this.mastery(b)).slice(0,limit);}
    averageTime(){const rows=Object.values(this.records),n=rows.reduce((s,r)=>s+r.correct+r.wrong,0);return n?Math.round(rows.reduce((s,r)=>s+r.time,0)/n):0;}
    recommendation(){const weak=this.weakTopics(1)[0];return `Practice ${LABELS[weak]} with five adaptive questions before the next advanced challenge.`;}
    dailyStart(){const date=new Date().toISOString().slice(0,10);if(this.daily.date!==date){this.daily.streak=this.daily.date?this.daily.streak+1:1;this.daily={date,completed:0,streak:this.daily.streak,questions:5};}return this.daily;}
    snapshot(){return {records:this.records,incorrect:this.incorrect,daily:this.daily};}
    restore(data){this.records=(data&&data.records)||{};this.incorrect=(data&&data.incorrect)||[];this.daily=(data&&data.daily)||this.daily;}
  }
  window.AdaptiveLearningManager=AdaptiveLearningManager;window.IUPAC_TOPIC_LABELS=LABELS;
}());
