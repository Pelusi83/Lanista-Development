const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

let html = fs.readFileSync(path.join(__dirname, 'iq.html'), 'utf8');

// Inject Chart stub + a Rapsodo-shaped fetch mock BEFORE the app script runs.
const stub = `<script>
window.Chart=function(){return{destroy:function(){}}};
window.scrollTo=function(){};
var PLAYERS=[{id:101,firstName:'Jaxson',lastName:'Carter',name:'Jaxson Carter',email:'a@b.com',bats:'R',throws:'R',height:70,weight:170,ballType:'baseball'},
 {id:102,firstName:'Peyton',lastName:'Ford',name:'Peyton Ford',email:'c@d.com',bats:'L',throws:'R',height:68,weight:150,ballType:'baseball'}];
var SUMMARY={configured:true,player:PLAYERS[0],hitting:{count:100,avgDistance:33.3,maxDistance:58.3,avgLaunchAngle:16.6,avgSpin:1386,sweetSpotPct:56},
 pitching:{count:40,avgSpin:1814,avgSpinEfficiency:71,avgVerticalBreakIn:8,avgHorizontalBreakIn:-1.6,avgReleaseHeightFt:6.2,avgReleaseExtensionFt:5.6,pitchTypes:{Fastball:20,Slider:10,Changeup:10}},talentIndex:37,hasData:true,updatedAt:Date.now(),source:'rapsodo'};
window.fetch=function(url,opts){
  url=String(url);
  var body;
  if(url.indexOf('resource=roster')>=0) body={configured:true,count:PLAYERS.length,players:PLAYERS,updatedAt:Date.now()};
  else if(url.indexOf('resource=summary')>=0) body=Object.assign({configured:true},SUMMARY);
  else if(url.indexOf('/api/player-auth?verify')>=0) body={valid:true,playerId:101};
  else if(url.indexOf('/api/player-auth?codes')>=0) body={players:PLAYERS.map(function(p){return{id:p.id,name:p.name,code:'ABCD1234',link:'http://x/iq?player='+p.id+'&k=tok'};})};
  else if(url.indexOf('/api/player-auth')>=0) body={success:true,token:'tok123',player:PLAYERS[0]};
  else body={ok:true};
  return Promise.resolve({json:function(){return Promise.resolve(body);}});
};
</script>`;
html = html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/, stub);

const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.detail && e.detail.message || e.message)));

// Simulate a coach opening the dashboard with live Rapsodo configured.
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc,
  url: 'https://example.com/iq?role=coach' });
const w = dom.window;
w.HTMLCanvasElement.prototype.getContext = () => ({});

setTimeout(() => {
  try {
    // live roster should be populated
    const liveN = w.LIQ && w.LIQ.live;
    const rosterN = w.LIQ && w.LIQ.liveRoster ? w.LIQ.liveRoster.length : 0;
    if (!liveN) errors.push('LIQ.live not true');
    if (rosterN !== 2) errors.push('liveRoster length = ' + rosterN);
    // navigate coach athletes + open a live athlete drawer
    w.navigate('athletes');
    w.openAthlete('Jaxson Carter');
    // player access panel + codes
    w.LIQ.openAccessPanel();
    // login flow
    w.LIQ.openLogin();
    // switch to player + performance (live)
    w.setRole('player');
    w.LIQ.mapSummary(w.LIQ.__testSummary || { player: { id:101, firstName:'Jaxson', lastName:'Carter', name:'Jaxson Carter', bats:'R', throws:'R', height:70, weight:170 }, hitting:{count:100,avgDistance:33,maxDistance:58,avgLaunchAngle:16,avgSpin:1386,sweetSpotPct:56}, pitching:{count:0}, talentIndex:37, hasData:true, updatedAt:Date.now() });
    w.navigate('home');
    w.navigate('performance');
    w.perfTab('hitting');
    w.perfTab('pitching');
    w.navigate('core4');
  } catch (e) { errors.push('interaction: ' + e.message + '\n' + e.stack); }

  setTimeout(() => {
    if (errors.length) { console.log('LIVE TEST ERRORS:\n' + errors.join('\n')); process.exit(1); }
    console.log('LIVE TEST PASSED — roster, drawer, access panel, login, live player + performance render cleanly');
    process.exit(0);
  }, 150);
}, 400);
