// Authored seconds are independent of the original formation simulation.
// All layers share this score: two genuine holds, a pull, then an impulse.
export const INTRO_END = 6.6;
export const RELEASE_AT = 4.22;
const clamp = x => Math.max(0, Math.min(1, x));
const smooth = x => { const u = clamp(x); return u*u*(3-2*u); };
const mix = (a,b,u) => a+(b-a)*u;

export function phaseAt(t) {
  return t<.90?'dispersion':t<1.65?'network':t<1.89?'outward':
    t<2.26?'anticipation':t<3.12?'convergence':t<3.35?'lock':
    t<4?'charge':t<RELEASE_AT?'still':t<4.67?'burst':
    t<INTRO_END?'afterglow':'ambient';
}

export function motionAt(time) {
  const t=Math.max(0,time);
  const age=Math.max(0,t-RELEASE_AT);
  // An impulse rather than another ease-in/ease-out. In the first .45 s,
  // the wave travels 82% of its distance; the long tail covers only 18%.
  const release=t<RELEASE_AT?0:age<.45?
    .82*(1-Math.exp(-age/.14))/(1-Math.exp(-.45/.14)):
    mix(.82,1,smooth((age-.45)/(INTRO_END-RELEASE_AT-.45)));
  let scene;
  if(t<.9)scene=t*2;
  else if(t<1.65)scene=mix(1.8,2.75,(t-.9)/.75);
  else if(t<1.89)scene=mix(2.75,3.25,(t-1.65)/.24);
  else if(t<2.26)scene=3.25;
  else if(t<3.12)scene=mix(3.25,6,Math.pow((t-2.26)/.86,1.7));
  else if(t<3.35)scene=mix(6,6.50,smooth((t-3.12)/.23));
  else if(t<4)scene=mix(6.50,6.649,smooth((t-3.35)/.65));
  else if(t<RELEASE_AT)scene=6.649;
  else scene=mix(6.65,8.8,release);
  const charge=smooth((t-3.35)/.65)*(1-smooth(age/.22));
  const flash=smooth(age/.022)*Math.exp(-age/ .13)*(t>=RELEASE_AT?1:0);
  const releaseLight=smooth(age/.018)*Math.exp(-age/.58)*(1-smooth((age-1.1)/.7));
  const jet=t<RELEASE_AT?0:smooth(age/.018)*Math.exp(-age/.52)*
    (.76+.24*Math.cos(age*Math.PI*2/.36))*(1-smooth((age-1.1)/.7));
  // A compressed half-size identity stores the energy. A critically damped
  // response accelerates out of the hold, then spends its tail settling.
  // There is no bounce, overshoot, or change to the approved final scale.
  const expansionAge=Math.min(age,1.03),response=a=>1-(1+12*a)*Math.exp(-12*a);
  const expansion=response(expansionAge)/response(1.03);
  const markFocus=smooth((age-.018)/.34);
  return {scene,release,age,charge,flash,releaseLight,
    markScale:mix(.5,1,expansion),markFocus,markBlur:2.8*(1-markFocus),
    // Focus racks across the outward breath/hold, before collection begins.
    focus:smooth((t-1.65)/.53),
    crystal:smooth((t-3.07)/.16)*(1-smooth((t-4.20)/.28)),
    crystalSweep:clamp((t-3.09)/1.0),
    // Preserve the vertical beginning and carry the final axis ten degrees
    // farther clockwise, toward the existing Opal ribbon.
    jet,jetReach:1-Math.exp(-age/.09),jetAngle:Math.PI/2-(.26+Math.PI/18)*(1-Math.exp(-age/.3)),
    projection:smooth((age-.18)/.22)*(1-smooth((age-.70)/1.45)),
    projectionSpread:1-Math.exp(-age/.5),
    tension:smooth((t-1.89)/.30)*(1-smooth((t-2.26)/.30)),
    phase:phaseAt(t)};
}
