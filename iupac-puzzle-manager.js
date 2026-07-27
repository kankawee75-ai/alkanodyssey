/* IUPAC challenge generator used by crystal doors without changing level mechanics. */
(function () {
  class IUPACPuzzleManager {
    constructor() { this.active = null; }
    create(chapter) {
      const sets = {
        1:[
          {formula:'CH₃—CH₂—CH₂—CH₃',question:'Identify the correct IUPAC name.',answer:'butane',choices:['butane','propane','2-methylpropane'],hint:'Count the longest continuous chain: four carbons.',explanation:'Four unbranched carbons form butane.'},
          {formula:'CH₃—CH₂—CH₂—CH₂—CH₃',question:'Identify the correct IUPAC name.',answer:'pentane',choices:['hexane','pentane','2-methylbutane'],hint:'The parent chain has five carbons.',explanation:'A straight five-carbon chain is pentane.'}
        ],
        2:[{formula:'CH₃—CH(CH₃)—CH₂—CH₃',question:'Name this single-branch alkane.',answer:'2-methylbutane',choices:['3-methylbutane','2-methylbutane','ethylbutane'],hint:'Number from the nearest end to give the branch the lowest locant.',explanation:'The methyl branch is on carbon 2, so it is 2-methylbutane.'}],
        3:[{formula:'CH₃—CH(CH₃)—CH(CH₃)—CH₂—CH₃',question:'Name this multiple-branch alkane.',answer:'2,3-dimethylpentane',choices:['3,4-dimethylpentane','2,3-dimethylpentane','2-ethyl-3-methylbutane'],hint:'Use the five-carbon parent chain and number from the left.',explanation:'Two methyl groups occur at carbons 2 and 3: 2,3-dimethylpentane.'}],
        4:[{formula:'CH₃—CH₂—CH(CH₃)—CH(CH₂CH₃)—CH₂—CH₃',question:'Choose the correctly ordered IUPAC name.',answer:'3-ethyl-4-methylhexane',choices:['4-ethyl-3-methylhexane','3-ethyl-4-methylhexane','3-methyl-4-ethylhexane'],hint:'At equal locants, alphabetical order places ethyl before methyl.',explanation:'The parent is hexane; ethyl is alphabetized before methyl.'}],
        5:[{formula:'CH₃—CH(CH₃)—CH(CH₂CH₃)—CH(CH₃)—CH₂—CH₃',question:'Complete the final naming challenge.',answer:'3-ethyl-2,4-dimethylhexane',choices:['3-ethyl-2,4-dimethylhexane','4-ethyl-2,3-dimethylhexane','3-ethyl-2,4-methylhexane'],hint:'Find hexane, number for 2,3,4, then alphabetize ethyl before methyl.',explanation:'The complete name is 3-ethyl-2,4-dimethylhexane.'}]
      };
      const list=sets[chapter] || sets[1]; this.active=list[Math.floor(Math.random()*list.length)]; return this.active;
    }
    answer(value) { return this.active && value === this.active.answer; }
  }
  window.IUPACPuzzleManager = IUPACPuzzleManager;
}());
