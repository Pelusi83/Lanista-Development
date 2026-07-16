const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

let html = fs.readFileSync(path.join(__dirname, 'iq.html'), 'utf8');
// Remove external Chart.js CDN script; inject a stub instead.
html = html.replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/, '<script>window.Chart=function(){return{destroy:function(){}}};</script>');

const errors = [];
const vc = new (require('jsdom').VirtualConsole)();
vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.detail && e.detail.message || e.message)));

const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc });
const w = dom.window;
w.fetch = () => Promise.resolve({ json: () => Promise.resolve({ response: 'ok' }) });
w.HTMLCanvasElement.prototype.getContext = () => ({});
w.scrollTo = () => {};

function run() {
  const roles = ['player','coach','admin'];
  const pagesByRole = {
    player:['home','profile','core4','performance','development','reports','resources'],
    coach:['home','team','athletes','core4','performance','development','reports','resources'],
    admin:['home','organizations','teams','athletes','analytics','assessments','reports','platform']
  };
  roles.forEach(r => {
    try { w.setRole(r); } catch(e){ errors.push('setRole '+r+': '+e.message); }
    pagesByRole[r].forEach(p => {
      try { w.navigate(p); } catch(e){ errors.push('navigate '+r+'/'+p+': '+e.message); }
    });
  });
  // exercise interactive bits
  const acts = [
    ()=>w.setRole('player'), ()=>w.navigate('performance'), ()=>w.perfTab('pitching'), ()=>w.perfTab('hitting'),
    ()=>w.navigate('core4'), ()=>w.openC4('talent'), ()=>w.closeModal(),
    ()=>w.openCheckin(), ()=>w.ciPick(0,4,{parentElement:{querySelectorAll:()=>[]},classList:{add(){}}}), ()=>w.closeModal(),
    ()=>w.openPlayerCard(), ()=>w.closeModal(),
    ()=>w.setRole('coach'), ()=>w.navigate('athletes'), ()=>w.sortMatrix('talent'), ()=>w.matrixFilter('P'), ()=>w.matrixFilter(''),
    ()=>w.openAthlete('Devin Parker'), ()=>w.closeDrawer(), ()=>w.openCompare(), ()=>w.closeModal(),
    ()=>w.setRole('admin'), ()=>w.navigate('platform'), ()=>w.platTab('health'), ()=>w.platTab('content'), ()=>w.platTab('users'),
    ()=>w.toggleGladius()
  ];
  acts.forEach((fn,i)=>{ try{ fn(); }catch(e){ errors.push('act#'+i+': '+e.message); } });
}

setTimeout(() => {
  run();
  setTimeout(() => {
    if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); process.exit(1); }
    else { console.log('SMOKE TEST PASSED — all roles/pages/interactions rendered with no JS errors'); process.exit(0); }
  }, 200);
}, 200);
