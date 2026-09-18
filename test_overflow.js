const puppeteer = require('puppeteer');
(async () => {
    try {
        const browser = await puppeteer.launch({ headless: 'new' });
        const page = await browser.newPage();
        
        // Test array of widths
        const viewports = [320, 360, 390, 430, 480];
        
        for (let width of viewports) {
            await page.setViewport({ width, height: 800 });
            await page.goto('file:///Users/apple/Documents/Trieye /index.html', { waitUntil: 'networkidle0' });
            
            const hasOverflow = await page.evaluate((width) => {
                const docWidth = Math.max(
                    document.body.scrollWidth,
                    document.documentElement.scrollWidth,
                    document.body.offsetWidth,
                    document.documentElement.offsetWidth,
                    document.documentElement.clientWidth
                );
                return docWidth > width;
            }, width);
            
            console.log(`Viewport ${width}px overflow test: ${hasOverflow ? 'FAILED (Overflow detected)' : 'PASSED (No overflow)'}`);
        }
        await browser.close();
    } catch (e) {
        console.error(e.message);
    }
})();
