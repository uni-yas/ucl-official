// Only public, bounded page/link identifiers enter analytics. Never read form values.
export const ORIGIN = 'https://universion-closure-logic.com';
const pages = {home:'Home',company:'Company',products:'Products & Services',contact:'Contact',research:'Research',quotaecho:'QuotaEcho'};
const studies = new Map([
  ['24047493','tuza-triangle-overlap-cores'],['23978800','hexagonal-strip-width-eleven'],
  ['23978867','king-grid-dynamic-identification'],['23978917','king-grid-det-old'],
  ['23978919','square-grid-det-ld'],['23978923','kagome-open-locating-domination']
]);
export function pageContext(href, language, section) {
  const url = new URL(href, ORIGIN), lang = language === 'en' ? 'en' : 'ja';
  const path = url.pathname.replace(/index\.html$/, '');
  let kind, cleanPath;
  if (path === '/') {
    kind = ['home','company','products','contact'].includes(section) ? section : 'home';
    cleanPath = '/?lang=' + lang + (kind === 'home' ? '' : '#' + kind);
    // The legacy research hash immediately redirects to the standalone page.
    if (url.hash === '#research') return null;
  } else if (['/research/','/research/en/'].includes(path)) {
    kind = 'research'; cleanPath = lang === 'en' ? '/research/en/' : '/research/';
  } else if (['/apple/quotaecho/','/apple/quotaecho/en/'].includes(path)) {
    kind = 'quotaecho'; cleanPath = lang === 'en' ? '/apple/quotaecho/en/' : '/apple/quotaecho/';
  } else return null;
  return {page_kind:kind, page_language:lang, page_location:ORIGIN+cleanPath,
    page_title:`${pages[kind]} | UCL | ${lang.toUpperCase()}`};
}
export function safeReferrer(raw) {
  try { const u = new URL(raw); return ['http:','https:'].includes(u.protocol) ? u.origin+'/' : ''; } catch { return ''; }
}
export function linkEvent(href, base = ORIGIN) {
  let u; try { u = new URL(href, base); } catch { return null; }
  if (!['http:','https:'].includes(u.protocol)) return null;
  const host = u.hostname, path = u.pathname;
  let id;
  if (host === 'zenodo.org') id = path.match(/^\/records\/(\d+)\/?$/)?.[1];
  if (host === 'doi.org') id = path.match(/^\/10\.5281\/zenodo\.(\d+)\/?$/)?.[1];
  if (studies.has(id)) return {name:'research_link_click',params:{study_id:studies.get(id),link_domain:host,link_url:u.origin+path}};
  if (host === 'arxiv.org' && path === '/abs/2611.11128') return {name:'research_link_click',params:{study_id:'tuza-triangle-overlap-cores',link_domain:host,link_url:u.origin+path}};
  if (host === 'apps.apple.com' && /\/id\d+/.test(path)) return {name:'app_store_click',params:{product:'quotaecho',link_domain:host,link_url:u.origin+path}};
  if (u.origin === new URL(base).origin && /^\/apple\/quotaecho\/(?:en\/)?(?:index\.html)?$/.test(path)) return {name:'product_link_click',params:{product:'quotaecho',link_domain:new URL(ORIGIN).hostname,link_url:ORIGIN+path}};
  return null;
}
export function createTracker({measurementId,enabled,command,load,initialReferrer=''}) {
  let consent=false, started=false, current=null, previous='', last='', sent=false;
  const valid = enabled && /^G-[A-Z0-9]+$/.test(measurementId);
  const emitPage = () => {
    if (!valid || !consent || !current || last === current.page_location) return;
    if (!started) {
      started=true;
      command('consent','default',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
      command('js',new Date());
      command('config',measurementId,{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,
        cookie_expires:15552000,cookie_update:false,page_referrer:safeReferrer(initialReferrer),...current});
      load();
    }
    const params={...current,page_referrer:previous || safeReferrer(initialReferrer)};
    command('set',params); // Also sanitize automatic session/engagement events.
    command('event','page_view',{...params,send_to:measurementId});
    previous=current.page_location; last=current.page_location; sent=true;
  };
  return {
    page(context){current=context;emitPage();},
    consent(granted){
      consent=Boolean(granted);
      if (!valid) return;
      if (!consent) {last='';previous='';sent=false;return;}
      emitPage();
    },
    event(event){
      if (!valid || !consent || !current || !sent || !event) return;
      if (!['research_link_click','product_link_click','app_store_click','contact_submit_success'].includes(event.name)) return;
      command('event',event.name,{...current,...event.params,send_to:measurementId});
    }
  };
}
