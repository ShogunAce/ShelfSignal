import {useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ArrowUpRight,ArrowRight,Menu,X,Pause,Play,Check,ScanLine,ChevronDown} from 'lucide-react';
import '@fontsource-variable/manrope';
import {SignalMark} from './Brand';
import {useLandingMotion} from './useLandingMotion';
import './landing.css';
import './cinematic.css';

const media='/media/landing/';
const examples='/examples/elevenlabs/';
const shots=[
 {src:media+'pantry.webp',label:'A clear baseline',position:'35% center'},
 {src:examples+'reference.png',label:'The expected shelf',position:'30% center'},
 {src:media+'capture.webp',label:'A fresh perspective',position:'center'},
 {src:examples+'missing-item.png',label:'A visible change',position:'42% center'},
 {src:media+'pantry-detail.webp',label:'Details that matter',position:'center'},
 {src:examples+'refilled.jpg',label:'A visual follow-up',position:'65% center'},
 {src:media+'capture.webp',label:'People in control',position:'65% center'},
];
function Gallery(){
 const ring=useRef<HTMLDivElement>(null),frame=useRef<HTMLDivElement>(null),rotation=useRef(-2);
 const [paused,setPaused]=useState(false);
 useEffect(()=>{
  const element=ring.current!,container=frame.current!;
  const cards=Array.from(element.children) as HTMLElement[];
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  let phase=rotation.current,last=0,raf=0;
  const resize=()=>element.style.setProperty('--ring-scale',String(Math.min(Math.max(.68,container.clientWidth/1440),1.15,innerHeight*.34/355)));
  const observer=new ResizeObserver(resize);observer.observe(container);window.addEventListener('resize',resize);resize();
  function paint(time:number){
   if(last&&!document.hidden&&!motion.matches&&!paused)phase-=Math.min((time-last)/1000,.1)*1.35;
   last=time;rotation.current=phase;
   cards.forEach((card,i)=>{
    // Tangent planes on a cylinder place the outer cards closer to the camera.
    const angle=((i*360/37+phase)%360+540)%360-180;
    card.style.visibility=Math.abs(angle)>65?'hidden':'visible';
    if(Math.abs(angle)>65)return;
    const radians=angle*Math.PI/180;
    card.style.transform=`translate3d(${940*Math.sin(radians)}px,0,${940*(1-Math.cos(radians))}px) rotateY(${-angle}deg)`;
   });
   raf=requestAnimationFrame(paint);
  }
  const reset=()=>{last=0};document.addEventListener('visibilitychange',reset);
  raf=requestAnimationFrame(paint);
  return()=>{cancelAnimationFrame(raf);observer.disconnect();window.removeEventListener('resize',resize);document.removeEventListener('visibilitychange',reset)};
 },[paused]);
 return <div className="scene-gallery" ref={frame}>
   <div className="scene-viewport"><div className="scene-ring" ref={ring} aria-hidden="true">{Array.from({length:37},(_,i)=>{const shot=shots[i%shots.length];return <div className="scene-card" key={i}><img src={shot.src} alt="" style={{objectPosition:shot.position}} loading={i<5||i>32?'eager':'lazy'}/></div>})}</div></div>
   <div className="gallery-controls"><span>AI-generated shelf imagery</span><button className="motion-control" onClick={()=>setPaused(!paused)} aria-label={paused?'Play gallery motion':'Pause gallery motion'}>{paused?<Play size={12}/>:<Pause size={12}/>}<span>{paused?'Play':'Pause'}</span></button></div>
 </div>
}
function Landing(){
 useLandingMotion();
 const [menu,setMenu]=useState(false),[preview,setPreview]=useState('missing');
 const toggle=useRef<HTMLButtonElement>(null),nav=useRef<HTMLElement>(null);
 useEffect(()=>{
  const close=(event:KeyboardEvent)=>{if(event.key==='Escape'&&menu){setMenu(false);toggle.current?.focus()}};
  const outside=(event:PointerEvent)=>{if(nav.current&&!nav.current.contains(event.target as Node))setMenu(false)};
  const resize=()=>{if(innerWidth>760)setMenu(false)};
  document.addEventListener('keydown',close);document.addEventListener('pointerdown',outside);window.addEventListener('resize',resize);
  return()=>{document.removeEventListener('keydown',close);document.removeEventListener('pointerdown',outside);window.removeEventListener('resize',resize)};
 },[menu]);
 const state=preview==='missing'?{file:'missing-item.png',label:'One position to review',note:'The middle shelf, third position, has visible occupancy loss.'}:preview==='refilled'?{file:'refilled.jpg',label:'The position is filled again',note:'A follow-up image gives the reviewer new visual evidence.'}:{file:'blurred.jpg',label:'A clearer view is needed',note:'Poor image quality should lead to a rescan, not a task.'};
 return <div className="landing">
  <div className="reading-progress" aria-hidden="true"/>
  <a className="skip-link" href="#main">Skip to content</a>
  <header className="landing-nav" ref={nav}>
   <a className="landing-brand" href="/" aria-label="ShelfSignal home"><SignalMark/><span>ShelfSignal<span className="brand-period">.</span></span></a>
   <button className="menu-toggle" ref={toggle} aria-label={menu?'Close menu':'Open menu'} aria-expanded={menu} aria-controls="landing-menu" onClick={()=>setMenu(!menu)}>{menu?<X/>:<Menu/>}</button>
   <nav id="landing-menu" className={menu?'nav-links open':'nav-links'} aria-label="Main navigation">
    <a href="#how-it-works" onClick={()=>setMenu(false)}>How it works</a><a href="#evidence" onClick={()=>setMenu(false)}>The evidence</a><a href="https://github.com/ShogunAce/ShelfSignal" target="_blank" rel="noreferrer">Source <ArrowUpRight size={12}/></a>
    <a className="light-button nav-cta" href="/workspace/"><span>Open workspace</span><ArrowUpRight size={15}/></a>
   </nav>
  </header>
  <main id="main">
   <section className="landing-hero" aria-labelledby="hero-title">
    <div className="hero-atmosphere" aria-hidden="true"/>
    <div className="hero-copy">
     <div className="hero-badge"><span><SignalMark/></span>Evidence before action</div>
     <h1 id="hero-title">See the gap.<br/><span>Close the loop.</span></h1>
     <p>Compare the shelf. Review the change.<br/>Verify the follow-up.</p>
     <div className="hero-actions"><a className="light-button" href="/workspace/"><span>Inspect a shelf</span><ArrowUpRight size={17}/></a><a className="text-link" href="#how-it-works">See how it works <ChevronDown size={14}/></a></div>
    </div>
    <Gallery/>
    <div className="product-window">
     <div className="window-bar"><span className="window-dots" aria-hidden="true"><i/><i/><i/></span><span><SignalMark/>ShelfSignal / Inspection workspace</span><a href="/workspace/" aria-label="Open the inspection workspace"><ArrowUpRight size={17}/></a></div>
     <a className="workspace-preview" href="/workspace/" aria-label="Try the ShelfSignal inspection workspace"><img src={media+'workspace-preview.webp'} alt="ShelfSignal workspace showing the generated shelf reference and a missing carton awaiting human review" width="1440" height="980"/></a>
     <div className="window-caption"><span><i/>Actual application. Synthetic shelf images.</span><a href="/workspace/">Explore the workspace <ArrowRight size={14}/></a></div>
    </div>
   </section>
   <div className="technology-strip"><span>Built for a considered decision.</span><div><span>OpenCV <b>5</b></span><i/><span>AWS <b>Lambda</b></span><i/><span>Human <b>review</b></span></div><a href="#evidence">See the limits <ArrowDown/></a></div>
   <section id="how-it-works" className="workflow-section section-shell">
    <div className="section-kicker"><span>01 / THE WORKFLOW</span><span>From observation to follow-through</span></div>
    <div className="workflow-grid"><div><h2>A better next step.<br/><span>At every shelf.</span></h2><p className="section-intro">Keep the original photo. Measure what changed. Let a person decide what happens next.</p>
     <ol className="workflow-list"><li><span>01</span><div><h3>Set the reference</h3><p>Capture a stocked shelf and mark the positions you expect to see.</p></div></li><li><span>02</span><div><h3>Review the change</h3><p>Compare a new photo. Inspect possible gaps before approving any task.</p></div></li><li><span>03</span><div><h3>Verify the follow-up</h3><p>Photograph the shelf again. Recheck the original positions and keep the evidence.</p></div></li></ol>
     <a className="text-link bright" href="/workspace/">Try the complete loop <ArrowUpRight size={16}/></a>
    </div><figure className="capture-figure"><img src={media+'capture.webp'} alt="AI-generated illustration of hands photographing a grocery shelf with a smartphone" width="856" height="1280" loading="lazy"/><figcaption><ScanLine size={18}/><span>Start with what you can see.<small>AI-generated illustrative image</small></span><span className="figure-index">01 / 03</span></figcaption></figure></div>
   </section>
   <section id="evidence" className="evidence-section section-shell">
    <div className="section-kicker"><span>02 / THE EVIDENCE</span><span>Compare. Question. Confirm.</span></div>
    <div className="evidence-heading"><h2>The image changes.<br/><span>So does the next step.</span></h2><p>Explore one synthetic shelf scene. These previews illustrate the workflow. Run an inspection in the workspace to measure the evidence.</p></div>
    <div className="comparison-panel"><div className="comparison-toolbar"><span><i/>Synthetic example</span><div role="group" aria-label="Preview shelf condition">{[['missing','Missing item'],['refilled','Refilled'],['blur','Blurred']].map(([id,label])=><button key={id} aria-pressed={preview===id} onClick={()=>setPreview(id)}>{label}</button>)}</div></div>
     <div className="comparison-images"><figure><figcaption><span>01</span>Reference<span>EXPECTED</span></figcaption><img src={examples+'reference.png'} alt="Stocked reference with eighteen cereal cartons" width="1280" height="720" loading="lazy"/></figure><figure><figcaption><span>02</span>Follow the change<span>OBSERVED</span></figcaption><img key={state.file} src={examples+state.file} alt={state.label} width="1280" height="720" loading="lazy"/></figure></div>
     <div className="comparison-result" aria-live="polite"><div><ScanLine size={20}/><span><strong>{state.label}</strong><small>{state.note}</small></span></div><a href="/workspace/">Test this in the app <ArrowUpRight size={16}/></a></div>
    </div>
    <div className="honesty-grid"><div><span className="small-label">A MEASURED STARTING POINT</span><h3>Tested on synthetic scenes.<br/>Still learning from the real world.</h3><p>The benchmark includes 88 synthetic inspections and 24 follow-ups. It does not establish real-store accuracy. Flat occlusions produced eight false positives, a reason to keep human review in the loop.</p><a href="https://github.com/ShogunAce/ShelfSignal/blob/main/EVALUATION.md" target="_blank" rel="noreferrer" className="text-link bright">Read the evaluation <ArrowUpRight size={15}/></a></div><div className="principles"><p><Check size={17}/> Approval does not mean completion.</p><p><Check size={17}/> Uncertain evidence requests another view.</p><p><Check size={17}/> Every transition keeps a trace.</p><p><Check size={17}/> Original images stay preserved.</p></div></div>
   </section>
   <section className="closing-section section-shell"><div className="closing-symbol"><SignalMark/></div><span className="small-label">SEE IT. REVIEW IT. FOLLOW THROUGH.</span><h2>Give the next action<br/><span>a clearer starting point.</span></h2><a className="light-button" href="/workspace/"><span>Open ShelfSignal</span><ArrowUpRight size={18}/></a><p>Try a generated shelf example or upload your own photographs.</p></section>
  </main>
  <footer className="landing-footer"><a className="landing-brand" href="/"><SignalMark/><span>ShelfSignal.</span></a><p>Built by Kenosis Interactive.<br/><span>Reference-based inspection. Evidence before action.</span></p><div><a href="https://github.com/ShogunAce/ShelfSignal" target="_blank" rel="noreferrer">Source code <ArrowUpRight size={13}/></a><a href="https://github.com/ShogunAce/ShelfSignal/blob/main/SECURITY.md" target="_blank" rel="noreferrer">Data handling <ArrowUpRight size={13}/></a></div><span className="footer-disclosure">Illustrative media generated with ElevenLabs. No customer results are depicted.</span></footer>
 </div>
}
function ArrowDown(){return <ArrowRight size={12} style={{transform:'rotate(90deg)'}}/>}
createRoot(document.getElementById('root')!).render(<Landing/>);
