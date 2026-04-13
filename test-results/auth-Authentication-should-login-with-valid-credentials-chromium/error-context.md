# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Authentication >> should login with valid credentials
- Location: tests\e2e\auth.spec.ts:9:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input[type="email"]')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - navigation [ref=e4]:
    - generic [ref=e6]:
      - generic [ref=e7]:
        - generic [ref=e8]: FF
        - generic [ref=e9]:
          - generic [ref=e10]: FlashFix
          - generic [ref=e11]: AI
      - generic [ref=e12]:
        - button "หน้าหลัก" [ref=e13] [cursor=pointer]:
          - img [ref=e14]
          - generic [ref=e17]: หน้าหลัก
        - button "อัปโหลดไฟล์" [ref=e19] [cursor=pointer]:
          - img [ref=e20]
          - generic [ref=e24]: อัปโหลดไฟล์
        - button "ควิซวัดระดับ" [ref=e25] [cursor=pointer]:
          - img [ref=e26]
          - generic [ref=e29]: ควิซวัดระดับ
        - button "ความชำนาญ" [ref=e30] [cursor=pointer]:
          - img [ref=e31]
          - generic [ref=e36]: ความชำนาญ
        - button "บุ๊กมาร์ก" [ref=e37] [cursor=pointer]:
          - img [ref=e38]
          - generic [ref=e40]: บุ๊กมาร์ก
      - generic [ref=e41]:
        - generic [ref=e42]:
          - img [ref=e43]
          - generic [ref=e46]: 45%
        - button "Toggle dark mode" [ref=e47] [cursor=pointer]:
          - img [ref=e48]
        - button "Switch to English" [ref=e50] [cursor=pointer]:
          - img [ref=e51]
        - button "Settings" [ref=e56] [cursor=pointer]:
          - img [ref=e57]
  - main [ref=e61]:
    - main "Home Dashboard" [ref=e65]:
      - generic [ref=e67]:
        - generic [ref=e68]:
          - img [ref=e69]
          - text: Powered by FlashFix AI
        - heading "เปลี่ยนความผิดพลาด ให้เป็นความเข้าใจ" [level=1] [ref=e71]:
          - text: เปลี่ยนความผิดพลาด
          - text: ให้เป็นความเข้าใจ
        - paragraph [ref=e72]: วิเคราะห์จุดอ่อนรายบุคคลด้วย AI พร้อมระบบ Spaced Repetition ที่จะช่วยให้คุณจำเนื้อหาได้แม่นยำขึ้นถึง 40%
        - generic [ref=e73]:
          - button "อัปโหลดไฟล์" [ref=e74] [cursor=pointer]: เริ่มใช้งาน
          - button "ควิซวัดระดับ" [ref=e75] [cursor=pointer]
      - generic [ref=e76]:
        - generic [ref=e77]:
          - img [ref=e79]
          - generic [ref=e82]:
            - generic [ref=e83]: ความชำนาญ
            - generic [ref=e84]: 45%
        - generic [ref=e85]:
          - img [ref=e87]
          - generic [ref=e90]:
            - generic [ref=e91]: Study Streak
            - generic [ref=e92]: 0 วัน
        - generic [ref=e93]:
          - img [ref=e95]
          - generic [ref=e98]:
            - generic [ref=e99]: Total Sessions
            - generic [ref=e100]: "0"
      - generic [ref=e101]:
        - region "กิจกรรมล่าสุด" [ref=e102]:
          - generic [ref=e103]:
            - heading "กิจกรรมล่าสุด" [level=2] [ref=e104]:
              - img [ref=e105]
              - text: กิจกรรมล่าสุด
            - button "ดูทั้งหมด" [ref=e109] [cursor=pointer]:
              - text: ดูทั้งหมด
              - img [ref=e110]
          - paragraph [ref=e114]: ยังไม่มีประวัติกิจกรรม
        - region "Learning Science" [ref=e115]:
          - generic [ref=e116]:
            - heading "Learning Science" [level=2] [ref=e117]:
              - img [ref=e118]
              - text: Learning Science
            - generic [ref=e120]:
              - generic [ref=e121]:
                - 'generic "Improvement score: 28%" [ref=e122]': +28%
                - generic [ref=e123]:
                  - generic [ref=e124]: Retrieval Practice
                  - paragraph [ref=e125]: การดึงข้อมูลออกจากความจำผ่านการทำข้อสอบ ช่วยสร้างเส้นใยประสาทที่แข็งแรงกว่าการแค่อ่าน
              - generic [ref=e126]:
                - 'generic "Improvement score: 35%" [ref=e127]': +35%
                - generic [ref=e128]:
                  - generic [ref=e129]: Self-Explanation
                  - paragraph [ref=e130]: ระบบ Teach-Back บังคับให้คุณต้องอธิบายเนื้อหาด้วยคำพูดตัวเอง ซึ่งเป็นวิธีเรียนรู้ที่ทรงพลังที่สุด
              - generic [ref=e131]:
                - 'generic "Improvement score: 40%" [ref=e132]': +40%
                - generic [ref=e133]:
                  - generic [ref=e134]: Spaced Repetition
                  - paragraph [ref=e135]: การทบทวนในระยะเวลาที่เหมาะสม (1, 3, 7 วัน) ช่วยป้องกันการลืมข้อมูลอย่างถาวร
          - generic:
            - img
  - generic [ref=e137]:
    - button "Skip" [ref=e144] [cursor=pointer]
    - generic [ref=e145]:
      - img [ref=e147]
      - heading "ยินดีต้อนรับสู่ FlashFix AI" [level=3] [ref=e152]
      - paragraph [ref=e153]: ระบบช่วยจำที่เปลี่ยน "ความผิดพลาด" ให้เป็น "ความเข้าใจ" ด้วยพลังของ AI และวิทยาศาสตร์การเรียนรู้
    - generic [ref=e154]:
      - button "ย้อนกลับ" [disabled] [ref=e155]:
        - img [ref=e156]
        - text: ย้อนกลับ
      - button "ถัดไป" [ref=e158] [cursor=pointer]:
        - img [ref=e159]
        - text: ถัดไป
  - button "เปิดผู้ช่วย AI" [ref=e162] [cursor=pointer]:
    - img [ref=e163]
```

# Test source

```ts
  1   | /**
  2   |  * E2E Test: Authentication Flow
  3   |  * Tests: Login, Signup, Password change, Session management
  4   |  */
  5   | 
  6   | import { test, expect, testUtils, TEST_ACCOUNTS } from "./fixtures";
  7   | 
  8   | test.describe("Authentication", () => {
  9   |   test("should login with valid credentials", async ({ page }) => {
  10  |     await page.goto("/");
  11  | 
  12  |     // Fill login form
> 13  |     await page.fill('input[type="email"]', TEST_ACCOUNTS.ADMIN.email);
      |                ^ Error: page.fill: Test timeout of 30000ms exceeded.
  14  |     await page.fill('input[type="password"]', TEST_ACCOUNTS.ADMIN.password);
  15  | 
  16  |     // Submit
  17  |     const responsePromise = page.waitForResponse(
  18  |       (response) => response.url().includes("/api/auth/") && response.status() === 200
  19  |     );
  20  |     await page.click('button[type="submit"]');
  21  | 
  22  |     // Verify successful response
  23  |     const response = await responsePromise;
  24  |     expect(response.ok()).toBeTruthy();
  25  | 
  26  |     // Verify navigation to dashboard
  27  |     await page.waitForURL("**/dashboard", { timeout: 10000 });
  28  |     expect(page.url()).toContain("/dashboard");
  29  |   });
  30  | 
  31  |   test("should reject invalid credentials", async ({ page }) => {
  32  |     await page.goto("/");
  33  | 
  34  |     await page.fill('input[type="email"]', "invalid@test.com");
  35  |     await page.fill('input[type="password"]', "wrongpassword");
  36  | 
  37  |     await page.click('button[type="submit"]');
  38  | 
  39  |     // Look for error message
  40  |     const errorMessage = page.locator('[data-testid="login-error"]');
  41  |     await expect(errorMessage).toBeVisible({ timeout: 5000 });
  42  |   });
  43  | 
  44  |   test("should store user profile in session", async ({ page }) => {
  45  |     await testUtils.login(page, TEST_ACCOUNTS.ADMIN.email, TEST_ACCOUNTS.ADMIN.password);
  46  | 
  47  |     const userProfile = await page.evaluate(() => {
  48  |       const user = sessionStorage.getItem("user");
  49  |       return user ? JSON.parse(user) : null;
  50  |     });
  51  | 
  52  |     expect(userProfile).toBeTruthy();
  53  |     expect(userProfile.email).toBe(TEST_ACCOUNTS.ADMIN.email);
  54  |     expect(userProfile.role).toBe("admin");
  55  |   });
  56  | 
  57  |   test("should persist session on page reload", async ({ page }) => {
  58  |     await testUtils.login(page, TEST_ACCOUNTS.ADMIN.email, TEST_ACCOUNTS.ADMIN.password);
  59  | 
  60  |     // Get user profile before reload
  61  |     const profileBefore = await page.evaluate(() => sessionStorage.getItem("user"));
  62  | 
  63  |     // Reload page
  64  |     await page.reload();
  65  | 
  66  |     // Check if still logged in and profile persists
  67  |     await page.waitForURL("**/dashboard", { timeout: 5000 });
  68  |     const profileAfter = await page.evaluate(() => sessionStorage.getItem("user"));
  69  | 
  70  |     expect(profileAfter).toBe(profileBefore);
  71  |   });
  72  | 
  73  |   test("should logout successfully", async ({ page }) => {
  74  |     await testUtils.login(page, TEST_ACCOUNTS.ADMIN.email, TEST_ACCOUNTS.ADMIN.password);
  75  | 
  76  |     // Find and click logout button
  77  |     await page.click('[data-testid="user-menu"]');
  78  |     await page.click('[data-testid="logout-btn"]');
  79  | 
  80  |     // Verify redirected to login
  81  |     await page.waitForURL("**/login", { timeout: 5000 });
  82  |     expect(page.url()).toContain("/login");
  83  | 
  84  |     // Verify session cleared
  85  |     const user = await page.evaluate(() => sessionStorage.getItem("user"));
  86  |     expect(user).toBeNull();
  87  |   });
  88  | 
  89  |   test("should require reauthentication for password change", async ({ page }) => {
  90  |     await testUtils.login(page, TEST_ACCOUNTS.ADMIN.email, TEST_ACCOUNTS.ADMIN.password);
  91  | 
  92  |     // Navigate to password change
  93  |     await page.goto("/settings/password");
  94  | 
  95  |     // Try to change without current password
  96  |     await page.fill('[name="new_password"]', "NewPass@123456");
  97  |     await page.fill('[name="confirm_password"]', "NewPass@123456");
  98  |     await page.click('button[type="submit"]');
  99  | 
  100 |     // Should show error asking for current password
  101 |     const errorMessage = page.locator('[data-testid="current-password-error"]');
  102 |     await expect(errorMessage).toBeVisible({ timeout: 5000 });
  103 | 
  104 |     // Fill current password
  105 |     await page.fill('[name="current_password"]', TEST_ACCOUNTS.ADMIN.password);
  106 |     await page.click('button[type="submit"]');
  107 | 
  108 |     // Should succeed
  109 |     const successMessage = page.locator('[data-testid="password-change-success"]');
  110 |     await expect(successMessage).toBeVisible({ timeout: 5000 });
  111 |   });
  112 | 
  113 |   test("should enforce password complexity requirements", async ({ page }) => {
```