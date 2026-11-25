// Research anchor: Brysbaert (2019), 238 wpm at 4.6 letters/word.
// The passage budget follows the published word-length adjustment. Individual
// word weights, the floor, punctuation and number/acronym costs are UI estimates,
// not measured fixation durations. See docs/reading-cadence.md.
export const READING={wpm:238,referenceLength:4.6,minimumWordMs:140,afterNarrationMs:1200};
export const tokenize=text=>String(text).match(/\S+\s*/g)??[];

export function readingCost(text){
 const word=text.trim(),letters=(word.match(/\p{L}/gu)??[]).length,digits=(word.match(/\d/g)??[]).length;
 const acronym=/^[A-Z]{2,6}$/.test(word.replace(/[^A-Za-z]/g,''));
 const length=Math.max(1,letters*(acronym?2:1)+digits+(/[\d]\.\d/.test(word)?1:0)+(/[$%]/.test(word)?2:0));
 const ending=word.replace(/["'”’\])]+$/g,'');
 const boundary=/[.!?…]$/.test(ending)?0.85:/[,;:—]$/.test(ending)?0.35:0;
 return {length,weight:0.5+0.12*length+boundary};
}

export function readingTokens(text,at=0,rate=1,steady=false){
 const words=tokenize(text);if(!words.length)return [];
 const costs=words.map(readingCost),baseMs=60000/READING.wpm;
 // Short-word passages never run faster than the average. Longer passages use
 // 238 * 4.6 / mean word length. Punctuation shares this budget, not an extra one.
 const budget=Math.max(words.length*baseMs,costs.reduce((n,c)=>n+c.length,0)*baseMs/READING.referenceLength);
 const durations=Array(words.length),pending=new Set(words.map((_,i)=>i));let remaining=budget;
 while(pending.size){
  const weight=[...pending].reduce((n,i)=>n+costs[i].weight,0);
  const short=[...pending].filter(i=>remaining*costs[i].weight/weight<READING.minimumWordMs);
  if(!short.length){for(const i of pending)durations[i]=remaining*costs[i].weight/weight;break;}
  for(const i of short){durations[i]=READING.minimumWordMs;remaining-=READING.minimumWordMs;pending.delete(i);}
 }
 // Give the final constraint clause a small authored reading breath.
 const clause=words.findIndex(w=>w.trim()==='given');
 if(text.endsWith('to maximize expected revenue given limited AE time.')&&clause>0)durations[clause-1]+=180;
 let cursor=at;
 return words.map((text,i)=>{
  const weightedDuration=durations[i]/rate;
  const duration=steady?Math.min(196,Math.max(130,160+(weightedDuration-160)*0.4)):weightedDuration;
  const start=cursor;cursor+=duration;
  return {text,start,end:cursor,next:cursor,duration,accept:start+duration*0.55,highlightEnd:start+duration*0.8};
 });
}
export const readingDuration=text=>readingTokens(text).at(-1)?.end??0;
export function readingPhase(token,time,reduced=false,showThinking=false){
 if(reduced||time>=token.highlightEnd)return 'settled';
 if(time<token.start)return 'pending';
 return showThinking&&time<token.accept?'thinking':'accepted';
}
export function readingSequence(items,gap=120){
 let next=-Infinity;
 return items.map(item=>{
  const at=Math.max(item.at,next),end=at+readingDuration(item.value);next=end+gap;
  return {...item,at,end};
 });
}
