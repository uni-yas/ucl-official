document.documentElement.classList.add("js");

const header = document.querySelector(".site-header");
const progress = document.querySelector(".scroll-progress");
const reveals = document.querySelectorAll(".reveal");
const sections = document.querySelectorAll("main section[id]");
const navLinks = document.querySelectorAll(".site-nav a[href^='#']");
const languageSwitch = document.querySelector("[data-language-switch]");
const year = document.querySelector("[data-year]");
const mobileMenu = document.querySelector(".mobile-menu");

mobileMenu?.querySelectorAll("a").forEach(link => {
  link.addEventListener("click", () => { mobileMenu.open = false; });
});
document.addEventListener("click", event => {
  if (mobileMenu?.open && !mobileMenu.contains(event.target)) mobileMenu.open = false;
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && mobileMenu?.open) {
    mobileMenu.open = false;
    mobileMenu.querySelector("summary")?.focus();
  }
});

function updateScrollState() {
  const top = window.scrollY || document.documentElement.scrollTop;
  const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  header?.classList.toggle("is-scrolled", top > 16);
  if (progress) progress.style.transform = `scaleX(${Math.min(1, top / max)})`;
  // A long pinned chapter may never cross an intersection-ratio threshold.
  // Use its leading edge so the navigation stays accurate throughout the story.
  const threshold = (header?.offsetHeight || 76) + 130;
  const activeSection = [...sections].filter(section => section.getBoundingClientRect().top <= threshold).at(-1);
  navLinks.forEach(link => {
    if (activeSection && link.getAttribute("href") === `#${activeSection.id}`) link.setAttribute("aria-current", "true");
    else link.removeAttribute("aria-current");
  });
}

updateScrollState();
window.addEventListener("scroll", updateScrollState, { passive: true });

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -5%" });

  reveals.forEach((item) => revealObserver.observe(item));

} else {
  reveals.forEach((item) => item.classList.add("is-visible"));
}

languageSwitch?.addEventListener("click", (event) => {
  const target = languageSwitch.getAttribute("href");
  if (!target || !window.location.hash) return;
  event.preventDefault();
  window.location.href = `${target}${window.location.hash}`;
});

if (year) year.textContent = new Date().getFullYear();
