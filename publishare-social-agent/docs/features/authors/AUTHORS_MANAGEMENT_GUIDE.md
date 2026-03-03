# Authors Management System Guide

## 🎯 **Overview**

The **Authors Management System** allows users to have **multiple authors** under their account, perfect for:

- **Teams & Organizations** - Multiple team members under one account
- **Agencies** - Managing multiple client authors  
- **Content Teams** - Different writers, editors, contributors
- **Scalability** - Growing teams without account proliferation

## 🏗️ **System Architecture**

### **Key Components:**

#### **1. Authors Table**
```sql
CREATE TABLE public.authors (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id), -- Account owner
  name TEXT NOT NULL,                     -- Author name
  email TEXT,                            -- Author email
  bio TEXT,                              -- Author bio
  avatar_url TEXT,                       -- Author avatar
  role TEXT DEFAULT 'author',            -- Role: author, editor, contributor, admin
  is_active BOOLEAN DEFAULT true,        -- Active status
  permissions JSONB,                     -- Granular permissions
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### **2. Article Ownership Model**
```sql
-- Articles now have both user_id and author_id
user_id    = Account owner (who pays/owns the content)
author_id  = Specific author (who wrote the content)
```

#### **3. Author Invitations**
```sql
CREATE TABLE public.author_invitations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  invited_email TEXT NOT NULL,
  invited_name TEXT NOT NULL,
  role TEXT DEFAULT 'author',
  permissions JSONB,
  status TEXT DEFAULT 'pending', -- pending, accepted, declined, expired
  token TEXT UNIQUE NOT NULL,    -- Secure invitation token
  expires_at TIMESTAMPTZ NOT NULL
);
```

#### **4. Author Collaborations**
```sql
CREATE TABLE public.author_collaborations (
  id UUID PRIMARY KEY,
  article_id UUID REFERENCES articles(id),
  author_id UUID REFERENCES authors(id),
  role TEXT DEFAULT 'contributor', -- primary, contributor, reviewer, editor
  contribution_type TEXT DEFAULT 'writing' -- writing, editing, research, review
);
```

#### **5. Author Permissions**
```sql
CREATE TABLE public.author_permissions (
  id UUID PRIMARY KEY,
  author_id UUID REFERENCES authors(id),
  permission_type TEXT NOT NULL, -- create_articles, edit_articles, delete_articles, etc.
  granted BOOLEAN DEFAULT true
);
```

## 🔄 **User Flow**

### **1. Account Owner Flow:**
```
1. User signs up → Default author created automatically
2. User invites team members → Invitation emails sent
3. Team members accept → New authors added to account
4. Authors create content → Articles linked to specific authors
5. Owner manages permissions → Granular access control
```

### **2. Author Invitation Flow:**
```
1. Owner clicks "Invite Author"
2. Enters name, email, role, permissions
3. System generates secure invitation token
4. Invitation email sent with token
5. Author clicks link → Accepts invitation
6. Author account created under owner's account
```

### **3. Content Creation Flow:**
```
1. Author creates article → author_id set automatically
2. Article owned by user_id (account owner)
3. Article written by author_id (specific author)
4. Dashboard shows articles by author
5. Analytics track author performance
```

## 🎨 **Frontend Features**

### **1. Authors Management Page (`/authors`)**
- **View all authors** in the team
- **Invite new authors** with role selection
- **Manage author permissions** granularly
- **Track author performance** and article counts
- **Handle pending invitations** with status tracking

### **2. Enhanced Article Creation**
- **Author selection** dropdown in article form
- **Automatic author assignment** based on current user
- **Author attribution** in article metadata
- **Collaboration support** for multiple authors

### **3. Dashboard Enhancements**
- **Author-specific analytics** and metrics
- **Recent articles by author** display
- **Team performance overview** with author breakdown
- **Quick access** to author management

## 🔒 **Security & Permissions**

### **Row Level Security (RLS) Policies:**
```sql
-- Users can only see their own authors
CREATE POLICY "Users can view their own authors" ON authors
  FOR SELECT USING (auth.uid()::text = user_id);

-- Users can only manage their own authors
CREATE POLICY "Users can manage their own authors" ON authors
  FOR ALL USING (auth.uid()::text = user_id);

-- Authors can only see their own articles
CREATE POLICY "Authors can view their own articles" ON articles
  FOR SELECT USING (author_id IN (
    SELECT id FROM authors WHERE user_id = auth.uid()::text
  ));
```

### **Permission Types:**
- **`create_articles`** - Can create new articles
- **`edit_articles`** - Can edit existing articles
- **`delete_articles`** - Can delete articles
- **`publish_articles`** - Can publish articles
- **`manage_authors`** - Can invite/manage other authors
- **`view_analytics`** - Can view analytics data
- **`manage_settings`** - Can manage account settings
- **`manage_billing`** - Can manage billing (admin only)

### **Role-Based Access:**
- **`admin`** - Full access to all features
- **`editor`** - Can edit and publish content
- **`author`** - Can create and edit own content
- **`contributor`** - Can contribute to articles

## 📊 **Analytics & Reporting**

### **Author Performance Metrics:**
- **Articles per author** - Content creation volume
- **Views per author** - Content engagement
- **Engagement rates** - Author performance
- **Collaboration stats** - Team collaboration metrics
- **Publishing frequency** - Content cadence

### **Team Analytics:**
- **Total team output** - Combined content metrics
- **Author productivity** - Individual performance
- **Content quality** - Engagement by author
- **Collaboration patterns** - Team dynamics

## 🚀 **Setup Instructions**

### **1. Run the Database Migration**
```sql
-- Execute authors-management-schema.sql in Supabase SQL Editor
-- This will create all necessary tables, functions, and policies
```

### **2. Test the System**
1. **Sign up** with a new account
2. **Verify default author** is created automatically
3. **Invite a test author** using the authors page
4. **Create articles** with different authors
5. **Check dashboard** shows author-specific data

### **3. Configure Email (Optional)**
- Set up email templates for author invitations
- Configure email service for invitation delivery
- Customize invitation messages and branding

## 🎯 **Use Cases**

### **1. Content Agency**
```
- Agency owner creates account
- Invites client authors with limited permissions
- Clients create content under agency account
- Agency manages all content and billing
- Analytics show client-specific performance
```

### **2. Marketing Team**
```
- Marketing manager creates account
- Invites copywriters, designers, editors
- Each team member has specific permissions
- Content flows through approval process
- Performance tracked by team member
```

### **3. Solo Creator Scaling**
```
- Solo creator starts with personal account
- As business grows, invites team members
- Maintains single account for billing
- Team members contribute under creator's brand
- Analytics show team performance
```

## 🔧 **Advanced Features**

### **1. Author Collaboration**
- **Multiple authors** per article
- **Role-based contributions** (writer, editor, reviewer)
- **Collaboration tracking** and attribution
- **Workflow management** for team content

### **2. Author Profiles**
- **Author bios** and expertise areas
- **Author avatars** and branding
- **Author portfolios** and past work
- **Author-specific analytics** and performance

### **3. Content Workflows**
- **Draft → Review → Publish** workflow
- **Author assignment** and handoffs
- **Approval processes** with role-based permissions
- **Content scheduling** and publishing

### **4. Team Management**
- **Author onboarding** and training
- **Performance reviews** and feedback
- **Team communication** and collaboration
- **Resource allocation** and planning

## 📈 **Benefits**

### **✅ Scalability**
- Add team members without account proliferation
- Maintain single billing and management
- Scale content production efficiently

### **✅ Collaboration**
- Multiple authors working together
- Clear attribution and ownership
- Team-based content creation

### **✅ Analytics**
- Author-specific performance tracking
- Team productivity insights
- Content quality by author

### **✅ Security**
- Granular permission control
- Data isolation between teams
- Secure invitation system

### **✅ Management**
- Centralized team management
- Role-based access control
- Performance monitoring

## 🎉 **Summary**

The **Authors Management System** transforms Publishare from a single-user platform into a **powerful team collaboration tool**. Users can now:

- **Invite unlimited authors** under their account
- **Manage team permissions** granularly
- **Track author performance** individually
- **Collaborate on content** seamlessly
- **Scale their content operations** efficiently

This system is perfect for agencies, marketing teams, content creators, and any organization that needs multiple people creating content under a single account.

---

**Status**: ✅ **READY** - Complete authors management system implemented
