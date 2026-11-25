'use client';
import {useEffect,useReducer,useState,useRef,useCallback,useMemo} from 'react';
import {initialPlayback,playbackReducer,advanceClock} from './playback.mjs';
import {chaptersFor} from './narrative.mjs';
export default function usePresentation(data,suspended){
 const [state,baseDispatch]=useReducer(playbackReducer,undefined,initialPlayback);
 const [manualSpeed,setSpeed]=useState(null),[osReduced,setOSReduced]=useState(null),[manualReduced,setManualReduced]=useState(false);
 const [mobile,setMobile]=useState(false);
 useEffect(()=>{
  const query=matchMedia('(max-width: 700px)');
  const update=()=>setMobile(query.matches);
  update();query.addEventListener('change',update);
  return ()=>query.removeEventListener('change',update);
 },[]);
 const speed=manualSpeed??(state.time<20000?1.2:1);
 const reduced=!!osReduced||manualReduced;
 const stateRef=useRef(state);stateRef.current=state;
 const chapters=useMemo(()=>chaptersFor(data),[data]);
 const dispatch=useCallback(action=>baseDispatch({reduced,...action,chapters:action.chapters??chapters}),[chapters,reduced]);
 useEffect(()=>{
  if(mobile||reduced||suspended)return;
  const controls='a,button,input,select,textarea,label,details,form,[contenteditable]:not([contenteditable="false"]),[role="button"],[role="slider"]';
  const toggle=event=>{
   if(event.defaultPrevented||event.metaKey||event.ctrlKey||event.altKey||event.shiftKey)return;
   if(event.target instanceof Element&&event.target.closest(controls))return;
   if(event.type==='keydown'){
    if(event.code!=='Space')return;
    event.preventDefault();
    if(event.repeat)return;
   }else if(window.getSelection()?.toString())return;
   dispatch({type:'toggle'});
  };
  document.addEventListener('click',toggle);
  document.addEventListener('keydown',toggle);
  return ()=>{
   document.removeEventListener('click',toggle);
   document.removeEventListener('keydown',toggle);
  };
 },[dispatch,reduced,suspended,mobile]);
 useEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)');const update=()=>setOSReduced(media.matches);update();media.addEventListener('change',update);return()=>media.removeEventListener('change',update)},[]);
 const previousMode=useRef(null);
 useEffect(()=>{
  if(osReduced===null)return;
  const autoplay=mobile&&!reduced;
  if(previousMode.current===false&&autoplay)dispatch({type:'resume'});
  previousMode.current=autoplay;
 },[mobile,reduced,osReduced,dispatch]);
 useEffect(()=>{if(reduced)dispatch({type:'reduce-motion'})},[reduced,dispatch]);
 useEffect(()=>{
  if(!state.playing||suspended||osReduced===null||reduced)return;
  let frame,previous=null;
  const resetPrevious=()=>{previous=null;};
  document.addEventListener('visibilitychange',resetPrevious);
  const tick=now=>{
   const sample=advanceClock({now,previous,hidden:document.hidden,ready:!!data,time:stateRef.current.time,speed});
   previous=sample.previous;
   if(sample.delta)dispatch({type:'tick',delta:sample.delta});
   frame=requestAnimationFrame(tick);
  };frame=requestAnimationFrame(tick);return()=>{cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',resetPrevious)};
 },[state.playing,suspended,!!data,speed,osReduced,reduced,dispatch]);
 return {state,dispatch,mobile,speed,setSpeed,reduced,setReduced:setManualReduced,osReduced,suspended};
}
