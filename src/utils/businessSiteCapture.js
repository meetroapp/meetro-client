// One foreground request, only after an authorized business user presses the capture button.
export function captureBusinessSitePosition(geolocation=globalThis.navigator?.geolocation) {
  return new Promise((resolve,reject)=>{
    if(!geolocation?.getCurrentPosition){reject(new Error('Location is unavailable on this device.'));return;}
    geolocation.getCurrentPosition(position=>{
      const {latitude,longitude,accuracy}=position.coords||{};
      const timestamp=position.timestamp;
      if(typeof latitude!=='number'||!Number.isFinite(latitude)||Math.abs(latitude)>90||typeof longitude!=='number'||!Number.isFinite(longitude)||Math.abs(longitude)>180||typeof accuracy!=='number'||!Number.isFinite(accuracy)||accuracy<=0||typeof timestamp!=='number'||!Number.isFinite(timestamp)||!Number.isFinite(new Date(timestamp).getTime())){
        reject(new Error('The device returned an incomplete or invalid position. Capture again.'));return;
      }
      resolve({latitude,longitude,accuracyMeters:accuracy,sampledAt:new Date(timestamp).toISOString()});
    },error=>reject(new Error(error?.code===1?'Location permission was denied. Allow foreground location in your browser to capture this site.':error?.code===3?'Location capture timed out. Try again while at the site.':'Your device could not obtain a position. Try again while at the site.')),
    {enableHighAccuracy:true,maximumAge:0,timeout:10000});
  });
}
