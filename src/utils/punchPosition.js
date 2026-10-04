// Invoked only by an explicit Punch action. No watch, polling, caching, or offline authority.
export function capturePunchPosition(geolocation=globalThis.navigator?.geolocation,foreground=()=>globalThis.document?.visibilityState==='visible') {
 return new Promise((resolve,reject)=>{
  const fail=(code,message)=>reject(Object.assign(new Error(message),{code}));
  if(!foreground())return fail('PUNCH_NOT_FOREGROUND','Open Meetro to verify your location and punch.');
  if(!geolocation?.getCurrentPosition)return fail('PUNCH_LOCATION_UNAVAILABLE','Your location could not be verified. Check location services and retry.');
  geolocation.getCurrentPosition(position=>{
   if(!foreground())return fail('PUNCH_NOT_FOREGROUND','Open Meetro and retry your punch.');
   const {latitude,longitude,accuracy}=position.coords||{},timestamp=position.timestamp;
   if(typeof latitude!=='number'||!Number.isFinite(latitude)||Math.abs(latitude)>90||typeof longitude!=='number'||!Number.isFinite(longitude)||Math.abs(longitude)>180||typeof accuracy!=='number'||!Number.isFinite(accuracy)||accuracy<=0||typeof timestamp!=='number'||!Number.isFinite(timestamp)||!Number.isFinite(new Date(timestamp).getTime()))return fail('PUNCH_POSITION_INVALID','Your device returned an incomplete position. Retry at the authorized location.');
   resolve({status:'CAPTURED',latitude,longitude,accuracyMeters:accuracy,sampledAt:new Date(timestamp).toISOString()});
  },error=>fail(error?.code===1?'PUNCH_PERMISSION_DENIED':'PUNCH_LOCATION_UNAVAILABLE',error?.code===1?'Location permission is needed to punch. Allow location while using Meetro.':'Your location could not be verified. Check location services and retry.'),{enableHighAccuracy:true,timeout:10000,maximumAge:0});
 });
}
