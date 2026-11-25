export const money=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(value);
export const dollars=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2}).format(value);
export const signedMoney=value=>(value>0?'+':'')+money(value);
export const number=value=>new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(value);
export const probability=value=>number(value*100)+'%';
export const route=value=>value==='sales'?'AE':'Self-service';

// A common symmetric logarithmic scale spreads the skewed cohort without
// dropping outliers, clipping losses, or altering any revenue calculation.
// Linear near zero; logarithmic beyond the $1,000 transition.
export const plotTransform=value=>Math.sign(value)*Math.log1p(Math.abs(value)/1000);
export const plotInverse=value=>Math.sign(value)*Math.expm1(Math.abs(value))*1000;
export function plotDomain(leads) {
  return {hours:Math.max(16,...leads.map(l=>l.ae_hours)),min:Math.min(0,...leads.map(l=>l.incremental_ev)),max:Math.max(1,...leads.map(l=>l.incremental_ev))};
}
export function coordinates(lead,domain) {
  const low=plotTransform(domain.min),high=plotTransform(domain.max);
  return {x:70+lead.ae_hours/domain.hours*550,y:245-(plotTransform(lead.incremental_ev)-low)/(high-low)*207};
}
export function plotTicks(domain) {
  const low=plotTransform(domain.min),high=plotTransform(domain.max);
  return [0,.25,.5,.75,1].map(t=>({value:plotInverse(low+t*(high-low)),y:245-t*207}));
}

export const hours=value=>new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}).format(value);

export function routeEstimates(lead) {
 const {arr_self=lead.arr,arr_sales=lead.arr,p_self=lead.p_self,p_sales=lead.p_sales}=lead.route_estimates??{};
 const selfRevenue=arr_self*p_self, salesRevenue=arr_sales*p_sales;
 return {arr_self,arr_sales,p_self,p_sales,selfRevenue,salesRevenue,lift:salesRevenue-selfRevenue};
}
