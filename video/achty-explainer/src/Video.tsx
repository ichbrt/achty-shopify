import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import scenes from '../script/scenes.json';
import {SCENE_DURATIONS, SCENE_STARTS, TOTAL_FRAMES} from './generated';

const C = {
  bg: '#050714',
  panel: 'rgba(13,18,40,0.72)',
  panel2: 'rgba(23,27,58,0.88)',
  text: '#F7FAFF',
  muted: '#8E99B8',
  cyan: '#29D9FF',
  violet: '#8B5CF6',
  purple: '#B26CFF',
  green: '#4ADE80',
  line: 'rgba(112,130,185,0.24)',
};

const font = 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif';

const ease = (v: number) => Easing.bezier(0.22, 1, 0.36, 1)(v);

const fade = (frame: number, duration: number) => {
  const i = interpolate(frame, [0, 18], [0, 1], {extrapolateRight: 'clamp'});
  const o = interpolate(frame, [Math.max(0, duration - 18), duration], [1, 0], {extrapolateLeft: 'clamp'});
  return Math.min(i, o);
};

const Glow: React.FC<{x: number; y: number; size: number; color: string; opacity?: number}> = ({x,y,size,color,opacity=0.22}) => (
  <div style={{position:'absolute',left:x-size/2,top:y-size/2,width:size,height:size,borderRadius:'50%',background:color,filter:'blur(90px)',opacity}} />
);

const Grid = () => (
  <AbsoluteFill style={{
    backgroundColor:C.bg,
    backgroundImage:
      'linear-gradient(rgba(120,135,190,.055) 1px, transparent 1px), linear-gradient(90deg, rgba(120,135,190,.055) 1px, transparent 1px)',
    backgroundSize:'64px 64px',
  }} />
);

const Pill: React.FC<{children: React.ReactNode; accent?: boolean}> = ({children,accent}) => (
  <div style={{
    padding:'10px 16px',
    borderRadius:999,
    border:'1px solid ' + (accent ? 'rgba(41,217,255,.55)' : 'rgba(150,165,220,.2)'),
    background:accent ? 'rgba(41,217,255,.09)' : 'rgba(16,22,48,.58)',
    color:accent ? C.cyan : '#C7D0EA',
    fontSize:20,
    letterSpacing:1.2,
    fontWeight:700,
  }}>{children}</div>
);

const Brand = () => (
  <div style={{display:'flex',alignItems:'center',gap:12}}>
    <div style={{
      width:36,height:36,borderRadius:11,
      background:'linear-gradient(135deg,'+C.cyan+','+C.violet+')',
      boxShadow:'0 0 32px rgba(41,217,255,.38)',
      display:'grid',placeItems:'center',fontWeight:900,color:'#07101B'
    }}>A</div>
    <div style={{fontSize:24,fontWeight:850,letterSpacing:-0.6}}>ACHTy <span style={{color:C.cyan}}>AI</span></div>
  </div>
);

const Header: React.FC<{index:number}> = ({index}) => (
  <div style={{position:'absolute',top:44,left:68,right:68,display:'flex',justifyContent:'space-between',alignItems:'center',zIndex:30}}>
    <Brand/>
    <div style={{display:'flex',alignItems:'center',gap:12}}>
      <Pill>AI SEARCH VISIBILITY</Pill>
      <div style={{fontSize:18,color:C.muted,fontWeight:700}}>{String(index+1).padStart(2,'0')} / {String(scenes.length).padStart(2,'0')}</div>
    </div>
  </div>
);

const SceneText: React.FC<{index:number;duration:number}> = ({index,duration}) => {
  const frame=useCurrentFrame();
  const sc=scenes[index];
  const p=ease(interpolate(frame,[4,32],[0,1],{extrapolateRight:'clamp'}));
  return (
    <div style={{position:'absolute',left:92,top:178,width:710,zIndex:20,opacity:fade(frame,duration),transform:'translateY('+((1-p)*24)+'px)'}}>
      <div style={{fontSize:19,letterSpacing:3.1,color:C.cyan,fontWeight:800,marginBottom:18}}>{sc.eyebrow}</div>
      <div style={{fontSize:index===9?64:58,lineHeight:1.05,letterSpacing:-2.4,fontWeight:850,color:C.text,textShadow:'0 12px 60px rgba(0,0,0,.35)'}}>{sc.title}</div>
      <div style={{marginTop:26,fontSize:25,lineHeight:1.45,color:'#AAB5D2',fontWeight:560,maxWidth:650}}>{sc.caption}</div>
    </div>
  );
};

const Glass: React.FC<{children:React.ReactNode;style?:React.CSSProperties}> = ({children,style}) => (
  <div style={{
    background:'linear-gradient(180deg,rgba(25,31,69,.82),rgba(10,14,34,.82))',
    border:'1px solid rgba(149,165,225,.18)',
    borderRadius:28,
    boxShadow:'0 30px 90px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.035)',
    ...style
  }}>{children}</div>
);

const EngineChip:React.FC<{name:string;color:string;delay:number}> = ({name,color,delay})=>{
  const f=useCurrentFrame();
  const s=spring({frame:f-delay,fps:30,config:{damping:14,stiffness:120,mass:.7}});
  return <div style={{opacity:s,transform:'scale('+(.85+.15*s)+')',padding:'18px 22px',borderRadius:18,border:'1px solid '+color+'66',background:color+'12',color:'#F5F7FF',fontWeight:750,fontSize:24,boxShadow:'0 0 35px '+color+'18'}}>{name}</div>
};

const Scene0:React.FC<{duration:number}> = ({duration})=>{
  const f=useCurrentFrame();
  const t=interpolate(f,[18,90],[0,1],{extrapolateRight:'clamp'});
  const cursor=Math.floor(f/16)%2===0;
  return <div style={{position:'absolute',left:860,top:210,width:920,height:660,opacity:fade(f,duration)}}>
    <Glow x={460} y={290} size={620} color={C.violet}/>
    <Glass style={{padding:34}}>
      <div style={{display:'flex',gap:10,marginBottom:26}}><span style={{width:12,height:12,borderRadius:9,background:'#FF5F57'}}/><span style={{width:12,height:12,borderRadius:9,background:'#FEBB2E'}}/><span style={{width:12,height:12,borderRadius:9,background:'#28C840'}}/></div>
      <div style={{fontSize:18,color:C.muted,marginBottom:12}}>AI ASSISTANT</div>
      <div style={{fontSize:31,fontWeight:700,lineHeight:1.3,minHeight:84}}>{'Dalaman’da en iyi klinik hangisi?'.slice(0,Math.floor(35*t))}<span style={{opacity:cursor?1:0,color:C.cyan}}>▌</span></div>
      <div style={{height:1,background:C.line,margin:'30px 0'}}/>
      {['Klinik A','Klinik B','Klinik C'].map((x,i)=><div key={x} style={{marginTop:14,padding:'18px 20px',borderRadius:17,background:'rgba(255,255,255,.035)',display:'flex',alignItems:'center',gap:14,opacity:interpolate(f,[95+i*16,115+i*16],[0,1],{extrapolateRight:'clamp'})}}>
        <div style={{width:34,height:34,borderRadius:10,background:i===0?'linear-gradient(135deg,'+C.cyan+','+C.violet+')':'rgba(255,255,255,.08)'}}/>
        <div style={{fontSize:24,fontWeight:700}}>{x}</div>
        {i===0&&<div style={{marginLeft:'auto',fontSize:18,color:C.green}}>Önerilen</div>}
      </div>)}
    </Glass>
  </div>
};

const Scene1:React.FC<{duration:number}> = ({duration})=>{
  const f=useCurrentFrame();
  const sweep=(f*7)%620;
  return <div style={{position:'absolute',left:850,top:185,width:940,height:670,opacity:fade(f,duration)}}>
    <Glow x={470} y={330} size={700} color={C.cyan} opacity={0.13}/>
    <Glass style={{height:'100%',padding:34,position:'relative',overflow:'hidden'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div><div style={{fontSize:18,color:C.muted}}>PROJECT</div><div style={{fontSize:28,fontWeight:800,marginTop:5}}>yourbrand.com</div></div>
        <Pill accent>SCAN ACTIVE</Pill>
      </div>
      <div style={{position:'absolute',left:60,top:145,right:60,bottom:55,border:'1px solid rgba(41,217,255,.15)',borderRadius:24,overflow:'hidden'}}>
        <div style={{position:'absolute',top:sweep-180,left:0,right:0,height:190,background:'linear-gradient(180deg,transparent,rgba(41,217,255,.12),rgba(41,217,255,.28),transparent)',filter:'blur(4px)'}}/>
        <div style={{position:'absolute',inset:38,display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:18,alignItems:'center'}}>
          <EngineChip name="ChatGPT" color={C.green} delay={18}/>
          <EngineChip name="Gemini" color={C.cyan} delay={30}/>
          <EngineChip name="Perplexity" color={C.violet} delay={42}/>
        </div>
        <div style={{position:'absolute',left:50,right:50,bottom:42,display:'flex',alignItems:'end',gap:20}}>
          <div style={{fontSize:17,color:C.muted}}>AI VISIBILITY SCORE</div>
          <div style={{fontSize:70,fontWeight:900,lineHeight:.8,color:C.text}}>{Math.round(interpolate(f,[40,150],[16,94],{extrapolateRight:'clamp'}))}</div>
          <div style={{fontSize:26,color:C.green,fontWeight:800}}>↑</div>
        </div>
      </div>
    </Glass>
  </div>
};

const Scene2:React.FC<{duration:number}> = ({duration})=>{
 const f=useCurrentFrame();
 const cards=[
  ['Prompt Coverage','128 sorgu'],
  ['Competitor Gap','7 fırsat'],
  ['Citations','36 kaynak'],
  ['Sentiment','Pozitif'],
  ['Mentions','2.4K'],
  ['Topics','18 küme']
 ];
 return <div style={{position:'absolute',left:850,top:205,width:930,height:640,opacity:fade(f,duration),display:'grid',gridTemplateColumns:'1fr 1fr',gap:18}}>
   {cards.map((c,i)=>{const s=spring({frame:f-10-i*7,fps:30,config:{damping:16,stiffness:120}});return <Glass key={c[0]} style={{padding:26,opacity:s,transform:'translateY('+((1-s)*24)+'px)'}}>
     <div style={{fontSize:18,color:C.muted}}>{c[0]}</div><div style={{fontSize:34,fontWeight:850,marginTop:10,color:i===1?C.violet:i===3?C.green:C.text}}>{c[1]}</div>
     <div style={{height:6,borderRadius:8,background:'rgba(255,255,255,.06)',marginTop:22,overflow:'hidden'}}><div style={{height:'100%',width:(45+i*8)+'%',background:'linear-gradient(90deg,'+C.cyan+','+C.violet+')'}}/></div>
   </Glass>})}
 </div>
};

const Scene3:React.FC<{duration:number}> = ({duration})=>{
 const f=useCurrentFrame();
 const agents=['Stratejist','Araştırmacı','İçerik','SEO','Doğrulayıcı','Trend'];
 const cx=1320,cy=535,rad=260;
 return <div style={{position:'absolute',inset:0,opacity:fade(f,duration)}}>
   <Glow x={cx} y={cy} size={620} color={C.violet} opacity={0.18}/>
   <svg width="1920" height="1080" style={{position:'absolute',inset:0}}>
     {agents.map((_,i)=>{const a=(Math.PI*2*i/agents.length)-Math.PI/2;const x=cx+Math.cos(a)*rad;const y=cy+Math.sin(a)*rad;const dash=interpolate(f,[15+i*4,70+i*4],[420,0],{extrapolateRight:'clamp'});return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(81,200,255,.35)" strokeWidth="2" strokeDasharray="420" strokeDashoffset={dash}/>})}
   </svg>
   <div style={{position:'absolute',left:cx-105,top:cy-105,width:210,height:210,borderRadius:'50%',background:'radial-gradient(circle at 35% 30%,'+C.cyan+','+C.violet+' 52%,#16182E 72%)',display:'grid',placeItems:'center',boxShadow:'0 0 80px rgba(139,92,246,.38)',fontWeight:900,fontSize:28,textAlign:'center'}}>AI<br/>CORE</div>
   {agents.map((a,i)=>{const ang=(Math.PI*2*i/agents.length)-Math.PI/2;const x=cx+Math.cos(ang)*rad;const y=cy+Math.sin(ang)*rad;const s=spring({frame:f-18-i*5,fps:30,config:{damping:15,stiffness:110}});return <div key={a} style={{position:'absolute',left:x-95,top:y-44,width:190,height:88,borderRadius:22,border:'1px solid rgba(133,154,225,.24)',background:C.panel2,display:'grid',placeItems:'center',fontSize:21,fontWeight:750,opacity:s,transform:'scale('+(.8+.2*s)+')'}}>{a}</div>})}
 </div>
};

const Scene4:React.FC<{duration:number}> = ({duration})=>{
 const f=useCurrentFrame(); const center={x:1320,y:530};
 const nodes=[['Organization',0,-250],['Service',260,-120],['Person',280,150],['Location',0,270],['Topic',-270,145],['WebSite',-280,-130]];
 return <div style={{position:'absolute',inset:0,opacity:fade(f,duration)}}>
  <Glow x={center.x} y={center.y} size={700} color={C.cyan} opacity={0.14}/>
  <svg width="1920" height="1080" style={{position:'absolute',inset:0}}>
   {nodes.map((n,i)=>{const x=center.x+(n[1] as number);const y=center.y+(n[2] as number);return <line key={i} x1={center.x} y1={center.y} x2={x} y2={y} stroke="rgba(139,92,246,.38)" strokeWidth="3"/>})}
  </svg>
  <div style={{position:'absolute',left:center.x-120,top:center.y-70,width:240,height:140,borderRadius:28,border:'1px solid rgba(41,217,255,.45)',background:'linear-gradient(135deg,rgba(41,217,255,.14),rgba(139,92,246,.18))',boxShadow:'0 0 70px rgba(41,217,255,.18)',display:'grid',placeItems:'center',fontSize:31,fontWeight:900}}>MARKA</div>
  {nodes.map((n,i)=>{const x=center.x+(n[1] as number),y=center.y+(n[2] as number);const s=spring({frame:f-12-i*6,fps:30,config:{damping:16,stiffness:100}});return <div key={String(n[0])} style={{position:'absolute',left:x-100,top:y-42,width:200,height:84,borderRadius:20,border:'1px solid rgba(171,190,240,.2)',background:C.panel2,display:'grid',placeItems:'center',fontSize:20,fontWeight:750,opacity:s,transform:'scale('+(.82+.18*s)+')'}}>{String(n[0])}</div>})}
 </div>
};

const Scene5:React.FC<{duration:number}> = ({duration})=>{
 const f=useCurrentFrame(); const p=interpolate(f,[20,160],[0,1],{extrapolateRight:'clamp'});
 const pts=[0.12,0.18,0.25,0.24,0.38,0.44,0.56,0.64,0.72,0.86];
 const path=pts.map((v,i)=>(i?'L':'M')+' '+(70+i*78)+' '+(410-v*330)).join(' ');
 return <div style={{position:'absolute',left:860,top:205,width:910,height:620,opacity:fade(f,duration)}}>
   <Glass style={{height:'100%',padding:34}}>
    <div style={{display:'flex',justifyContent:'space-between'}}><div><div style={{fontSize:18,color:C.muted}}>LIVE OPTIMIZATION</div><div style={{fontSize:30,fontWeight:850,marginTop:5}}>Visibility Trend</div></div><Pill accent>LIVE SERP</Pill></div>
    <svg width="820" height="430" style={{marginTop:25}}>
      {[0,1,2,3].map(i=><line key={i} x1="40" x2="800" y1={90+i*90} y2={90+i*90} stroke="rgba(130,150,210,.13)"/>)}
      <path d={path} fill="none" stroke={C.cyan} strokeWidth="6" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1-p} style={{filter:'drop-shadow(0 0 12px rgba(41,217,255,.5))'}}/>
      {pts.map((v,i)=><circle key={i} cx={70+i*78} cy={410-v*330} r={i===pts.length-1?9:5} fill={i===pts.length-1?C.violet:C.cyan} opacity={interpolate(p,[i/pts.length,(i+1)/pts.length],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'})}/>)}
    </svg>
   </Glass>
 </div>
};

const Scene6:React.FC<{duration:number}> = ({duration})=>{
 const f=useCurrentFrame();
 const items=['Kaynaklar','Doğrulama','Optimizasyon','Yayın'];
 return <div style={{position:'absolute',left:850,top:265,width:940,height:520,opacity:fade(f,duration),display:'flex',alignItems:'center',gap:22}}>
  {items.map((x,i)=>{const s=spring({frame:f-10-i*18,fps:30,config:{damping:15,stiffness:110}});return <React.Fragment key={x}><div style={{width:178,height:178,borderRadius:32,border:'1px solid '+(i===1?'rgba(74,222,128,.5)':'rgba(139,92,246,.28)'),background:i===1?'rgba(74,222,128,.08)':C.panel2,display:'grid',placeItems:'center',textAlign:'center',fontSize:22,fontWeight:800,opacity:s,transform:'scale('+(.8+.2*s)+')'}}>{i===1&&<div style={{fontSize:42,color:C.green}}>✓</div>}<div>{x}</div></div>{i<items.length-1&&<div style={{fontSize:38,color:C.cyan,opacity:s}}>→</div>}</React.Fragment>})}
 </div>
};

const Scene7:React.FC<{duration:number}> = ({duration})=>{
 const f=useCurrentFrame(); const score=Math.round(interpolate(f,[20,140],[45,94],{extrapolateRight:'clamp'}));
 return <div style={{position:'absolute',left:845,top:190,width:950,height:650,opacity:fade(f,duration),display:'grid',gridTemplateColumns:'1.3fr 1fr',gap:18}}>
  <Glass style={{padding:34,gridRow:'1 / span 2'}}>
   <div style={{fontSize:18,color:C.muted}}>AI VISIBILITY SCORE</div><div style={{fontSize:118,fontWeight:900,letterSpacing:-7,marginTop:12}}>{score}<span style={{fontSize:34,color:C.muted,letterSpacing:0}}>/100</span></div>
   <div style={{height:14,borderRadius:20,background:'rgba(255,255,255,.06)',overflow:'hidden',marginTop:30}}><div style={{height:'100%',width:score+'%',background:'linear-gradient(90deg,'+C.cyan+','+C.violet+')'}}/></div>
   <div style={{marginTop:44,fontSize:22,color:C.green,fontWeight:800}}>↑ 12% bu hafta</div>
  </Glass>
  <Glass style={{padding:26}}><div style={{fontSize:18,color:C.muted}}>MENTIONS</div><div style={{fontSize:48,fontWeight:900,marginTop:12}}>2.4K</div><div style={{fontSize:19,color:C.green,marginTop:7}}>+847 yeni</div></Glass>
  <Glass style={{padding:26}}><div style={{fontSize:18,color:C.muted}}>AI ENGINES</div><div style={{fontSize:48,fontWeight:900,marginTop:12}}>3/3</div><div style={{fontSize:19,color:C.cyan,marginTop:7}}>takipte</div></Glass>
 </div>
};

const Scene8:React.FC<{duration:number}> = ({duration})=>{
 const f=useCurrentFrame(); const p=interpolate(f,[25,135],[0,1],{extrapolateRight:'clamp'});
 return <div style={{position:'absolute',left:860,top:230,width:900,height:560,opacity:fade(f,duration)}}>
  <div style={{display:'flex',gap:26,height:'100%',alignItems:'center'}}>
    <Glass style={{width:360,padding:28,opacity:1-p*.65,transform:'translateX('+(-70*p)+'px) scale('+(1-.12*p)+')'}}>
      <div style={{fontSize:18,color:C.muted}}>SEARCH RESULTS</div>{[1,2,3,4].map(i=><div key={i} style={{marginTop:22}}><div style={{height:13,width:(70-i*7)+'%',borderRadius:8,background:'rgba(41,217,255,.26)'}}/><div style={{height:9,width:'90%',borderRadius:8,background:'rgba(255,255,255,.07)',marginTop:9}}/><div style={{height:9,width:'74%',borderRadius:8,background:'rgba(255,255,255,.05)',marginTop:7}}/></div>)}
    </Glass>
    <div style={{fontSize:46,color:C.violet,transform:'scale('+(1+p*.2)+')'}}>→</div>
    <Glass style={{flex:1,padding:34,transform:'translateX('+((1-p)*90)+'px)',boxShadow:'0 30px 100px rgba(139,92,246,.18)'}}>
      <div style={{display:'flex',alignItems:'center',gap:12}}><div style={{width:36,height:36,borderRadius:12,background:'linear-gradient(135deg,'+C.cyan+','+C.violet+')'}}/><div style={{fontSize:20,color:C.muted}}>AI ANSWER</div></div>
      <div style={{fontSize:34,fontWeight:800,lineHeight:1.25,marginTop:28}}>“En iyi seçenekler arasında…”</div>
      <div style={{fontSize:22,lineHeight:1.55,color:'#A9B4D1',marginTop:20}}>Artık kullanıcı bağlantı listesini taramak yerine, doğrudan cevabı ve öneriyi okuyor.</div>
      <div style={{marginTop:30,display:'flex',gap:10}}><Pill accent>ANSWER</Pill><Pill>RECOMMENDATION</Pill></div>
    </Glass>
  </div>
 </div>
};

const Scene9:React.FC<{duration:number}> = ({duration})=>{
 const f=useCurrentFrame(); const s=spring({frame:f-8,fps:30,config:{damping:17,stiffness:90}});
 return <div style={{position:'absolute',left:860,top:260,width:880,height:470,opacity:fade(f,duration),transform:'scale('+(.93+.07*s)+')'}}>
   <Glow x={440} y={220} size={900} color={C.violet} opacity={0.26}/>
   <Glass style={{height:'100%',display:'grid',placeItems:'center',textAlign:'center',padding:50,border:'1px solid rgba(41,217,255,.28)'}}>
    <div>
      <div style={{fontSize:30,fontWeight:900,letterSpacing:1}}>ACHTy <span style={{color:C.cyan}}>AI</span></div>
      <div style={{fontSize:20,color:C.muted,marginTop:18}}>AI SEARCH VISIBILITY PLATFORM</div>
      <div style={{fontSize:54,fontWeight:900,letterSpacing:-2.5,marginTop:34,background:'linear-gradient(90deg,#FFFFFF,'+C.cyan+','+C.violet+')',WebkitBackgroundClip:'text',color:'transparent'}}>achty.com</div>
      <div style={{marginTop:28,fontSize:21,color:'#B5C0DE'}}>Understand • Improve • Become Recommendable</div>
    </div>
   </Glass>
 </div>
};

const SceneVisual:React.FC<{index:number;duration:number}> = ({index,duration})=>{
 const comps=[Scene0,Scene1,Scene2,Scene3,Scene4,Scene5,Scene6,Scene7,Scene8,Scene9];
 const Comp=comps[index] ?? Scene0;
 return <Comp duration={duration}/>;
};

export const ACHTyVideo:React.FC = () => {
 const frame=useCurrentFrame();
 const {fps}=useVideoConfig();
 const active=SCENE_STARTS.reduce<number>((acc,start,i)=>frame>=start?i:acc,0);
 const progress=interpolate(frame,[0,TOTAL_FRAMES],[0,1],{extrapolateRight:'clamp'});
 return <AbsoluteFill style={{fontFamily:font,color:C.text,background:C.bg,overflow:'hidden'}}>
  <Grid/>
  <Glow x={1600} y={150} size={900} color={C.violet} opacity={0.10}/>
  <Glow x={250} y={930} size={800} color={C.cyan} opacity={0.07}/>
  <Header index={active}/>
  {SCENE_DURATIONS.map((dur,i)=><Sequence key={i} from={SCENE_STARTS[i]} durationInFrames={dur}>
    <SceneText index={i} duration={dur}/>
    <SceneVisual index={i} duration={dur}/>
    <Audio src={staticFile('audio/scene-'+String(i+1)+'.mp3')} volume={0.98}/>
  </Sequence>)}
  <div style={{position:'absolute',left:68,right:68,bottom:42,height:4,borderRadius:8,background:'rgba(255,255,255,.07)',overflow:'hidden',zIndex:50}}>
    <div style={{height:'100%',width:(progress*100)+'%',background:'linear-gradient(90deg,'+C.cyan+','+C.violet+')',boxShadow:'0 0 18px rgba(41,217,255,.5)'}}/>
  </div>
  <div style={{position:'absolute',bottom:55,right:70,fontSize:16,color:'rgba(174,188,225,.6)',fontWeight:700,zIndex:50}}>ACHTy.COM</div>
 </AbsoluteFill>;
};
