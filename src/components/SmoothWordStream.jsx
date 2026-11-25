import {wordOpacity} from './smooth-stream.mjs';

// Render every slot from the outset. Opacity never changes wrapping or color.
export default function SmoothWordStream({tokens,time,reduced=false,className=''}){
 return tokens.map((token,i)=><span key={i} className={'smooth-stream-word'+(className?' '+className:'')} style={{opacity:wordOpacity(token,time,reduced,tokens[i+1]?.start??token.next??token.end)}}>{token.text}</span>);
}
