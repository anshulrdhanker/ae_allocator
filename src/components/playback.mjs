import {BEATS,INTRO_DURATION,beatAt} from './narrative.mjs';
export const initialPlayback=()=>({time:0,playing:true,selectedId:null});
export function playbackReducer(state,action){const chapters=action.chapters??BEATS,end=chapters.at(-1).end,b=beatAt(state.time,chapters),i=chapters.indexOf(b);switch(action.type){
 case 'tick':return !state.playing?state:{...state,resultFrom:b.id==='result'?state.resultFrom:undefined,time:Math.min(end,state.time+action.delta),playing:state.time+action.delta<end};
 case 'toggle':return state.time>=end?state:{...state,playing:!state.playing};
 case 'resume':return state.time<end?{...state,playing:true}:state;
 case 'pause':return {...state,playing:false};
 case 'replay':return {...initialPlayback(),playing:!action.reduced};
 case 'reduce-motion':return {...state,time:b.complete,playing:false};
 case 'next':
 case 'seek':{
  const target=action.type==='seek'?(chapters.find(c=>c.id===action.chapter)??b):
   state.time<b.complete?b:chapters[Math.min(i+1,chapters.length-1)];
  if(action.type==='seek'&&target.id==='shared_allocation'&&target!==b&&!action.reduced)return {...state,time:target.at,playing:true};
  if(target.id==='result'&&target!==b&&!action.reduced)return {...state,time:target.at,resultFrom:state.time,playing:true};
  return {...state,time:target.complete,playing:false};
 }
 case 'back':return {...state,time:chapters[Math.max(0,i-1)].complete,playing:false};
 case 'select-lead':return {...state,selectedId:action.id,time:(chapters.find(c=>c.id==='inbound_record')??b).complete,playing:false};
 case 'seek-cue':{const target=(action.chapter?chapters.find(c=>c.id===action.chapter):chapters.find(c=>action.cue>=c.storyAt&&action.cue<c.storyAt+c.storyDuration))??b;return {...state,time:Math.min(target.complete,target.at+target.delay+(action.cue-target.storyAt)/target.storyRate),playing:false};}
 case 'seek-time':return {...state,resultFrom:undefined,time:Math.max(0,Math.min(end,action.time)),playing:!!action.keepPlaying&&state.playing&&action.time<end};
 default:return state;
}}
export function advanceClock({now,previous,hidden,ready,time,speed,readyLimit=INTRO_DURATION}){if(hidden||(!ready&&time>=readyLimit))return {previous:null,delta:0};if(previous===null)return {previous:now,delta:0};if(now-previous<24)return {previous,delta:0};const delta=(now-previous)*speed;return {previous:now,delta:ready?delta:Math.min(delta,readyLimit-time)}}
