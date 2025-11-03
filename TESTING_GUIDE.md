# Testing Guide: Password-Based Role Assignment

## Quick Test Steps

### Step 1: Sign Out Current User

1. Navigate to Settings
2. Click "Sign Out"

### Step 2: Create Test Account

1. Go to `/auth/signup`
2. Create a new account (will be GUEST role)
3. You'll be redirected to `/onboarding`

### Step 3: Create Team with 3 Passwords

1. Click "Create New Team"
2. Fill in:
   - **Team Name**: Test Company
   - **Team ID**: test-company-123
   - **Admin Password**: admin12345678
   - **Editor Password**: editor12345678
   - **Viewer Password**: viewer12345678
3. Click "Create Team"
4. You should be redirected to inbox as ADMIN

### Step 4: Note Your Team ID

1. Go to Settings
2. Copy the Team ID (test-company-123)
3. Note all 3 passwords are displayed (blurred until hover)

### Step 5: Test Password-Based Role Assignment

#### Test 5a: Join as Editor

1. Sign out
2. Create another new account
3. On onboarding page, click "Join Existing Team"
4. Enter:
   - **Team ID**: test-company-123
   - **Password**: editor12345678
5. Click "Join Team"
6. ✅ **Expected**: Joined as EDITOR role
7. Check Settings → Role should show "EDITOR"

#### Test 5b: Join as Viewer

1. Sign out
2. Create another new account
3. Join with:
   - **Team ID**: test-company-123
   - **Password**: viewer12345678
4. ✅ **Expected**: Joined as VIEWER role
5. Check Settings → Role should show "VIEWER"

#### Test 5c: Join as Admin

1. Sign out
2. Create another new account
3. Join with:
   - **Team ID**: test-company-123
   - **Password**: admin12345678
4. ✅ **Expected**: Joined as ADMIN role
5. Check Settings → Role should show "ADMIN"

#### Test 5d: Wrong Password

1. Sign out
2. Create another new account
3. Join with:
   - **Team ID**: test-company-123
   - **Password**: wrongpassword123
4. ✅ **Expected**: Error message "Incorrect team password"

### Step 6: Test Password Reset (Admin Only)

1. Sign in as an ADMIN user
2. Go to Settings
3. Click "Reset" next to any password
4. Enter new password (min 8 characters)
5. ✅ **Expected**: Success message
6. Test: Sign out and try joining with NEW password
7. Should work with new password, old password should fail

### Step 7: Test Edit Team ID (Admin Only)

1. Sign in as ADMIN user
2. Go to Settings
3. Click "Edit" button next to Team ID
4. Enter new slug: test-company-new
5. ✅ **Expected**: Success message
6. Team ID should update in UI
7. Test: Try joining with OLD team ID → Should fail
8. Test: Join with NEW team ID → Should work

### Step 8: Test Non-Admin Restrictions

1. Sign in as VIEWER or EDITOR user
2. Go to Settings
3. ✅ **Expected**:
   - No password fields visible
   - No "Edit" button on Team ID
   - No "Invite Member" button

## Expected Results Summary

| Test                | Input          | Expected Result                 |
| ------------------- | -------------- | ------------------------------- |
| Create Team         | 3 passwords    | Team created, user is ADMIN     |
| Join with Admin PW  | admin12345678  | Role = ADMIN                    |
| Join with Editor PW | editor12345678 | Role = EDITOR                   |
| Join with Viewer PW | viewer12345678 | Role = VIEWER                   |
| Join with Wrong PW  | wrongpassword  | Error: Incorrect password       |
| Reset Password      | New password   | Old password invalid, new valid |
| Edit Team ID        | New slug       | Old ID invalid, new ID works    |
| Non-Admin View      | N/A            | Cannot see/edit passwords       |

## Common Issues & Solutions

### Issue: TypeScript errors in VSCode

**Solution**: Reload VS Code window

- Press `Ctrl+Shift+P`
- Type "Reload Window"
- Select "Developer: Reload Window"

### Issue: "slug does not exist" error

**Solution**:

1. Stop dev server
2. Run: `npx prisma generate`
3. Restart dev server

### Issue: Can't see passwords in Settings

**Solution**: Make sure you're logged in as ADMIN of the team

### Issue: Onboarding page shows role dropdown

**Solution**: Clear browser cache and hard reload (Ctrl+Shift+R)

## Verification Checklist

- [ ] Created team with 3 separate passwords
- [ ] Joined with admin password → Got ADMIN role
- [ ] Joined with editor password → Got EDITOR role
- [ ] Joined with viewer password → Got VIEWER role
- [ ] Wrong password shows error
- [ ] Admin can see all 3 passwords (blurred)
- [ ] Admin can reset each password individually
- [ ] Admin can edit team ID
- [ ] Non-admins cannot see passwords
- [ ] Non-admins cannot edit team ID
- [ ] Old team ID stops working after edit
- [ ] New team ID works after edit
- [ ] Role selection removed from join form
- [ ] Helper text shows "role will be assigned"

## Success Criteria

✅ **All tests pass**
✅ **No TypeScript errors** (after VS Code reload)
✅ **No runtime errors** in console
✅ **Role assignment automatic** based on password
✅ **Security maintained** - only admins manage passwords
