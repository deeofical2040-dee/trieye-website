const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const testCases = [
    {
      name: 'option1_bike_detail_finish',
      bikeImg: 'assets/bike/bike-detail-finish.jpg',
      bikePos: '52% center',
      graphenePos: 'center center'
    },
    {
      name: 'option2_bike_hero_cropped',
      bikeImg: 'assets/bike/bike-hero.jpg',
      bikePos: '48% center',
      graphenePos: 'center center'
    },
    {
      name: 'option3_bike_detail_body_portrait',
      bikeImg: 'assets/bike/bike-detail-body.jpg',
      bikePos: 'center center',
      graphenePos: 'center center'
    }
  ];

  for (const tc of testCases) {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

    await page.evaluate((tc) => {
      document.body.innerHTML = `
      <div style="background: #ffffff; padding: 40px; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center;">
        <h2 style="font-family: sans-serif; font-size: 20px; margin-bottom: 24px; color: #111;">${tc.name}</h2>
        <div style="display: flex; gap: 32px; justify-content: center;">
          
          <!-- Card 6: Graphene -->
          <div class="gallery-card is-active" style="position: relative; width: 330px; height: 480px; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.24);">
            <div class="gallery-card-inner" style="position: relative; width: 100%; height: 100%;">
              <img src="assets/graphene/graphene-hydrophobic.jpg" style="width: 100%; height: 100%; object-fit: cover; object-position: ${tc.graphenePos}; display: block;">
              <div class="gallery-card-bottom">
                <div class="gallery-item-tag">06 / GRAPHENE MATRIX</div>
                <h3 class="gallery-item-title">ULTRA-HYDROPHOBIC WATER BEADING</h3>
              </div>
            </div>
          </div>

          <!-- Card 7: Bike -->
          <div class="gallery-card is-active" style="position: relative; width: 330px; height: 480px; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.24);">
            <div class="gallery-card-inner" style="position: relative; width: 100%; height: 100%;">
              <img src="${tc.bikeImg}" style="width: 100%; height: 100%; object-fit: cover; object-position: ${tc.bikePos}; display: block;">
              <div class="gallery-card-bottom">
                <div class="gallery-item-tag">07 / SUPERBIKE DETAILING</div>
                <h3 class="gallery-item-title">FULL MOTORCYCLE RESTORATION</h3>
              </div>
            </div>
          </div>

        </div>
      </div>
      `;
    }, tc);

    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: path.join(__dirname, `test_${tc.name}.png`) });
    console.log(`Rendered test_${tc.name}.png`);
  }

  await browser.close();
})();
