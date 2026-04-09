# Payment System Deployment Checklist

## Pre-Deployment

- [ ] Verify `db.php` is accessible at: `https://raw.githubusercontent.com/jeemnndz/RapidRepair/main/db.php`
- [ ] Confirm payments table exists in rapidrepairs database
- [ ] Test local/dev environment if available

## File Deployment to Azure

- [ ] Upload `paymentcrud.php` to root directory (next to other CRUD files)
- [ ] Verify file permissions (readable/executable)
- [ ] Confirm no .php execution restrictions

## Database Verification

- [ ] Connect to Azure MySQL database
- [ ] Verify `payments` table exists with all columns:
  ```sql
  SHOW COLUMNS FROM payments;
  ```
- [ ] Check table indexes are created:
  ```sql
  SHOW INDEX FROM payments;
  ```
- [ ] Verify Foreign Keys are set up:
  ```sql
  SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME 
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
  WHERE TABLE_NAME = 'payments';
  ```

## API Testing

### Test GET Request (List Payments)
```
URL: https://rapidrepair-gygpcbczgyg0czek.southeastasia-01.azurewebsites.net/paymentcrud.php?action=list&tenantID=1&limit=10

Expected Response:
{
  "status": "success",
  "message": "Payments retrieved successfully",
  "data": [...]
}
```

- [ ] Test with tenant ID 1
- [ ] Test with user_id filter
- [ ] Test with status filter (Pending, Paid, etc.)
- [ ] Test limit/offset pagination

### Test POST Request (Create Payment)
```bash
curl -X POST https://rapidrepair-gygpcbczgyg0czek.southeastasia-01.azurewebsites.net/paymentcrud.php \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create",
    "tenantID": 1,
    "user_id": 10,
    "appointment_id": 1,
    "paymentAmount": 500.00,
    "paymentMethod": "Cash"
  }'
```

- [ ] Test payment creation
- [ ] Verify reference number generated
- [ ] Check balance calculated correctly

### Test POST Request (Update Payment)
```bash
curl -X POST https://rapidrepair-gygpcbczgyg0czek.southeastasia-01.azurewebsites.net/paymentcrud.php \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update",
    "payment_id": 1,
    "amountPaid": 250.00
  }'
```

- [ ] Test payment amount update
- [ ] Verify status auto-updates to "Partial"
- [ ] Test status field update

### Test GET Request (Delete Payment)
```
URL: https://rapidrepair-gygpcbczgyg0czek.southeastasia-01.azurewebsites.net/paymentcrud.php?action=delete&payment_id=1
```

- [ ] Test payment deletion
- [ ] Verify error if payment_id invalid

## Frontend Testing

- [ ] Update HomeScreen.js to pass tenantID and user_id props to PaymentsScreen
- [ ] Test app loads PaymentsScreen
- [ ] Verify loading indicator shows briefly
- [ ] Check pending payments display correctly
- [ ] Check history payments display correctly
- [ ] Test segment tab switching
- [ ] Test payment count display in tabs
- [ ] Verify pull-to-refresh works
- [ ] Test Pay Now button functionality
- [ ] Test View Invoice button functionality
- [ ] Verify error state shows on API failure
- [ ] Test retry button on error state

## Data Validation

- [ ] Amount formattin correct (2 decimal places)
- [ ] Dates formatted correctly (MM DD, YYYY)
- [ ] Status badges show correct colors (PENDING=yellow, PAID=green, OVERDUE=red)
- [ ] Overdue detection works (compares appointment_date to today)
- [ ] Balance calculation correct (paymentAmount - amountPaid)

## Performance Testing

- [ ] Test with 50+ payments (check pagination)
- [ ] Monitor API response time (should be < 2 seconds)
- [ ] Test on slow 3G network
- [ ] Verify ActivityIndicator shows during load
- [ ] Check memory usage doesn't spike

## Post-Deployment

- [ ] Monitor Azure logs for errors
- [ ] Check database query performance
- [ ] Monitor API call success rate
- [ ] Get user feedback on UX
- [ ] Document any issues encountered

## Rollback Plan

If issues occur:
1. Revert PaymentsScreen.js to use hardcoded data (comment out API calls)
2. Remove paymentcrud.php from Azure
3. Redeploy previous version
4. Troubleshoot on dev environment

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| API returns 404 | paymentcrud.php not uploaded or wrong path | Verify file in root dir, not /mobileapis/ |
| "Connection failed" | db.php not accessible | Check GitHub URL is correct, verify db.php is public |
| Empty payment list | No data in payments table | Create test data or check user_id parameter |
| Status not updating | POST not reaching API | Check Azure app service POST restrictions |
| Balance incorrect | Multiple updates processed | Verify backend calculations are correct |
| Slow loading | Too many records fetched | Implement pagination limits, add indexes |

## Sign-Off

- [ ] QA Approved
- [ ] Database backup created
- [ ] Monitoring alerts set up
- [ ] Documentation updated
- [ ] Team notified of deployment

**Deployed By:** _______________
**Date:** _______________
**Notes:** _______________
