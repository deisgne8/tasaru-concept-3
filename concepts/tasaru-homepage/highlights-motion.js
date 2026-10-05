(() => {
  const scene = document.querySelector('[data-up-scene]');
  if (!scene) return;
  const sticky = scene.querySelector('.joby-up-sticky');
  const cards = [...scene.querySelectorAll('.joby-up-card')];
  const figures = cards.map(card => card.querySelector('figure'));
  const copies = cards.map(card => card.querySelector('.joby-up-copy'));
  const lines = copies.map(copy => [...copy.querySelectorAll('p span, a')]);
  const finale = scene.querySelector('.joby-up-finale');
  const brandLine = document.querySelector('.supplier-progress-brand-line');
  const motion = matchMedia('(min-width: 901px) and (prefers-reduced-motion: no-preference)');
  const clamp = value => Math.min(1, Math.max(0, value));
  const phase = (p, start, end) => clamp((p - start) / (end - start));
  const ease = value => value * value * (3 - 2 * value);
  const mix = (a, b, t) => a + (b - a) * t;
  const words = [];
  const walker = document.createTreeWalker(finale.querySelector('h3'), NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  textNodes.forEach(node => {
    const fragment = document.createDocumentFragment();
    node.textContent.split(/(\s+)/).forEach(token => {
      if (!token.trim()) return fragment.append(document.createTextNode(token));
      const word = document.createElement('span');
      word.className = 'highlight-word';
      word.textContent = token;
      fragment.append(word);
      words.push(word);
    });
    node.replaceWith(fragment);
  });

  let geometry;
  let progress = 0;
  let target = 0;
  let frame = 0;
  let previousTime = 0;

  function measure() {
    const width = sticky.clientWidth;
    const height = sticky.clientHeight;
    const imageWidth = (width - 136) / 2;
    const imageHeight = height - 50;
    const x = (width - imageWidth) / 2;
    const thumb = .19;
    const gap = width < 1000 ? 20 : 28;
    geometry = {
      height, imageWidth, imageHeight,
      radius: parseFloat(getComputedStyle(scene).getPropertyValue('--radius-ui')) || 8,
      main: { x, y: 25, scale: 1 },
      previous: { x: x - imageWidth * thumb - gap, y: 25, scale: thumb },
      next: { x: x + imageWidth + gap, y: height - 25 - imageHeight * thumb, scale: thumb }
    };
    scene.style.setProperty('--image-width', `${imageWidth}px`);
    scene.style.setProperty('--image-height', `${imageHeight}px`);
    scene.style.setProperty('--copy-x', `${x + imageWidth + gap}px`);
    scene.style.setProperty('--copy-width', `${Math.max(140, width - x - imageWidth - gap - 32)}px`);
    scene.style.setProperty('--finale-x', `${x}px`);
    scene.style.setProperty('--finale-width', `${width - x - 40}px`);
    if (brandLine) {
      // Bridge the empty space below the settled finale, leaving room for its CTA.
      const section = brandLine.closest('section');
      // Measure the base gap independently of the responsive overlap limit.
      brandLine.style.removeProperty('--brand-line-rise');
      const lineOffset = parseFloat(getComputedStyle(section).paddingTop)
        + parseFloat(getComputedStyle(brandLine).marginTop);
      const finaleBottom = height * .15 + 7 + finale.offsetHeight;
      const rise = Math.max(0, height - finaleBottom + lineOffset - 48);
      brandLine.style.setProperty('--brand-line-rise', `${rise}px`);
    }
  }

  function blend(a, b, t) {
    return { x: mix(a.x, b.x, t), y: mix(a.y, b.y, t), scale: mix(a.scale, b.scale, t) };
  }

  function paint(p) {
    const { height, imageWidth, imageHeight, main, previous, next } = geometry;
    const first = ease(phase(p, .025, .23));
    const handoffOne = ease(phase(p, .30, .44));
    const handoffTwo = ease(phase(p, .56, .70));
    const exit = ease(phase(p, .82, .985)) * height * .85;
    const entryScale = mix(.14, 1, first);
    const entry = { x: main.x + imageWidth * (1 - entryScale) / 2,
      y: height - 25 - imageHeight * entryScale, scale: entryScale };
    const nextEntry = amount => ({
      x: next.x + imageWidth * next.scale * (1 - amount),
      y: height - 25 - imageHeight * next.scale * amount,
      scale: next.scale * amount
    });
    const retired = { x: previous.x - 28, y: 25, scale: 0 };
    const rects = [
      p < .30 ? entry : p < .56 ? blend(main, previous, handoffOne) : blend(previous, retired, handoffTwo),
      p < .30 ? nextEntry(ease(phase(p, .13, .23))) : p < .56 ? blend(next, main, handoffOne) : blend(main, previous, handoffTwo),
      p < .56 ? nextEntry(ease(phase(p, .33, .44))) : blend(next, main, handoffTwo)
    ];
    rects.forEach((rect, index) => {
      const figure = figures[index];
      figure.style.setProperty('--image-x', `${rect.x}px`);
      figure.style.setProperty('--image-y', `${rect.y - exit}px`);
      figure.style.setProperty('--image-scale', rect.scale.toFixed(5));
      // Compensating the radius keeps thumbnails and full-size images equally rounded.
      figure.style.setProperty('--image-radius', `${Math.min(geometry.radius * 10, geometry.radius / Math.max(.01, rect.scale))}px`);
      figure.style.setProperty('--image-visibility', rect.scale > .005 ? 'visible' : 'hidden');
    });
    scene.style.setProperty('--title-alpha', 1 - phase(p, .10, .205));
    scene.style.setProperty('--title-y', `${-ease(phase(p, .02, .22)) * 260}px`);
    [[.22, .295], [.445, .555], [.705, .805]].forEach(([start, end], index) => {
      copies[index].style.setProperty('--copy-visibility', p > start && p < end + .04 ? 'visible' : 'hidden');
      copies[index].inert = !(p > start + .02 && p < end);
      lines[index].forEach((line, lineIndex) => {
        const enter = ease(phase(p, start + lineIndex * .008, start + .03 + lineIndex * .008));
        const leave = ease(phase(p, end, end + .035));
        line.style.setProperty('--line-alpha', enter * (1 - leave));
        line.style.setProperty('--line-y', `${(1 - enter) * 18 - leave * 10}px`);
      });
    });
    scene.style.setProperty('--finale-y', `${height + 7 - exit}px`);
    scene.style.setProperty('--finale-visibility', p > .82 ? 'visible' : 'hidden');
    finale.inert = p < .88;
    const reveal = phase(p, .855, .99);
    words.forEach((word, index) => {
      word.style.setProperty('--word-alpha', .25 + .75 * clamp(reveal * (words.length + 5) - index));
    });
    scene.style.setProperty('--finale-link-alpha', phase(p, .93, .985));
  }

  function readProgress() {
    target = clamp(-scene.getBoundingClientRect().top / Math.max(1, scene.offsetHeight - sticky.clientHeight));
  }

  function tick(time) {
    frame = 0;
    if (!motion.matches) return;
    const elapsed = previousTime ? Math.min(64, time - previousTime) : 16.67;
    previousTime = time;
    // Time-based smoothing gives mouse wheels and high-refresh trackpads the same response.
    progress += (target - progress) * (1 - Math.exp(-elapsed / 75));
    if (Math.abs(target - progress) < .00005) progress = target;
    paint(progress);
    if (progress !== target) frame = requestAnimationFrame(tick);
    else previousTime = 0;
  }

  function schedule() {
    if (!motion.matches) return;
    readProgress();
    if (!frame) frame = requestAnimationFrame(tick);
  }

  function refresh() {
    cancelAnimationFrame(frame);
    frame = 0;
    previousTime = 0;
    scene.classList.toggle('motion-ready', motion.matches);
    if (!motion.matches) {
      brandLine?.style.removeProperty('--brand-line-rise');
      [...copies, finale].forEach(element => { element.inert = false; });
      return;
    }
    measure();
    readProgress();
    progress = target;
    paint(progress);
  }
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', refresh);
  addEventListener('load', refresh);
  motion.addEventListener('change', refresh);
  scene.addEventListener('highlights:refresh', refresh);
  document.fonts.ready.then(refresh);
  refresh();
})();
