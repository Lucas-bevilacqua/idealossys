const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  await page.setViewport({ width: 1280, height: 720 });

  const filePath = path.resolve(__dirname, 'public', 'presentation.html');
  await page.goto('file://' + filePath, { waitUntil: 'networkidle0' });

  // Wait for fonts and animations to load
  await new Promise(r => setTimeout(r, 2000));

  // Pause all animations (static PDF)
  await page.addStyleTag({ content: `* { animation-play-state: paused !important; }` });

  // Fix gradient text for Apple PDF viewers (Preview, iOS):
  // CSS background-clip:text is unsupported in Apple's PDF renderer.
  // Replace .text-shiny spans with SVG <text fill="url(#gradient)">, which is
  // PDF-spec and renders correctly everywhere. Baseline is measured from the live
  // DOM so the SVG text lands exactly where the HTML text was.
  await page.evaluate(() => {
    document.querySelectorAll('.text-shiny').forEach((el, i) => {
      const elRect = el.getBoundingClientRect();

      // Probe the actual baseline position: a 0x0 inline-block at baseline
      // has its top edge at exactly the baseline Y of the line box
      const probe = document.createElement('span');
      probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline;overflow:hidden';
      el.appendChild(probe);
      const baselineY = probe.getBoundingClientRect().top - elRect.top;
      el.removeChild(probe);

      const cs = window.getComputedStyle(el);
      const fontSize   = parseFloat(cs.fontSize);
      const fontWeight = cs.fontWeight;
      const ls = parseFloat(cs.letterSpacing) || -(fontSize * 0.04);
      const text = el.textContent.trim();
      const gradId = 'pdfg' + i;
      const W = elRect.width;   // gradient spans actual text width
      const H = elRect.height;

      const svgNS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(svgNS, 'svg');
      // Extra width so text never clips; negative right-margin cancels extra space
      svg.setAttribute('width',  W + 80);
      svg.setAttribute('height', H);
      svg.style.cssText = `display:inline-block;vertical-align:top;overflow:visible;margin-right:-80px`;

      svg.innerHTML = `
        <defs>
          <linearGradient id="${gradId}" x1="0" y1="0" x2="${W}" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="20%" stop-color="#ffffff"/>
            <stop offset="45%" stop-color="#3B82F6"/>
            <stop offset="60%" stop-color="#3B82F6"/>
            <stop offset="80%" stop-color="#ffffff"/>
          </linearGradient>
        </defs>
        <!-- Fallback white layer: visible on viewers that cannot resolve the gradient ref -->
        <text fill="white" opacity="0.85"
          font-family="Outfit, sans-serif"
          font-size="${fontSize}"
          font-weight="${fontWeight}"
          letter-spacing="${ls}"
          x="0"
          y="${baselineY}">${text}</text>
        <!-- Gradient layer on top; SVG paint fallback syntax: url(ref) fallback-color -->
        <text fill="url(#${gradId}) white"
          font-family="Outfit, sans-serif"
          font-size="${fontSize}"
          font-weight="${fontWeight}"
          letter-spacing="${ls}"
          x="0"
          y="${baselineY}">${text}</text>`;

      el.replaceWith(svg);
    });
  });

  await page.pdf({
    path: path.resolve(__dirname, 'public', 'idealos-apresentacao.pdf'),
    width: '1280px',
    height: '720px',
    printBackground: true,
    landscape: false,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });

  await browser.close();
  console.log('PDF gerado: public/idealos-apresentacao.pdf');
})();
