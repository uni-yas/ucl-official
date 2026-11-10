import {createTracker,pageContext,linkEvent} from './analytics-core.mjs';
import {measurementId} from './analytics-config.mjs';
const root=document.documentElement;
const live=location.protocol==='https:' && location.hostname==='universion-closure-logic.com';
const preview=location.hostname==='127.0.0.1' || location.hostname==='localhost';
const storageKey='ucl-analytics-consent-v1', lifetime=15552000000;
let choice=null;
try {const saved=JSON.parse(localStorage.getItem(storageKey)); if(saved && Date.now()-saved.at<lifetime && ['granted','denied'].includes(saved.value)) choice=saved.value;} catch {}
// No Google requests (including consent pings) before affirmative consent.
const tracker=createTracker({measurementId,enabled:live,
  initialReferrer:document.referrer,
  command(){window.dataLayer=window.dataLayer||[];window.dataLayer.push(arguments);},
  load(){const s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id='+measurementId;s.referrerPolicy='strict-origin';document.head.append(s);}
});
const words={ja:{title:'閲覧状況の計測について',body:'サイトの改善のため、同意いただいた場合にGoogle Analyticsを使用します。ページの閲覧やリンク操作を計測します。',allow:'許可する',deny:'許可しない',settings:'計測設定',privacy:'プライバシー',close:'閉じる',saved:'計測設定を保存しました。',enabled:'現在：計測を許可',disabled:'現在：計測を許可しない'},
en:{title:'Website analytics',body:'With your consent, we use Google Analytics to improve this website by measuring page visits and link clicks.',allow:'Allow',deny:'Decline',settings:'Analytics settings',privacy:'Privacy',close:'Close',saved:'Analytics preference saved.',enabled:'Current setting: allowed',disabled:'Current setting: declined'}};
const panel=document.createElement('section'); panel.className='ucl-consent'; panel.hidden=true;panel.setAttribute('role','region');panel.setAttribute('aria-labelledby','ucl-consent-title');
panel.innerHTML='<div class="ucl-consent-heading"><h2 id="ucl-consent-title"></h2><button class="ucl-consent-close" type="button">×</button></div><p class="ucl-consent-copy"></p><p class="ucl-consent-state"></p><div class="ucl-consent-actions"><button type="button" data-choice="denied"></button><button type="button" data-choice="granted"></button></div><a class="ucl-consent-privacy"></a>';
document.body.append(panel);
const status=document.createElement('span');status.className='ucl-consent-sr';status.setAttribute('role','status');document.body.append(status);
let opener=null;
function translate(){
  const lang=root.lang==='en'?'en':'ja',w=words[lang];
  panel.querySelector('h2').textContent=w.title;
  panel.querySelector('.ucl-consent-copy').textContent=w.body;
  panel.querySelector('.ucl-consent-state').textContent=choice ? w[choice==='granted'?'enabled':'disabled']:'';
  panel.querySelector('[data-choice="granted"]').textContent=w.allow;
  panel.querySelector('[data-choice="denied"]').textContent=w.deny;
  panel.querySelector('.ucl-consent-close').setAttribute('aria-label',w.close);
  panel.querySelector('.ucl-consent-close').hidden=!choice;
  for(const el of document.querySelectorAll('[data-analytics-settings]'))el.textContent=w.settings;
  for(const el of document.querySelectorAll('[data-analytics-privacy],.ucl-consent-privacy')){el.textContent=w.privacy;el.href=lang==='en'?'/privacy/en/':'/privacy/';}
}
function open(from){opener=from||null;translate();panel.hidden=false;if(from)panel.querySelector('[data-choice="denied"]').focus();}
function close(){panel.hidden=true;if(opener?.isConnected)opener.focus();opener=null;}
function clearCookies(){
  for(const cookie of document.cookie.split(';')){
    const name=cookie.split('=')[0].trim();if(!/^_ga(?:_|$)/.test(name))continue;
    for(const domain of ['',location.hostname,'.'+location.hostname])document.cookie=name+'=; Max-Age=0; Path=/; SameSite=Lax'+(domain?'; Domain='+domain:'');
  }
}
function choose(value){
  const revoke=choice==='granted' && value==='denied';choice=value;
  try{localStorage.setItem(storageKey,JSON.stringify({value,at:Date.now()}));}catch{}
  if(value==='denied'){
    window['ga-disable-'+measurementId]=true;tracker.consent(false);clearCookies();
  } else {window['ga-disable-'+measurementId]=false;tracker.consent(true);}
  close();translate();status.textContent=words[root.lang==='en'?'en':'ja'].saved;
  // Discard the loaded Google runtime after withdrawal, without sending a denied ping.
  if(revoke && live)location.reload();
}
for(const el of document.querySelectorAll('.ucl-footer-bottom')){
  const b=document.createElement('button');b.type='button';b.className='ucl-analytics-settings';b.dataset.analyticsSettings='';el.append(b);
}
document.addEventListener('click',event=>{
  const target=event.target instanceof Element?event.target:null;
  const settings=target?.closest('[data-analytics-settings]');if(settings){open(settings);return;}
  const a=target?.closest('a[href]');if(a)tracker.event(linkEvent(a.href,location.origin));
});
panel.addEventListener('click',e=>{const b=e.target.closest('button[data-choice]');if(b)choose(b.dataset.choice);});
panel.querySelector('.ucl-consent-close').addEventListener('click',close);
panel.addEventListener('keydown',e=>{if(e.key==='Escape'&&choice)close();});
let ready=false;
function sync(){translate();if(ready)tracker.page(pageContext(location.href,root.lang,root.dataset.page));}
window.addEventListener('ucl:pagechange',sync);
window.addEventListener('pageshow',sync);
window.addEventListener('ucl:contact-sent',()=>tracker.event({name:'contact_submit_success',params:{}}));
// Consent changes in another UCL tab stop measurement in this tab too.
window.addEventListener('storage',e=>{if(e.key===storageKey){window['ga-disable-'+measurementId]=true;location.reload();}});
function start(){ready=true;sync();tracker.consent(choice==='granted');if(!choice && (live || preview))open();}
if(document.readyState==='complete')start();else window.addEventListener('DOMContentLoaded',start,{once:true});
