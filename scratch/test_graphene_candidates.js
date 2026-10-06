const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

  const candidates = [
    {
      name: 'A_workmanship_portrait',
      img: 'assets/graphene/graphene-workmanship.jpg',
      pos: 'center center',
      tag: '06 / GRAPHENE MATRIX',
      title: 'PRECISION INSPECTION & FINISH'
    },
    {
      name: 'B_application_applicator',
      img: 'assets/graphene/graphene-application.jpg',
      pos: '58% center',
      tag: '06 / GRAPHENE MATRIX',
      title: 'GRAPHENE COATING APPLICATION'
    },
    {
      name: 'C_macro_beading',
      img: 'assets/ceramic-coating/hydrophobic-water-beading.webp',
      pos: 'center center',
      tag: '06 / GRAPHENE MATRIX',
      title: 'ULTRA-HYDROPHOBIC WATER BEADING'
    },
    {
      name: 'D_hood_beading_low_crop',
      img: 'assets/graphene/graphene-hydrophobic.jpg',
      pos: 'center 75%',
      tag: '06 / GRAPHENE MATRIX',
      title: 'ULTRA-HYDROPHOBIC WATER BEADING'
    }
  ];

  await page.evaluate((candidates) => {
    document.body.innerHTML = `
    <div style="background: #ffffff; padding: 40px; min-height: 100vh; display: flex; flex-direction: column; align-items: center;">
      <h2 style="font-family: sans-serif; font-size: 24px; margin-bottom: 24px; color: #111;">CANDIDATES FOR CARD 06 GRAPHENE</h2>
      <div style="display: flex; gap: 24px; justify-content: center; flex-wrap: wrap;">
        ${candidates.map(c => `
          <div style="text-align: center;">
            <p style="font-family: monospace; font-size: 13px; font-weight: bold; margin-bottom: 8px;">${c.name}</p>
            <div class="gallery-card is-active" style="position: relative; width: 300px; height: 440px; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.24);">
              <div class="gallery-card-inner" style="position: relative; width: 100%; height: 100%;">
                <img src="${c.img}" style="width: 100%; height: 100%; object-fit: cover; object-position: ${c.pos}; display: block;">
                <div class="gallery-card-bottom">
                  <div class="gallery-item-tag">${c.tag}</div>
                  <h3 class="gallery-item-title">${c.title}</h3>
                </div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
    `;
  }, candidates);

  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(__dirname, 'graphene_candidates_comparison.png'), fullPage: true });
  console.log('Saved graphene_candidates_comparison.png');

  await browser.close();
})();
