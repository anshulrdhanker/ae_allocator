import React,{useState,useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import Home from '../app/page';
import PresentationDocument from '../src/components/PresentationDocument';
import usePresentation from '../src/components/usePresentation';
import fixtures from '../tests/fixtures.json';
import {chaptersFor} from '../src/components/narrative.mjs';
// Test-only media-query injection exercises the production preference listener.
const nativeMatchMedia=window.matchMedia.bind(window),nativeMotion=nativeMatchMedia('(prefers-reduced-motion: reduce)');
let motionPreference='system';const motionListeners=new Set();
const motionQuery={media:nativeMotion.media,get matches(){return motionPreference==='reduce'||(motionPreference==='system'&&nativeMotion.matches)},addEventListener:(_,fn)=>motionListeners.add(fn),removeEventListener:(_,fn)=>motionListeners.delete(fn)};
window.matchMedia=query=>query==='(prefers-reduced-motion: reduce)'?motionQuery:nativeMatchMedia(query);
const changeMotion=value=>{motionPreference=value;motionListeners.forEach(fn=>fn({matches:motionQuery.matches,media:motionQuery.media}))};
const originalFetch=window.fetch.bind(window);
window.fetch=(input,options)=>document.getElementById('qa-failure')?.checked&&String(input).includes('/api/simulate')?Promise.reject(new TypeError('Deliberate test: API request failed')):originalFetch(input,options);
function QA(){const [mode,setMode]=useState('fixtures'),[scenario,setScenario]=useState('default');const data=fixtures[scenario],controller=usePresentation(data,false);const {state,dispatch}=controller;useEffect(()=>dispatch({type:'seek-time',time:2000}),[scenario]);return <><div className="qa-toolbar"><label>QA mode <select value={mode} onChange={e=>setMode(e.target.value)}><option value="fixtures">Fixtures</option><option value="app">Actual application</option></select></label><label>Scenario <select value={scenario} onChange={e=>setScenario(e.target.value)}>{Object.keys(fixtures).map(k=><option key={k}>{k}</option>)}</select></label><label>Time (ms) <input aria-label="Time (ms)" type="number" value={Math.round(state.time)} onChange={e=>dispatch({type:'seek-time',time:+e.target.value})}/></label><label>Checkpoint <select value="" onChange={e=>dispatch({type:'seek-time',time:+e.target.value})}><option value="">Choose</option>{[2000,8200,10000,14000,15600,22500,23800,25000,27000,27500,28300,30000,36300,37800,38200,41200,49800,55500,64600,66200,69600,76000,77000,78000,80000,85000].map(t=><option key={t} value={t}>{t/1000}s</option>)}{chaptersFor(data).map(b=><option key={b.id} value={b.complete}>{b.id}</option>)}</select></label><label>OS motion (test) <select onChange={e=>changeMotion(e.target.value)}><option value="system">System</option><option value="reduce">Reduce</option></select></label><label><input id="qa-failure" type="checkbox"/>Fail API requests</label></div>{mode==='app'?<Home/>:<main className="optimizer-entry"><PresentationDocument data={data} controller={controller}/></main>}</>}
createRoot(document.getElementById('root')).render(<QA/>);
