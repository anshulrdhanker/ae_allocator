import {referenceChoices} from './transformer-vocabulary.mjs';
import {readingTokens,readingDuration,readingPhase} from './reading.mjs';
export {tokenize} from './reading.mjs';
export const NARRATION_EXIT=390;
export const INTRO_LIFT_MS=520;
const clean=word=>word.toLowerCase().replace(/[^a-z-]/g,'');
const authored={};
const additions=`has|sees|faces|receives|experiences
more|greater|additional|higher|growing
inbound|incoming|qualified|new|potential
demand|interest|volume|activity|requests
than|beyond|above|versus|against
its|the|their|our|this
gtm|sales|commercial|revenue|growth
team|organization|function|staff|group
can|could|may|will|should
handle|support|manage|serve|process
so|therefore|and|thus|then
are|get|remain|become|were
allocated|routed|assigned|distributed|directed
account|sales|commercial|customer|business
executives|representatives|specialists|advisors|managers
naturally|intuitively|initially|then|first
saw|framed|treated|understood|recognized
as|through|with|via|within
an|a|the|this|one
optimization|allocation|routing|planning|modeling
problem|challenge|question|decision|task
how|where|when|why|whether
we|I|you|teams|operators
allocate|distribute|assign|direct|prioritize
that|which|this|the|each
start|begin|open|look|work
single|one|individual|specific|sample
takes|uses|reads|accepts|considers
in|from|through|with|within
potential|possible|estimated|projected|expected
arr|revenue|value|return|earnings
estimated|modeled|assumed|projected|expected
probabilities|likelihoods|estimates|rates|assumptions
through|via|across|under|between
both|two|each|either|these
routes|paths|channels|options|policies
amount|quantity|number|budget|allocation
increase|improve|raise|lift|change
probability|likelihood|chance|rate|estimate
calculate|compute|estimate|measure|derive
much|far|significantly|substantially|meaningfully
additional|incremental|extra|marginal|potential
involvement|support|assistance|attention|effort
would|could|might|can|should
generate|produce|yield|create|contribute
those|these|the|our|available
hours|resources|budgets|constraints|limits
shared|pooled|limited|available|constrained
across|among|throughout|between|over
all|every|the|these|incoming
incoming|inbound|new|available|generated
algorithm|model|solver|optimizer|method
evaluates|considers|compares|assesses|examines
every|each|all|any|the
together|jointly|collectively|simultaneously|globally
ones|leads|records|opportunities|accounts
receive|get|require|warrant|need
attention|support|assistance|effort|time
then|next|subsequently|also|finally
simulated|tested|evaluated|modeled|compared
synthetic|generated|simulated|hypothetical|sample
against|with|versus|alongside|to
simple|illustrative|basic|greedy|conventional
baseline|reference|comparison|existing|traditional
rule|policy|heuristic|approach|method
even|still|also|yet|then
exact|identical|original|given|fixed
generated|produced|yielded|returned|estimated
annual|yearly|modeled|projected|expected
improvement|increase|gain|uplift|difference
no|zero|neither|without|none
neither|both|either|each|every
retained|kept|preserved|returned|used
verified|validated|confirmed|proven|checked
less|lower|reduced|smaller|decreased
because|since|as|when|while
zero|no|unchanged|equal|none`;
for(const row of additions.split('\n')){const [key,...values]=row.split('|');authored[key]=values;}
const choices={};
for(const [word,values] of Object.entries(referenceChoices))choices[clean(word)]??=values;
export function tokenCandidates(text,index){
 const word=text.trim(),key=clean(word),alternatives=referenceChoices[word]??choices[key]??authored[key];
 if(!alternatives)return [];
 const scores=word==='programming,'?[.87,.07,.03,.02,.01]:word==='optimized'?[.79,.10,.06,.03,.02]:[[.48,.24,.15,.08,.05],[.66,.17,.09,.05,.03],[.53,.27,.11,.06,.03]][index%3];
 return [word,...alternatives].map((text,i)=>[text,scores[i]]);
}
export function narrationTokens(text,at=0,rate=1,focal=null,steady=false){
 const important=new Set((Array.isArray(focal)?focal:[focal]).filter(Boolean).map(clean));
 const pauseAfterLead=text.startsWith('We start with a single inbound lead.')?1000:0;
 const pauseAfterNext=text.startsWith('Next, the agent calculates')?400:0;
 const tokens=readingTokens(text,at,rate,steady);
 const lead=tokens.find(token=>token.text.trim()==='lead.');
 const next=tokens.find(token=>token.text.trim()==='Next,');
 return tokens.map((token,i)=>{
  const shifted=(pauseAfterLead&&lead&&token.start>=lead.end?pauseAfterLead:0)
   +(pauseAfterNext&&next&&token.start>=next.end?pauseAfterNext:0);
  return {...token,start:token.start+shifted,end:token.end+shifted,next:token.next+shifted,accept:token.accept+shifted,highlightEnd:token.highlightEnd+shifted,detailed:important.has(clean(token.text)),candidates:tokenCandidates(token.text,i)};
 });
}
export const narrationDuration=readingDuration;
export const tokenPhase=(token,time,reduced=false,showThinking=true)=>readingPhase(token,time,reduced,showThinking);
