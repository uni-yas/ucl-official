document.documentElement.classList.add("js");

const header = document.querySelector(".site-header");
const progress = document.querySelector(".scroll-progress");
const reveals = document.querySelectorAll(".reveal");
const sections = document.querySelectorAll("main section[id]");
const navLinks = document.querySelectorAll(".site-nav a[href^='#']");
const languageSwitch = document.querySelector("[data-language-switch]");
const year = document.querySelector("[data-year]");

function updateScrollState() {
  const top = window.scrollY || document.documentElement.scrollTop;
  const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  header?.classList.toggle("is-scrolled", top > 16);
  if (progress) progress.style.transform = `scaleX(${Math.min(1, top / max)})`;
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

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((link) => {
        const active = link.getAttribute("href") === `#${entry.target.id}`;
        if (active) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
      });
    });
  }, { threshold: 0.24, rootMargin: "-15% 0px -60%" });

  sections.forEach((section) => sectionObserver.observe(section));
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
