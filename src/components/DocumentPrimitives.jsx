import {ease,progress} from './narrative.mjs';
import {useMemo} from 'react';
import {readingTokens} from './reading.mjs';
import SmoothWordStream from './SmoothWordStream';
export function Reveal({time,at,duration=280,children,className='',reserve=false}){const p=ease(progress(time,at,duration));return <div className={'reveal '+className} style={{gridTemplateRows:reserve?'1fr':`${p}fr`,opacity:p===0?0:1}} aria-hidden={p===0||undefined} inert={p===0?true:undefined}><div>{children}</div></div>}
export function RouteChip({route,changed=false,time=1000,at=0}){const p=ease(progress(time,at,200));return <span className={'route-chip '+(changed?'changed':'')} style={{transform:`translateY(${(1-p)*8}px)`,visibility:p?'visible':'hidden'}}>{route==='sales'?'AE-assisted':'Self-service'}</span>}

// A fixed-size output slot keeps the formula stable while its returned value resolves.
export function StreamValue({value,time,at,placeholder='—',reduced=false,fade=0}){
 const tokens=useMemo(()=>readingTokens(value,at),[value,at]),resolved=time>=at;
 return <span className="stream-value" data-resolved={resolved} data-complete={time>=(tokens.at(-1)?.end??at)}>
  <span aria-hidden={!resolved||undefined} style={{visibility:resolved?'visible':'hidden',opacity:fade&&!reduced?progress(time,at,fade):1}}><SmoothWordStream tokens={tokens} time={time} reduced={reduced}/></span>
  <span className="stream-placeholder" aria-hidden={resolved||undefined} style={{visibility:resolved?'hidden':'visible'}}>{placeholder}</span>
 </span>;
}
