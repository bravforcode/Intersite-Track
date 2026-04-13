# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Authentication >> should enforce password complexity requirements
- Location: tests\e2e\auth.spec.ts:113:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input[name="password"]')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - navigation [ref=e4]:
    - generic [ref=e6]:
      - generic [ref=e8]: FF
      - button "Toggle menu" [ref=e9] [cursor=pointer]:
        - img [ref=e10]
  - main [ref=e12]:
    - main "Home Dashboard" [ref=e16]:
      - generic [ref=e18]:
        - generic [ref=e19]:
          - img [ref=e20]
          - text: Powered by FlashFix AI
        - heading "เปลี่ยนความผิดพลาด ให้เป็นความเข้าใจ" [level=1] [ref=e22]:
          - text: เปลี่ยนความผิดพลาด
          - text: ให้เป็นความเข้าใจ
        - paragraph [ref=e23]: วิเคราะห์จุดอ่อนรายบุคคลด้วย AI พร้อมระบบ Spaced Repetition ที่จะช่วยให้คุณจำเนื้อหาได้แม่นยำขึ้นถึง 40%
        - generic [ref=e24]:
          - button "อัปโหลดไฟล์" [ref=e25] [cursor=pointer]: เริ่มใช้งาน
          - button "ควิซวัดระดับ" [ref=e26] [cursor=pointer]
      - generic [ref=e27]:
        - generic [ref=e28]:
          - img [ref=e30]
          - generic [ref=e33]:
            - generic [ref=e34]: ความชำนาญ
            - generic [ref=e35]: 45%
        - generic [ref=e36]:
          - img [ref=e38]
          - generic [ref=e41]:
            - generic [ref=e42]: Study Streak
            - generic [ref=e43]: 0 วัน
        - generic [ref=e44]:
          - img [ref=e46]
          - generic [ref=e49]:
            - generic [ref=e50]: Total Sessions
            - generic [ref=e51]: "0"
      - generic [ref=e52]:
        - region "กิจกรรมล่าสุด" [ref=e53]:
          - generic [ref=e54]:
            - heading "กิจกรรมล่าสุด" [level=2] [ref=e55]:
              - img [ref=e56]
              - text: กิจกรรมล่าสุด
            - button "ดูทั้งหมด" [ref=e60] [cursor=pointer]:
              - text: ดูทั้งหมด
              - img [ref=e61]
          - paragraph [ref=e65]: ยังไม่มีประวัติกิจกรรม
        - region "Learning Science" [ref=e66]:
          - generic [ref=e67]:
            - heading "Learning Science" [level=2] [ref=e68]:
              - img [ref=e69]
              - text: Learning Science
            - generic [ref=e71]:
              - generic [ref=e72]:
                - 'generic "Improvement score: 28%" [ref=e73]': +28%
                - generic [ref=e74]:
                  - generic [ref=e75]: Retrieval Practice
                  - paragraph [ref=e76]: การดึงข้อมูลออกจากความจำผ่านการทำข้อสอบ ช่วยสร้างเส้นใยประสาทที่แข็งแรงกว่าการแค่อ่าน
              - generic [ref=e77]:
                - 'generic "Improvement score: 35%" [ref=e78]': +35%
                - generic [ref=e79]:
                  - generic [ref=e80]: Self-Explanation
                  - paragraph [ref=e81]: ระบบ Teach-Back บังคับให้คุณต้องอธิบายเนื้อหาด้วยคำพูดตัวเอง ซึ่งเป็นวิธีเรียนรู้ที่ทรงพลังที่สุด
              - generic [ref=e82]:
                - 'generic "Improvement score: 40%" [ref=e83]': +40%
                - generic [ref=e84]:
                  - generic [ref=e85]: Spaced Repetition
                  - paragraph [ref=e86]: การทบทวนในระยะเวลาที่เหมาะสม (1, 3, 7 วัน) ช่วยป้องกันการลืมข้อมูลอย่างถาวร
          - generic:
            - img
  - generic [ref=e88]:
    - button "Skip" [ref=e95] [cursor=pointer]
    - generic [ref=e96]:
      - img [ref=e98]
      - heading "ยินดีต้อนรับสู่ FlashFix AI" [level=3] [ref=e103]
      - paragraph [ref=e104]: ระบบช่วยจำที่เปลี่ยน "ความผิดพลาด" ให้เป็น "ความเข้าใจ" ด้วยพลังของ AI และวิทยาศาสตร์การเรียนรู้
    - generic [ref=e105]:
      - button "ย้อนกลับ" [disabled] [ref=e106]:
        - img [ref=e107]
        - text: ย้อนกลับ
      - button "ถัดไป" [ref=e109] [cursor=pointer]:
        - img [ref=e110]
        - text: ถัดไป
  - button "เปิดผู้ช่วย AI" [ref=e113] [cursor=pointer]:
    - img [ref=e114]
```

# Test source

```ts
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
  114 |     await page.goto("/signup");
  115 | 
  116 |     const testCases = [
  117 |       { password: "short", error: "at least 8 characters" },
  118 |       { password: "nouppercase123", error: "uppercase" },
  119 |       { password: "NOLOWERCASE123", error: "lowercase" },
  120 |       { password: "NoNumbers", error: "number" },
  121 |     ];
  122 | 
  123 |     for (const { password, error } of testCases) {
> 124 |       await page.fill('input[name="password"]', password);
      |                  ^ Error: page.fill: Test timeout of 30000ms exceeded.
  125 |       const helpText = page.locator('text=' + error);
  126 |       await expect(helpText).toBeVisible({ timeout: 3000 });
  127 |     }
  128 |   });
  129 | });
  130 | 
```