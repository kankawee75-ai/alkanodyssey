/* The AlkanOdyssey Phase 3 — Main Menu, Story, Chapter 1, and Quest System. */
'use strict';

const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height, GROUND = 421, MAP_WIDTH = 7800;
const $ = id => document.getElementById(id);
ctx.imageSmoothingEnabled = false;

/* Asset Manager keeps visual resources separate from gameplay state and rendering calls. */
const assets=new window.AssetManager();
assets.load('atlas','assets/sprites.svg');
const SPRITES={
  heroIdle:[0,0],heroWalk1:[64,0],heroWalk2:[128,0],heroRun:[192,0],heroJump:[256,0],heroCelebrate:[320,0],heroHurt:[384,0],
  professor:[0,64],rabbit:[64,64],student:[128,64],miner:[192,64],explorer:[256,64],oldScientist:[320,64],
  slime:[0,128],bat:[64,128],rock:[128,128],tree:[192,128],crystal:[256,128],coin:[320,128],book:[384,128],scroll:[448,128],chest:[512,128],sign:[576,128],gate:[640,128],mushroom:[704,128],
  cave:[0,192],bridge:[64,192],waterfall:[128,192],molecule:[192,192],firefly:[256,192],butterfly:[320,192],flower:[384,192],checkpoint:[448,192]
};
function drawSprite(name,x,y,w=64,h=64,flip=false,alpha=1) { const image=assets.get('atlas'), cell=SPRITES[name]; if(!assets.ready||!image||!cell)return; ctx.save();ctx.globalAlpha=alpha;ctx.imageSmoothingEnabled=false;if(flip){ctx.translate(Math.round(x+w),Math.round(y));ctx.scale(-1,1);ctx.drawImage(image,cell[0],cell[1],64,64,0,0,Math.round(w),Math.round(h));}else ctx.drawImage(image,cell[0],cell[1],64,64,Math.round(x),Math.round(y),Math.round(w),Math.round(h));ctx.restore(); }

/* Persistent runtime state for the first fully playable chapter. */
const game = {
  mode:'menu',
  time:0, last:0, camera:0,
  coins:0, crystals:0, books:0, scrolls:0, xp:0, level:1,
  hp:5, maxHp:5,
  quest:'Recover the Main Chain Crystal.',
  keys:{},
  saveKey:'alkanOdysseyPhase3',
  dialog:null, particles:[], butterflies:[], leaves:[], molecules:[], collectibles:[], treasures:[], npcs:[], signboards:[],
  settings:{sound:55, music:35, shake:true, textSpeed:28, soundEnabled:true, musicEnabled:true}, lastSave:0, audio:null,
  journalUnlocked:true,
  fireflies:[], checkpoints:[], enemies:[],
  menuParticles:[], menuMusic:null, menuFade:0, menuTransition:false,
  worldMapUnlocked:false,
  mainChainRuleUnlocked:false,
  lowestNumberRuleUnlocked:false,
  chapter2Unlocked:false,
  chapter3Unlocked:false,
  chapter4Unlocked:false,
  chapter5Unlocked:false,
  endingUnlocked:false,
  mainChainCrystalFound:false,
  chapter:1,
  puzzleMode:null,
  canyonPuzzle:null,
  transition:null,
  gate:{x:4880, y:GROUND-120, opened:false},
  story:{scene:0, timer:0, fade:0},
  celebration:null,
  puzzleActive:false,
  puzzle:null,
  menuCrystals:[],
  mission:{started:false, active:false, completed:false, pool:[], currentIndex:0, solved:0}
};
/* Dedicated managers own scene locks, quest state, and local persistence. */
const sceneManager=new window.SceneManager();
const questManager=new window.QuestManager();
const saveManager=new window.SaveManager(game.saveKey);
const iupacPuzzleManager=new window.IUPACPuzzleManager();
const bossManager=new window.BossManager();
const finalExamManager=new window.FinalExamManager();
const demoManager=new window.DemoManager();
const tutorialManager=new window.TutorialManager();
const achievementManager=new window.AchievementManager();
const learningManager=new window.LearningManager();
const avatarManager=new window.AvatarManager();
const analyticsManager=new window.AnalyticsManager();
const adaptiveLearningManager=new window.AdaptiveLearningManager();
game.knowledgePoints=0; game.chapterStars=0; game.abilities={mainChainVision:false,numberScanner:false,branchDetector:false}; game.iupacDoorSolved=false;
game.bossDefeated=false;game.completedFinalExam=false;game.finalScore=0;game.certificateIssued=false;game.demoMode=false;
game.difficulty='easy';game.practiceUnlocked=false;
game.stats={startedAt:Date.now(),playSeconds:0,puzzlesSolved:0,correctAnswers:0,wrongAnswers:0};
game.dialogHistory=[];game.dialogAuto=false;game.practiceSession=null;game.dailySession=null;
const player = {
  x:160, y:320, w:28, h:43, vx:0, vy:0, facing:1, grounded:false, state:'idle',
  coyote:0, jumpBuffer:0, landTimer:0, turnTimer:0, stepTimer:0, dustTimer:0, celebrateTimer:0, hurtTimer:0, invulnerable:0
};

/* Input map supports keyboard and the on-screen controls. */
const keyMap = {ArrowLeft:'left',ArrowRight:'right',a:'left',A:'left',d:'right',D:'right',
  ' ':'jump',ArrowUp:'jump',w:'jump',W:'jump',Shift:'run',e:'interact',E:'interact',Enter:'interact',j:'journal',J:'journal',i:'inventory',I:'inventory',m:'map',M:'map',v:'ability',V:'ability',Escape:'escape'};
addEventListener('keydown', event => {
  const key = keyMap[event.key]; if (!key) return;
  game.keys[key] = true;
  if (['left','right','jump','run'].includes(key)) event.preventDefault();
  if (!event.repeat && ['interact','journal','inventory','map','ability','escape'].includes(key)) press(key);
});
addEventListener('keyup', event => { const key = keyMap[event.key]; if (key) game.keys[key] = false; });
document.querySelectorAll('[data-key]').forEach(button => {
  const key = button.dataset.key;
  button.addEventListener('pointerdown', event => { event.preventDefault(); game.keys[key] = true; if (key === 'action') press('interact'); });
  ['pointerup','pointerleave','pointercancel'].forEach(type => button.addEventListener(type, () => game.keys[key] = false));
});

/* Small synthesized sound palette; interaction starts audio in browser-safe fashion. */
function sound(name) {
  if (!game.settings.sound || !game.settings.soundEnabled) return;
  try {
    const ac = game.audio || (game.audio = new (window.AudioContext || window.webkitAudioContext)());
    const tones = { step:[150,.025,'square'], jump:[330,.09,'square'], coin:[820,.09,'sine'], crystal:[620,.16,'triangle'], talk:[220,.018,'square'], land:[100,.05,'square'], click:[980,.04,'triangle'] };
    const [frequency, duration, type] = tones[name] || tones.talk;
    const osc = ac.createOscillator(), gain = ac.createGain();
    osc.type = type; osc.frequency.value = frequency; gain.gain.value = game.settings.sound / 1400;
    osc.connect(gain); gain.connect(ac.destination); osc.start(); gain.gain.exponentialRampToValueAtTime(.001, ac.currentTime + duration); osc.stop(ac.currentTime + duration);
  } catch (_) { /* Audio is optional when a browser blocks it. */ }
}
function startAmbience() {
  if (!game.settings.music || !game.settings.musicEnabled || game.ambience) return;
  try { const ac = game.audio || (game.audio = new (window.AudioContext || window.webkitAudioContext)()); const osc=ac.createOscillator(), gain=ac.createGain(); osc.type='sine'; osc.frequency.value=92; gain.gain.value=game.settings.music/5000; osc.connect(gain);gain.connect(ac.destination);osc.start(); game.ambience={osc,gain}; } catch (_) {}
}
function playMenuClick() {
  sound('click');
}
function startMenuMusic() {
  if (game.menuMusic || !game.settings.music) return;
  try {
    const ac = game.audio || (game.audio = new (window.AudioContext || window.webkitAudioContext)());
    const master = ac.createGain();
    master.gain.value = Math.max(0.0001, game.settings.music / 2200);
    master.connect(ac.destination);
    const notes = [196, 261, 329, 392, 329, 261];
    const durations = [0.7, 0.7, 0.7, 1.1, 0.7, 1.1];
    let step = 0;
    const playNote = () => {
      if (!game.menuMusic) return;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'triangle';
      osc.frequency.value = notes[step];
      gain.gain.value = 0.0001;
      gain.gain.exponentialRampToValueAtTime(0.025, ac.currentTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + durations[step] * 0.82);
      osc.connect(gain); gain.connect(master); osc.start(); osc.stop(ac.currentTime + durations[step] * 0.9);
      step = (step + 1) % notes.length;
      game.menuMusic.timeout = setTimeout(playNote, durations[step] * 1000);
    };
    game.menuMusic = { ac, master, timeout: null };
    playNote();
  } catch (_) {}
}
function stopMenuMusic() {
  if (!game.menuMusic) return;
  clearTimeout(game.menuMusic.timeout);
  try {
    if (game.menuMusic.master) game.menuMusic.master.gain.exponentialRampToValueAtTime(0.0001, game.audio.currentTime + 0.06);
  } catch (_) {}
  game.menuMusic = null;
}
function initMenuParticles() {
  if (game.menuParticles.length) return;
  game.menuParticles = Array.from({ length: 30 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H * 0.7,
    vx: (Math.random() - 0.5) * 24,
    vy: (Math.random() - 0.5) * 16,
    size: 1 + Math.random() * 2,
    life: 1 + Math.random() * 1.6,
    color: Math.random() > 0.5 ? '#7fe8ff' : '#ffd59d'
  }));
}
function updateMenuVisuals(dt) {
  initMenuParticles();
  game.menuParticles.forEach(p => {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt * 0.4;
    if (p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20 || p.life <= 0) {
      p.x = Math.random() * W;
      p.y = Math.random() * H * 0.7;
      p.life = 1 + Math.random() * 1.6;
    }
  });
  if (game.menuTransition) {
    game.menuFade = Math.min(1, game.menuFade + dt * 1.3);
    if (game.menuFade >= 1) {
      game.mode = 'story';
      game.menuTransition = false;
      game.story.scene = 0;
      game.story.timer = 0;
      game.menuFade = 1;
    }
  }
}
function approach(value,target,amount){return value<target?Math.min(value+amount,target):Math.max(value-amount,target);} 
function clamp(value,min,max){return Math.min(max,Math.max(min,value));}
function lerp(a,b,t){return a+(b-a)*t;}
function setQuest(text){ game.quest=text; updateHud(); }
function updateHud() {
  game.level = 1 + Math.floor(game.xp / 120);
  const healthEl = $('health');
  if (healthEl) healthEl.innerHTML = `❤ ${game.hp}/${game.maxHp}`;
  const xpEl = $('xp');
  if (xpEl) xpEl.textContent = `XP ${game.xp}`;
  const levelEl = $('levelReadout');
  if (levelEl) levelEl.textContent = `LV ${game.level}`;
  const coinsEl = $('coins');
  if (coinsEl) coinsEl.textContent = `● ${game.coins}`;
  const crystalsEl = $('crystals');
  if (crystalsEl) crystalsEl.textContent = `✦ ${game.crystals}`;
  const questEl = $('questTracker');
  const activeQuest=Object.values(questManager.quests).find(quest=>quest.active);
  if (questEl) questEl.textContent = activeQuest ? `${activeQuest.title}\n${game.quest}` : game.quest;
  const missionProgress=$('missionProgress');
  if(missionProgress){const ratio=activeQuest?activeQuest.progress/Math.max(1,activeQuest.objectives):0;missionProgress.style.setProperty('--progress',`${Math.round(ratio*100)}%`);missionProgress.title=activeQuest?`${activeQuest.progress}/${activeQuest.objectives}`:'No active mission';}
}
function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function circle(x,y,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.arc(Math.round(x),Math.round(y),r,0,Math.PI*2);ctx.fill();}

/* Build the forest with collectibles, NPCs, treasure, and educational signboards. */
function buildForest() {
  game.iupacDoorSolved=false;
  game.collectibles = []; game.butterflies = []; game.leaves = []; game.molecules = []; game.treasures = []; game.npcs = []; game.signboards = []; game.fireflies = []; game.checkpoints = []; game.enemies=[];
  game.mission = {started:false, active:false, completed:false, pool:[], currentIndex:0, solved:0};
  const spots = [850,1030,1220,1450,1670,1870,2080,2310,2560,2810,3050,3320,3610,3890,4170,4490,4780];
  spots.forEach((x, i) => game.collectibles.push({x, y:GROUND-68-(i%3)*26, kind:i%5===0?'book':i%2?'coin':'crystal', taken:false, phase:i*.73}));
  for (let i=0; i<18; i++) game.butterflies.push({x:250+i*280,y:150+(i%5)*38,phase:i*.9,color:i%2?'#ffd15c':'#ef8ccb'});
  for (let i=0; i<55; i++) game.leaves.push({x:(i*97)%MAP_WIDTH,y:50+(i*53)%310,phase:i*.41,drift:12+i%17});
  for (let i=0; i<16; i++) game.molecules.push({x:400+i*280,y:120+(i%4)*92,phase:i*.67,size:4+i%3,color:i%2?'#8bffed':'#f6c2f6'});
  for (let i=0; i<26; i++) game.fireflies.push({x:640+i*180,y:170+(i%6)*40,phase:i*.68});
  game.checkpoints = [
    {x:760, y:GROUND-70, reached:false},
    {x:2280, y:GROUND-84, reached:false},
    {x:3920, y:GROUND-108, reached:false}
  ];
  game.treasures = [
    {x:980, y:GROUND-56, opened:false, reward:'coin'},
    {x:2140, y:GROUND-56, opened:false, reward:'crystal'},
    {x:3160, y:GROUND-56, opened:false, reward:'book'},
    {x:4020, y:GROUND-56, opened:false, reward:'potion'}
  ];
  game.signboards = [
    {x:1140, y:GROUND-84, topic:'Longest Carbon Chain'},
    {x:2380, y:GROUND-84, topic:'Parent Chain'},
    {x:3520, y:GROUND-84, topic:'Simple Examples'}
  ];
  game.npcs = [
    {id:'professor', name:'Professor Carbon', x:760, y:GROUND-52, met:false},
    {id:'rabbit', name:'Carbon Rabbit', x:1820, y:GROUND-56, met:false},
    {id:'student', name:'Scientist Student', x:2860, y:GROUND-56, met:false}
  ];
  game.gate = {x:4880, y:GROUND-120, opened:false};
  game.menuCrystals = Array.from({length:8}, (_,i) => ({x:120+i*120,y:80+i*32,phase:i*.9}));
  game.menuParticles = [];
}

function buildCanyonWorld() {
  game.iupacDoorSolved=false; game.abilities.numberScanner=true;
  game.collectibles = []; game.butterflies = []; game.leaves = []; game.molecules = []; game.treasures = []; game.npcs = []; game.signboards = []; game.fireflies = []; game.checkpoints = [];
  game.collectibles.push(
    {x:640, y:GROUND-70, kind:'coin', taken:false, phase:1},
    {x:920, y:GROUND-110, kind:'crystal', taken:false, phase:2},
    {x:1220, y:GROUND-116, kind:'scroll', taken:false, phase:3},
    {x:1560, y:GROUND-150, kind:'book', taken:false, phase:4},
    {x:1880, y:GROUND-90, kind:'coin', taken:false, phase:5},
    {x:2360, y:GROUND-140, kind:'crystal', taken:false, phase:6},
    {x:2740, y:GROUND-120, kind:'scroll', taken:false, phase:7},
    {x:3060, y:GROUND-92, kind:'coin', taken:false, phase:8}
  );
  game.treasures = [{x:3300, y:GROUND-56, opened:false, reward:'crystal'}];
  game.fireflies = Array.from({length:24}, (_,i) => ({x:540+i*150, y:140+(i%5)*30, phase:i*.7}));
  game.molecules = Array.from({length:18}, (_,i) => ({x:520+i*220, y:140+(i%4)*80, phase:i*.5, size:4+i%3, color:i%2?'#88f2ff':'#f1a7ff'}));
  game.npcs = [
    {id:'miner', name:'Crystal Miner', x:920, y:GROUND-48, met:false},
    {id:'explorer', name:'Chemistry Explorer', x:1740, y:GROUND-52, met:false},
    {id:'oldScientist', name:'Old Scientist', x:2580, y:GROUND-52, met:false}
  ];
  game.signboards = [{x:1180, y:GROUND-84, topic:'Lowest Number Rule'}, {x:2140, y:GROUND-84, topic:'Numbering Tips'}];
  game.checkpoints = [{x:760, y:GROUND-72, reached:false}, {x:1840, y:GROUND-88, reached:false}, {x:2920, y:GROUND-92, reached:false}];
  game.enemies = [
    {id:'slime', x:1200, y:GROUND-22, vx:-60, dir:-1, hp:1, patrol: [980, 1320]},
    {id:'bat', x:1720, y:140, vx:70, dir:1, hp:1, patrol: [1460, 1980]},
    {id:'mole', x:2680, y:GROUND-20, vx:-80, dir:-1, hp:1, patrol: [2450, 2880]}
  ];
  game.gate = {x:3540, y:GROUND-120, opened:false};
}

function startChapterTransition(targetChapter) {
  game.currentChapter = targetChapter;
  game.chapterTransition = {type:'worldMap', timer:0, targetChapter};
  game.mode = 'transition';
  player.x = 120;
  player.y = GROUND - player.h;
  game.camera = 0;
  stopMenuMusic();
}

function completeChapter2() {
  game.chapter2Complete = true;
  game.chapter3Unlocked = true;
  game.quest = 'Branch Forest awaits.';
  updateHud();
  saveGame();
  showDialogue('Professor Carbon', [
    'Excellent! You have mastered Carbon Numbering.',
    `Strength: ${analyticsManager.strongestChapter()}. ${adaptiveLearningManager.recommendation()}`,
    'Next destination: Branch Forest.',
    'Chapter 3 is now unlocked.'
  ], ()=>beginCampaignTransition(3));
}

/* Save and restore only actual player progress, without resetting world pickups. */
function saveGame(showMessage=false) {
  const data = {
    x:player.x, y:player.y, coins:game.coins, crystals:game.crystals, books:game.books, scrolls:game.scrolls, xp:game.xp, level:game.level,
    journalUnlocked:game.journalUnlocked, worldMapUnlocked:game.worldMapUnlocked, mainChainRuleUnlocked:game.mainChainRuleUnlocked,
    lowestNumberRuleUnlocked:game.lowestNumberRuleUnlocked, chapter2Unlocked:game.chapter2Unlocked, chapter3Unlocked:game.chapter3Unlocked, chapter4Unlocked:game.chapter4Unlocked, chapter5Unlocked:game.chapter5Unlocked, endingUnlocked:game.endingUnlocked,
    mainChainCrystalFound:game.mainChainCrystalFound, gateOpened:game.gate.opened, chapter:game.chapter,
    collected:game.collectibles.map(c=>c.taken), treasure:game.treasures.map(c=>c.opened), npcMet:game.npcs.map(n=>n.met),
    checkpoints:game.checkpoints.map(c=>c.reached), settings:game.settings, quest:game.quest,
    mission: game.mission, sceneState:sceneManager.snapshot(), questState:questManager.snapshot(),
    inventory:{coins:game.coins,crystals:game.crystals,books:game.books,scrolls:game.scrolls}, knowledgePoints:game.knowledgePoints, chapterStars:game.chapterStars, abilities:game.abilities, iupacDoorSolved:game.iupacDoorSolved, completedFinalExam:game.completedFinalExam, certificateIssued:game.certificateIssued, bossState:bossManager.snapshot(), finalExamState:finalExamManager.snapshot(), demoState:demoManager.snapshot(), tutorialState:tutorialManager.snapshot(), achievementState:achievementManager.snapshot(), stats:game.stats,difficulty:game.difficulty,practiceUnlocked:game.practiceUnlocked,avatar:avatarManager.snapshot(),analytics:analyticsManager.snapshot(),adaptive:adaptiveLearningManager.snapshot()
  };
  saveManager.save(data);
  if (showMessage) toast('GAME SAVED','Checkpoint and learning progress recorded.');
}
function restoreGame() {
  const saved = saveManager.load();
  if (!saved) { toast('NO JOURNAL FOUND','Start a new chapter to begin the adventure.'); return false; }
  game.coins=saved.coins||0; game.crystals=saved.crystals||0; game.books=saved.books||0; game.scrolls=saved.scrolls||0; game.xp=saved.xp||0; game.level=saved.level||1;
  game.journalUnlocked=!!saved.journalUnlocked; game.worldMapUnlocked=!!saved.worldMapUnlocked; game.mainChainRuleUnlocked=!!saved.mainChainRuleUnlocked;
  game.lowestNumberRuleUnlocked=!!saved.lowestNumberRuleUnlocked; game.chapter2Unlocked=!!saved.chapter2Unlocked; game.chapter3Unlocked=!!saved.chapter3Unlocked; game.chapter4Unlocked=!!saved.chapter4Unlocked; game.chapter5Unlocked=!!saved.chapter5Unlocked; game.endingUnlocked=!!saved.endingUnlocked;
  game.mainChainCrystalFound=!!saved.mainChainCrystalFound; game.gate.opened=!!saved.gateOpened; game.chapter=Math.min(5,saved.chapter||1);
  game.knowledgePoints=saved.knowledgePoints||0;game.chapterStars=saved.chapterStars||0;Object.assign(game.abilities,saved.abilities||{});game.iupacDoorSolved=!!saved.iupacDoorSolved;
  game.bossDefeated=!!saved.bossDefeated;game.completedFinalExam=!!saved.completedFinalExam;game.finalScore=saved.finalScore||0;game.certificateIssued=!!saved.certificateIssued;bossManager.restore(saved.bossState);finalExamManager.restore(saved.finalExamState);
  demoManager.restore(saved.demoState);tutorialManager.restore(saved.tutorialState);game.demoMode=demoManager.active;
  achievementManager.restore(saved.achievementState);Object.assign(game.stats,saved.stats||{});game.stats.startedAt=Date.now();
  game.difficulty=saved.difficulty||'easy';learningManager.setDifficulty(game.difficulty);game.practiceUnlocked=!!saved.practiceUnlocked;
  avatarManager.restore(saved.avatar);analyticsManager.restore(saved.analytics);adaptiveLearningManager.restore(saved.adaptive);
  Object.assign(game.settings,saved.settings||{});
  player.x=Math.max(80,Math.min(MAP_WIDTH-60,saved.x||160)); player.y=saved.y||320;
  game.collectibles.forEach((c,i)=>c.taken=!!(saved.collected||[])[i]);
  game.treasures.forEach((c,i)=>c.opened=!!(saved.treasure||[])[i]);
  game.npcs.forEach((npc,i)=>npc.met=!!(saved.npcMet||[])[i]);
  game.checkpoints.forEach((cp,i)=>cp.reached=!!(saved.checkpoints||[])[i]);
  game.quest=saved.quest||'Recover the Main Chain Crystal.';
  if(saved.sceneState)sceneManager.restore(saved.sceneState); else { sceneManager.unlock(1); for(let chapter=2;chapter<=game.chapter;chapter++)sceneManager.unlock(chapter); }
  if(saved.questState)questManager.restore(saved.questState);
  const mission=saved.mission||{};
  game.mission = {
    started: !!mission.started,
    active: !!mission.active,
    completed: !!mission.completed || !!game.mainChainCrystalFound,
    pool: Array.isArray(mission.pool) ? mission.pool : [],
    currentIndex: mission.currentIndex || 0,
    solved: mission.solved || 0
  };
  return true;
}

/* Dialogue uses typewriter timing, explicit continue, and an immediate skip. */
function showDialogue(name, pages, onComplete) {
  game.dialog={name,pages,index:0,shown:0,timer:0,onComplete}; game.dialogHistory.push(...pages.map(text=>({name,text})));game.dialogHistory=game.dialogHistory.slice(-30); $('speaker').textContent=name; $('portrait').textContent=name==='Professor Carbon'?'C':'●'; $('dialogue').classList.remove('hidden'); renderDialogue();
}
function renderDialogue() { const d=game.dialog; if (!d) return; $('dialogueText').textContent=d.pages[d.index].slice(0,d.shown); $('dialogueContinue').textContent=d.shown<d.pages[d.index].length?'REVEAL':'CONTINUE'; $('dialogueBack').disabled=d.index===0; $('dialogueAuto').textContent=`AUTO: ${game.dialogAuto?'ON':'OFF'}`; }
function advanceDialogue(skip=false) {
  const d=game.dialog; if (!d) return;
  if (skip) { closeDialogue(); return; }
  if (d.shown < d.pages[d.index].length) { d.shown=d.pages[d.index].length; renderDialogue(); return; }
  if (d.index < d.pages.length-1) { d.index++; d.shown=0; d.timer=0; renderDialogue(); } else closeDialogue();
}
function closeDialogue() {
  if (!game.dialog) return;
  const callback=game.dialog.onComplete;
  game.dialog=null; $('dialogue').classList.add('hidden');
  if (callback) callback();
}
function updateDialogue(dt) { const d=game.dialog; if (!d) return; d.timer+=dt; const speed=Math.max(.01,game.settings.textSpeed/1000);if(d.timer>speed && d.shown<d.pages[d.index].length){d.timer=0;d.shown++;sound('talk');renderDialogue();}else if(game.dialogAuto&&d.shown>=d.pages[d.index].length&&d.timer>.75){d.timer=0;advanceDialogue();} }
function dialogueBack(){const d=game.dialog;if(!d||d.index===0)return;d.index--;d.shown=d.pages[d.index].length;renderDialogue();}
function dialogueHistory(){toast('DIALOGUE HISTORY',game.dialogHistory.slice(-3).map(line=>`${line.name}: ${line.text}`).join('  /  '));}

/* Menu helpers preserve the journal, inventory, map, and settings screens. */
function press(key) {
  if(game.mode==='ending'&&key==='interact'){game.mode='menu';sceneManager.set('menu');$('endingActions').classList.add('hidden');$('startMenu').classList.remove('hidden');startMenuMusic();return;}
  if (game.mode==='menu') {
    if (key==='escape') hidePanels();
    return;
  }
  if (key==='escape') { if(game.dialog){closeDialogue();return;} togglePause(); return; }
  if (game.dialog && key==='interact') { advanceDialogue(); return; }
  if (key==='interact') interact();
  if (key==='journal') togglePanel('journal');
  if (key==='inventory') togglePanel('inventory');
  if (key==='map') openWorldMap();
  if (key==='ability') toggleAbilityVision();
}
function hidePanels() { document.querySelectorAll('.modal').forEach(el=>el.classList.add('hidden')); game.puzzleActive=false; }
function hasBlockingModal(){return [...document.querySelectorAll('.modal')].some(el=>!el.classList.contains('hidden'));}
function interact() {
  if (game.mode !== 'playing' || game.puzzleActive) return;
  if (game.chapter>=3) { interactCampaignChapter(); return; }
  if (game.chapter===2) { interactCanyon(); return; }
  const nearProfessor = Math.abs(player.x-game.npcs[0].x)<88 && Math.abs(player.y-game.npcs[0].y)<88;
  if (nearProfessor) {
    game.npcs[0].met=true; player.celebrateTimer=.8; setQuest('Recover the Main Chain Crystal.');
    showDialogue('Professor Carbon', [
      'Welcome Alkanist!',
      'Our first mission is to recover the Main Chain Crystal.',
      'Someone has stolen the IUPAC Crystals.',
      'Without them, students can no longer correctly name alkane compounds.',
      'Tutorial: trace the longest continuous carbon chain first.',
      'Then number from the end nearest a branch, and identify each alkyl group.'
    ], ()=> {
      game.worldMapUnlocked=true; game.journalUnlocked=true; game.mainChainRuleUnlocked=true; game.abilities.mainChainVision=true;questManager.start('main_chain_crystal','Quest 1: Recover the Main Chain Crystal',3);setQuest('Recover the Main Chain Crystal.'); updateHud(); saveGame();
      toast('ADVENTURE JOURNAL','Unlocked the Journal, World Map, and the first quest.');
    });
    updateHud(); return;
  }
  const nearRabbit = game.npcs[1] && Math.abs(player.x-game.npcs[1].x)<70 && Math.abs(player.y-game.npcs[1].y)<70;
  if (nearRabbit && !game.npcs[1].met) {
    game.npcs[1].met=true; showDialogue('Carbon Rabbit', ['The forest remembers every bond.','A long chain hides the truth.']); return;
  }
  const nearStudent = game.npcs[2] && Math.abs(player.x-game.npcs[2].x)<70 && Math.abs(player.y-game.npcs[2].y)<70;
  if (nearStudent && !game.npcs[2].met) {
    game.npcs[2].met=true; showDialogue('Scientist Student', ['Longer chains are not always straight.','Look for the longest continuous path.']); return;
  }
  const nearSignboard = game.signboards.find(sign => Math.abs(player.x-sign.x)<70 && Math.abs(player.y-sign.y)<70);
  if (nearSignboard) {
    const lines = nearSignboard.topic === 'Longest Carbon Chain'
      ? ['A parent chain is the longest continuous carbon chain in a structure.','Choose the chain with the greatest number of carbon atoms.']
      : nearSignboard.topic === 'Parent Chain'
        ? ['The parent chain gives the molecule its main name.','It should be selected before branches are numbered.']
        : ['Simple example: hexane has six carbons in a straight chain.','A branch can make the longest chain less obvious.'];
    showDialogue('Chemistry Signboard', lines); return;
  }
  const nearTreasure = game.treasures.find(chest => !chest.opened && Math.abs(player.x-chest.x)<70 && Math.abs(player.y-chest.y)<70);
  if (nearTreasure) {
    openTreasure(nearTreasure); return;
  }
  if (Math.abs(player.x-game.gate.x)<92 && Math.abs(player.y-game.gate.y)<92) {
    if (game.mainChainCrystalFound) beginCanyonTransition(); else if(!game.iupacDoorSolved) startIUPACPuzzle(1); else startPuzzle(); return;
  }
  toast('FOREST ECHO','The gate and NPCs are waiting for your attention.');
}
function togglePanel(id) {
  const panel=$(id), opening=panel.classList.contains('hidden');
  hidePanels();
  if(!opening) return;
  if(id==='journal') {
    $('journalContent').innerHTML=`<article class="entry"><strong>Learning Journal · Chapter ${game.chapter}/5</strong><p>Review these rules before attempting the final IUPAC exam.</p></article><article class="entry"><strong>1. Longest Chain Rule</strong><p>Choose the longest continuous carbon chain for the parent name.</p></article><article class="entry"><strong>2. Numbering Rule</strong><p>Number from the end giving the first substituent the lowest possible locant.</p></article><article class="entry"><strong>3. Substituent Rule</strong><p>Identify alkyl groups: CH₃ is methyl, CH₃CH₂ is ethyl, and so on.</p></article><article class="entry"><strong>4. Alphabetical Order</strong><p>List substituents alphabetically; ignore di-, tri-, and other multiplicative prefixes.</p></article><article class="entry"><strong>5. Complete Naming Process</strong><p>Parent chain → numbering → substituents → alphabetical order → final IUPAC name.</p></article>`;
  } else if (id==='inventory') {
    $('inventoryContent').innerHTML=`<article class="entry"><strong>IUPAC Crystals × ${game.crystals}</strong><p>Glowing fragments from the chemistry kingdoms.</p></article><article class="entry"><strong>Knowledge Points × ${game.knowledgePoints}</strong><p>Earned by solving IUPAC Crystal Door challenges.</p></article><article class="entry"><strong>Chapter Stars × ${game.chapterStars}</strong><p>Awarded for completing each chapter.</p></article><article class="entry"><strong>Coins × ${game.coins}</strong><p>Currency gathered across the trail.</p></article><article class="entry"><strong>Hint Scrolls × ${game.scrolls}</strong><p>Numbering clues recovered in Carbon Canyon.</p></article><article class="entry"><strong>Abilities</strong><p>${game.abilities.mainChainVision?'Main Chain Vision · ':''}${game.abilities.numberScanner?'Number Scanner · ':''}${game.abilities.branchDetector?'Branch Detector':''||'Not yet unlocked'}</p></article>`;
  }
  panel.classList.remove('hidden');
}
function togglePause(){const panel=$('pauseModal');if(panel.classList.contains('hidden')){hidePanels();panel.classList.remove('hidden');}else panel.classList.add('hidden');}
function openWorldMap(){if(!game.worldMapUnlocked){toast('MAP LOCKED','Professor Carbon will provide the World Map after the story intro.');return;}hidePanels();const names=['Carbon Forest','Carbon Canyon','Branch Forest','Crystal Library','Temple of IUPAC'];document.querySelectorAll('.map-node').forEach((node,index)=>{node.classList.toggle('active',index===game.chapter-1);node.style.opacity=index<game.chapter||[game.chapter2Unlocked,game.chapter3Unlocked,game.chapter4Unlocked,game.chapter5Unlocked][index-1]?1:.42;});$('mapNote').textContent=`Current route: ${names[game.chapter-1]||'Ending'} · Press M or Escape to return.`;$('mapModal').classList.remove('hidden');}
function toggleAbilityVision(){const names=[];if(game.abilities.mainChainVision)names.push('Main Chain Vision');if(game.abilities.numberScanner)names.push('Number Scanner');if(game.abilities.branchDetector)names.push('Branch Detector');if(!names.length){toast('ABILITIES LOCKED','Learn from Professor Carbon to unlock chemistry abilities.');return;}game.abilityView=!game.abilityView;toast(game.abilityView?'ABILITY VISION ON':'ABILITY VISION OFF',names.join(' · '));}
function toast(title, body) { const el=$('achievement'); el.innerHTML=`<strong>${title}</strong><br>${body}`; el.classList.remove('hidden'); clearTimeout(game.toastTimer); game.toastTimer=setTimeout(()=>el.classList.add('hidden'),2700); }
function unlockAchievement(id,title,text){if(achievementManager.unlock(id)){toast(`ACHIEVEMENT: ${title}`,text);saveGame();}}
function successFeedback(topic){const skill=topic||learningManager.chapter(game.chapter)?.skill||'naming';game.stats.correctAnswers++;game.stats.puzzlesSolved++;analyticsManager.attempt(skill,true,0,game.chapter);adaptiveLearningManager.attempt(skill,true,0);unlockAchievement('puzzle_master','Puzzle Master','Solved an IUPAC challenge.');if(skill==='parent'&&adaptiveLearningManager.mastery('parent')>=90)unlockAchievement('main_chain_master','Master of Main Chains','Reached 90% parent-chain mastery.');if(skill==='branches'&&adaptiveLearningManager.mastery('branches')>=90)unlockAchievement('branch_specialist','Branch Specialist','Reached 90% branch mastery.');if(learningManager.config().hints===0&&game.stats.correctAnswers>=5)unlockAchievement('no_hint_champion','No Hint Champion','Solved five Master Alkanist challenges without hints.');canvas.classList.remove('success-flash');void canvas.offsetWidth;canvas.classList.add('success-flash');addBurst(player.x+14,player.y+10,'crystal');sound('crystal');}
function learningMistake(topic,hint){const skill=topic||learningManager.chapter(game.chapter)?.skill||'naming';game.stats.wrongAnswers++;analyticsManager.attempt(skill,false,0,game.chapter);adaptiveLearningManager.attempt(skill,false,0,{hint:!!hint});const config=learningManager.config();return config.hints===0?'Review your chemistry notebook, then retry.':hint||'Think about the IUPAC rule being practiced before trying again.';}

function openTreasure(chest) {
  if (chest.opened) return;
  chest.opened=true;
  unlockAchievement('treasure_hunter','Treasure Hunter','Opened an exploration chest.');
  if (chest.reward==='coin') { game.coins+=20; game.xp+=8; }
  else if (chest.reward==='crystal') { game.crystals+=1; game.xp+=18; }
  else if (chest.reward==='book') { game.books+=1; game.xp+=14; }
  else { game.xp+=10; }
  addBurst(chest.x, chest.y, chest.reward);
  sound('crystal');
  toast('TREASURE FOUND', 'The chest revealed a useful alkanist reward.');
  updateHud(); saveGame();
}

/* Smooth platformer physics: acceleration, coyote jump and variable jump height. */
function updatePlayer(dt) {
  const direction=(game.keys.left?-1:0)+(game.keys.right?1:0), running=game.keys.run, maxSpeed=running?320:205;
  if(direction) { player.vx=approach(player.vx,direction*maxSpeed, (player.grounded?1750:900)*dt); if(direction!==player.facing){player.facing=direction;player.turnTimer=.13;} }
  else player.vx=approach(player.vx,0,(player.grounded?2100:550)*dt);
  player.coyote=player.grounded ? 0.1 : Math.max(0,player.coyote-dt); player.jumpBuffer=game.keys.jump ? 0.12 : Math.max(0,player.jumpBuffer-dt);
  if(player.jumpBuffer&&player.coyote){player.vy=-470;player.grounded=false;player.coyote=0;player.jumpBuffer=0;sound('jump');}
  player.vy+=1250*dt; if(!game.keys.jump&&player.vy<0) player.vy+=900*dt; player.vy=Math.min(player.vy,650);
  player.x=Math.max(35,Math.min(MAP_WIDTH-player.w-35,player.x+player.vx*dt)); player.y+=player.vy*dt;
  const wasAirborne=!player.grounded; player.grounded=false;
  if(player.y+player.h>=GROUND){player.y=GROUND-player.h;player.vy=0;player.grounded=true;if(wasAirborne){player.landTimer=.14;addDust(player.x+14,GROUND,7);sound('land');}}
  player.landTimer=Math.max(0,player.landTimer-dt);player.turnTimer=Math.max(0,player.turnTimer-dt);player.celebrateTimer=Math.max(0,player.celebrateTimer-dt);player.hurtTimer=Math.max(0,player.hurtTimer-dt);player.invulnerable=Math.max(0,player.invulnerable-dt);
  if(player.hurtTimer)player.state='hurt'; else if(player.celebrateTimer)player.state='celebrate'; else if(!player.grounded)player.state='jump'; else if(player.landTimer)player.state='land'; else if(player.turnTimer)player.state='turn'; else if(Math.abs(player.vx)>245)player.state='run'; else if(Math.abs(player.vx)>18)player.state='walk'; else player.state='idle';
  if(player.grounded&&Math.abs(player.vx)>30){player.stepTimer-=dt;if(player.stepTimer<0){player.stepTimer=player.state==='run' ? 0.17 : 0.31;addDust(player.x+14,GROUND,1);sound('step');}}
}

/* Collectibles and ambient particles update independently from frame rendering. */
function updateWorld(dt) {
  for(const item of game.collectibles) if(!item.taken&&Math.abs(player.x-item.x)<27&&Math.abs(player.y-item.y)<72){item.taken=true;if(item.kind==='coin'){game.coins++;game.xp+=5;sound('coin');}else if(item.kind==='crystal'){game.crystals++;game.xp+=12;sound('crystal');}else if(item.kind==='scroll'){game.scrolls++;game.xp+=18;game.lowestNumberRuleUnlocked=true;sound('crystal');}else{game.books++;game.xp+=20;sound('crystal');}if(game.chapter===1&&item.kind==='crystal'){const found=game.collectibles.filter(c=>c.taken&&c.kind==='crystal').length;questManager.update('main_chain_crystal',Math.min(2,found));}if(game.chapter===2&&item.kind==='scroll')questManager.update('chapter_2',1);if(game.chapter>=3)questManager.update(`chapter_${game.chapter}`,campaignCollected());addBurst(item.x,item.y,item.kind);const label=item.kind==='book'?'CHEMISTRY BOOK':item.kind==='scroll'?'HINT SCROLL':item.kind==='coin'?'GOLDEN COIN':'BLUE CRYSTAL SHARD';toast(label,`Collected! +${item.kind==='book'?20:item.kind==='scroll'?18:item.kind==='coin'?5:12} XP`);updateHud();saveGame();}
  game.particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=p.gravity*dt;p.life-=dt;});game.particles=game.particles.filter(p=>p.life>0);
  for (const cp of game.checkpoints) {
    if (!cp.reached && Math.abs(player.x-cp.x)<42 && Math.abs(player.y-cp.y)<76) {
      cp.reached=true;
      saveGame(true);
      toast('CHECKPOINT REACHED','Your trail is safely saved in the journal.');
    }
  }
  for(let x=1180;x<MAP_WIDTH-200;x+=760) if(!player.invulnerable&&Math.abs(player.x-x)<18&&player.grounded) hurtPlayer();
  if(game.chapter===2) updateCanyonEnemies(dt);
  if(game.time-game.lastSave>12){saveGame();game.lastSave=game.time;}
}
function hurtPlayer(){player.invulnerable=1.1;player.hurtTimer=.3;player.vx=-player.facing*260;game.hp=Math.max(0,game.hp-1);addBurst(player.x+14,player.y+20,'book');sound('land');if(!game.hp){game.hp=game.maxHp;player.x=800;player.y=GROUND-player.h;toast('BOND RECOVERED','Professor Carbon restored your health at the ruins.');}updateHud();}
function addDust(x,y,count){for(let i=0;i<count;i++)game.particles.push({x,y:y-4,vx:(Math.random()-.5)*55,vy:-Math.random()*35,gravity:65,life:.35,color:'#d9d0a2',size:2+Math.random()*3});}
function addBurst(x,y,kind){const color=kind==='coin'?'#ffd15c':kind==='book'?'#ff9b6b':'#72e9ff';for(let i=0;i<14;i++)game.particles.push({x,y,vx:(Math.random()-.5)*120,vy:(Math.random()-.7)*120,gravity:110,life:.55,color,size:3});}
function updateCamera(dt) { const desired=player.x-W*.42; game.camera=approach(game.camera,Math.max(0,Math.min(MAP_WIDTH-W,desired)),Math.abs(desired-game.camera)*Math.min(1,dt*6)); }

/* Story cutscene setup and animation. */
function startAdventure() {
  playMenuClick();
  buildForest();
  game.chapter=1; game.demoMode=false;demoManager.active=false; game.chapter2Unlocked=false; game.chapter3Unlocked=false; game.chapter4Unlocked=false; game.chapter5Unlocked=false; game.endingUnlocked=false; game.mainChainCrystalFound=false; game.lowestNumberRuleUnlocked=false; game.scrolls=0; game.enemies=[];sceneManager.set('story');
  game.mode='transition';
  game.menuTransition=true; game.menuFade=0;
  game.story.scene=0; game.story.timer=0; game.story.fade=0;
  $('startMenu').classList.add('hidden');
  stopMenuMusic();
  startAmbience();
  updateHud();
}
function chooseDifficulty(level){game.difficulty=level;const config=learningManager.setDifficulty(level);$('difficultyModal').classList.add('hidden');$('startMenu').classList.add('hidden');toast(`${config.label.toUpperCase()} MODE`,`${config.range} molecules · reward ×${config.multiplier}${config.timer?` · ${config.timer}s trials`:''}`);startAdventure();}
function openDifficulty(){ $('difficultyModal').classList.remove('hidden'); }
function updateStoryCutscene(dt) {
  game.story.timer+=dt;
  if (game.story.scene===0) {
    if (game.story.timer>2.6) {
      game.story.scene=1; game.story.timer=0; game.story.fade=0;
    }
  } else if (game.story.scene===1) {
    if (game.story.timer>3.4) {
      game.mode='playing';sceneManager.set('forest');
      player.x=160; player.y=320; game.worldMapUnlocked=true; game.journalUnlocked=true; game.mainChainRuleUnlocked=true;
      setQuest('Recover the Main Chain Crystal.');
      showDialogue('Professor Carbon', [
        'The AlkanOdyssey is an adventure game that helps players learn IUPAC alkane naming through exploration and problem solving.',
        'Learning goals: find the longest carbon chain, number atoms correctly, identify alkyl groups, and name compounds with IUPAC rules.',
        'Welcome Alkanist!',
        'Our first mission is to recover the Main Chain Crystal.',
        'Someone has stolen the IUPAC Crystals.',
        'Without them, students can no longer correctly name alkane compounds.',
        'First find the longest chain. Then number it and identify any alkyl branches.',
        'You have received the Adventure Journal, World Map, and your first quest.'
      ], ()=> {
        game.abilities.mainChainVision=true;questManager.start('main_chain_crystal','Quest 1: Recover the Main Chain Crystal',3);updateHud(); saveGame();
        startPuzzle();
      });
      toast('STORY INTRO','The Great Book of IUPAC glows as the adventure begins.');
    }
  }
}

/* Presentation helpers make learning goals and completion visible during demonstrations. */
function openTutorial(){tutorialManager.start();renderTutorial();$('tutorialModal').classList.remove('hidden');}
function renderTutorial(){const step=tutorialManager.current();if(!step){$('tutorialModal').classList.add('hidden');saveGame();return;}$('tutorialTitle').textContent=step.title;$('tutorialText').textContent=step.text;$('tutorialNext').textContent=tutorialManager.index===tutorialManager.steps.length-1?'START EXPLORING':'NEXT';}
function nextTutorial(){const next=tutorialManager.next();if(!next){$('tutorialModal').classList.add('hidden');saveGame();return;}renderTutorial();}
function openProgressDashboard(){const completed=questManager.completedQuests.length;const chapter=Math.min(5,game.chapter);$('progressContent').innerHTML=`<article class="entry"><strong>Chapter: ${chapter}/5</strong><p>${sceneManager.currentScene||'Campaign'} · ${game.demoMode?'Competition Demo active':'Normal Adventure'}</p></article><article class="entry"><strong>IUPAC Crystals: ${game.crystals}</strong><p>Knowledge Points: ${game.knowledgePoints} · Chapter Stars: ${game.chapterStars}</p></article><article class="entry"><strong>Completed Quests: ${completed}</strong><p>Questions completed: ${Math.round(game.knowledgePoints/10)} · Correct-answer rewards are saved automatically.</p></article>`;$('progressModal').classList.remove('hidden');}
function openAchievementScreen(){const completed=questManager.completedQuests.length;$('achievementContent').innerHTML=`<article class="entry"><strong>Questions Completed: ${Math.round(game.knowledgePoints/10)}</strong><p>Correct Answers: ${Math.round(game.knowledgePoints/10)}</p></article><article class="entry"><strong>Knowledge Points: ${game.knowledgePoints}</strong><p>Chapters reached: ${Math.min(5,game.chapter)}/5 · Quests completed: ${completed}</p></article>`;$('achievementModal').classList.remove('hidden');}
function openStatistics(){const s=game.stats, minutes=Math.floor(s.playSeconds/60),percent=Math.min(100,Math.round((Math.min(5,game.chapter)/5)*100)),attempts=s.correctAnswers+s.wrongAnswers;$('statisticsContent').innerHTML=`<article class="entry"><strong>Total Play Time</strong><p>${minutes} min ${Math.floor(s.playSeconds%60)} sec</p></article><article class="entry"><strong>Chapters Completed</strong><p>${game.chapterStars}/5 · Completion ${percent}%</p></article><article class="entry"><strong>Questions</strong><p>Solved: ${s.puzzlesSolved} · Correct: ${s.correctAnswers} · Wrong: ${s.wrongAnswers} · Accuracy: ${attempts?Math.round(s.correctAnswers/attempts*100):0}%</p></article><article class="entry"><strong>Learning Recommendation</strong><p>Review <strong>${analyticsManager.weakest()}</strong>. Your strongest performance is ${analyticsManager.strongestChapter()}.</p></article><article class="entry"><strong>Knowledge Points</strong><p>${game.knowledgePoints} · Quests completed: ${questManager.completedQuests.length}</p></article>`;$('statisticsModal').classList.remove('hidden');}
function openGallery(){const unlocked=Math.min(5,game.chapter);$('galleryContent').innerHTML=['Story Artwork','Professor Carbon','Carbon Forest','Carbon Canyon','Branch Forest','Crystal Library','Temple of IUPAC','Carbon Guardian','IUPAC Explorer Certificate'].map((name,index)=>`<article class="entry"><strong>${index<unlocked+2||game.completedFinalExam?name:'Locked Artwork'}</strong><p>${index<unlocked+2||game.completedFinalExam?'Unlocked through campaign progress.':'Complete more chapters to unlock this gallery item.'}</p></article>`).join('');$('galleryModal').classList.remove('hidden');}
function startCompetitionDemo(){demoManager.start(game,sceneManager);buildCampaignChapter(5);game.mode='playing';player.x=130;player.y=GROUND-player.h;$('startMenu').classList.add('hidden');startAmbience();updateHud();showDialogue('Professor Carbon',['Competition Demo activated.','Explore the Temple, review the IUPAC systems, then face the Carbon Guardian.']);toast('COMPETITION DEMO','All showcase chapters and learning abilities are unlocked.');saveGame();}

/* Main menu drawing with animated clouds, crystals, and pixel lighting. */
function drawMenuScene() {
  drawSkyMenu(); drawCloudsMenu(); drawParallaxHills(); drawCrystalField(); drawLaboratory(); drawGrass(); drawChemistryParticles(); drawLighting();
  drawTitleGlow();
  if (game.menuTransition) {
    ctx.fillStyle = `rgba(7, 12, 24, ${game.menuFade * 0.8})`;
    ctx.fillRect(0, 0, W, H);
  }
}
function drawSkyMenu() {
  const grad=ctx.createLinearGradient(0,0,0,H); grad.addColorStop(0,'#6fb6d8'); grad.addColorStop(.42,'#9fe0cc'); grad.addColorStop(1,'#ebf4b8'); ctx.fillStyle=grad; ctx.fillRect(0,0,W,H);
  for (let i=0;i<56;i++) {
    const x=(i*173+game.time*18)%W; const y=26+(i%7)*40; circle(x,y,1+(i%3),'rgba(255,255,255,.28)');
  }
}
function drawCloudsMenu() {
  const drift=game.time*18; for (let i=0;i<8;i++) {
    const x=(i*170+drift)% (W+260) - 120; const y=72+(i%3)*38;
    rect(x+8,y+8,30,12,'rgba(255,255,255,.8)'); rect(x+20,y,18,12,'rgba(255,255,255,.8)'); rect(x+36,y+8,24,10,'rgba(255,255,255,.8)');
  }
}
function drawParallaxHills() {
  ctx.save();
  ctx.translate(-game.time * 8, 0);
  ctx.fillStyle='#6b8e7b'; ctx.beginPath(); ctx.moveTo(0, 300); ctx.lineTo(120, 252); ctx.lineTo(240, 288); ctx.lineTo(360, 244); ctx.lineTo(520, 290); ctx.lineTo(680, 246); ctx.lineTo(840, 284); ctx.lineTo(960, 258); ctx.lineTo(960, 540); ctx.lineTo(0, 540); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#8db892'; ctx.beginPath(); ctx.moveTo(0, 336); ctx.lineTo(150, 308); ctx.lineTo(312, 330); ctx.lineTo(480, 292); ctx.lineTo(660, 324); ctx.lineTo(840, 300); ctx.lineTo(960, 320); ctx.lineTo(960, 540); ctx.lineTo(0, 540); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function drawCrystalField() {
  game.menuCrystals.forEach((crystal,i) => {
    const y=crystal.y+Math.sin(game.time*1.3+i)*14; const x=crystal.x+Math.cos(game.time*0.6+i)*8;
    rect(x+2,y+10,6,16,'#4d7f96'); rect(x+1,y+2,8,10,'#89f0ff'); rect(x+3,y-6,4,8,'#d8ffff'); circle(x+5,y+8,3,'rgba(255,255,255,.6)');
    rect(x+4,y+18,2,4,'#6fcf8f');
  });
}
function drawLaboratory() {
  const x=700; const y=302;
  rect(x,y,120,90,'#5f5a8a'); rect(x+10,y-16,102,18,'#8f7fbe'); rect(x+18,y+10,16,24,'#f5dbc8'); rect(x+46,y+10,16,24,'#f5dbc8'); rect(x+74,y+10,16,24,'#f5dbc8'); rect(x+22,y+42,78,18,'#7eddd5'); rect(x+28,y+58,20,8,'#d8e4ff'); rect(x+56,y+58,20,8,'#d8e4ff'); rect(x+22,y-28,10,10,'#f2c454'); rect(x+86,y-28,10,10,'#f2c454'); rect(x+74,y+18,8,12,'#ff7aa2'); rect(x+96,y+20,8,10,'#ff8e41');
}
function drawGrass() {
  for (let i=0;i<24;i++) {
    const x=i*40 + (Math.sin(game.time*1.8 + i) * 6);
    const h=16 + ((i%4) * 3);
    rect(x, 430 + (i%3) * 2, 8, h, '#75b56a'); rect(x+2, 430 + (i%3) * 2 + h - 6, 4, 6, '#5e9b4f');
  }
}
function drawChemistryParticles() {
  initMenuParticles();
  game.menuParticles.forEach(p => {
    circle(p.x, p.y, p.size, p.color);
    rect(p.x - 1, p.y - 6, 2, 6, '#fff');
  });
}
function drawLighting() {
  const light=ctx.createLinearGradient(0,0,W,H); light.addColorStop(0,'rgba(255,236,168,.1)'); light.addColorStop(1,'rgba(29,46,72,.25)'); ctx.fillStyle=light; ctx.fillRect(0,0,W,H);
  ctx.fillStyle='rgba(10,12,22,.16)'; ctx.fillRect(0,0,W,H);
}
function drawTitleGlow() {
  ctx.save();
  ctx.textAlign='center';
  ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,.72)'; ctx.font='bold 44px monospace'; ctx.fillText('THE ALKANODYSSEY', W/2, 140);
  ctx.strokeStyle='#6a4c2b'; ctx.lineWidth=3; ctx.strokeText('THE ALKANODYSSEY', W/2, 140);
  ctx.font='bold 13px monospace'; ctx.fillStyle='#ffd385'; ctx.fillText('Restore the Lost IUPAC Crystals', W/2, 172);
  ctx.restore();
}

/* Chapter 1 world rendering. */
function drawWorld() {
  ctx.clearRect(0,0,W,H); drawSky(); drawMountains(); drawClouds(); drawForestBack();
  ctx.save(); ctx.translate(-Math.round(game.camera),0);
  drawGround(); drawRiverAndBridge(); drawRuins(); drawTrees(); drawPlatforms(); drawDecor(); drawCheckpoints(); drawCollectibles(); drawTreasures(); drawSignboards(); drawNPCs(); drawGate(); drawPlayer(); drawParticles(); drawMolecules(); drawFireflies();
  ctx.restore(); drawForeground();
  if (game.celebration) drawCelebration();
}
function drawSky(){const grad=ctx.createLinearGradient(0,0,0,H);grad.addColorStop(0,'#6fb6d8');grad.addColorStop(.58,'#9fe0cc');grad.addColorStop(1,'#e7f4b6');ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);for(let i=0;i<70;i++){let x=(i*149-game.camera*.06)%1050;if(x<0)x+=1050;circle(x,42+(i%7)*33,1+(i%3),'rgba(212,255,247,.42)');}}
function drawMountains(){ctx.save();ctx.translate(-game.camera*.12,0);for(let i=-1;i<8;i++){let x=i*260;ctx.fillStyle=i%2?'#6d8d8d':'#5d7578';ctx.beginPath();ctx.moveTo(x,330);ctx.lineTo(x+122,170+(i%3)*28);ctx.lineTo(x+248,330);ctx.fill();ctx.fillStyle='#9fcbba';ctx.beginPath();ctx.moveTo(x+42,330);ctx.lineTo(x+128,194);ctx.lineTo(x+216,330);ctx.fill();}ctx.restore();}
function drawClouds(){ctx.save();ctx.translate(-game.camera*.22,0);for(let i=0;i<8;i++){let x=i*190+30,y=70+(i%3)*48;rect(x+8,y+8,24,10,'rgba(255,255,255,.82)');rect(x+18,y,18,10,'rgba(255,255,255,.82)');rect(x+35,y+8,20,10,'rgba(255,255,255,.82)');}ctx.restore();}
function drawForestBack(){ctx.save();ctx.translate(-game.camera*.38,0);for(let i=-2;i<20;i++){let x=i*100;rect(x+5,220,20,190,'#4c6a5d');rect(x+10,190,24,48,'#5b856c');rect(x+2,210,10,44,'#507a5e');rect(x+24,208,16,40,'#3f6b57');rect(x+8,176,18,14,'#8eca8a');}ctx.restore();}
function drawGround(){rect(0,GROUND,MAP_WIDTH,H-GROUND,'#2f4a3d');rect(0,GROUND,MAP_WIDTH,8,'#8fcf6d');rect(0,GROUND+8,MAP_WIDTH,6,'#5ca55a');for(let x=0;x<MAP_WIDTH;x+=34){rect(x,GROUND+31+(x%4)*7,20,3,'#53795c'); if ((x/34)%2===0) rect(x+4,GROUND+21,8,6,'#7fba6b');}}
function drawRiverAndBridge(){
  const riverY=GROUND-6; ctx.fillStyle='#4d83a5'; ctx.fillRect(1480,riverY,520,34); ctx.fillStyle='#72b7d6'; ctx.fillRect(1480,riverY+4,520,8);
  for (let x=1500; x<1980; x+=24) {
    const wave=8+Math.sin(game.time*3+x*0.05)*5;
    rect(x,riverY+10+wave,12,6,'rgba(220,248,255,.9)');
  }
  rect(1560,GROUND-28,220,10,'#8f6a3f'); rect(1580,GROUND-38,180,10,'#c5914b'); rect(1620,GROUND-44,138,10,'#6c4c2a');
  for (let i=0;i<8;i++) rect(1582+i*18,GROUND-44-(i%2)*4,8,16,'#4e342e');
  rect(3320,GROUND-16,120,8,'#7f5d3d'); rect(3360,GROUND-24,80,8,'#a67745');
  for (let i=0;i<4;i++) rect(3340+i*28,GROUND-24-(i%2)*3,10,18,'#4e342e');
  const fallX=3480; ctx.fillStyle='#2f6d8f'; ctx.fillRect(fallX,GROUND-96,44,96); ctx.fillStyle='#5b9dba'; ctx.fillRect(fallX+6,GROUND-116,32,24); for (let i=0;i<8;i++) rect(fallX+8+i*5,GROUND-94-i*8,4,12,'rgba(214,246,255,.85)');
}
function drawRuins(){for(let x=420;x<740;x+=54){rect(x,GROUND-92-(x%3)*14,24,90+(x%3)*14,'#8ea4a0');rect(x-2,GROUND-96-(x%3)*14,28,8,'#c1cdb8');rect(x+7,GROUND-62,10,18,'#5f6d73');rect(x+7,GROUND-78,10,6,'#f0d2a0');}rect(385,GROUND-31,390,10,'#6f7f7c');}
function drawTrees(){for(let x=90;x<MAP_WIDTH;x+=170){let h=90+(x/17%4)*18;rect(x+8,GROUND-h+6,12,h-10,'#6b4d3b');rect(x+4,GROUND-h+6,6,h-14,'#8d633f');rect(x+6,GROUND-h-24,24,24,'#7cb56f');rect(x+2,GROUND-h-30,32,22,'#5d9d5a');rect(x+14,GROUND-h-38,10,10,'#7cd7e6');if(x%340===90){rect(x+12,GROUND-h-44,8,8,'#ffd56b');}}}
function drawPlatforms(){for(let x=930;x<MAP_WIDTH-300;x+=410){rect(x,GROUND-85-(x%3)*27,118,10,'#80665a');rect(x+6,GROUND-91-(x%3)*27,108,7,'#c38d61');rect(x+22,GROUND-68-(x%3)*27,5,13,'#6b5145');rect(x+92,GROUND-68-(x%3)*27,5,13,'#6b5145');}for(let x=1320;x<MAP_WIDTH;x+=820){rect(x,GROUND-42,83,42,'#687477');rect(x-6,GROUND-47,95,8,'#a9b1ab');}}
function drawDecor(){for(let x=45;x<MAP_WIDTH;x+=73){let flower=(x/73|0)%3;if(flower===0){rect(x,GROUND-16,2,16,'#5c7d53');circle(x-3,GROUND-20,4,'#ff78a2');circle(x+4,GROUND-20,4,'#ff78a2');circle(x,GROUND-25,3,'#ffda5d');}if(flower===1){rect(x,GROUND-14,3,14,'#6c955d');circle(x+2,GROUND-17,6,'#6fddff');}if(flower===2){rect(x,GROUND-14,4,14,'#7a6b3b');circle(x+2,GROUND-18,9,'#c58bff');circle(x+2,GROUND-20,4,'#e7c6ff');}}for(let x=1180;x<MAP_WIDTH-200;x+=760){rect(x,GROUND-16,3,16,'#86465e');rect(x+5,GROUND-13,3,13,'#86465e');circle(x+2,GROUND-18,6,'#f45e86');}for(const b of game.butterflies){let x=b.x, y=b.y+Math.sin(game.time*3+b.phase)*9;circle(x,y,4,b.color);circle(x+5,y-3,4,b.color);rect(x+3,y,1,6,'#303747');}for(const l of game.leaves){let x=l.x+Math.sin(game.time+l.phase)*l.drift,y=l.y+((game.time*18+l.phase*42)%330);rect(x,y,3,5,'#d9ad62');}}
function drawCollectibles(){for(const c of game.collectibles){if(c.taken)continue;let y=c.y+Math.sin(game.time*2+c.phase)*7;if(c.kind==='coin'){circle(c.x,y,10,'#c68a1b');circle(c.x,y,7,'#ffd56b');rect(c.x-1,y-6,2,12,'#fff8a6');rect(c.x-3,y-2,6,4,'#fff8a6');}else if(c.kind==='book'){rect(c.x-9,y-8,18,16,'#7a4d7e');rect(c.x-7,y-6,14,12,'#f5e6b6');rect(c.x-4,y-4,8,8,'#ffb36b');rect(c.x+5,y-5,3,10,'#ff7e65');}else{ctx.fillStyle='rgba(96,232,255,.18)';ctx.fillRect(c.x-14,y-16,28,32);ctx.fillStyle='#71f0ff';ctx.beginPath();ctx.moveTo(c.x,y-16);ctx.lineTo(c.x+10,y-6);ctx.lineTo(c.x+4,y+15);ctx.lineTo(c.x-4,y+15);ctx.lineTo(c.x-10,y-6);ctx.closePath();ctx.fill();rect(c.x-2,y-7,4,18,'#d9ffff');}}}
function drawTreasures(){for(const chest of game.treasures){if(chest.opened)continue; const y=GROUND-38; rect(chest.x,y,18,18,'#7d4a2f'); rect(chest.x+3,y+3,12,12,'#b8693a'); rect(chest.x+6,y+6,6,6,'#ffd986'); rect(chest.x+7,y+2,4,6,'#4b2d1c');}}
function drawSignboards(){for(const sign of game.signboards){rect(sign.x,GROUND-66,18,28,'#9d6b41'); rect(sign.x+3,GROUND-62,12,20,'#d9c56d'); rect(sign.x+6,GROUND-58,6,12,'#fdf2a9'); rect(sign.x+4,GROUND-74,10,8,'#6b4d3b');}}
function drawCheckpoints(){for(const cp of game.checkpoints){const y=cp.reached?GROUND-74:GROUND-86; rect(cp.x,y,16,20,'#9a3c3c'); rect(cp.x+2,y-6,12,8,'#ffcb61'); rect(cp.x+5,y+14,6,8,'#7b2d2d'); if(!cp.reached){ circle(cp.x+8,y-8,4,'rgba(255,220,90,.78)'); }}}
function drawFireflies(){for(const f of game.fireflies){const y=f.y+Math.sin(game.time*2.3+f.phase)*4; circle(f.x,y,2,'rgba(255,230,120,.9)');}}
function drawNPCs(){for(const npc of game.npcs){const y=npc.y; if (npc.id==='professor') { rect(npc.x+4,y-39,20,14,'#dfaa83'); rect(npc.x,y-45,28,8,'#f1f0db'); rect(npc.x+5,y-34,4,4,'#202c39'); rect(npc.x+18,y-34,4,4,'#202c39'); rect(npc.x+3,y-24,22,27,'#76536e'); rect(npc.x+5,y+3,7,8,'#3b3743'); rect(npc.x+17,y+3,7,8,'#3b3743'); rect(npc.x+8,y-18,12,8,'#ff7ea3'); }
  if (npc.id==='rabbit') { rect(npc.x,y-20,16,20,'#7d5b44'); rect(npc.x+2,y-24,6,4,'#fff'); rect(npc.x+8,y-24,6,4,'#fff'); rect(npc.x+3,y-10,10,10,'#ffb47a'); rect(npc.x+2,y-12,3,4,'#7d5b44'); rect(npc.x+10,y-12,3,4,'#7d5b44'); }
  if (npc.id==='student') { rect(npc.x,y-30,18,30,'#3c5379'); rect(npc.x+2,y-35,6,6,'#f0c48f'); rect(npc.x+10,y-35,6,6,'#f0c48f'); rect(npc.x+5,y-12,8,8,'#69e4df'); rect(npc.x+3,y-18,12,6,'#ff7ea3'); }} }
function drawGate(){const x=game.gate.x; const open=game.gate.opened; const glow=game.mainChainCrystalFound||game.gate.opened; rect(x,GROUND-120,36,120,'#4f6c7a'); rect(x+8,GROUND-94,20,95,'#91cfd6'); rect(x+4,GROUND-132,28,12,'#5f7c54'); if (glow) { circle(x+18,GROUND-132,11,'rgba(113,242,255,.95)'); rect(x+14,GROUND-140,8,18,'#dffcff'); } else { rect(x+14,GROUND-118,8,12,'#7a9aa2'); } if (open) { rect(x+12,GROUND-98,8,40,'#7cf2ff'); rect(x+15,GROUND-100,2,42,'#fff'); } }
function drawMolecules(){for(const m of game.molecules){const x=m.x+Math.sin(game.time*1.2+m.phase)*5; const y=m.y+Math.cos(game.time*0.8+m.phase)*6; circle(x,y,m.size,m.color); rect(x-1,y-8,2,16,'#fff'); rect(x-8,y-1,16,2,'#fff');}} 
function drawPlayer(){
  if(player.invulnerable&&Math.floor(game.time*18)%2)return;
  const x=player.x,y=player.y,bob=player.state==='idle'?Math.sin(game.time*3)*1:0;
  const swing=player.state==='walk'||player.state==='run'?Math.sin(game.time*(player.state==='run'?16:12))*5:0;
  const flip=player.facing;
  ctx.save();
  ctx.translate(x+14,y+22+bob);
  ctx.scale(flip,1);
  if(player.state==='hurt')ctx.rotate(-.12);
  rect(-12,24,24,4,'rgba(18,24,28,.3)');
  rect(-10,14+swing*0.2,8,10,'#2b4a79');
  rect(4,14-swing*0.2,8,10,'#2b4a79');
  rect(-11,22,8,6,'#6b4d3b');
  rect(5,22,8,6,'#6b4d3b');
  rect(-14,-8,28,24,'#4c7bc4');
  rect(-13,-12,26,10,'#7fd0ff');
  rect(-15,2,5,12,'#6d4e2f');
  rect(-16,4,7,6,'#ff7ea3');
  rect(-10,-24,20,10,'#2f1f10');
  rect(-8,-18,16,8,'#1b1610');
  rect(-7,-16,14,6,'#f7d0b0');
  rect(-9,-14,18,8,'#202833');
  rect(-5,-14,4,8,'#7fdce8');
  rect(4,-14,4,8,'#7fdce8');
  rect(-16,-10,6,12,'#ffb37a');
  rect(10,-10,6,12,'#ffb37a');
  rect(8,-20,6,12,'#1e1612');
  rect(-8,-25,16,10,'#f3c28f');
  rect(-4,-24,8,8,'#202833');
  if(player.state==='celebrate'){rect(12,-15,10,3,'#f5c199');rect(-23,-15,10,3,'#f5c199');}
  ctx.restore();
}
function drawParticles(){for(const p of game.particles){ctx.globalAlpha=Math.max(0,p.life*2);rect(p.x,p.y,p.size,p.size,p.color);}ctx.globalAlpha=1;}
function drawForeground(){ctx.save();ctx.translate(-game.camera*.72,0);for(let x=-30;x<W+60;x+=76){rect(x,H-62,5,65,'#225342');circle(x+4,H-83,25,'#29664e');rect(x+10,H-74,12,18,'#5da16b');}ctx.restore();}
function drawCelebration(){if (!game.celebration) return; const t=clamp(game.celebration.timer/1.5,0,1); const x=game.celebration.startX+(game.celebration.targetX-game.celebration.startX)*t; const y=game.celebration.startY+(game.celebration.targetY-game.celebration.startY)*t; circle(x,y,8,'#62e7ff'); rect(x-3,y-12,6,20,'#d9ffff'); circle(x+10,y-10,4,'#ffd56b'); circle(x-10,y+6,4,'#ff7ea3'); if (t>=1) game.celebration=null; }
/* Educational mission flow for the crystal shrine. */
function shuffleArray(items) {
  const copy=[...items];
  for (let i=copy.length-1;i>0;i--) {
    const j=Math.floor(Math.random()*(i+1));
    [copy[i],copy[j]]=[copy[j],copy[i]];
  }
  return copy;
}
function createMissionPool() {
  const templates=[
    {name:'Shrine Structure A', structure:'CH3-CH2-CH(CH3)-CH2-CH2-CH3', explanation:'A branch creates a longer path than the straight line at first glance.', longest:6},
    {name:'Shrine Structure B', structure:'CH3-CH(CH3)-CH2-CH2-CH2-CH3', explanation:'The longest path passes through the branch and reaches six carbons.', longest:6},
    {name:'Shrine Structure C', structure:'CH3-CH2-CH2-CH(CH2CH3)-CH2-CH3', explanation:'The longest chain includes the side branch and reaches seven carbons.', longest:7},
    {name:'Shrine Structure D', structure:'CH3-CH(CH3)-CH(CH3)-CH2-CH3', explanation:'A longer chain hides behind the branching points.', longest:5},
    {name:'Shrine Structure E', structure:'CH3-CH2-CH(CH3)-CH2-CH3', explanation:'Follow the chain carefully; the longest route is not the first straight line.', longest:5},
    {name:'Shrine Structure F', structure:'CH3-CH2-CH2-CH2-CH(CH3)-CH3', explanation:'The branch still counts, so the longest chain reaches six carbons.', longest:6},
    {name:'Shrine Structure G', structure:'CH3-CH(CH2CH3)-CH2-CH2-CH3', explanation:'The side chain is part of a longer continuous path.', longest:6},
    {name:'Shrine Structure H', structure:'CH3-CH2-CH(CH3)-CH(CH3)-CH3', explanation:'Trace every branch before choosing the parent chain.', longest:6},
    {name:'Shrine Structure I', structure:'CH3-CH2-CH2-CH2-CH2-CH(CH3)-CH3', explanation:'A seven-carbon chain is hidden by the side branch.', longest:7},
    {name:'Shrine Structure J', structure:'CH3-CH(CH3)-CH2-CH2-CH3', explanation:'The longest chain is the path with the most carbon atoms in sequence.', longest:5}
  ];
  return shuffleArray(templates).slice(0,10);
}
function buildMissionPuzzle() {
  const current = game.mission.pool[game.mission.currentIndex];
  if (!current) return null;
  const correct = current.longest;
  const distractors = [Math.max(2, correct - 1), Math.max(2, correct - 2), Math.max(2, correct + 1)];
  const options = shuffleArray([
    {label:`${correct}-carbon chain`, value:correct},
    {label:`${distractors[0]}-carbon chain`, value:distractors[0]},
    {label:`${distractors[1]}-carbon chain`, value:distractors[1]},
    {label:`${distractors[2]}-carbon chain`, value:distractors[2]}
  ]);
  return {current, options, correctValue:correct};
}
function renderMissionPuzzle() {
  game.puzzleActive=true;sceneManager.set('mainChainHunter');
  game.puzzle=buildMissionPuzzle();
  if (!game.puzzle) return;
  const {current, options, correctValue} = game.puzzle;
  $('puzzlePrompt').textContent=`Main Chain Hunter · Trial ${game.mission.currentIndex + 1} / 10`;
  $('puzzleStructure').innerHTML=`<div class="puzzle-structure-card"><strong>${current.name}</strong><div class="puzzle-structure-text">${current.structure}</div><p>${current.explanation}</p></div>`;
  $('puzzleFeedback').textContent='Choose the longest continuous carbon chain.';
  $('puzzleOptions').innerHTML='';
  options.forEach((option,index) => {
    const button=document.createElement('button');
    button.className='puzzle-option';
    button.textContent=option.label;
    button.onclick=()=>answerPuzzle(index);
    $('puzzleOptions').appendChild(button);
  });
  $('puzzleModal').classList.remove('hidden');
  $('puzzleModal').querySelector('.close').onclick=()=>{ $('puzzleModal').classList.add('hidden'); game.puzzleActive=false; sceneManager.set('forest'); };
}
function startPuzzle() {
  if (game.mainChainCrystalFound || game.gate.opened) return;
  if (!game.mission.started) {
    game.mission.started=true;
    game.mission.active=true;
    game.mission.pool=createMissionPool();
    game.mission.currentIndex=0;
    game.mission.solved=0;
    showDialogue('Professor Carbon', [
      'Welcome, young alkanist.',
      'In this shrine, the parent chain rule guides every name.',
      'Find the longest continuous carbon chain in each structure.',
      'Choose carefully and the crystal will reveal itself.'
    ], ()=>renderMissionPuzzle());
    return;
  }
  if (game.puzzleActive) return;
  if (!game.mission.active) {
    game.mission.active=true;
    game.mission.pool=createMissionPool();
    game.mission.currentIndex=0;
    game.mission.solved=0;
  }
  renderMissionPuzzle();
}
function answerPuzzle(index) {
  const selected = game.puzzle.options[index];
  if (!selected) return;
  const current = game.mission.pool[game.mission.currentIndex];
  if (selected.value === current.longest) {
    game.mission.solved += 1;
    game.xp += 100;
    game.crystals += 1;
    game.mainChainRuleUnlocked = true;
    game.journalUnlocked = true;
    game.worldMapUnlocked = true;
    game.mission.currentIndex += 1;
    sound('crystal');
    updateHud();
    if (game.mission.currentIndex >= game.mission.pool.length) {
      game.mission.completed=true;
      game.mission.active=false;
      game.gate.opened=true;
      game.mainChainCrystalFound=true;
      game.chapter2Unlocked=true;
      sceneManager.unlock(2); questManager.complete('main_chain_crystal'); game.chapterStars++;
      game.puzzleActive=false;
      $('puzzleModal').classList.add('hidden');
      setQuest('Chapter 2 unlocked: Carbon Canyon');
      toast('MAIN CHAIN CRYSTAL','The shrine crystal glows. The Main Chain Rule is unlocked and Chapter 2 is now open.');
      game.celebration={timer:0,startX:game.gate.x+18,startY:GROUND-100,targetX:120,targetY:70};
      saveGame(true);
      showDialogue('Professor Carbon', [
        'Excellent work.',
        'You have mastered the parent chain rule.',
        'The Main Chain Crystal is restored.',
        'Carbon Canyon now opens for your next lesson.'
      ], ()=> {
        updateHud(); beginCanyonTransition();
      });
      return;
    }
    $('puzzleFeedback').textContent=`Correct! +100 XP. The longest chain is ${current.longest} carbons. The shrine crystal brightens.`;
    const buttons=[...$('puzzleOptions').querySelectorAll('button')];
    buttons.forEach(button => button.classList.add('correct'));
    setTimeout(() => {
      if (!game.mainChainCrystalFound) renderMissionPuzzle();
    }, 650);
    return;
  }
  $('puzzleFeedback').textContent=`Not yet. ${current.explanation} The correct chain is ${current.longest} carbons.`;
  const buttons=[...$('puzzleOptions').querySelectorAll('button')];
  buttons.forEach((button, buttonIndex) => {
    const option=game.puzzle.options[buttonIndex];
    const isCorrect = option.value === current.longest;
    button.classList.toggle('correct', isCorrect);
    button.classList.toggle('wrong', !isCorrect);
  });
}

/* Sprint 5: fly from the restored forest crystal into Chapter 2. */
function beginCanyonTransition() {
  game.mode='canyonTransition';
  game.transition={timer:0,duration:4.2};
  hidePanels(); closeDialogue();
}
function updateCanyonTransition(dt) {
  game.transition.timer+=dt;
  if(game.transition.timer>=game.transition.duration){
    game.chapter=2; sceneManager.unlock(2);sceneManager.set('canyon',2); buildCanyonWorld(); questManager.start('chapter_2','Carbon Canyon: Branch Identification',2); player.x=130; player.y=GROUND-player.h; player.vx=player.vy=0; game.camera=0;
    game.mode='playing'; game.quest='Speak with the Crystal Miner in Carbon Canyon.'; updateHud(); saveGame();
    showDialogue('Professor Carbon',['Excellent work!','Now you must master the Lowest Number Rule.','Travel to Carbon Canyon.']);
  }
}
function drawCanyonTransition(){
  const t=clamp(game.transition.timer/game.transition.duration,0,1); const x=lerp(100,MAP_WIDTH-800,t);
  ctx.fillStyle='#162448';ctx.fillRect(0,0,W,H); circle(W/2,H/2,220,'#284f6a');
  for(let i=0;i<22;i++){const a=i*.62+game.time*.6;const r=130+(i%4)*24;circle(W/2+Math.cos(a)*r,H/2+Math.sin(a)*r,5,'#65dff5');}
  rect(80,350,800,28,'#53865a');rect(80,378,800,20,'#344e4d');
  drawSprite('heroRun',135+t*530,270,64,64,false,1);
  ctx.fillStyle='rgba(255,255,255,.88)';ctx.font='bold 17px monospace';ctx.textAlign='center';ctx.fillText(t<.5?'WORLD MAP · CARBON FOREST':'WORLD MAP · CARBON CANYON',W/2,92);ctx.font='11px monospace';ctx.fillText('Following the Main Chain Crystal resonance...',W/2,118);ctx.textAlign='start';
  for(let i=0;i<9;i++){const cx=(i*130-x*.1)%W;rect(cx,300-(i%3)*22,70,12,'#7a7c9d');}
}

/* Canyon interactions teach numbering before the puzzle is opened. */
function interactCanyon(){
  const npc=game.npcs.find(n=>Math.abs(player.x-n.x)<82&&Math.abs(player.y-n.y)<90);
  if(npc){npc.met=true;const lines=npc.id==='miner'
    ? ['Crystal Miner: Start at the end nearest the first branch.','The lowest possible number wins, not the direction that looks prettiest.']
    : npc.id==='explorer'
      ? ['Chemistry Explorer: Compare both directions before you commit.','A branch at carbon 2 is always better than one at carbon 4.']
      : ['Old Scientist: The parent chain is numbered to give substituents the lowest set of locants.','When the first point of difference is lower, that numbering is correct.'];
    showDialogue(npc.name,lines); game.lowestNumberRuleUnlocked=true; updateHud(); saveGame(); return;
  }
  const sign=game.signboards.find(s=>Math.abs(player.x-s.x)<70);
  if(sign){showDialogue('Crystal Canyon Sign',[sign.topic==='Lowest Number Rule'?'Lowest Number Rule: number from the end closest to the first substituent.':'Tip: compare locants at the first point they differ.']);return;}
  if(Math.abs(player.x-game.gate.x)<105){ if(!game.iupacDoorSolved)startIUPACPuzzle(2); else startCarbonNumberRush(); return; }
  toast('CANYON WIND','Find the Crystal Miner or follow the glow to the Numbering Altar.');
}
function updateCanyonEnemies(dt){
  for(const enemy of game.enemies){
    enemy.x+=enemy.vx*dt;
    if(enemy.x<enemy.patrol[0]||enemy.x>enemy.patrol[1])enemy.vx*=-1;
    const ey=enemy.id==='bat'?160+Math.sin(game.time*3)*24:GROUND-24;
    if(!player.invulnerable&&Math.abs(player.x-enemy.x)<27&&Math.abs(player.y-ey)<50)hurtPlayer();
  }
}

/* The draggable Carbon Number Rush evaluates both possible chain directions. */
function startCarbonNumberRush(){
  if(game.chapter3Unlocked){toast('NUMBERING ALTAR','Carbon Numbering is already mastered. Branch Forest is unlocked.');return;}
  const puzzles=[
    {chain:5,branch:3,name:'2-methylpentane',correct:'right'},
    {chain:6,branch:3,name:'3-ethylhexane',correct:'right'},
    {chain:5,branch:3,name:'2-methylpentane',correct:'right'},
    {chain:7,branch:4,name:'3-ethylheptane',correct:'right'}
  ];
  game.canyonPuzzle=puzzles[Math.floor(Math.random()*puzzles.length)]; game.canyonPuzzle.answer=[]; game.puzzleActive=true;
  $('numberPrompt').textContent=`${game.canyonPuzzle.name}: drag 1 through ${game.canyonPuzzle.chain} onto the carbon chain. Number from the end closest to the pink substituent.`;
  $('numberFeedback').textContent='';$('numberRetry').classList.add('hidden');$('numberCheck').classList.remove('hidden');renderNumberRush();$('numberPuzzle').classList.remove('hidden');
}
function renderNumberRush(){
  const puzzle=game.canyonPuzzle, chain=$('numberChain'), tiles=$('numberTiles');chain.innerHTML='';tiles.innerHTML='';
  for(let i=0;i<puzzle.chain;i++){const slot=document.createElement('div');slot.className='carbon-slot';slot.dataset.index=i;slot.textContent=puzzle.answer[i]||'';if(i===puzzle.branch)slot.style.boxShadow='inset 0 -8px #ff79a0';slot.addEventListener('dragover',e=>{e.preventDefault();slot.classList.add('over');});slot.addEventListener('dragleave',()=>slot.classList.remove('over'));slot.addEventListener('drop',e=>{e.preventDefault();slot.classList.remove('over');const number=+e.dataTransfer.getData('text/plain');if(!puzzle.answer.includes(number)){puzzle.answer[i]=number;renderNumberRush();}});chain.appendChild(slot);}
  for(let n=1;n<=puzzle.chain;n++)if(!puzzle.answer.includes(n)){const tile=document.createElement('div');tile.className='number-tile';tile.draggable=true;tile.textContent=n;tile.addEventListener('dragstart',e=>e.dataTransfer.setData('text/plain',n));tile.addEventListener('click',()=>{const empty=puzzle.answer.findIndex(x=>!x);if(empty!==-1){puzzle.answer[empty]=n;renderNumberRush();}});tiles.appendChild(tile);}
}
function checkCarbonNumberRush(){
  const puzzle=game.canyonPuzzle;if(puzzle.answer.length!==puzzle.chain||puzzle.answer.some(n=>!n)){ $('numberFeedback').textContent='Place every number on a carbon first.';return; }
  const expected=Array.from({length:puzzle.chain},(_,i)=>puzzle.chain-i); const correct=puzzle.answer.every((n,i)=>n===expected[i]);
  if(correct){game.xp+=150;game.crystals++;game.coins+=8;game.knowledgePoints+=10;game.chapterStars++;analyticsManager.attempt('numbering',true,0,2);game.stats.correctAnswers++;game.stats.puzzlesSolved++;game.lowestNumberRuleUnlocked=true;questManager.complete('chapter_2');game.puzzleActive=false;$('numberPuzzle').classList.add('hidden');updateHud();saveGame(true);toast('NUMBERING MASTERED','Correct! +150 XP · +10 Knowledge · +1 Star');completeChapter2();return;}
  analyticsManager.attempt('numbering',false,0,2);game.stats.wrongAnswers++;$('numberFeedback').innerHTML='<span class="number-bad">Wrong direction. The substituent must receive the lowest possible number. The correct numbering is now highlighted — retry from the right-hand end.</span>';[...document.querySelectorAll('.carbon-slot')].forEach((slot,i)=>{slot.textContent=expected[i];slot.classList.add('over');});$('numberCheck').classList.add('hidden');$('numberRetry').classList.remove('hidden');sound('land');
}
function retryCarbonNumberRush(){game.canyonPuzzle.answer=[];$('numberFeedback').textContent='Try again: begin at the end closest to the pink substituent.';$('numberRetry').classList.add('hidden');$('numberCheck').classList.remove('hidden');renderNumberRush();}

/* Crystal Canyon’s full pixel environment and its three enemy silhouettes. */
function drawCanyonWorld(){
  const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#152d62');sky.addColorStop(.58,'#437ca1');sky.addColorStop(1,'#9fe4dc');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
  ctx.save();ctx.translate(-game.camera*.16,0);for(let i=-1;i<9;i++){const x=i*190;ctx.fillStyle=i%2?'#475a91':'#384b7d';ctx.beginPath();ctx.moveTo(x,365);ctx.lineTo(x+95,90+(i%3)*45);ctx.lineTo(x+205,365);ctx.fill();rect(x+82,155,20,180,'#6ee9ff');rect(x+87,155,6,180,'#d9ffff');}ctx.restore();
  ctx.save();ctx.translate(-Math.round(game.camera),0);rect(0,GROUND,MAP_WIDTH,H-GROUND,'#4a4a68');rect(0,GROUND,MAP_WIDTH,8,'#8de7f5');for(let x=0;x<MAP_WIDTH;x+=50){rect(x,GROUND+18,26,5,'#626681');if(x%150===0){rect(x+13,GROUND-40,8,40,'#475069');circle(x+17,GROUND-48,14,'#77eaff');}}
  drawCanyonBridges();drawCanyonCaves();drawCanyonCollectibles();drawTreasures();drawSignboards();drawCanyonNPCs();drawCanyonEnemies();drawGate();drawPlayer();drawParticles();drawMolecules();drawFireflies();ctx.restore();
  ctx.save();ctx.translate(-game.camera*.7,0);for(let x=-20;x<W+60;x+=70){rect(x,H-45,6,45,'#33415c');circle(x+3,H-55,20,'#5a6f91');}ctx.restore();
  for(let i=0;i<20;i++){const x=(i*91-game.camera*.4)%W;rect(x,120+(i%7)*38,2,7,'rgba(234,247,255,.55)');}
}

/* Compact HUD map: player, active gate, guide, treasure, and puzzle objective. */
function drawMiniMap(){const map=$('miniMap');if(!map||game.mode==='menu'||game.mode==='story'||game.mode==='ending'){if(map)map.style.display='none';return;}map.style.display='block';const m=map.getContext('2d'),scale=map.width/MAP_WIDTH;m.clearRect(0,0,map.width,map.height);m.fillStyle='#18324a';m.fillRect(0,0,map.width,map.height);m.fillStyle='#5b8e72';m.fillRect(0,48,map.width,24);const dot=(x,y,color)=>{m.fillStyle=color;m.fillRect(Math.round(x*scale)-2,y-2,5,5);};dot(player.x,38,'#fff3a2');if(game.gate)dot(game.gate.x,36,'#d797ff');game.npcs.forEach(n=>dot(n.x,24,'#7eeaff'));game.treasures.filter(t=>!t.opened).forEach(t=>dot(t.x,57,'#ffcd68'));game.collectibles.filter(c=>!c.taken).slice(0,12).forEach(c=>dot(c.x,64,'#75f4ff'));}
function renderAvatar(){const preview=$('avatarPreview');if(!preview)return;const a=avatarManager.avatar;preview.style.background=`linear-gradient(${a.hairColor} 0 22%,${a.skin} 22% 60%,${a.clothing==='Crystal Cape'?'#8c6fd1':'#3f85d2'} 60%)`;preview.textContent=a.pet==='None'?'A':'A ✦';}
function openAvatar(){hidePanels();const select=document.querySelector('[data-avatar="hair"]');if(select&&!select.options.length)select.innerHTML=avatarManager.styles().map(s=>`<option>${s}</option>`).join('');document.querySelectorAll('[data-avatar]').forEach(input=>{input.value=avatarManager.avatar[input.dataset.avatar]||input.value;input.oninput=()=>{avatarManager.update(input.dataset.avatar,input.value);renderAvatar();};});renderAvatar();$('avatarModal').classList.remove('hidden');}
function openProfile(){hidePanels();const a=avatarManager.avatar,s=game.stats;$('profileContent').innerHTML=`<article class="entry"><strong>${a.clothing} Alkanist</strong><p>${a.accessory} · Pet: ${a.pet} · ${learningManager.config().label} difficulty</p></article><article class="entry"><strong>Knowledge Level</strong><p>${game.knowledgePoints} Knowledge Points · ${analyticsManager.accuracy()}% accuracy</p></article><article class="entry"><strong>Learning Analytics</strong><p>Questions: ${s.correctAnswers+s.wrongAnswers} · Weakest topic: ${analyticsManager.weakest()} · Best: ${analyticsManager.strongestChapter()}</p></article><article class="entry"><strong>Adventure Record</strong><p>${Math.floor(s.playSeconds/60)} minutes played · ${achievementManager.unlocked.length} achievements · ${game.chapterStars} stars</p></article>`;$('profileModal').classList.remove('hidden');}
function startPractice(skill,daily=false){hidePanels();const complexity=Math.max(1,Math.ceil((100-adaptiveLearningManager.mastery(skill))/25));let q=learningManager.question(skill,complexity),attempt=0;while(adaptiveLearningManager.row(skill).seen.includes(q.key)&&attempt++<20)q=learningManager.question(skill,complexity);game.practiceSession={skill,q,started:performance.now(),daily};$('iupacQuestion').textContent=`${daily?'DAILY CHALLENGE':'PRACTICE'} · ${q.prompt}`;$('iupacFormula').textContent=q.formula;$('iupacFeedback').textContent=daily?'Five questions earn a daily Knowledge bonus.':'Adaptive practice increases complexity as you improve.';const choices=$('iupacChoices');choices.innerHTML='';q.choices.forEach(choice=>{const b=document.createElement('button');b.textContent=choice;b.onclick=()=>answerPractice(choice);choices.appendChild(b);});game.puzzleActive=true;$('iupacPuzzleModal').classList.remove('hidden');}
function answerPractice(choice){const p=game.practiceSession;if(!p)return;const correct=choice===p.q.answer;const seconds=(performance.now()-p.started)/1000;analyticsManager.attempt(p.skill,correct,seconds,game.chapter);adaptiveLearningManager.attempt(p.skill,correct,seconds,{key:p.q.key,question:p.q.prompt,answer:p.q.answer,explanation:p.q.hint,hint:!correct});if(!correct){game.stats.wrongAnswers++;$('iupacFeedback').textContent=`Try again. ${learningManager.config().hints===0?'Use your notebook to review the rule.':p.q.hint}`;sound('land');return;}game.stats.correctAnswers++;game.stats.puzzlesSolved++;if(seconds<=5)unlockAchievement('fast_thinker','Fast Thinker','Solved an adaptive question in under five seconds.');game.knowledgePoints+=10;game.xp+=10;if(p.daily){game.dailySession.done++;if(game.dailySession.done>=5){const d=adaptiveLearningManager.dailyStart();d.completed=5;game.knowledgePoints+=30;unlockAchievement('chemistry_explorer','Chemistry Explorer','Completed a Daily Challenge.');game.puzzleActive=false;$('iupacPuzzleModal').classList.add('hidden');toast('DAILY COMPLETE',`+30 bonus Knowledge · ${d.streak}-day streak`);updateHud();saveGame(true);return;}}updateHud();saveGame(true);$('iupacFeedback').innerHTML=`<span class="number-good">Correct! +10 Knowledge Points. Loading another adaptive question…</span>`;setTimeout(()=>startPractice(p.skill,p.daily),750);}
function openAdaptiveDashboard(){hidePanels();const labels=window.IUPAC_TOPIC_LABELS;const bars=['parent','numbering','branches','prefixes','alphabetical','naming'].map(topic=>`<div class="mastery-row"><span>${labels[topic]}</span><div class="mastery-bar"><i style="width:${adaptiveLearningManager.mastery(topic)}%"></i></div><b>${adaptiveLearningManager.mastery(topic)}%</b></div>`).join('');$('adaptiveContent').innerHTML=`<article class="entry"><strong>Overall Accuracy: ${analyticsManager.accuracy()}%</strong><p>Average solving time: ${adaptiveLearningManager.averageTime()} sec · ${adaptiveLearningManager.recommendation()}</p></article>${bars}<article class="entry"><strong>Achievement Progress</strong><p>${achievementManager.unlocked.length} achievements unlocked · ${game.knowledgePoints} Knowledge Points</p></article>`;$('adaptiveModal').classList.remove('hidden');}
function openTeacherDashboard(){hidePanels();const s=game.stats,a=analyticsManager.accuracy();$('teacherContent').innerHTML=`<article class="entry"><strong>Student: Alkanist</strong><p>Difficulty: ${learningManager.config().label} · Chapters completed: ${game.chapterStars}/5</p></article><article class="entry"><strong>Performance</strong><p>Accuracy: ${a}% · Weak topics: ${adaptiveLearningManager.weakTopics().map(t=>window.IUPAC_TOPIC_LABELS[t]).join(', ')}</p></article><article class="entry"><strong>Support</strong><p>Hints used: ${Object.values(adaptiveLearningManager.records).reduce((n,r)=>n+r.hints,0)} · Practice completed: ${game.stats.puzzlesSolved} · Daily streak: ${adaptiveLearningManager.daily.streak}</p></article>`;$('teacherModal').classList.remove('hidden');}
function openReview(){hidePanels();const rows=adaptiveLearningManager.incorrect.slice(-20).reverse();$('reviewContent').innerHTML=rows.length?rows.map(item=>`<article class="entry"><strong>${window.IUPAC_TOPIC_LABELS[item.topic]}</strong><p>Question: ${item.question}</p><p>Correct answer: ${item.answer}</p><p>Explanation: ${item.explanation}</p><p>Rule: ${item.rule}</p></article>`).join(''):'<p>No incorrect answers recorded yet. Keep exploring!</p>';$('reviewModal').classList.remove('hidden');}
function openLearningReport(){hidePanels();const best=['parent','numbering','branches','prefixes','alphabetical','naming'].sort((a,b)=>adaptiveLearningManager.mastery(b)-adaptiveLearningManager.mastery(a))[0];$('reportContent').innerHTML=`<article class="entry"><strong>Learning Report · ${new Date().toLocaleDateString()}</strong><p>Difficulty completed: ${learningManager.config().label}</p></article><article class="entry"><strong>Results</strong><p>Overall accuracy: ${analyticsManager.accuracy()}% · Average time: ${adaptiveLearningManager.averageTime()} sec · Total questions: ${game.stats.correctAnswers+game.stats.wrongAnswers}</p></article><article class="entry"><strong>Learning Profile</strong><p>Best topic: ${window.IUPAC_TOPIC_LABELS[best]} · Weakest topic: ${window.IUPAC_TOPIC_LABELS[adaptiveLearningManager.weakTopics(1)[0]]}</p></article><article class="entry"><strong>Achievement Summary</strong><p>${achievementManager.unlocked.length} achievements · ${game.knowledgePoints} Knowledge Points · Completed ${game.chapterStars}/5 chapters</p></article>`;$('reportModal').classList.remove('hidden');}
function startDailyChallenge(){const d=adaptiveLearningManager.dailyStart();if(d.completed>=5){toast('DAILY COMPLETE',`Come back tomorrow to extend your ${d.streak}-day streak.`);return;}game.dailySession={done:d.completed};startPractice(adaptiveLearningManager.weakTopics(1)[0],true);}
function drawCelebration(){if(!game.celebration)return;const t=clamp(game.celebration.timer/1.5,0,1);const x=game.celebration.startX+(game.celebration.targetX-game.celebration.startX)*t;const y=game.celebration.startY+(game.celebration.targetY-game.celebration.startY)*t;drawSprite('crystal',x-18,y-28,36,36);drawSprite('firefly',x+8,y-18,16,16);if(t>=1)game.celebration=null;}

/* Crystal Door challenges connect exploration to the chapter’s IUPAC lesson. */
function startIUPACPuzzle(chapter){
  const challenge=iupacPuzzleManager.create(chapter);game.puzzleActive=true;$('iupacQuestion').textContent=challenge.question;$('iupacFormula').textContent=challenge.formula;$('iupacFeedback').textContent='Choose an answer to unlock the Crystal Door.';const choices=$('iupacChoices');choices.innerHTML='';challenge.choices.forEach(choice=>{const button=document.createElement('button');button.textContent=choice;button.onclick=()=>answerIUPACPuzzle(choice);choices.appendChild(button);});$('iupacPuzzleModal').classList.remove('hidden');
}
function answerIUPACPuzzle(choice){
  const challenge=iupacPuzzleManager.active;if(!challenge)return;
  if(iupacPuzzleManager.answer(choice)){game.iupacDoorSolved=true;game.knowledgePoints+=10;game.crystals++;game.xp+=15;successFeedback(learningManager.chapter(game.chapter)?.skill);$('iupacFeedback').innerHTML=`<span class="number-good">Correct! +10 Knowledge Points · +1 IUPAC Crystal. ${challenge.explanation}</span>`;[...$('iupacChoices').querySelectorAll('button')].forEach(button=>button.disabled=true);updateHud();saveGame(true);setTimeout(()=>{$('iupacPuzzleModal').classList.add('hidden');game.puzzleActive=false;toast('CRYSTAL DOOR OPEN','The naming challenge is solved.');},900);return;}
  $('iupacFeedback').innerHTML=`<span class="number-bad">Not quite. ${challenge.hint} Try again.</span>`;sound('land');
}
function drawAbilityOverlay(){if(!game.abilityView)return;ctx.save();ctx.globalAlpha=.8;ctx.strokeStyle='#7fdce8';ctx.lineWidth=3;if(game.abilities.mainChainVision){ctx.strokeRect(80,120,W-160,210);ctx.fillStyle='#c9ffff';ctx.font='10px monospace';ctx.fillText('MAIN CHAIN VISION: longest route highlighted',28,132);}if(game.abilities.numberScanner){ctx.strokeStyle='#ffd56b';ctx.beginPath();ctx.moveTo(W-145,350);ctx.lineTo(W-70,350);ctx.lineTo(W-83,340);ctx.moveTo(W-70,350);ctx.lineTo(W-83,360);ctx.stroke();ctx.fillStyle='#fff5c8';ctx.fillText('NUMBER SCANNER → lowest locant direction',W-305,335);}if(game.abilities.branchDetector){ctx.fillStyle='#ff8ab0';ctx.fillText('BRANCH DETECTOR: alkyl groups identified',28,153);}ctx.restore();}

/* Final Temple encounter: the Carbon Guardian yields only to chemistry knowledge. */
function startCarbonGuardian(){
  if(game.completedFinalExam){toast('TEMPLE RESTORED','The IUPAC Knowledge Crystal is already shining.');return;}
  bossManager.start();game.puzzleActive=true;showDialogue('Professor Carbon',['The Carbon Guardian protects the lost rules.','Answer each trial to restore the IUPAC Knowledge Crystal.'],()=>renderBossTrial());
}
function renderBossTrial(){const trial=bossManager.current();if(!trial){startFinalExam();return;}$('bossEnergy').style.setProperty('--boss-energy',`${bossManager.energy*25}%`);$('bossPrompt').textContent=`${trial.title}: ${trial.prompt}`;const choices=$('bossChoices');choices.innerHTML='';trial.choices.forEach(choice=>{const button=document.createElement('button');button.textContent=choice;button.onclick=()=>answerBossTrial(choice);choices.appendChild(button);});$('bossFeedback').textContent='Each correct rule weakens the guardian.';$('bossModal').classList.remove('hidden');}
function answerBossTrial(choice){const result=bossManager.answer(choice);if(!result.correct){$('bossFeedback').textContent=`Not yet. ${learningMistake('mastery',result.trial.explanation)} Retry the trial.`;sound('land');return;}game.knowledgePoints+=10;game.xp+=20;successFeedback('mastery');if(result.defeated){$('bossModal').classList.add('hidden');toast('CARBON GUARDIAN DEFEATED','All four chemistry trials are complete.');saveGame(true);startFinalExam();return;}$('bossFeedback').textContent=`Correct! ${result.trial.explanation}`;setTimeout(renderBossTrial,650);updateHud();saveGame();}
function startFinalExam(){finalExamManager.start();renderFinalExam();}
function renderFinalExam(){const question=finalExamManager.current();if(!question){finishFinalExam();return;}$('examProgress').textContent=`Question ${finalExamManager.index+1} / 5 · Score ${finalExamManager.score}`;$('examPrompt').textContent=question.prompt;const choices=$('examChoices');choices.innerHTML='';question.choices.forEach(choice=>{const button=document.createElement('button');button.textContent=choice;button.onclick=()=>answerFinalExam(choice);choices.appendChild(button);});$('examFeedback').textContent='A wrong answer explains the rule and lets you retry.';$('finalExamModal').classList.remove('hidden');}
function answerFinalExam(choice){const result=finalExamManager.answer(choice);if(!result.correct){$('examFeedback').textContent=`Try again. ${learningMistake('mastery',result.question.explanation)}`;sound('land');return;}game.knowledgePoints+=20;game.xp+=30;successFeedback('mastery');if(result.complete){$('finalExamModal').classList.add('hidden');finishFinalExam();return;}$('examFeedback').textContent=`Correct! ${result.question.explanation}`;setTimeout(renderFinalExam,500);updateHud();saveGame();}
function finishFinalExam(){
  game.bossDefeated=true;game.completedFinalExam=true;game.endingUnlocked=true;game.certificateIssued=true;game.practiceUnlocked=true;game.finalScore=finalExamManager.score;game.chapterStars++;game.crystals++;questManager.complete('chapter_5');unlockAchievement('temple_champion','Temple Champion','Restored the IUPAC Knowledge Crystal.');unlockAchievement('iupac_expert','IUPAC Expert','Completed the final IUPAC exam.');updateHud();saveGame(true);showDialogue('Professor Carbon',['Alkanist has restored the lost knowledge of IUPAC.','The IUPAC Knowledge Crystal shines again.','Your final score is '+game.finalScore+'. Practice Mode is now unlocked.'],()=>{sceneManager.set('ending');game.mode='ending';$('endingActions').classList.remove('hidden');});
}
function showCertificate(){const date=new Date().toLocaleDateString();$('certificateContent').innerHTML=`<p><strong>THE ALKANODYSSEY</strong></p><p>IUPAC Explorer Certificate</p><p>Presented to: <strong>Alkanist</strong></p><p>Final Score: ${game.finalScore} / 100</p><p>Completed Chapters: 5 / 5</p><p>Knowledge Points: ${game.knowledgePoints}</p><p>Stars Collected: ${game.chapterStars}</p><p>Date Completed: ${date}</p>`;$('certificateModal').classList.remove('hidden');}

/* Chapters 3–5 reuse the established platformer systems with their own playable objectives. */
const CAMPAIGN_CHAPTERS={
  3:{name:'Branch Forest',quest:'Identify methyl, ethyl, propyl, and butyl substituents.',npc:'Branch Keeper',hint:'Inspect each molecular branch separately from the parent chain.',goal:5,theme:'#5f9d5a',next:'Prefix Library'},
  4:{name:'Prefix Library',quest:'Apply di-, tri-, tetra- and alphabetical ordering.',npc:'Archivist Quartz',hint:'Multiplicity uses prefixes, but alphabetical order ignores them.',goal:6,theme:'#7370ad',next:'Temple of IUPAC'},
  5:{name:'Temple of IUPAC',quest:'Construct complete alkane names and complete the Carbon Guardian trials.',npc:'Temple Curator',hint:'Parent chain, numbering, branches, prefixes, alphabetical order, and final IUPAC name.',goal:7,theme:'#5f4a89',next:'Ending'}
};
function buildCampaignChapter(chapter){
  const data=CAMPAIGN_CHAPTERS[chapter]; game.chapter=chapter;game.iupacDoorSolved=false;if(chapter>=3)game.abilities.branchDetector=true;game.collectibles=[];game.treasures=[];game.npcs=[];game.signboards=[];game.checkpoints=[];game.enemies=[];game.molecules=[];game.fireflies=[];game.butterflies=[];game.leaves=[];
  for(let i=0;i<data.goal;i++)game.collectibles.push({x:650+i*650,y:GROUND-75-(i%3)*28,kind:i%3===0?'book':i%2?'crystal':'coin',taken:false,phase:i*.8});
  game.treasures=[{x:1480,y:GROUND-56,opened:false,reward:'coin'},{x:3180,y:GROUND-56,opened:false,reward:'crystal'}];
  game.npcs=[{id:'campaignGuide',name:data.npc,x:620,y:GROUND-52,met:false}];game.signboards=[{x:1160,y:GROUND-84,topic:data.name}];game.checkpoints=[{x:980,y:GROUND-76,reached:false},{x:2780,y:GROUND-76,reached:false}];game.gate={x:4600,y:GROUND-120,opened:false};
  for(let i=0;i<14;i++)game.molecules.push({x:500+i*320,y:120+(i%4)*78,phase:i*.6});for(let i=0;i<20;i++)game.fireflies.push({x:420+i*220,y:150+(i%5)*38,phase:i*.4});
  game.quest=data.quest;questManager.start(`chapter_${chapter}`,data.name,data.goal);sceneManager.unlock(chapter);sceneManager.set(sceneManager.chapterScene(chapter),chapter);updateHud();
}
function campaignCollected(){return game.collectibles.filter(item=>item.taken).length;}
function interactCampaignChapter(){
  const data=CAMPAIGN_CHAPTERS[game.chapter], guide=game.npcs[0];
  if(guide&&Math.abs(player.x-guide.x)<90){guide.met=true;showDialogue(data.npc,[data.hint,`${campaignCollected()}/${data.goal} objective items recovered.`,campaignCollected()>=data.goal?`The route to ${data.next} is ready at the crystal gate.`:'Keep exploring — treasure chests and field items are active.']);saveGame();return;}
  const sign=game.signboards.find(item=>Math.abs(player.x-item.x)<75);if(sign){showDialogue('Chapter Sign',[data.hint]);return;}
  const chest=game.treasures.find(item=>!item.opened&&Math.abs(player.x-item.x)<75);if(chest){openTreasure(chest);return;}
  if(Math.abs(player.x-game.gate.x)<105){if(campaignCollected()<data.goal){toast('CRYSTAL GATE',`Recover ${data.goal-campaignCollected()} more objective items to open this route.`);return;}if(game.chapter===5){startCarbonGuardian();return;}if(!game.iupacDoorSolved){startIUPACPuzzle(Math.min(5,game.chapter));return;}completeCampaignChapter();return;}
  toast(data.name,`Objective progress: ${campaignCollected()}/${data.goal}.`);
}
function completeCampaignChapter(){
  const data=CAMPAIGN_CHAPTERS[game.chapter];game.gate.opened=true;game.xp+=100;game.crystals++;game.chapterStars++;questManager.complete(`chapter_${game.chapter}`);updateHud();saveGame();
  if(game.chapter===3){game.chapter4Unlocked=true;showDialogue('Professor Carbon',[`The Branch Forest is restored.`,`Accuracy: ${analyticsManager.accuracy()}%. ${adaptiveLearningManager.recommendation()}`,`Next destination: ${data.next}.`],()=>beginCampaignTransition(4));}
  else if(game.chapter===4){game.chapter5Unlocked=true;showDialogue('Professor Carbon',[`The Prefix Library is complete.`,`Accuracy: ${analyticsManager.accuracy()}%. ${adaptiveLearningManager.recommendation()}`,`Next destination: ${data.next}.`],()=>beginCampaignTransition(5));}
}
function beginCampaignTransition(target){game.mode='campaignTransition';game.transition={timer:0,duration:3.1,target};hidePanels();closeDialogue();}
function updateCampaignTransition(dt){game.transition.timer+=dt;if(game.transition.timer<game.transition.duration)return;if(game.transition.target===6){sceneManager.set('ending');game.mode='ending';saveGame(true);return;}buildCampaignChapter(game.transition.target);player.x=130;player.y=GROUND-player.h;player.vx=player.vy=0;game.camera=0;game.mode='playing';showDialogue('Professor Carbon',[`Welcome to ${CAMPAIGN_CHAPTERS[game.chapter].name}.`,CAMPAIGN_CHAPTERS[game.chapter].hint]);saveGame(true);}
function drawCampaignTransition(){const t=clamp(game.transition.timer/game.transition.duration,0,1);ctx.fillStyle='#172542';ctx.fillRect(0,0,W,H);for(let i=0;i<28;i++)drawSprite('molecule',(i*83+game.time*45)%W,75+(i%6)*55,20,20,false,.75);ctx.fillStyle='#fff5c8';ctx.font='bold 17px monospace';ctx.textAlign='center';ctx.fillText(`TRAVELING TO ${game.transition.target===6?'THE ENDING':CAMPAIGN_CHAPTERS[game.transition.target].name.toUpperCase()}`,W/2,130);ctx.font='11px monospace';ctx.fillText(`Crystal route ${Math.floor(t*100)}% stabilized`,W/2,158);ctx.textAlign='start';}
function drawCampaignWorld(){drawWorld();const data=CAMPAIGN_CHAPTERS[game.chapter];ctx.fillStyle=data.theme;ctx.globalAlpha=game.chapter===5?.28:.12;ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;if(game.chapter===5){for(let x=90;x<W;x+=130)drawSprite('gate',x,210+(x%3)*18,36,82,false,.55);drawSprite('rock',game.gate.x-game.camera-10,GROUND-100,84,84);ctx.fillStyle='#ffe4a8';ctx.font='9px monospace';ctx.fillText('TEMPLE LOCKS · KNOWLEDGE TRIALS · CARBON GUARDIAN',24,72);}ctx.fillStyle='#fff5c8';ctx.font='bold 13px monospace';ctx.fillText(data.name,24,92);ctx.font='9px monospace';ctx.fillText(`${campaignCollected()}/${data.goal} objective items`,24,110);}
function drawEnding(){ctx.fillStyle='#101a3b';ctx.fillRect(0,0,W,H);for(let i=0;i<28;i++)drawSprite('crystal',(i*79+game.time*18)%W,90+(i%6)*55,32,32,false,.8);drawSprite('heroCelebrate',W/2-48,H/2-45,96,96);ctx.fillStyle='#fff5c8';ctx.font='bold 25px monospace';ctx.textAlign='center';ctx.fillText('THE ALKANODYSSEY',W/2,110);ctx.font='bold 15px monospace';ctx.fillText('IUPAC KNOWLEDGE RESTORED',W/2,145);ctx.font='11px monospace';ctx.fillText(`Final Score ${game.finalScore}/100 · ${game.chapterStars} Stars · ${game.knowledgePoints} Knowledge`,W/2,395);ctx.fillText('IUPAC Explorer Certificate earned',W/2,417);ctx.textAlign='start';}
function drawCanyonBridges(){for(const x of [1040,2020]){rect(x,GROUND-72,220,10,'#765548');for(let i=0;i<10;i++){rect(x+i*21,GROUND-80+(i%2)*4,16,9,'#b77c54');rect(x+i*21,GROUND-60,3,25,'#5d4035');}}}
function drawCanyonCaves(){for(let x=600;x<MAP_WIDTH;x+=660){rect(x,GROUND-120,110,120,'#4d536c');circle(x+55,GROUND-58,34,'#17233f');circle(x+42,GROUND-66,8,'#6be9ff');circle(x+72,GROUND-70,6,'#bd8cff');}}
function drawCanyonCollectibles(){for(const c of game.collectibles){if(c.taken)continue;const y=c.y+Math.sin(game.time*2+c.phase)*7;if(c.kind==='scroll'){rect(c.x-8,y-12,16,24,'#e8d09a');rect(c.x-10,y-10,20,4,'#ae7b52');rect(c.x-10,y+7,20,4,'#ae7b52');rect(c.x-2,y-7,4,12,'#6e547f');}else if(c.kind==='coin'){circle(c.x,y,9,'#ffd15c');rect(c.x-1,y-6,2,12,'#fff7b1');}else if(c.kind==='book'){rect(c.x-9,y-9,18,18,'#875a9b');rect(c.x-5,y-5,9,11,'#f7e3b0');}else{circle(c.x,y,19,'rgba(99,238,255,.2)');ctx.fillStyle='#72efff';ctx.beginPath();ctx.moveTo(c.x,y-16);ctx.lineTo(c.x+10,y);ctx.lineTo(c.x,y+17);ctx.lineTo(c.x-10,y);ctx.fill();rect(c.x-2,y-8,4,19,'#e4ffff');}}}
function drawCanyonEnemies(){for(const e of game.enemies){const y=e.id==='bat'?160+Math.sin(game.time*3)*24:GROUND-24;if(e.id==='slime'){circle(e.x,y,15,'#a85be3');circle(e.x-5,y-3,3,'#fff');circle(e.x+5,y-3,3,'#fff');}else if(e.id==='bat'){rect(e.x-15,y,30,5,'#7f5aaf');rect(e.x-5,y-7,10,12,'#3c294e');circle(e.x-3,y-3,2,'#ffdb6c');}else{circle(e.x,y,17,'#8b9a9e');circle(e.x-6,y-5,4,'#62efff');rect(e.x-18,y+11,36,5,'#59646b');}}}
function drawCanyonNPCs(){for(const npc of game.npcs){const x=npc.x,y=npc.y;if(npc.id==='miner'){rect(x,y-27,20,27,'#84654e');rect(x+2,y-34,16,10,'#f2c492');rect(x,y-38,20,5,'#f2d075');rect(x+4,y-44,12,6,'#806a4b');rect(x+19,y-18,10,4,'#a8eaff');}else if(npc.id==='explorer'){rect(x,y-29,18,29,'#537ca2');rect(x+2,y-37,14,10,'#e6b486');rect(x,y-43,18,6,'#7858a1');rect(x+4,y-20,10,6,'#ffd66a');}else{rect(x,y-28,19,28,'#6b5a88');rect(x+3,y-37,14,11,'#e7bd91');rect(x,y-43,20,6,'#e6e5d6');rect(x+6,y-21,7,4,'#71efff');}if(Math.abs(player.x-x)<85)rect(x+7,y-57,6,11,'#ffd66a');}}

/* Launch the current play session from the menu. */
function startGameFromMenu() {
  if (localStorage.getItem(game.saveKey)) {
    buildForest();
    restoreGame();
    if(game.endingUnlocked){game.mode='ending';sceneManager.set('ending');$('startMenu').classList.add('hidden');$('endingActions').classList.remove('hidden');return;}
    if (game.chapter===2) { const saved=JSON.parse(localStorage.getItem(game.saveKey)); buildCanyonWorld(); restoreGame(); player.x=saved.x||130; player.y=saved.y||GROUND-player.h; }
    else if(game.chapter>=3&&game.chapter<=5){const saved=JSON.parse(localStorage.getItem(game.saveKey));buildCampaignChapter(game.chapter);restoreGame();player.x=saved.x||130;player.y=saved.y||GROUND-player.h;}
    sceneManager.set(sceneManager.chapterScene(game.chapter));
    game.mode='playing';
    $('startMenu').classList.add('hidden');
    startAmbience();
    updateHud();
    toast('RESUMED','Your alkanist journal was restored.');
    return;
  }
  startAdventure();
}
function startGame(continueSave=false){
  buildForest();
  if (continueSave) { restoreGame(); if(game.chapter===2){ const saved=JSON.parse(localStorage.getItem(game.saveKey)); buildCanyonWorld(); restoreGame(); player.x=saved.x||130; player.y=saved.y||GROUND-player.h; } else if(game.chapter>=3&&game.chapter<=5){const saved=JSON.parse(localStorage.getItem(game.saveKey));buildCampaignChapter(game.chapter);restoreGame();player.x=saved.x||130;player.y=saved.y||GROUND-player.h;} } else {
    player.x=160; player.y=260; game.coins=game.crystals=game.books=game.xp=0; game.journalUnlocked=true; game.worldMapUnlocked=false; game.mainChainRuleUnlocked=false; game.chapter2Unlocked=false; game.mainChainCrystalFound=false; game.gate.opened=false; game.quest='Recover the Main Chain Crystal.'; game.mode='playing';
  }
  $('startMenu').classList.add('hidden');
  startAmbience();
  updateHud();
  if (!continueSave) {
    showDialogue('Professor Carbon', ['Welcome Alkanist!','Our first mission is to recover the Main Chain Crystal.','Someone has stolen the IUPAC Crystals.'], ()=> {
      game.worldMapUnlocked=true; game.journalUnlocked=true; updateHud(); saveGame();
      toast('ADVENTURE JOURNAL','Unlocked the Journal, World Map, and the first quest.');
    });
  }
}

/* Sprite-only object renderers. Physics and game entities retain their original data and timing. */
function heroFrame(){if(player.state==='jump')return'heroJump';if(player.state==='celebrate')return'heroCelebrate';if(player.state==='hurt')return'heroHurt';if(player.state==='run')return'heroRun';if(player.state==='walk')return Math.floor(game.time*11)%2?'heroWalk1':'heroWalk2';return'heroIdle';}
function drawPlayer(){if(player.invulnerable&&Math.floor(game.time*18)%2)return;const lift=player.state==='jump'?-2:player.state==='idle'?Math.sin(game.time*3):0;drawSprite(heroFrame(),player.x-18,player.y-15+lift,64,64,player.facing<0);}
function drawTrees(){for(let x=90;x<MAP_WIDTH;x+=170)drawSprite('tree',x-18,GROUND-145-(x/17%4)*18,92,150);}
function drawDecor(){for(let x=45;x<MAP_WIDTH;x+=73){const type=(x/73|0)%3;drawSprite(type===2?'mushroom':'flower',x-14,GROUND-45,34,45);}for(const b of game.butterflies){drawSprite('butterfly',b.x-10,b.y+Math.sin(game.time*3+b.phase)*9-10,26,26);}for(const l of game.leaves){drawSprite('flower',l.x+Math.sin(game.time+l.phase)*l.drift-4,l.y+((game.time*18+l.phase*42)%330)-4,10,10,false,.72);}}
function collectibleSprite(kind){return kind==='coin'?'coin':kind==='book'?'book':kind==='scroll'?'scroll':'crystal';}
function drawCollectibles(){for(const c of game.collectibles)if(!c.taken){const float=Math.sin(game.time*2+c.phase)*7;drawSprite(collectibleSprite(c.kind),c.x-20,c.y+float-27,40,40);}}
function drawCanyonCollectibles(){drawCollectibles();}
function drawTreasures(){for(const chest of game.treasures)if(!chest.opened)drawSprite('chest',chest.x-20,GROUND-62,42,42);}
function drawSignboards(){for(const sign of game.signboards)drawSprite('sign',sign.x-20,GROUND-86,42,52);}
function drawCheckpoints(){for(const checkpoint of game.checkpoints)drawSprite('checkpoint',checkpoint.x-19,GROUND-94,38,54,false,checkpoint.reached?.5:1);}
function drawFireflies(){for(const firefly of game.fireflies)drawSprite('firefly',firefly.x-7,firefly.y+Math.sin(game.time*2.3+firefly.phase)*4-7,14,14,false,.9);}
function drawMolecules(){for(const molecule of game.molecules)drawSprite('molecule',molecule.x+Math.sin(game.time*1.2+molecule.phase)*5-15,molecule.y+Math.cos(game.time*.8+molecule.phase)*6-15,30,30);}
function drawNPCs(){for(const npc of game.npcs){const kind=npc.id==='professor'?'professor':npc.id==='rabbit'?'rabbit':'student';drawSprite(kind,npc.x-22,npc.y-58,50,58);if(Math.abs(player.x-npc.x)<85)drawSprite('firefly',npc.x+3,npc.y-73,16,16);}}
function drawCanyonNPCs(){for(const npc of game.npcs){const kind=npc.id==='miner'?'miner':npc.id==='explorer'?'explorer':'oldScientist';drawSprite(kind,npc.x-22,npc.y-58,50,58);if(Math.abs(player.x-npc.x)<85)drawSprite('firefly',npc.x+3,npc.y-73,16,16);}}
function drawCanyonEnemies(){for(const enemy of game.enemies){const kind=enemy.id==='slime'?'slime':enemy.id==='bat'?'bat':'rock';const y=enemy.id==='bat'?160+Math.sin(game.time*3)*24:GROUND-47;drawSprite(kind,enemy.x-25,y-24,50,50,enemy.vx<0);}}
function drawGate(){drawSprite('gate',game.gate.x-20,GROUND-145,72,145,false,game.mainChainCrystalFound||game.gate.opened?1:.7);}
function drawCanyonCaves(){for(let x=600;x<MAP_WIDTH;x+=660)drawSprite('cave',x-12,GROUND-135,124,135);}
function drawCanyonBridges(){for(const x of [1040,2020])for(let piece=0;piece<4;piece++)drawSprite('bridge',x+piece*53,GROUND-95+(piece%2)*4,55,58);}
function drawRiverAndBridge(){for(let x=1480;x<2000;x+=64)drawSprite('waterfall',x,GROUND-63,64,63,false,.72);for(let x=1560;x<1780;x+=54)drawSprite('bridge',x,GROUND-82,58,58);drawSprite('waterfall',3480,GROUND-130,64,130);}
function drawRuins(){for(let x=420;x<740;x+=74)drawSprite('cave',x,GROUND-122-(x%3)*8,82,122);}
function drawForeground(){ctx.save();ctx.translate(-game.camera*.72,0);for(let x=-40;x<W+60;x+=94)drawSprite('tree',x,H-128,76,126);ctx.restore();}
function drawLaboratory(){drawSprite('cave',700,285,130,130);drawSprite('crystal',748,250,42,42);}
function drawCanyonWorld(){
  const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#152d62');sky.addColorStop(.58,'#437ca1');sky.addColorStop(1,'#9fe4dc');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
  ctx.save();ctx.translate(-game.camera*.16,0);for(let i=-1;i<9;i++){const x=i*190;ctx.fillStyle=i%2?'#475a91':'#384b7d';ctx.beginPath();ctx.moveTo(x,365);ctx.lineTo(x+95,90+(i%3)*45);ctx.lineTo(x+205,365);ctx.fill();}ctx.restore();
  ctx.save();ctx.translate(-Math.round(game.camera),0);rect(0,GROUND,MAP_WIDTH,H-GROUND,'#4a4a68');rect(0,GROUND,MAP_WIDTH,8,'#8de7f5');for(let x=0;x<MAP_WIDTH;x+=150)drawSprite('crystal',x,GROUND-62,42,62);drawCanyonBridges();drawCanyonCaves();drawCanyonCollectibles();drawTreasures();drawSignboards();drawCanyonNPCs();drawCanyonEnemies();drawGate();drawPlayer();drawParticles();drawMolecules();drawFireflies();ctx.restore();drawForeground();
  for(let i=0;i<20;i++){const x=(i*91-game.camera*.4)%W;drawSprite('firefly',x,120+(i%7)*38,10,10,false,.5);}
}

function loop(now){const dt=Math.min(.033,(now-game.last)/1000||0);game.last=now;game.time+=dt;if(game.mode!=='menu')game.stats.playSeconds+=dt;if(game.mode==='transition'){updateMenuVisuals(dt);drawMenuScene();if(game.menuFade>=1){game.mode='story';sceneManager.set('story');game.story.scene=0;game.story.timer=0;}} else if(game.mode==='story'){updateStoryCutscene(dt);updateMenuVisuals(dt);drawMenuScene();}else if(game.mode==='menu'){startMenuMusic();updateMenuVisuals(dt);drawMenuScene();}else if(game.mode==='canyonTransition'){updateCanyonTransition(dt);drawCanyonTransition();}else if(game.mode==='campaignTransition'){updateCampaignTransition(dt);drawCampaignTransition();}else if(game.mode==='ending'){drawEnding();}else{if(!game.dialog&&!game.puzzleActive&&!hasBlockingModal()){updatePlayer(dt);updateWorld(dt);updateCamera(dt);}if(game.dialog)updateDialogue(dt);stopMenuMusic();if(game.chapter===2)drawCanyonWorld();else if(game.chapter>=3)drawCampaignWorld();else drawWorld();drawAbilityOverlay();}drawMiniMap();requestAnimationFrame(loop);}

/* DOM setup is deliberately last so all systems are ready before play begins. */
$('newGame').onclick=()=>startAdventure();$('continueGame').onclick=()=>{ playMenuClick(); if (localStorage.getItem(game.saveKey)) startGameFromMenu(); else togglePanel('journal'); };$('settingsOpen').onclick=()=>{ playMenuClick(); $('settings').classList.remove('hidden'); };$('achievementOpen').onclick=()=>{ playMenuClick(); toast('ACHIEVEMENTS','Follow the campaign route to restore every IUPAC chapter.'); };$('exitGame').onclick=()=>{ playMenuClick(); if (window.close) window.close(); else toast('EXIT','The adventure can be resumed from the browser tab.'); };$('saveBtn').onclick=()=>saveGame(true);$('dialogueContinue').onclick=()=>advanceDialogue();$('dialogueSkip').onclick=()=>advanceDialogue(true);$('hintButton').onclick=()=>toast('CONTROLS','A/D or arrows move · Space jumps · Hold Shift to run · E talks · J journal · I inventory · M world map · V ability vision · Esc pause.');$('resumeGame').onclick=()=>$('pauseModal').classList.add('hidden');$('pauseMap').onclick=openWorldMap;$('pauseSave').onclick=()=>saveGame(true);$('viewCertificate').onclick=showCertificate;$('returnMenu').onclick=()=>press('interact');$('bossLeave').onclick=()=>{$('bossModal').classList.add('hidden');game.puzzleActive=false;};$('examLeave').onclick=()=>{$('finalExamModal').classList.add('hidden');game.puzzleActive=false;};document.querySelectorAll('.close').forEach(button=>button.onclick=()=>button.closest('.modal').classList.add('hidden'));$('musicVolume').oninput=e=>{game.settings.music=+e.target.value;if(game.ambience)game.ambience.gain.gain.value=game.settings.music/5000;};$('soundVolume').oninput=e=>game.settings.sound=+e.target.value;$('screenShake').onchange=e=>game.settings.shake=e.target.checked;$('numberCheck').onclick=checkCarbonNumberRush;$('numberRetry').onclick=retryCarbonNumberRush;$('numberClose').onclick=()=>{$('numberPuzzle').classList.add('hidden');game.puzzleActive=false;};$('iupacClose').onclick=()=>{$('iupacPuzzleModal').classList.add('hidden');game.puzzleActive=false;};
$('demoGame').onclick=startCompetitionDemo;$('tutorialNext').onclick=nextTutorial;$('tutorialSkip').onclick=()=>{tutorialManager.skip();$('tutorialModal').classList.add('hidden');saveGame();};$('progressButton').onclick=openProgressDashboard;$('achievementOpen').onclick=openAchievementScreen;$('settingsControls').onclick=()=>toast('CONTROLS','A/D or arrows move · Space jumps · Shift runs · E interacts · J journal · I inventory · M map · V abilities.');$('resetProgress').onclick=()=>{if(confirm('Reset all saved AlkanOdyssey progress?')){localStorage.removeItem(game.saveKey);location.reload();}};$('textSpeed').oninput=e=>game.settings.textSpeed=+e.target.value;$('soundEnabled').onchange=e=>game.settings.soundEnabled=e.target.checked;$('musicEnabled').onchange=e=>{game.settings.musicEnabled=e.target.checked;if(!e.target.checked&&game.ambience){try{game.ambience.osc.stop();}catch(_){ }game.ambience=null;}else startAmbience();};
$('creditsOpen').onclick=()=>$('creditsModal').classList.remove('hidden');$('statsOpen').onclick=openStatistics;$('galleryOpen').onclick=openGallery;$('fullscreenToggle').onchange=async e=>{try{if(e.target.checked)await document.documentElement.requestFullscreen();else if(document.fullscreenElement)await document.exitFullscreen();}catch(_){toast('FULLSCREEN','Fullscreen is not available in this browser.');}};
$('languageSelect').onchange=e=>{game.settings.language=e.target.value;toast('LANGUAGE',e.target.value==='th'?'ตั้งค่าภาษาไทยแล้ว':'English selected');};
document.querySelectorAll('[data-difficulty]').forEach(button=>button.onclick=()=>chooseDifficulty(button.dataset.difficulty));$('newGame').onclick=openDifficulty;
/* Sprint 11 UI connections: customization, notebook tools, practice, and dialogue controls. */
$('avatarOpen').onclick=openAvatar;$('profileButton').onclick=openProfile;$('avatarSave').onclick=()=>{saveGame(true);$('avatarModal').classList.add('hidden');toast('AVATAR UPDATED',avatarManager.label());};
$('practiceOpen').onclick=()=>{if(!game.practiceUnlocked&&!game.demoMode){toast('PRACTICE LOCKED','Complete Story Mode to unlock unlimited practice, or enter Competition Demo.');return;}$('practiceModal').classList.remove('hidden');};
$('dailyOpen').onclick=startDailyChallenge;$('teacherOpen').onclick=openTeacherDashboard;$('learningOpen').onclick=openAdaptiveDashboard;$('viewReport').onclick=openLearningReport;$('reviewOpen').onclick=openReview;$('teacherPrint').onclick=()=>window.print();$('reportPrint').onclick=()=>window.print();$('teacherCsv').onclick=()=>{const r=adaptiveLearningManager.records,lines=['Student,Difficulty,Topic,Correct,Incorrect,Hints,Retries,Average Time'];Object.entries(r).forEach(([topic,row])=>lines.push(`Alkanist,${learningManager.config().label},${window.IUPAC_TOPIC_LABELS[topic]},${row.correct},${row.wrong},${row.hints},${row.retries},${Math.round(row.time/Math.max(1,row.correct+row.wrong))}`));const blob=new Blob([lines.join('\n')],{type:'text/csv'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='alkanodyssey-learning-progress.csv';a.click();URL.revokeObjectURL(url);};
$('dialogueBack').onclick=dialogueBack;$('dialogueAuto').onclick=()=>{game.dialogAuto=!game.dialogAuto;renderDialogue();};$('dialogueHistory').onclick=dialogueHistory;
document.querySelectorAll('[data-practice]').forEach(button=>button.onclick=()=>startPractice(button.dataset.practice));
$('journalBookmark').onclick=()=>{game.settings.journalBookmark=game.chapter;saveGame();toast('NOTEBOOK BOOKMARKED',`Chapter ${game.chapter} review saved.`);};
$('journalSearch').oninput=e=>{const query=e.target.value.toLowerCase();$('journalContent').querySelectorAll('.entry').forEach(entry=>entry.style.display=entry.textContent.toLowerCase().includes(query)?'':'none');};
buildForest();startMenuMusic();updateHud();requestAnimationFrame(loop);
