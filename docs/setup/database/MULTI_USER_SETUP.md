# Multi-User Database Setup Guide

## 🎯 **What We've Accomplished**

✅ **Updated Dashboard** - Now shows real data instead of mock data  
✅ **Multi-User Authentication** - Each user sees only their own content  
✅ **Article Creation** - Users can create articles that are linked to their account  
✅ **Calculator Creation** - Users can create calculators that are linked to their account  
✅ **Row Level Security (RLS)** - Database policies ensure data isolation  

## 🚀 **Next Steps to Complete Setup**

### **1. Run the Database Setup SQL**

Go to your **Supabase Dashboard** → **SQL Editor** and run the contents of `setup-multi-user-db.sql`:

```sql
-- Copy and paste the entire contents of setup-multi-user-db.sql
-- This will:
-- - Enable Row Level Security on all tables
-- - Create policies so users only see their own data
-- - Set up automatic profile creation on signup
-- - Create helper functions for dashboard stats
```

### **2. Test the Multi-User Functionality**

1. **Sign up with a new account** at `/auth/signup`
2. **Create an article** by clicking "New Article" on the dashboard
3. **Create a calculator** by clicking "New Calculator" on the dashboard
4. **Check the dashboard** - you should see your real data!

### **3. Verify Data Isolation**

1. **Sign up with a second account** (different email)
2. **Create content** with the second account
3. **Switch between accounts** - each should only see their own content

## 🏗️ **Database Architecture**

### **Key Tables with Multi-User Support:**

| Table | User Field | Purpose |
|-------|------------|---------|
| `articles` | `author_id` | Links articles to the user who created them |
| `profiles` | `id` | User profiles (auto-created on signup) |
| `quiz_sessions` | `user_id` | Calculator/quiz sessions |
| `contacts` | `user_id` | Contact form submissions |
| `form_submissions` | `user_id` | General form submissions |
| `media_library` | `article_id` → `author_id` | Media linked to user's articles |

### **Row Level Security Policies:**

- **Users can only view their own articles**
- **Users can only edit their own articles**
- **Users can only see their own calculators**
- **Users can only access their own media**
- **Users can only view their own contacts**

## 🔧 **How It Works**

### **1. User Registration Flow:**
```
User signs up → Supabase Auth creates user → Trigger creates profile → User can create content
```

### **2. Content Creation Flow:**
```
User creates article → `author_id` set to user.id → RLS ensures only user can see/edit
```

### **3. Dashboard Data Flow:**
```
Dashboard loads → Queries filtered by user.id → Only user's content returned → Real stats displayed
```

## 📊 **Dashboard Features**

### **Real-Time Stats:**
- **Total Articles** - Count of user's articles
- **Active Calculators** - Count of user's calculators
- **Total Views** - Sum of article views (stored in meta_description)
- **Engagement Rate** - Average SEO score across articles

### **Recent Content:**
- **Recent Articles** - User's latest 5 articles
- **Popular Calculators** - User's most used calculators with conversion rates

## 🛠️ **Troubleshooting**

### **If Dashboard Shows No Data:**
1. Check that you've run the SQL setup
2. Verify RLS policies are active
3. Check browser console for errors
4. Ensure user is properly authenticated

### **If Content Creation Fails:**
1. Check that `author_id` is being set correctly
2. Verify RLS policies allow INSERT
3. Check Supabase logs for errors

### **If Users Can See Each Other's Content:**
1. Verify RLS policies are working
2. Check that `auth.uid()` is being used correctly
3. Ensure policies are applied to all tables

## 🎨 **Customization Options**

### **Add More User Fields:**
```sql
-- Add to profiles table
ALTER TABLE profiles ADD COLUMN company_name TEXT;
ALTER TABLE profiles ADD COLUMN website TEXT;
```

### **Add More Content Types:**
```sql
-- Create new tables with user_id field
CREATE TABLE user_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES auth.users(id),
  name TEXT NOT NULL,
  content JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **Add Role-Based Access:**
```sql
-- Use existing user_roles table
INSERT INTO user_roles (user_id, role) VALUES ('user-uuid', 'editor');
```

## 🚀 **Production Deployment**

### **Environment Variables:**
Ensure these are set in production:
```
NEXT_PUBLIC_SUPABASE_URL=your_production_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_key
```

### **Database Migration:**
1. Run the SQL setup on production database
2. Test with a few users
3. Monitor RLS policy performance

## 📈 **Next Features to Build**

1. **Article Editor** - Rich text editor for articles
2. **Calculator Builder** - Visual calculator builder
3. **Analytics Dashboard** - Detailed engagement metrics
4. **Team Collaboration** - Share content with team members
5. **Content Templates** - Reusable content templates

---

## ✅ **Success Checklist**

- [ ] Run `setup-multi-user-db.sql` in Supabase
- [ ] Test user registration and profile creation
- [ ] Create test articles and calculators
- [ ] Verify dashboard shows real data
- [ ] Test data isolation between users
- [ ] Deploy to production (if ready)

Your Publishare platform now supports multiple users with proper data isolation and real-time dashboard data! 🎉
