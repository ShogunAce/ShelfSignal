import {useEffect} from 'react';

/** Native scrolling stays in control; effects only change paint properties. */
export function useLandingMotion(){
 useEffect(()=>{
  const root=document.querySelector<HTMLElement>('.landing')!;
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const preview=document.querySelector<HTMLElement>('.product-window')!;
  const capture=document.querySelector<HTMLElement>('.capture-figure')!;
  const reveals=Array.from(document.querySelectorAll<HTMLElement>('.section-kicker,.workflow-grid>div>h2,.section-intro,.workflow-list li,.capture-figure,.evidence-heading,.comparison-panel,.honesty-grid>div,.closing-section>*'));
  let dispose=()=>{};
  function setup(){
   dispose();
   if(motion.matches){root.classList.remove('motion-ready');return}
   root.classList.add('motion-ready');
   let frame=0;
   const clamp=(value:number)=>Math.max(0,Math.min(1,value));
   const paint=()=>{
    frame=0;
    const height=innerHeight;
    const heroProgress=clamp(scrollY/(height*.65));
    root.style.setProperty('--copy-shift',`${-heroProgress*32}px`);
    root.style.setProperty('--copy-opacity',String(1-heroProgress*.65));
    root.style.setProperty('--scroll-progress',String(clamp(scrollY/Math.max(1,document.documentElement.scrollHeight-height))));
    const entrance=clamp((height-preview.getBoundingClientRect().top)/(height*.85));
    preview.style.setProperty('--preview-scale',String(.94+.06*entrance));
    preview.style.setProperty('--preview-tilt',`${(1-entrance)*5}deg`);
    const photoProgress=clamp((height-capture.getBoundingClientRect().top)/(height+capture.offsetHeight));
    capture.style.setProperty('--photo-shift',`${(photoProgress-.5)*40}px`);
   };
   const schedule=()=>{if(!frame)frame=requestAnimationFrame(paint)};
   const observer=new IntersectionObserver(entries=>{
    for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('is-revealed');observer.unobserve(entry.target)}
   },{threshold:.1,rootMargin:'0px 0px -5% 0px'});
   reveals.forEach(element=>{
    element.classList.add('scroll-reveal');
    if(element.getBoundingClientRect().top<innerHeight*.9)element.classList.add('is-revealed');
    else observer.observe(element);
   });
   document.querySelectorAll<HTMLElement>('.workflow-list li').forEach((item,index)=>item.style.setProperty('--reveal-delay',`${index*90}ms`));
   window.addEventListener('scroll',schedule,{passive:true});
   window.addEventListener('resize',schedule);
   paint();
   dispose=()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule)};
  }
  setup();motion.addEventListener('change',setup);
  return()=>{dispose();motion.removeEventListener('change',setup);root.classList.remove('motion-ready')};
 },[]);
}
