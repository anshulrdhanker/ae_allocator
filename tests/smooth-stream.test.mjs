import {test} from 'node:test';
import assert from 'node:assert/strict';
import {wordOpacity,WORD_ENTRANCE_MS} from '../src/components/smooth-stream.mjs';
import {readingTokens} from '../src/components/reading.mjs';
import {estimateOperation} from '../src/components/agent-activity.mjs';

test('word entrance is continuous, monotonic, and deterministic under seeking',()=>{
 const tokens=readingTokens('AE time 5.06 h',1000),original=structuredClone(tokens);
 for(const token of tokens){
  assert.equal(wordOpacity(token,token.start-1),0);
  assert.equal(wordOpacity(token,token.start),0);
  assert.equal(wordOpacity(token,token.start+55),.5);
  let previous=0;
  for(let elapsed=0;elapsed<=WORD_ENTRANCE_MS;elapsed++){
   const opacity=wordOpacity(token,token.start+elapsed);assert.ok(opacity>=previous&&opacity<=1);previous=opacity;
  }
  assert.equal(wordOpacity(token,token.end),1);
  assert.equal(wordOpacity(token,token.end+10000),1);
  // Seeking backward and forward does not depend on earlier samples.
  assert.equal(wordOpacity(token,token.start+55),.5);
  assert.equal(wordOpacity(token,token.start-1),0);
 }
 assert.deepEqual(tokens,original);
});

test('short intervals clamp the entrance and reduced motion respects scheduled starts',()=>{
 const token={start:100,end:150,next:150};
 assert.equal(wordOpacity(token,125),.5);assert.equal(wordOpacity(token,150),1);
 assert.equal(wordOpacity(token,120,false,120),1);
 assert.equal(wordOpacity(token,99,true),0);assert.equal(wordOpacity(token,100,true),1);
 assert.equal(wordOpacity({start:100,end:100},100),1);
});

test('structured outputs settle before the existing transfer schedule',()=>{
 const operation=estimateOperation({p_self:.4039,p_sales:.4634,ae_hours:5.06,bdr_hours:1.27},26600);
 for(const output of operation.outputs)for(const token of [...output.labelTokens,...output.valueTokens]){
  assert.equal(wordOpacity(token,output.end),1);
  assert.equal(wordOpacity(token,output.transferAt),1);
  assert.ok(token.start+WORD_ENTRANCE_MS<=output.end);
 }
});
