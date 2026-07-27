/* Five-question final checks every step in the IUPAC alkane naming workflow. */
(function(){
  class FinalExamManager {
    constructor(){this.index=0;this.score=0;this.active=false;this.questions=[
      {prompt:'1. Choose the longest parent chain in a structure containing six connected carbons.',choices:['pentane','hexane','heptane'],answer:'hexane',explanation:'Six carbons make hexane.'},
      {prompt:'2. A branch is closer to the right end. Where does numbering begin?',choices:['Left end','Right end','Middle'],answer:'Right end',explanation:'Use the direction with the lowest locant.'},
      {prompt:'3. Identify the alkyl group CH₃CH₂—.',choices:['methyl','ethyl','propyl'],answer:'ethyl',explanation:'Two carbons form an ethyl group.'},
      {prompt:'4. Which name is listed first alphabetically?',choices:['methyl','ethyl','dimethyl'],answer:'ethyl',explanation:'Ignore multiplicative prefixes; ethyl precedes methyl.'},
      {prompt:'5. Name CH₃—CH(CH₃)—CH₂—CH₃.',choices:['2-methylbutane','3-methylbutane','ethylpropane'],answer:'2-methylbutane',explanation:'Butane is the parent, with a methyl on carbon 2.'}
    ];}
    start(){this.index=0;this.score=0;this.active=true;}
    current(){return this.questions[this.index];}
    answer(choice){const question=this.current();if(choice!==question.answer)return {correct:false,question};this.score+=20;this.index++;if(this.index>=this.questions.length){this.active=false;return {correct:true,question,complete:true};}return {correct:true,question,complete:false};}
    snapshot(){return {index:this.index,score:this.score,active:this.active};}
    restore(state){if(!state)return;this.index=state.index||0;this.score=state.score||0;this.active=!!state.active;}
  }
  window.FinalExamManager=FinalExamManager;
}());
