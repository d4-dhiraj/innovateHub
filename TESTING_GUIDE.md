# Testing Guide: Photo Gallery / Success Stories & Issues Near You Features

## Step 1: Update Supabase Database

First, you need to add the `after_photo_url` and `upvote_count` columns to your Supabase `problems` table.

1. Go to your Supabase dashboard (https://supabase.com/dashboard)
2. Navigate to your project
3. Go to the SQL Editor
4. Run the following SQL command (or use the `add_after_photo_column.sql` file):

```sql
ALTER TABLE problems 
ADD COLUMN after_photo_url TEXT;

COMMENT ON COLUMN problems.after_photo_url IS 'URL of the after photo showing the resolved state of the problem';

ALTER TABLE problems 
ADD COLUMN upvote_count INTEGER DEFAULT 0;

COMMENT ON COLUMN problems.upvote_count IS 'Number of upvotes from citizens for this problem';
```

## Step 2: Test Photo Gallery / Success Stories Feature

### Option A: Manual Testing via Supabase

1. **Mark a problem as resolved manually:**
   - Go to Supabase Dashboard → Table Editor → problems table
   - Find a problem that's currently assigned or in progress
   - Update the `status` field to `resolved`
   - Optionally, add a URL to the `after_photo_url` field (if you have a hosted image)
   - Save the changes

2. **View the Success Stories page:**
   - Open http://localhost:3000/success-stories
   - You should see the resolved problem displayed as a before-and-after card

### Option B: Testing via University Dashboard (Recommended)

1. **Start the AI service (if not running):**
   ```bash
   cd ai-service
   python main.py
   ```

2. **Log in as a University user:**
   - Open http://localhost:3000/login
   - Log in with a university account

3. **Accept a challenge:**
   - Go to the University Dashboard
   - In the "Challenge Inbox" section, click "Accept" on a submitted problem
   - The problem will move to "Assigned Challenges"

4. **Mark as resolved:**
   - In the "Assigned Challenges" section, click "Mark Resolved" on the accepted problem
   - A dialog will appear asking for an after photo (optional)
   - Upload an after photo showing the resolved state
   - Click "Confirm Resolved"

5. **View the Success Stories:**
   - Click "Success Stories" in the navigation bar
   - Or go directly to http://localhost:3000/success-stories
   - You should see the resolved problem with before and after photos

## Step 3: Test Issues Near You & Upvote Feature

1. **Log in as a Citizen user:**
   - Open http://localhost:3000/login
   - Log in with a citizen account

2. **Report an issue with a location:**
   - Go to Citizen Dashboard
   - Click "Report a New Issue"
   - Fill in the form with a specific location (e.g., "Ranchi", "Jamshedpur", "Dhanbad")
   - Submit the issue

3. **View Issues Near You:**
   - Scroll down to the "Issues Near You" section
   - You should see other problems from the same location
   - If no other issues exist, report another issue with the same location from a different account

4. **Test Upvote Functionality:**
   - Click the "Upvote" button on any issue in the "Issues Near You" section
   - The upvote count should increment immediately
   - The button should show the updated count
   - Try upvoting multiple issues

5. **Verify Upvote Display:**
   - Check that upvote counts appear in:
     - Issues Near You section
     - My Activity section (your own problems)
     - University Challenge Inbox
     - University Assigned Challenges
     - Success Stories page
     - Admin Dashboard (total upvotes)

## Step 4: Verify Both Features

### Photo Gallery / Success Stories:

1. **University Dashboard:**
   - [ ] Challenge Inbox shows submitted problems
   - [ ] "Accept" button moves problems to Assigned Challenges
   - [ ] "Start Work" button changes status to in_progress
   - [ ] "Mark Resolved" button opens dialog with photo upload
   - [ ] After photo upload works correctly
   - [ ] Problem status changes to resolved

2. **Success Stories Page:**
   - [ ] Page loads at /success-stories
   - [ ] Resolved problems are displayed as cards
   - [ ] Before photo shows with "Before" label
   - [ ] After photo shows with "After" label
   - [ ] Clicking a card opens detailed modal
   - [ ] Modal shows larger before/after comparison
   - [ ] Problem details are displayed correctly
   - [ ] Upvote counts are displayed on success stories

3. **Navigation:**
   - [ ] "Success Stories" link appears on home page
   - [ ] "Success Stories" link appears in university dashboard
   - [ ] "Success Stories" link appears in admin dashboard
   - [ ] "Photo Gallery" card in citizen dashboard links to success stories

### Issues Near You & Upvotes:

1. **Citizen Dashboard:**
   - [ ] "Issues Near You" section appears below My Activity
   - [ ] Shows problems from same location (excluding user's own)
   - [ ] Displays problem cards with photos, details, and status
   - [ ] Upvote button is prominent and visually appealing
   - [ ] Upvote count displays correctly
   - [ ] Clicking upvote increments the count
   - [ ] Button shows loading state during upvote

2. **Location Filtering:**
   - [ ] Only shows problems from user's submitted locations
   - [ ] If user has no submissions, shows message to report first
   - [ ] If no other issues in location, shows appropriate message
   - [ ] Issues are sorted by upvote count (most popular first)

3. **Upvote Display Across App:**
   - [ ] Upvote counts appear in My Activity
   - [ ] Upvote counts appear in University Challenge Inbox
   - [ ] Upvote counts appear in University Assigned Challenges
   - [ ] Upvote counts appear in Success Stories
   - [ ] Admin Dashboard shows total upvotes

4. **Admin Dashboard:**
   - [ ] Total Problems Submitted card shows correct count
   - [ ] Total Community Upvotes card shows sum of all upvotes
   - [ ] "Most Upvoted Problems" section appears

## Troubleshooting

### If the after_photo_url column doesn't exist:
- Make sure you ran the SQL script in Supabase
- Check the Table Editor to verify the column was added

### If the upvote_count column doesn't exist:
- Make sure you ran the complete SQL script
- Check the Table Editor to verify the column was added with default value 0

### If photos don't upload:
- Check that the Supabase storage bucket 'problem-photos' exists
- Verify your storage permissions in Supabase
- Check browser console for upload errors

### If resolved problems don't appear:
- Verify the status is exactly 'resolved' (lowercase)
- Check browser console for fetch errors
- Ensure the Supabase anon key is correct in .env.local

### If Issues Near You shows no problems:
- Make sure you've submitted at least one problem with a location
- Check that other problems exist with the same location text
- Verify the location text matches exactly (case-sensitive)
- Check browser console for fetch errors

### If upvotes don't work:
- Verify the upvote_count column exists in the database
- Check browser console for error messages
- Ensure the user is logged in
- Check Supabase RLS policies allow updates to upvote_count

## Current Status

✅ **Completed:**
- Added AssignedChallenges component with "Mark Resolved" button
- Created after photo upload functionality
- Added SQL script to update database schema (after_photo_url + upvote_count)
- Created Success Stories page with before/after cards
- Added navigation links across all dashboards
- Integrated with existing photo storage system
- Created IssuesNearYou component with location filtering
- Implemented upvote functionality with real-time updates
- Added upvote counts display across all problem cards
- Enhanced Admin Dashboard with total upvotes metric

🔄 **Ready for Testing:**
- Database schema update (needs manual SQL execution)
- End-to-end user flow testing for both features
- Community engagement testing via upvotes