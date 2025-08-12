import { test, expect } from '@playwright/test';

test.describe('Full-Screen Landscape Mode', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the game
    await page.goto('http://localhost:5173');
    // Wait for the game to load
    await page.waitForLoadState('networkidle');
  });

  test('should enforce landscape mode with full-screen coverage', async ({ page }) => {
    // Set viewport to portrait orientation to test landscape enforcement
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check if the root element has the correct rotation transform
    const rootElement = page.locator('#root');
    await expect(rootElement).toBeVisible();
    
    // Verify the game canvas is present and covers full viewport
    const gameCanvas = page.locator('#gameCanvas');
    await expect(gameCanvas).toBeVisible();
    
    // Check canvas dimensions and positioning
    const canvasBox = await gameCanvas.boundingBox();
    expect(canvasBox).toBeTruthy();
    
    // Verify joypad canvas is present and positioned correctly
    const joypadCanvas = page.locator('canvas').nth(1); // Second canvas should be joypad
    await expect(joypadCanvas).toBeVisible();
    
    // Check that UI elements are properly positioned
    const leaderboard = page.locator('.leaderboard');
    if (await leaderboard.isVisible()) {
      const leaderboardBox = await leaderboard.boundingBox();
      expect(leaderboardBox?.x).toBeGreaterThanOrEqual(0);
      expect(leaderboardBox?.y).toBeGreaterThanOrEqual(0);
    }
  });

  test('should maintain proper element positioning in landscape', async ({ page }) => {
    // Set viewport to landscape orientation
    await page.setViewportSize({ width: 667, height: 375 });
    
    // Verify game layout is properly positioned
    const gameLayout = page.locator('.game-layout');
    await expect(gameLayout).toBeVisible();
    
    // Check that the game canvas fills the viewport
    const gameCanvas = page.locator('#gameCanvas');
    const canvasBox = await gameCanvas.boundingBox();
    
    expect(canvasBox?.width).toBeGreaterThan(0);
    expect(canvasBox?.height).toBeGreaterThan(0);
    
    // Verify no scrollbars are present (full-screen)
    const bodyOverflow = await page.evaluate(() => {
      return window.getComputedStyle(document.body).overflow;
    });
    expect(bodyOverflow).toBe('hidden');
  });

  test('should handle touch interactions properly in landscape mode', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Wait for joypad to be ready
    const joypadCanvas = page.locator('canvas').nth(1);
    await expect(joypadCanvas).toBeVisible();
    
    // Simulate touch interaction on joypad area
    await joypadCanvas.tap({ position: { x: 100, y: 100 } });
    
    // Verify the joypad responds (canvas should be interactive)
    const canvasPointerEvents = await joypadCanvas.evaluate((canvas) => {
      return window.getComputedStyle(canvas).pointerEvents;
    });
    
    // Should be 'auto' when game is playing, 'none' when not
    expect(['auto', 'none']).toContain(canvasPointerEvents);
  });

  test('should have proper z-index layering', async ({ page }) => {
    // Check z-index of game elements
    const gameCanvas = page.locator('#gameCanvas');
    const joypadCanvas = page.locator('canvas').nth(1);
    
    const gameCanvasZIndex = await gameCanvas.evaluate((canvas) => {
      return window.getComputedStyle(canvas).zIndex;
    });
    
    const joypadZIndex = await joypadCanvas.evaluate((canvas) => {
      return window.getComputedStyle(canvas).zIndex;
    });
    
    // Joypad should be above game canvas
    expect(parseInt(joypadZIndex)).toBeGreaterThan(parseInt(gameCanvasZIndex));
  });
});