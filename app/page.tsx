'use client';
import {useCallback, useEffect, useRef, useState} from 'react';
import Resume from '../src/components/Resume';
import PresentationDocument from '../src/components/PresentationDocument';
import {chaptersFor} from '../src/components/narrative.mjs';
import usePresentation from '../src/components/usePresentation';
import {orderLeads} from '../src/components/selectors.mjs';

type LeadEdit = {id:number;arr:number;p_self:number;p_sales:number;ae_hours:number;bdr_hours:number};
type Config = {lead_count:number;average_arr:number;bdr_capacity_hours:number;ae_capacity_hours:number;seed:number};
type Result = {opportunities:LeadEdit[];configuration:Config;[key:string]:any};
const defaults:Config = {lead_count:1000,average_arr:100000,bdr_capacity_hours:600,ae_capacity_hours:1200,seed:42};
const leadFields = [
 {key:'arr',label:'Potential ARR · $',min:0.01,max:1e9,step:'any'},
 {key:'p_self',label:'Self-service probability · 0–1',min:0,max:1,step:'any'},
 {key:'p_sales',label:'AE-assisted probability · 0–1',min:0,max:1,step:'any'},
 {key:'ae_hours',label:'Required AE hours',min:0.001,max:1e7,step:'any'},
 {key:'bdr_hours',label:'Required BDR hours',min:0.001,max:1e7,step:'any'},
] as const;
export default function Home(){
 const [config,setConfig]=useState(defaults),[data,setData]=useState<Result|null>(null),[busy,setBusy]=useState(true),[error,setError]=useState(''),[settings,setSettings]=useState(false);
 const [edits,setEdits]=useState<Record<number,LeadEdit>>({}),[selectedId,setSelectedId]=useState(1),[runId,setRunId]=useState(0);
 const request = useRef<AbortController|null>(null);
 const [resumeOpen,setResumeOpen]=useState(false);
 const controller=usePresentation(data,settings||resumeOpen||!!error||(busy&&runId>0));
 const {state,dispatch,reduced}=controller;
 const hasResult=useRef(false),reducedRef=useRef(false);reducedRef.current=reduced;
 const run=useCallback(async (values:Config, overrides:Record<number,LeadEdit>)=>{
  request.current?.abort(); const controller=new AbortController();request.current=controller;
  setBusy(true);setError('');
  try{
   const validEdits=Object.values(overrides).filter(l=>l.id<=values.lead_count);
   const response=await fetch('/api/simulate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...values,lead_overrides:validEdits}),signal:controller.signal});
   if(!response.ok)throw new Error(response.status===422?'Check the parameter values and try again.':'Could not solve this cohort. Check the backend and retry.');
   const result=await response.json();
   if(controller.signal.aborted)return;
   if(hasResult.current)dispatch({type:'replay',reduced:reducedRef.current,chapters:chaptersFor(result)});
   hasResult.current=true;setData(result);setRunId(n=>n+1);setSettings(false);
   setEdits(Object.fromEntries(validEdits.map(l=>[l.id,l])));
   setSelectedId(orderLeads(result)[0]?.id??1);
  }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Simulation failed.');}
  finally{if(!controller.signal.aborted)setBusy(false)}
 },[]);
 useEffect(()=>{run(defaults,{});return()=>request.current?.abort()},[run]);
 useEffect(()=>{
  if(controller.mobile){setSettings(false);if(resumeOpen){
   const disclosure=document.querySelector<HTMLDetailsElement>('.resume-disclosure');
   if(disclosure&&!disclosure.getClientRects().length)disclosure.open=false;
  }}
 },[controller.mobile,resumeOpen,state.time===0]);
 const original=data?.opportunities.find(l=>l.id===selectedId);
 const selected=edits[selectedId]??original;
 return <main className="optimizer-entry">

  {settings&&<form id="parameters" className="settings" onSubmit={e=>{e.preventDefault();run(config,edits)}}>
   <div className="settings-heading">Cohort <button type="button" aria-label="Close parameters" onClick={()=>setSettings(false)}>×</button></div>
   <div className="settings-grid">{([{key:'lead_count',label:'Number of leads',max:5000},{key:'average_arr',label:'Average potential ARR · $',max:1e9},{key:'ae_capacity_hours',label:'Available AE hours',max:1e7},{key:'bdr_capacity_hours',label:'Available BDR hours',max:1e7},{key:'seed',label:'Random seed',max:4294967295}] as const).map(f=><label key={f.key}>{f.label}<input required type="number" min={f.key==='average_arr'?1:0} max={f.max} step={f.key.includes('hours')?'any':1} value={Number.isNaN(config[f.key])?'':config[f.key]} onChange={e=>setConfig({...config,[f.key]:e.target.valueAsNumber})}/></label>)}</div>
   {data&&data.opportunities.length>0&&<><div className="settings-heading">Edit an example lead</div><label>Lead<select aria-label="Lead" value={selectedId} onChange={e=>setSelectedId(Number(e.target.value))}>{orderLeads(data).map((lead:LeadEdit,i:number)=><option value={lead.id} key={lead.id}>Lead #{String(lead.id).padStart(3,'0')}{i<2?' · example '+(i+1):''}{edits[lead.id]?' · edited':''}</option>)}</select></label>
    {selected&&<div className="settings-grid">{leadFields.map(f=><label key={f.key}>{f.label}<input required type="number" min={f.min} max={f.max} step={f.step} value={Number.isNaN(selected[f.key])?'':selected[f.key]} onChange={e=>{
      const edit:LeadEdit={id:selected.id,arr:selected.arr,p_self:selected.p_self,p_sales:selected.p_sales,ae_hours:selected.ae_hours,bdr_hours:selected.bdr_hours,[f.key]:e.target.valueAsNumber};
      setEdits({...edits,[selectedId]:edit});
    }}/></label>)}</div>}
    <p className="settings-note">Lead edits are retained across runs. Apply to recompute both policies for the entire cohort.</p><button type="button" className="reset-edits" onClick={()=>{setEdits({});run(config,{})}}>Reset lead edits</button></>}
   <button type="submit" className="apply-parameters" disabled={busy}>{busy?'Solving…':'Apply & recompute ↗'}</button>
  </form>}
  {error&&<div role="alert" className="error">{error} {data?'Showing the last completed run.':''} <button onClick={()=>run(config,edits)}>Retry</button></div>}
  <PresentationDocument data={data} controller={controller} onParameters={()=>setSettings(true)} busy={busy} error={error}/>
  <details className="resume-disclosure" onToggle={event=>{
    const disclosure=event.currentTarget;
    setResumeOpen(disclosure.open);
    if(disclosure.open) disclosure.querySelector('.resume-stage')?.scrollIntoView({
      behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth', block:'start'
    });
  }}>
    <summary>Anshul's resume</summary>
    <Resume/>
  </details>
 </main>;
}
