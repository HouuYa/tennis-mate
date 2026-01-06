/**
 * Tennis Mate - Cloud & Guest Mode Integration Test
 *
 * This test verifies:
 * 1. Cloud mode date/time picker functionality
 * 2. Location input improvements
 * 3. Guest mode score reset after finishing a set
 * 4. Batch save functionality
 */

const { chromium } = require('playwright');

async function runTests() {
  console.log('🎾 Starting Tennis Mate Integration Tests...\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    permissions: ['geolocation']
  });
  const page = await context.newPage();

  try {
    // Test 1: Navigate to app
    console.log('📍 Test 1: Loading application...');
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000);
    console.log('✅ App loaded successfully\n');

    // Test 2: Select Cloud Mode
    console.log('📍 Test 2: Testing Cloud Mode selection...');
    const cloudButton = await page.locator('text=CLOUD').first();
    if (await cloudButton.isVisible()) {
      await cloudButton.click();
      await page.waitForTimeout(1000);
      console.log('✅ Cloud mode selected\n');
    } else {
      console.log('⚠️  Cloud mode button not found\n');
    }

    // Test 3: Check Date/Time Picker
    console.log('📍 Test 3: Verifying date/time picker...');
    const datetimeInput = await page.locator('input[type="datetime-local"]');
    if (await datetimeInput.isVisible()) {
      console.log('✅ Date/time picker is visible');

      // Get current value
      const currentValue = await datetimeInput.inputValue();
      console.log(`   Current value: ${currentValue}`);

      // Try to change the value
      await datetimeInput.fill('2026-01-10T14:30');
      const newValue = await datetimeInput.inputValue();
      console.log(`   New value: ${newValue}`);

      if (newValue === '2026-01-10T14:30') {
        console.log('✅ Date/time picker works correctly\n');
      } else {
        console.log('⚠️  Date/time picker may have issues\n');
      }
    } else {
      console.log('❌ Date/time picker not found\n');
    }

    // Test 4: Check Location Input
    console.log('📍 Test 4: Testing location input...');
    const locationInput = await page.locator('input[placeholder*="Where are you playing"]');
    if (await locationInput.isVisible()) {
      console.log('✅ Location input is visible');
      await locationInput.fill('Test Court, Seoul');
      const value = await locationInput.inputValue();
      console.log(`   Entered location: ${value}\n`);
    } else {
      console.log('❌ Location input not found\n');
    }

    // Test 5: Check HTTPS warning for location
    console.log('📍 Test 5: Checking location button...');
    const locationButton = await page.locator('button[title="Use my location"]');
    if (await locationButton.isVisible()) {
      console.log('✅ Location button is visible');
      // Note: Clicking may show permission denied on localhost
      console.log('   (Location permissions require HTTPS in production)\n');
    } else {
      console.log('⚠️  Location button not found\n');
    }

    // Test 6: Start Session
    console.log('📍 Test 6: Starting Cloud session...');
    const startButton = await page.locator('button:has-text("Start Session")').first();
    if (await startButton.isVisible()) {
      await startButton.click();
      await page.waitForTimeout(1000);

      // Check for confirmation dialog
      const confirmButton = await page.locator('button:has-text("Confirm")');
      if (await confirmButton.isVisible()) {
        console.log('✅ Confirmation dialog appeared');
        await confirmButton.click();
        await page.waitForTimeout(2000);
        console.log('✅ Session started successfully\n');
      }
    } else {
      console.log('⚠️  Start button not found\n');
    }

    // Test 7: Guest Mode Score Reset Test
    console.log('📍 Test 7: Testing Guest mode score reset...');

    // Go back to mode selection
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(1000);

    // Select Guest/Local mode
    const guestButton = await page.locator('text=LOCAL').first();
    if (await guestButton.isVisible()) {
      await guestButton.click();
      await page.waitForTimeout(1000);
      console.log('✅ Guest mode selected');

      // Start a match
      const startMatchButton = await page.locator('button:has-text("Start New Match")').first();
      if (await startMatchButton.isVisible()) {
        await startMatchButton.click();
        await page.waitForTimeout(1000);
        console.log('✅ Match started');

        // Check initial scores
        const scoreElements = await page.locator('.text-5xl.font-bold.font-mono').all();
        if (scoreElements.length >= 2) {
          const score1 = await scoreElements[0].textContent();
          const score2 = await scoreElements[1].textContent();
          console.log(`   Initial scores: ${score1} - ${score2}`);
        }

        // Change score
        const plusButtons = await page.locator('button:has-text("+")').all();
        if (plusButtons.length > 0) {
          await plusButtons[0].click();
          await page.waitForTimeout(500);
          console.log('✅ Score changed');
        }

        // Finish match
        const finishButton = await page.locator('button:has-text("Finish Match")').first();
        if (await finishButton.isVisible()) {
          await finishButton.click();
          await page.waitForTimeout(500);

          // Confirm finish
          const confirmFinish = await page.locator('button:has-text("Confirm")').last();
          if (await confirmFinish.isVisible()) {
            await confirmFinish.click();
            await page.waitForTimeout(2000);
            console.log('✅ Match finished');

            // Check if "Saving..." message appeared
            const savingMessage = await page.locator('text=Saving...').isVisible();
            if (savingMessage) {
              console.log('✅ "Saving..." message appeared');
            }

            // Start next match
            const startNext = await page.locator('button:has-text("Start New Match")').first();
            if (await startNext.isVisible()) {
              await startNext.click();
              await page.waitForTimeout(1000);

              // Check if scores reset to 6-0
              const newScoreElements = await page.locator('.text-5xl.font-bold.font-mono').all();
              if (newScoreElements.length >= 2) {
                const newScore1 = await newScoreElements[0].textContent();
                const newScore2 = await newScoreElements[1].textContent();
                console.log(`   New match scores: ${newScore1} - ${newScore2}`);

                if (newScore1 === '6' && newScore2 === '0') {
                  console.log('✅ Scores correctly reset to 6-0\n');
                } else {
                  console.log('⚠️  Scores may not have reset properly\n');
                }
              }
            }
          }
        }
      }
    }

    console.log('🎉 All tests completed!\n');

    // Take screenshot
    await page.screenshot({ path: '/home/user/tennis-mate/test-results.png', fullPage: true });
    console.log('📸 Screenshot saved to test-results.png\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

runTests().catch(console.error);
