#!/usr/bin/env bun
import path from 'path';
import puppeteer from 'puppeteer';

async function generateSocialPreview() {
  console.log('🎨 Generating social media preview image...');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();

    // Set viewport to exact social media dimensions
    await page.setViewport({
      width: 1200,
      height: 630,
      deviceScaleFactor: 2, // High DPI for crisp image
    });

    // Load the HTML template
    const htmlPath = path.join(process.cwd(), 'public', 'social-preview.html');
    await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });

    // Take screenshot
    const outputPath = path.join(process.cwd(), 'public', 'social-preview.png');
    await page.screenshot({
      path: outputPath as `${string}.png`,
      type: 'png',
      clip: {
        x: 0,
        y: 0,
        width: 1200,
        height: 630,
      },
    });

    console.log(`✅ Social media preview generated: ${outputPath}`);

    // Generate a smaller version for Twitter
    await page.setViewport({
      width: 1200,
      height: 600,
      deviceScaleFactor: 2,
    });

    const twitterPath = path.join(
      process.cwd(),
      'public',
      'social-preview-twitter.png'
    );
    await page.screenshot({
      path: twitterPath as `${string}.png`,
      type: 'png',
      clip: {
        x: 0,
        y: 15,
        width: 1200,
        height: 600,
      },
    });

    console.log(`✅ Twitter preview generated: ${twitterPath}`);
  } catch (error) {
    console.error('❌ Error generating social preview:', error);
  } finally {
    await browser.close();
  }
}

// Run the script
generateSocialPreview();
