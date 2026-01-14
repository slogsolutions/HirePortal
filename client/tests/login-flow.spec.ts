import { test, expect } from "@playwright/test";

test("user can login and see dashboard", async ({ page }) => {
  await page.goto("http://localhost:5173/login");

  // You are already on /login, no need to click Login
  await page.waitForSelector('input[type="email"]');

 await page.fill('input[type="email"]', 'login@test.com');
await page.fill('input[type="password"]', '123456');

  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await expect(page).toHaveURL(/\/dashboard/);

  // This text is guaranteed by your Dashboard layout
  await expect(page.locator("h2:text('Dashboard')")).toBeVisible();
});


// import { test, expect } from "@playwright/test";

// test("user can login and see dashboard", async ({ page }) => {
//   // Open the real login route
//   await page.goto("/login");

//   // Wait for login form
//   await page.waitForSelector('input[type="email"]', { timeout: 15000 });

//   // Fill credentials
//   await page.fill('input[type="email"]', "admin@test.com");
//   await page.fill('input[type="password"]', "123456");

//   // Submit
//   await page.click('button[type="submit"]');

//   // Wait for dashboard redirect
//   await page.waitForURL(/dashboard/, { timeout: 15000 });

//   // Assert something on dashboard
//   await expect(page.locator("text=Dashboard")).toBeVisible();
// });
