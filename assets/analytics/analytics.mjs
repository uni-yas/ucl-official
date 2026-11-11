// Page-view analytics only. No consent UI, identifiers, cookies or localStorage are
// created for measurement. Language preferences belong to the navigation module.
import {siteToken} from './analytics-config.mjs?v=20261111-cookieless';
const production=location.protocol==='https:' && location.hostname==='universion-closure-logic.com';
// One-time removal of identifiers left by our previous Google Analytics setup.
try{localStorage.removeItem('ucl-analytics-consent-v1')}catch{}
for(const item of document.cookie.split(';')){
  const name=item.split('=')[0].trim();
  if(!/^_ga(?:_|$)/.test(name))continue;
  for(const domain of ['',location.hostname,'.'+location.hostname]){
    document.cookie=name+'=; Max-Age=0; Path=/; SameSite=Lax'+(domain?'; Domain='+domain:'');
  }
}
function start(){
  if(!production || !/^[a-f0-9]{32}$/i.test(siteToken||''))return;
  if(document.querySelector('script[data-cf-beacon]'))return;
  const script=document.createElement('script');
  script.src='https://static.cloudflareinsights.com/beacon.min.js';
  script.type='module';
  // Corporate sections now have real paths; local anchors are not page views.
  script.dataset.cfBeacon=JSON.stringify({token:siteToken,spa:false});
  document.head.append(script);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
