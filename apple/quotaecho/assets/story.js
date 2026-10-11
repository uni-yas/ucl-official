// Frame math stays independent of the DOM so the narrative can be regression-tested.
function quotaEchoStoryFrame(progress) {
  const p = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0;
  const ramp = (start, end) => {
    const x = Math.min(1, Math.max(0, (p - start) / (end - start)));
    return x * x * (3 - 2 * x);
  };
  return {
    time: ramp(.25, .45),
    gap: ramp(.48, .66),
    expand: ramp(.18, .43),
    detail: ramp(.44, .64),
    // Scrolling can stop at any point: never overlay two readable headlines.
    title: [1 - ramp(.18, .24), ramp(.24, .30) * (1 - ramp(.52, .58)), ramp(.58, .64)]
  };
}

(() => {
  if (typeof document === 'undefined') return;
  const chapters = [...document.querySelectorAll('.scroll-story[data-story]')];
  if (!chapters.length || !window.matchMedia || !window.requestAnimationFrame) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const short = window.matchMedia('(max-height: 700px)');
  const narrow = window.matchMedia('(max-width: 767px)');
  const shortPhone = window.matchMedia('(max-height: 599px)');
  let scheduled = false;
  let active = false;

  const paint = (chapter, progress) => {
    const frame = quotaEchoStoryFrame(progress);
    for (const key of ['time', 'gap', 'expand', 'detail']) {
      chapter.style.setProperty(`--${key}`, frame[key].toFixed(4));
    }
    frame.title.forEach((opacity, index) => chapter.style.setProperty(`--title-${index}`, opacity.toFixed(4)));
  };

  const update = () => {
    scheduled = false;
    if (!active) return;
    // Read every geometry first; write afterward to avoid layout thrashing.
    const frames = chapters.map(chapter => {
      if (!chapter.classList.contains('is-enhanced')) return [chapter, 1];
      const rect = chapter.getBoundingClientRect();
      const sticky = chapter.querySelector('.story-sticky');
      const top = parseFloat(window.getComputedStyle(sticky).top) || 0;
      const range = rect.height - sticky.offsetHeight;
      return [chapter, range > 0 ? (top - rect.top) / range : 1];
    });
    frames.forEach(([chapter, progress]) => paint(chapter, progress));
  };

  const schedule = () => {
    if (scheduled || !active) return;
    scheduled = true;
    window.requestAnimationFrame(update);
  };

  const configure = () => {
    const eligible = !reduced.matches && !(narrow.matches ? shortPhone.matches : short.matches);
    chapters.forEach(chapter => chapter.classList.toggle('is-enhanced', eligible));
    // Safe areas and enlarged text can leave less room than the viewport suggests.
    const fits = chapters.map(chapter => {
      if (!eligible) return false;
      const sticky = chapter.querySelector('.story-sticky');
      const style = window.getComputedStyle(sticky);
      const padding = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0);
      return chapter.querySelector('.story-inner').offsetHeight + padding <= sticky.clientHeight;
    });
    active = fits.some(Boolean);
    chapters.forEach((chapter, index) => {
      chapter.classList.toggle('is-enhanced', fits[index]);
      if (!fits[index]) paint(chapter, 1);
    });
    schedule();
  };

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', configure, { passive: true });
  window.addEventListener('pageshow', configure);
  reduced.addEventListener('change', configure);
  short.addEventListener('change', configure);
  narrow.addEventListener('change', configure);
  shortPhone.addEventListener('change', configure);
  configure();
})();
