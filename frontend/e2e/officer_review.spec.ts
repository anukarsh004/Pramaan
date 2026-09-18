import { test, expect } from '@playwright/test';

test.describe('Officer Review Journey', () => {
  test('Officer can view dashboard and navigate to case details', async ({ page }) => {
    // Mock API requests
    await page.route('**/api/v1/auth/session', async (route) => {
      await route.fulfill({ json: { success: true, data: { id: 'u-1', full_name: 'Officer John', role: 'officer' } } });
    });

    await page.route('**/api/v1/bid-applications?page=1', async (route) => {
      await route.fulfill({
        json: {
          success: true,
          page: 1,
          limit: 10,
          total: 1,
          data: [
            { id: 'app-101', bidder_name: 'SmartTech Solutions', tender_title: 'Solar Plant O&M', status: 'ready_for_review', overall_score: 85, risk_level: 'LOW', submitted_at: new Date().toISOString() }
          ]
        }
      });
    });

    await page.route('**/api/v1/bid-applications/app-101', async (route) => {
      await route.fulfill({
        json: {
          success: true,
          data: {
            id: 'app-101',
            status: 'ready_for_review',
            bidder_name: 'SmartTech Solutions',
            tender_title: 'Solar Plant O&M',
            documents: [],
            checks: [],
            score: { overall_score: 85, risk_level: 'LOW', score_breakdown: {} },
            recommendation: { text: 'Looks good', suggested_action: 'qualify', model_used: 'gpt-4' },
            decisions: []
          }
        }
      });
    });

    await page.route('**/api/v1/bid-applications/app-101/decision', async (route) => {
      await route.fulfill({ json: { success: true, decision_id: 'd-1', case_status: 'closed' } });
    });

    // Navigate to dashboard
    await page.goto('/');

    // Check dashboard loads
    await expect(page.getByRole('heading', { name: 'Welcome back, Officer John' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Recent Applications' })).toBeVisible();

    // Verify synthetic data is rendered
    await expect(page.getByText('Solar Plant O&M')).toBeVisible();
    await expect(page.getByText('SmartTech Solutions')).toBeVisible();

    // Navigate to case details
    await page.getByText('SmartTech Solutions').click();

    // Verify case details load
    await expect(page.getByText('Solar Plant O&M').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'SmartTech Solutions' })).toBeVisible();

    // Open decision modal
    await page.getByRole('button', { name: /Record Decision/i }).click();

    // Ensure decision modal is open
    await expect(page.getByRole('heading', { name: 'Record Decision' })).toBeVisible();
    
    // Select Qualify
    await page.getByLabel('Decision').selectOption('qualify');
    await page.getByPlaceholder('Provide justification (min 10 characters for disqualify)...').fill('Looks good based on AI recommendation.');
    
    // Submit decision
    await page.getByRole('button', { name: 'Submit Decision' }).click();

    // Check if modal closes
    await expect(page.getByRole('heading', { name: 'Record Decision' })).toBeHidden();
  });
});
