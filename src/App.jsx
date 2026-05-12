import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const ERA_LIST = ['Stone Age','Ancient','Bronze Age','Iron Age','Classical','Medieval','Renaissance','Industrial','Modern','Global','Synthetic','Interstellar','Posthuman','Singularity'];
const START_ERAS = ['Stone Age','Ancient','Medieval','Renaissance','Industrial','Modern'];
const GEOGRAPHIES = ['Desert','Arctic','Jungle','Island','Plains','Mountain'];
const GOVERNMENTS = ['Tribal','Monarchy','Democracy','Theocracy','Technocracy','Hive Mind'];
const CULTURE_SEEDS = ['Warrior','Scholar','Merchant','Spiritual','Isolationist','Expansionist'];
const WILDCARDS = ['What if they never discovered fire?','What if they had alien technology from the start?','What if they were underwater?','What if they started with nuclear power?','What if women ruled exclusively from the start?','What if they worshipped mathematics?','What if they never developed language?','What if a plague wiped out half of them at birth?','What if they could photosynthesize?','What if they achieved enlightenment immediately?'];

const FLAG_COLORS = ['#e63946','#f4a261','#2a9d8f','#264653','#ffb703','#8ecae6','#ff006e','#8338ec','#06d6a0','#ef476f','#118ab2','#ffd166'];
const NAME_PREFIX = ['Val','Kor','Eth','Mal','Sun','Drak','Eld','Zar','Ori','Bel','Thun','Ash'];
const NAME_SUFFIX = ['oria','emis','akur','enth','adra','imor','okar','undi','elth','azan'];
const MOTTO_A = ['Eternal','Iron','Undying','Golden','Swift','Silent','Ancient','Radiant'];
const MOTTO_B = ['Flame','Dawn','Storm','Crown','Tide','Shield','Blood','Sky','Root','Forge'];
const MOTTO_C = ['Endures','Never Sleeps','Shall Rise','Burns Eternal','Holds Fast'];
const LANG_SUFFIX = ['dric','enthi','ori','azan','ith','aran'];
const SCRIPTS = ['Runic','Flowing','Angular','Pictographic'];

const clamp=(v,min=0,max=100)=>Math.max(min,Math.min(max,v));
const r=(arr)=>arr[Math.floor(Math.random()*arr.length)];
const sumStats=(c)=>c.food+c.resources+c.tech+c.military+c.culture+c.happiness+c.territory+c.population;
const geoMods={Desert:{food:-8,military:6},Arctic:{population:-4,happiness:-2},Jungle:{food:6,resources:4},Island:{culture:6,territory:-5},Plains:{food:8,population:4},Mountain:{resources:8,food:-3}};

function makeFlag(){ const a=r(FLAG_COLORS), b=r(FLAG_COLORS.filter(x=>x!==a)); return {bg:a,fg:b,pattern:r(['h','v','d','cross','quarters','plain']),symbol:r(['sun','moon','eagle','tree','mountain','wave','flame','eye','star','crown','dragon','spiral'])}; }
function makeIdentity(seed,name,flag){
  const civName=name?.trim()||`${r(NAME_PREFIX)}${r(NAME_SUFFIX)}`;
  const f=flag||makeFlag();
  const teamAdj = r(['Iron','Golden','Silent','Swift','Ancient','Radiant']); const teamThing = r(['Wolves','Arrows','Traders','Spirals','Stalkers','Runners']);
  const sportsBySeed={Warrior:['⚔️ Gladiatorial Combat',`The ${teamAdj} ${teamThing}`],Scholar:['🎯 Archery League',`The ${teamAdj} Arrows`],Merchant:['🏇 Chariot Racing',`The ${teamAdj} Traders`],Spiritual:['🌀 Ritual Dance Competition',`The Sacred ${teamThing}`],Isolationist:['🏹 Hunting Tournament',`The Silent ${teamThing}`],Expansionist:['⛵ Naval Racing',`The Tide ${teamThing}`]};
  const [sport,teamName]=sportsBySeed[seed]||sportsBySeed.Warrior;
  return {
    name:civName, flagSpec:f, nationalColors:[f.bg,f.fg], motto:`${r(MOTTO_A)} ${r(MOTTO_B)} ${r(MOTTO_C)}`,
    language:`${civName.slice(0,3)}${r(LANG_SUFFIX)}`, script:r(SCRIPTS),
    sports:{sport,teamName,wins:0,losses:0,last:'Season begins'},
    festivals:[0,1,2,3].map((i)=>({name:`${['Spring','Summer','Autumn','Winter'][i]}: Festival of the ${r(['Crimson Moon','Iron Flame','Scholar Sun','Golden Root'])}`, interval:8+i*3, buff:0})),
    hallOfFame:[], wonders:[], resourcesStreak:0,
  };
}

function baseCiv({id,name,flag,player,era,geography,government,cultureSeed,wildcardId}) {
  const eraIndex=Math.max(0,ERA_LIST.indexOf(era)); const identity=makeIdentity(cultureSeed,name,flag?.bg?flag:null);
  const civ={id,name:identity.name,flag,player,population:40,food:45,resources:40,tech:10+eraIndex*4,military:25,culture:30,happiness:50,territory:30,era,eraIndex,wildcardId,geography,government,cultureSeed,eventLog:[],year:0,alive:true,badTicks:0,history:[],effectQueue:[],identity};
  Object.entries(geoMods[geography]||{}).forEach(([k,v])=>{civ[k]=clamp(civ[k]+v);}); return civ;
}

function tickCiv(civ){ if(!civ.alive)return civ; const n={...civ,identity:{...civ.identity, festivals:civ.identity.festivals.map(f=>({...f,buff:Math.max(0,f.buff-1)})), hallOfFame:[...civ.identity.hallOfFame], wonders:[...civ.identity.wonders], sports:{...civ.identity.sports}}};
  n.year+=1; n.food=clamp(n.food+1); n.population=Math.max(0,n.population+(n.food>40?2:n.food<20?-2:0)); n.resources=clamp(n.resources+1); n.tech=clamp(n.tech+0.5); if(n.resources>50)n.military=clamp(n.military+1); if(n.happiness>60)n.culture=clamp(n.culture+1);
  n.happiness=clamp((n.food+n.culture+(100-Math.abs(n.population-60)))/3)+ (n.identity.festivals.some(f=>f.buff>0)?10:0);
  if(n.year%50===0){ const fig={name:r(['Kael','Mira','Dorn','Sel','Auren','Thal','Riven','Cora','Bex','Lyra','Oryn','Vael'])+' the '+r(['Unbroken','Conqueror','Fearless','Wise','Philosopher','Inventor','Blessed','Seer']), year:n.year, bonus:r(['military','tech','culture','resources'])}; n[fig.bonus]=clamp(n[fig.bonus]+4); n.identity.hallOfFame.unshift(fig); n.eventLog.unshift({year:n.year,text:`${fig.name} rises to greatness, granting +4 ${fig.bonus}.`}); }
  n.identity.festivals.forEach((f)=>{ if(n.year%f.interval===0){ f.buff=3; n.effectQueue.push('festival'); n.eventLog.unshift({year:n.year,text:`${f.name} fills the streets with celebration.`}); }});
  if(n.resources>70){ n.identity.resourcesStreak=(n.identity.resourcesStreak||0)+1; } else n.identity.resourcesStreak=0;
  if(n.identity.resourcesStreak>=5 && !n.identity.wonders.includes(n.era)){ n.identity.wonders.push(n.era); n.eventLog.unshift({year:n.year,text:`WONDER BUILT — ${n.identity.language} Vel'Arath rises in the ${n.era}.`}); n.effectQueue.push('wonder'); if(n.era.includes('Industrial'))n.resources=clamp(n.resources+10); if(n.era.includes('Modern'))n.happiness=clamp(n.happiness+10); if(n.era.includes('Ancient'))n.culture=clamp(n.culture+10); }
  if(Math.random()<0.04){ const won=n.happiness>60||Math.random()>0.5; n.identity.sports[won?'wins':'losses']+=1; n.happiness=clamp(n.happiness+(won?5:-3)); n.identity.sports.last=won?`${n.identity.sports.teamName} won`: `${n.identity.sports.teamName} lost`; n.eventLog.unshift({year:n.year,text:`Sports — ${n.identity.sports.last} the ${n.identity.sports.sport} match.`}); }
  if(Math.random()<(n.tech/100)*0.3 && n.eraIndex<ERA_LIST.length-1){ n.eraIndex+=1; n.era=ERA_LIST[n.eraIndex]; n.effectQueue.push('era'); n.eventLog.unshift({year:n.year,text:`ERA BREAKTHROUGH — ${n.era}!`}); }
  if(n.population<5||n.food<5||n.happiness<10)n.badTicks=(n.badTicks||0)+1; else n.badTicks=0; if(n.badTicks>=3){n.alive=false;n.era='Collapse';n.effectQueue.push('collapse');}
  n.history=[...(n.history||[]),{population:n.population,tech:n.tech,happiness:n.happiness}].slice(-5); n.eventLog=n.eventLog.slice(0,30); return n;
}

function WorldCanvas({ civ, speed, active }) { const ref=useRef(null); const state=useRef({sprites:[],particles:[],t:0,weather:'☀️'});
  useEffect(()=>{ const c=ref.current; const ctx=c.getContext('2d'); let raf; const draw=()=>{const s=state.current; s.t+=1; ctx.clearRect(0,0,300,200); ctx.fillStyle='#1a1208';ctx.fillRect(0,0,300,200);
    for(let y=0;y<12;y++)for(let x=0;x<20;x++){ctx.fillStyle=['#3c5a3c','#5b7a45','#2f3d53','#6b5b3e'][(x+y+civ.eraIndex)%4];ctx.fillRect(x*15,y*15,14,14);} 
    const cx=150,cy=90; ctx.fillStyle=civ.identity.nationalColors[0]; ctx.fillRect(cx,cy,2,14); ctx.fillStyle=civ.identity.nationalColors[1]; ctx.fillRect(cx+2,cy+Math.sin(s.t/8)*2,8,6);
    const night=(Math.sin((s.t/3600)*Math.PI*2)+1)/2*0.4; ctx.fillStyle=`rgba(0,0,0,${night})`; ctx.fillRect(0,0,300,200);
    ctx.fillStyle='#f5d76e'; ctx.font='12px sans-serif'; ctx.fillText(s.weather,6,14);
    if(s.t%240===0) s.weather=r(civ.geography==='Desert'?['☀️','🌪️','⛈️']:civ.geography==='Arctic'?['❄️','☀️','⛈️']:['☀️','🌧️','⛈️']);
    if(civ.effectQueue.length){ const fx=civ.effectQueue.shift(); for(let i=0;i<20;i++) s.particles.push({x:150,y:100,vx:(Math.random()-0.5)*3,vy:(Math.random()-0.5)*3,life:40,color:fx==='plague'?'#a855f7':fx==='bless'?'#22c55e':'#f59e0b'}); }
    s.particles=s.particles.slice(-100).filter(p=>p.life>0); s.particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.life-=1;ctx.globalAlpha=p.life/40;ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,2,2);ctx.globalAlpha=1;});
    raf=requestAnimationFrame(draw); }; raf=requestAnimationFrame(draw); return ()=>cancelAnimationFrame(raf); }, [civ,speed]);
  return <canvas ref={ref} width={300} height={200} style={{width:'100%',imageRendering:'pixelated',border:`1px solid ${active?civ.identity.nationalColors[1]:'#3f3120'}`,boxShadow:active?`0 0 14px ${civ.identity.nationalColors[0]}`:'none',borderRadius:8}}/>;
}

const StatBar=({label,val,color='#c9a84c'})=><div><div style={{display:'flex',justifyContent:'space-between'}}><small>{label}</small><small>{Math.round(val)}</small></div><div style={{height:8,background:'#0008',borderRadius:10}}><div style={{height:8,width:`${clamp(val)}%`,background:color,transition:'all .5s'}}/></div></div>;
const CivPanel=({civ,onAction,energy,active,speed})=><div style={{background:'#1e1810',border:'1px solid #3f3120',padding:10,borderRadius:12}}><WorldCanvas civ={civ} speed={speed} active={active}/><h3 style={{fontFamily:'Cinzel'}}>{civ.name} — {civ.era}</h3><div style={{fontStyle:'italic',fontSize:12}}>{civ.identity.motto}</div>
{['population','food','resources','tech','military','culture','happiness','territory'].map(s=><StatBar key={s} label={s} val={civ[s]} color={civ.identity.nationalColors[1]}/>) }
<div style={{fontSize:12,margin:'6px 0'}}>🏆 {civ.identity.sports.teamName} ({civ.identity.sports.wins}-{civ.identity.sports.losses}) — {civ.identity.sports.last}</div>
<details><summary>Hall of Fame ({civ.identity.hallOfFame.length})</summary>{civ.identity.hallOfFame.map((f,i)=><div key={i} style={{fontSize:12}}>{f.year}: {f.name} (+{f.bonus})</div>)}</details>
<div style={{fontSize:12}}>Wonders: {civ.identity.wonders.join(', ')||'—'}</div><div style={{fontSize:12}}>Spoken tongue: {civ.identity.language} ({civ.identity.script})</div>
<div>{[['smite',20],['enlighten',30],['bless',15],['plague',25]].map(([a,c])=><button key={a} disabled={energy<c} onClick={()=>onAction(civ.id,a,c)}>{a} ({c})</button>)}</div>
<div style={{maxHeight:120,overflow:'auto',fontSize:12}}>{civ.eventLog.map((e,i)=><div key={i}>Year {e.year} — {e.text}</div>)}</div></div>;

function App(){
  const [mode,setMode]=useState('menu'); const [speed,setSpeed]=useState(2000); const [energy,setEnergy]=useState(100); const [civs,setCivs]=useState([]); const [compare,setCompare]=useState(false);
  const [spawn,setSpawn]=useState({name:'',flag:'🏛️',era:'Stone Age',geography:'Plains',government:'Tribal',cultureSeed:'Scholar',wildcardId:0,player:1});
  useEffect(()=>{if(mode==='menu')return; if(mode!=='menu'&&civs.length===0){setCivs([baseCiv({id:Date.now(),...spawn,name:spawn.name||'Aurora'})]);} const i=setInterval(()=>{setCivs(p=>p.map(tickCiv)); setEnergy(e=>Math.min(200,e+5));},speed); return ()=>clearInterval(i);},[speed,mode]);
  const addCiv=()=>setCivs(p=>p.length>=4?p:[...p,baseCiv({id:Date.now()+Math.random(),...spawn})]);
  const onAction=(id,a,cost)=>{if(energy<cost)return; setEnergy(e=>e-cost); setCivs(prev=>prev.map(c=>c.id!==id?c:{...c,effectQueue:[...c.effectQueue,a],eventLog:[{year:c.year,text:`DIVINE INTERVENTION — ${a}.`},...c.eventLog].slice(0,30)}));};
  const leader=useMemo(()=>civs.slice().sort((a,b)=>sumStats(b)-sumStats(a))[0],[civs]);
  if(mode==='menu') return <div style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#0a0a1a',color:'#f6e7be'}}><div><h1 style={{fontFamily:'Cinzel',color:'#c9a84c'}}>THE PANTHEON</h1><button onClick={()=>setMode('single')}>Single Player</button><button onClick={()=>setMode('rival')}>Rival Gods (2P)</button></div></div>;
  return <div style={{padding:12,color:'#f6e7be',background:'#0a0a1a',minHeight:'100vh'}}><div style={{display:'flex',justifyContent:'space-between'}}><div>Divine Energy: {energy}</div><div>{[['⏸ Pause',999999],['🐢 Slow',4000],['▶ Normal',2000],['⚡ Fast',500]].map(([t,v])=><button key={t} onClick={()=>setSpeed(v)}>{t}</button>)} <button onClick={()=>setCompare(true)}>Compare Civs</button></div><div>Leader: {leader?.name||'—'}</div></div>
  <div style={{margin:'8px 0',fontSize:12,opacity:.85}}>Tip: click <b>Spawn</b> to create up to 4 civilizations (a starter civ auto-spawns).</div><div><input placeholder='Name (optional)' value={spawn.name} onChange={e=>setSpawn({...spawn,name:e.target.value})}/><select value={spawn.era} onChange={e=>setSpawn({...spawn,era:e.target.value})}>{START_ERAS.map(v=><option key={v}>{v}</option>)}</select><select value={spawn.geography} onChange={e=>setSpawn({...spawn,geography:e.target.value})}>{GEOGRAPHIES.map(v=><option key={v}>{v}</option>)}</select><select value={spawn.government} onChange={e=>setSpawn({...spawn,government:e.target.value})}>{GOVERNMENTS.map(v=><option key={v}>{v}</option>)}</select><select value={spawn.cultureSeed} onChange={e=>setSpawn({...spawn,cultureSeed:e.target.value})}>{CULTURE_SEEDS.map(v=><option key={v}>{v}</option>)}</select><select value={spawn.wildcardId} onChange={e=>setSpawn({...spawn,wildcardId:+e.target.value})}>{WILDCARDS.map((v,i)=><option value={i} key={i}>{v}</option>)}</select><button onClick={addCiv}>Spawn</button></div>
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))',gap:10}}>{civs.map(c=><CivPanel key={c.id} civ={c} onAction={onAction} energy={energy} speed={speed} active={mode==='rival'&&c.player===1}/>)}</div>
  {compare&&<div style={{position:'fixed',inset:0,background:'#000d'}}><button onClick={()=>setCompare(false)}>Close</button><ResponsiveContainer width='100%' height='90%'><BarChart data={['population','food','resources','tech','military','culture','happiness','territory'].map(stat=>{const row={stat};civs.forEach(c=>row[c.name]=Math.round(c[stat]));return row;})}><CartesianGrid strokeDasharray='3 3'/><XAxis dataKey='stat'/><YAxis/><Tooltip/><Legend/>{civs.map(c=><Bar key={c.id} dataKey={c.name} fill={c.identity.nationalColors[0]}/>)}</BarChart></ResponsiveContainer></div>}</div>;
}

export default App;
