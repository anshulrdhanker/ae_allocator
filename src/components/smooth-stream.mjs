export const WORD_ENTRANCE_MS=110;

// Appearance only: never change the token's reading interval or operation schedule.
export function wordOpacity(token,time,reduced=false,nextStart=token.next??token.end){
 if(time<token.start)return 0;
 if(reduced)return 1;
 const duration=Math.max(0,Math.min(WORD_ENTRANCE_MS,token.end-token.start,nextStart-token.start));
 const p=duration?Math.min(1,(time-token.start)/duration):1;
 return p*p*(3-2*p);
}
