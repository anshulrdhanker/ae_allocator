'use client';
import {useMemo,useRef,useLayoutEffect,useState} from 'react';
import {narrationTokens,tokenPhase,NARRATION_EXIT,INTRO_LIFT_MS} from './intro.mjs';
import {ease,progress,smoothProgress,PHONE_RISE_MS} from './narrative.mjs';

const phoneLiftDuration=PHONE_RISE_MS*1.2;
const liftEnd=NARRATION_EXIT-450;

export default function TextGenerationIntro({line,reservedLines=null,previousLine,opening=null,closing=false,time,reduced,showThinking=true}){
 const root=useRef(null),active=useRef(null),[position,setPosition]=useState({left:0,top:0,width:184,compact:false});
 const secondCopy=useRef(null);
 const firstCopy=useRef(null),[geometry,setGeometry]=useState({lift:0,gap:0,exitDistance:0});
 const tokens=useMemo(()=>narrationTokens(line.text,line.at,line.rate,line.focal,line.steady),[line.text,line.at,line.rate,line.steady,String(line.focal)]);
 const firstTokens=useMemo(()=>opening?narrationTokens(opening.first.text,opening.first.at,opening.first.rate,opening.first.focal):[],[opening?.first.text]);
 const secondTokens=useMemo(()=>opening?narrationTokens(opening.second.text,opening.second.at,opening.second.rate,opening.second.focal):[],[opening?.second.text]);
 const closingLines=useMemo(()=>{
  if(!closing||!line.text.includes('an improvement of'))return null;
  const second=tokens.findIndex((t,i)=>t.text.trim()==='the'&&tokens[i+1]?.text.trim()==='optimized');
  const third=tokens.findIndex(t=>t.text.trim()==='expected');
  return second>0&&third>second?[tokens.slice(0,second),tokens.slice(second,third),tokens.slice(third)]:null;
 },[closing,line.text,tokens]);
 useLayoutEffect(()=>{
  if(!opening)return;
  const measure=()=>{
   if(!firstCopy.current||!root.current)return;
   const gap=parseFloat(getComputedStyle(firstCopy.current).lineHeight)/2;
   const transform=getComputedStyle(root.current).transform;
   const dockOffset=transform==='none'?0:new DOMMatrixReadOnly(transform).m42;
   // Untransformed page origin: enough extra travel to clear the entire first
   // paragraph above the viewport when docking finishes, at any breakpoint.
   const bounds=root.current.getBoundingClientRect(),scale=bounds.width/root.current.offsetWidth;
   const exitDistance=reservedLines?0:Math.max(0,(bounds.top+window.scrollY)/scale-dockOffset);
   if(reservedLines&&secondCopy.current){
    const first=firstCopy.current.offsetHeight,second=secondCopy.current.offsetHeight;
    const header=root.current.previousElementSibling;
    const topInset=parseFloat(getComputedStyle(root.current.closest('.routing-presentation')).paddingTop);
    const boundary=topInset+header.offsetHeight+parseFloat(getComputedStyle(header).marginBottom);
    setGeometry({first,second,gap,boundary,lift:0,exitDistance:0});
    return;
   }
   setGeometry({lift:firstCopy.current.getBoundingClientRect().height/scale+gap,gap,exitDistance});
  };
  measure();const observer=new ResizeObserver(measure);observer.observe(firstCopy.current);
  if(reservedLines&&secondCopy.current){
   observer.observe(secondCopy.current);
   observer.observe(root.current.previousElementSibling);
  }
  return()=>observer.disconnect();
 },[opening?.phase,opening?.first.text,reservedLines]);
 const reserve=useMemo(()=>reservedLines&&<div className="narration-reserve" aria-hidden="true">{reservedLines.map(text=><p key={text}>{text.split(' ').map((word,i)=><span key={i}><span className="narrator-word">{word}</span>{' '}</span>)}</p>)}</div>,[reservedLines]);
 const current=reduced||!showThinking?null:tokens.find(t=>t.candidates.length&&time>=t.start&&time<t.end);
 // The intro playhead runs faster than the workspace. Keep the same visible word cadence.
 const wordTime=line.at+(time-line.at)/(line.wordClockScale??1);
 const wordPhase=token=>tokenPhase(token,wordTime,reduced,showThinking);
 const exitDuration=opening?.phase==='exit'?550:NARRATION_EXIT;
 const exiting=!reduced&&previousLine&&opening?.phase!=='second'&&time<exitDuration;
 const exitProgress=ease(progress(time,0,exitDuration));
 // Use the existing end-of-paragraph hold for a gentler lift, keeping its end
 // and the breathing room before the next word cue unchanged.
 const handoff=reservedLines?progress(opening?.handoffTime??0,liftEnd-phoneLiftDuration,phoneLiftDuration):progress(opening?.handoffTime??0,-450-(INTRO_LIFT_MS-NARRATION_EXIT),INTRO_LIFT_MS);
 const liftProgress=opening?.phase==='exit'?1:reduced?(reservedLines?Number(opening?.phase==='second'):Number(handoff>0)):smoothProgress(handoff);
 // The settled two-line workspace narration sits half a line below its origin.
 const secondOffset=(reservedLines?0:geometry.gap)*(reduced?1-(opening?.dock??0):1);
 const mobileOpening=reservedLines&&opening;
 const dock=mobileOpening?smoothProgress(progress(opening.dockElapsed,0,PHONE_RISE_MS)):opening?.dock??0;
 const firstY=mobileOpening
  ? `calc(var(--rise) * ${2-liftProgress-dock} - var(--paragraph-step))`
  : `${-geometry.lift*liftProgress-geometry.exitDistance*dock-(opening?.phase==='exit'?5*exitProgress:0)}px`;
 const secondY=mobileOpening
  ? `calc(var(--rise) * ${1-dock})`
  : `${secondOffset}px`;
 const streamingCopy=useRef(null);
 const [wraps,setWraps]=useState([]);
 useLayoutEffect(()=>{
  const copy=streamingCopy.current;
  if(!copy||reduced){setWraps([]);return;}
  const measure=()=>{
   const breaks=[];
   let previousTop;
   copy.querySelectorAll('.narrator-word').forEach((word,index)=>{
    const top=word.offsetTop;
    if(previousTop!==undefined&&top>previousTop){
     breaks.push({at:tokens[index].start,distance:top-previousTop});
    }
    previousTop=top;
   });
   setWraps(breaks);
  };
  measure();
  const observer=new ResizeObserver(measure);
  observer.observe(copy);
  document.fonts.addEventListener('loadingdone',measure);
  return ()=>{observer.disconnect();document.fonts.removeEventListener('loadingdone',measure);};
 },[tokens,closing,opening?.phase,reduced]);
 const firstWrap=wraps[0];
 const thirdLine=line.liftThirdLine&&wraps[1];
 const thirdLineLift=thirdLine?0.4*thirdLine.distance*ease(progress(time,thirdLine.at,340)):0;
 const wrapOffset=firstWrap&&!reduced?(firstWrap.distance/2)*ease(progress(time,firstWrap.at,340))+thirdLineLift:0;
 const outgoingOffset=previousLine?.liftThirdLine
  ? 'max(0.1lh, 1.3lh - 40%, 2lh - 100%)'
  : 'max(0.5lh, 2lh - 100%)';
 const renderWords=(items,clock,live=false)=>items.map((token,i)=><span className="narrator-token" key={i}><span ref={live&&token===current?active:null} className="narrator-word" data-state={live?wordPhase(token):tokenPhase(token,clock,reduced,showThinking)}>{token.text.trimEnd()}</span>{/\s$/.test(token.text)?' ':''}</span>);
 useLayoutEffect(()=>{
  if(!current)return;
  const measure=()=>{
   if(!root.current||!active.current)return;
   const r=root.current.getBoundingClientRect(),a=active.current.getBoundingClientRect();
   const scale=r.width/root.current.offsetWidth,top=(a.bottom-r.top)/scale;
   const compact=top+108>r.height/scale,width=compact?Math.min(384,r.width/scale-16):184;
   setPosition({left:Math.max(0,Math.min((a.left-r.left)/scale,r.width/scale-width-8)),top:top+(compact?4:8),width,compact});
  };
  measure();const observer=new ResizeObserver(measure);observer.observe(root.current);
  return()=>observer.disconnect();
 },[current,secondY,firstY,wrapOffset]);
 const words=closingLines?closingLines.map((lineWords,i)=><span className="closing-line" key={i}>{renderWords(lineWords,time,true)}</span>):renderWords(tokens,time,true);
 const workspaceNarration=!closing&&opening?.phase!=='first'&&opening?.phase!=='second';
 const streamingWords=workspaceNarration?<span ref={streamingCopy} style={{display:'block',position:'relative',transform:`translateY(${reduced?"0px":`calc(1lh - ${wrapOffset}px)`})`}}>{words}</span>:words;
 return <section className="narrator" data-phone-opening={mobileOpening?.phase} data-static-pair={mobileOpening?.phase==='second'&&reduced||undefined} style={mobileOpening?{'--first-height':(geometry.first??0)+'px','--second-height':(geometry.second??0)+'px','--boundary':(geometry.boundary??0)+'px'}:undefined} data-plain-narration={!showThinking || undefined} aria-label="Narrator" ref={root} data-narration-state={exiting?'clearing':!reduced&&time<line.at?'blank':!reduced&&time<line.at+line.duration?'streaming':'complete'}>
  {reserve}
  <div className="narrator-copy" aria-hidden="true">
   {opening&&<p ref={firstCopy} data-intro-paragraph="first" className={'intro-flow-first'+(opening.phase==='exit'?' intro-flow-history':'')} style={{visibility:opening.phase==='exit'&&!exiting?'hidden':'visible',opacity:mobileOpening?1:opening.phase==='exit'?1-exitProgress:1,transform:`translateY(${firstY})`}}>{opening.phase==='first'?streamingWords:renderWords(firstTokens,Infinity)}</p>}
   {opening?.phase==='first'&&<p ref={secondCopy} className="intro-flow-measure">{renderWords(secondTokens,-Infinity)}</p>}
   {opening?.phase!=='first'&&<p ref={secondCopy} data-intro-paragraph={opening?.phase==='second'?'second':undefined} style={opening?.phase==='second'?{transform:`translateY(${secondY})`}:undefined}>{streamingWords}</p>}
   {previousLine&&opening?.phase!=='second'&&<p className="narrator-previous" style={{visibility:exiting?'visible':'hidden',opacity:1-exitProgress,transform:`translateY(calc(${opening?.phase==='exit'?secondOffset+'px':workspaceNarration&&!opening?outgoingOffset:"0px"} - ${5*exitProgress}px))`}}>{previousLine.text}</p>}
  </div>
  <p className="sr-only">{line.text}</p>
  {current&&<div className={'intro-selection '+(time>=current.accept?'is-accepted ':'')+(position.compact?'is-compact':'')} style={{left:position.left,top:position.top,width:position.width}} aria-hidden="true">
   <span className="intro-phase">{time>=current.accept?'assign':'thinking'}</span>
   <div className="intro-candidates">{current.candidates.map(([word,probability],i)=><div className="intro-candidate" key={word+':'+i} style={{visibility:time<current.accept?'visible':'hidden'}}><span>{word}</span><span>{probability.toFixed(2)}</span></div>)}</div>
  </div>}
 </section>;
}
