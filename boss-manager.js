/* Carbon Guardian is a non-combat boss: each chemistry rule drains one energy segment. */
(function(){
  class BossManager {
    constructor(){this.stage=0;this.energy=4;this.active=false;}
    start(){this.stage=0;this.energy=4;this.active=true;}
    current(){return [
      {title:'Main Chain Trial',prompt:'Which parent chain is longest in CH₃—CH₂—CH(CH₃)—CH₂—CH₂—CH₃?',choices:['5 carbons','6 carbons','7 carbons'],answer:'6 carbons',explanation:'The longest continuous carbon chain contains six atoms.'},
      {title:'Numbering Trial',prompt:'A methyl group is nearer the right end. Which direction gives the lowest locant?',choices:['Number from the left','Number from the right','Either direction'],answer:'Number from the right',explanation:'Always number from the end closest to the first substituent.'},
      {title:'Branch Trial',prompt:'What alkyl group is CH₃— attached to a parent chain?',choices:['ethyl','methyl','propyl'],answer:'methyl',explanation:'A one-carbon substituent is methyl.'},
      {title:'Naming Trial',prompt:'What ordering rule applies to ethyl and methyl substituents?',choices:['Order by size','Alphabetize names','Order by locant only'],answer:'Alphabetize names',explanation:'Substituent names are alphabetized: ethyl comes before methyl.'}
    ][this.stage];}
    answer(choice){const trial=this.current();if(choice!==trial.answer)return {correct:false,trial};this.stage++;this.energy=Math.max(0,this.energy-1);if(this.stage>=4){this.active=false;return {correct:true,trial,defeated:true};}return {correct:true,trial,defeated:false};}
    snapshot(){return {stage:this.stage,energy:this.energy,active:this.active};}
    restore(state){if(!state)return;this.stage=state.stage||0;this.energy=state.energy??4;this.active=!!state.active;}
  }
  window.BossManager=BossManager;
}());
