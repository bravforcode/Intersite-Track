# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: authorization.spec.ts >> Authorization Security >> file download requires authentication
- Location: tests\e2e\authorization.spec.ts:141:3

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
  1   | /**
  2   |  * Playwright Test Fixtures & Utilities
  3   |  * Provides authenticated user contexts and common helpers
  4   |  */
  5   | 
  6   | import { test as base, expect } from "@playwright/test";
  7   | import { Page } from "@playwright/test";
  8   | 
  9   | /**
  10  |  * Test data - update these with your actual test accounts
  11  |  */
  12  | export const TEST_ACCOUNTS = {
  13  |   ADMIN: {
  14  |     email: "admin@test.com",
  15  |     password: "Admin@123456",
  16  |     role: "admin",
  17  |   },
  18  |   STAFF: {
  19  |     email: "staff@test.com",
  20  |     password: "Staff@123456",
  21  |     role: "staff",
  22  |   },
  23  |   USER: {
  24  |     email: "user@test.com",
  25  |     password: "User@123456",
  26  |     role: "user",
  27  |   },
  28  | };
  29  | 
  30  | /**
  31  |  * Fixture: Authenticated admin user
  32  |  */
  33  | export const test = base.extend({
  34  |   authenticatedPage: async ({ page }, use) => {
  35  |     // Navigate to login
  36  |     await page.goto("/");
  37  | 
  38  |     // Wait for auth state
  39  |     await page.waitForURL("**/login", { timeout: 5000 }).catch(() => null);
  40  | 
  41  |     // Check if already logged in
  42  |     const isLoggedIn = await page.evaluate(() => {
  43  |       const user = sessionStorage.getItem("user");
  44  |       return user !== null;
  45  |     });
  46  | 
  47  |     if (!isLoggedIn) {
  48  |       // Log in as admin
  49  |       await page.fill('input[type="email"]', TEST_ACCOUNTS.ADMIN.email);
  50  |       await page.fill('input[type="password"]', TEST_ACCOUNTS.ADMIN.password);
  51  |       await page.click('button[type="submit"]');
  52  | 
  53  |       // Wait for dashboard
  54  |       await page.waitForURL("**/dashboard", { timeout: 10000 });
  55  |     }
  56  | 
  57  |     await use(page);
  58  |   },
  59  | 
  60  |   staffPage: async ({ page }, use) => {
  61  |     await page.goto("/");
  62  |     const isLoggedIn = await page.evaluate(() => sessionStorage.getItem("user") !== null);
  63  | 
  64  |     if (!isLoggedIn) {
  65  |       await page.fill('input[type="email"]', TEST_ACCOUNTS.STAFF.email);
  66  |       await page.fill('input[type="password"]', TEST_ACCOUNTS.STAFF.password);
  67  |       await page.click('button[type="submit"]');
  68  |       await page.waitForURL("**/dashboard", { timeout: 10000 });
  69  |     }
  70  | 
  71  |     await use(page);
  72  |   },
  73  | });
  74  | 
  75  | /**
  76  |  * Common test utilities
  77  |  */
  78  | export const testUtils = {
  79  |   /**
  80  |    * Login helper
  81  |    */
  82  |   async login(page: Page, email: string, password: string) {
  83  |     await page.goto("/");
> 84  |     await page.fill('input[type="email"]', email);
      |                ^ Error: page.fill: Test timeout of 30000ms exceeded.
  85  |     await page.fill('input[type="password"]', password);
  86  |     await page.click('button[type="submit"]');
  87  |     await page.waitForURL("**/dashboard", { timeout: 10000 });
  88  |   },
  89  | 
  90  |   /**
  91  |    * Logout helper
  92  |    */
  93  |   async logout(page: Page) {
  94  |     await page.click('[data-testid="user-menu"]');
  95  |     await page.click('[data-testid="logout-btn"]');
  96  |     await page.waitForURL("**/login", { timeout: 5000 });
  97  |   },
  98  | 
  99  |   /**
  100 |    * Wait for API response
  101 |    */
  102 |   async waitForApi(page: Page, pattern: string | RegExp) {
  103 |     return page.waitForResponse(
  104 |       (response) =>
  105 |         response.request().url().includes(pattern.toString()) &&
  106 |         response.status() < 400,
  107 |       { timeout: 10000 }
  108 |     );
  109 |   },
  110 | 
  111 |   /**
  112 |    * Check for accessibility violations
  113 |    */
  114 |   async checkAccessibility(page: Page) {
  115 |     const violations = [];
  116 | 
  117 |     // Check for missing alt text on images
  118 |     const imagesWithoutAlt = await page.locator("img:not([alt])").count();
  119 |     if (imagesWithoutAlt > 0) {
  120 |       violations.push(`${imagesWithoutAlt} images missing alt text`);
  121 |     }
  122 | 
  123 |     // Check for missing form labels
  124 |     const inputsWithoutLabel = await page
  125 |       .locator('input:not([aria-label]):not([type="hidden"])')
  126 |       .count();
  127 |     if (inputsWithoutLabel > 0) {
  128 |       violations.push(`${inputsWithoutLabel} inputs missing labels`);
  129 |     }
  130 | 
  131 |     // Check for color contrast (basic)
  132 |     const lowContrast = await page.evaluate(() => {
  133 |       // Placeholder - real contrast checking requires more complex logic
  134 |       return document.querySelectorAll("[style*='color']").length;
  135 |     });
  136 | 
  137 |     return violations;
  138 |   },
  139 | 
  140 |   /**
  141 |    * Upload file
  142 |    */
  143 |   async uploadFile(page: Page, inputSelector: string, filePath: string) {
  144 |     const fileInput = page.locator(inputSelector);
  145 |     await fileInput.setInputFiles(filePath);
  146 |   },
  147 | 
  148 |   /**
  149 |    * Fill and submit form
  150 |    */
  151 |   async fillForm(page: Page, fields: Record<string, string>, submitButtonSelector?: string) {
  152 |     for (const [selector, value] of Object.entries(fields)) {
  153 |       const element = page.locator(selector).first();
  154 |       const tagName = await element.evaluate((el) => el.tagName.toLowerCase());
  155 | 
  156 |       if (tagName === "select") {
  157 |         await element.selectOption(value);
  158 |       } else {
  159 |         await element.fill(value);
  160 |       }
  161 |     }
  162 | 
  163 |     if (submitButtonSelector) {
  164 |       await page.click(submitButtonSelector);
  165 |     }
  166 |   },
  167 | 
  168 |   /**
  169 |    * Wait for notification
  170 |    */
  171 |   async waitForNotification(page: Page, text: string, timeout: number = 5000) {
  172 |     await page.locator(`text=${text}`).waitFor({ timeout });
  173 |   },
  174 | 
  175 |   /**
  176 |    * Take screenshot with readable name
  177 |    */
  178 |   async screenshot(page: Page, name: string) {
  179 |     await page.screenshot({ path: `test-results/screenshots/${name}.png` });
  180 |   },
  181 | };
  182 | 
  183 | export { expect };
  184 | 
```