(() => {
 const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('seen');observer.unobserve(e.target)}}),{threshold:.7});
 document.querySelectorAll('.scene-break').forEach(e=>observer.observe(e));
})();
