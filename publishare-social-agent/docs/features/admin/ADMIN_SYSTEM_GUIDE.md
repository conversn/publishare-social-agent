# Admin System Guide

## 🎯 **Overview**

The **Admin System** provides comprehensive user and subscription management capabilities for Publishare administrators. This system allows admins to monitor the platform, manage users, and control subscriptions.

## 🔐 **Access Control**

### **Admin Role Required**
- Only users with the `admin` role can access admin functions
- Admin role is assigned through the `user_roles` table
- Admin functions are protected with role-based access control

### **Accessing the Admin Panel**
1. **Sign in** with an admin account
2. **Click your profile** in the header
3. **Select "Admin Panel"** from the dropdown menu
4. **Navigate to `/admin`** directly

## 📊 **Admin Dashboard Features**

### **1. System Overview**
- **Total Users** - Complete user count with active user breakdown
- **Total Articles** - All articles created on the platform
- **Calculators** - Interactive content count
- **Recent Signups** - New users in the last 7 days

### **2. User Management**
- **User List** - Complete list of all users
- **Search & Filter** - Find specific users quickly
- **User Details** - Email, name, role, join date, article count
- **Subscription Status** - Current plan and payment status

## 💳 **Subscription Management**

### **Available Plans**
- **Free** - Basic features for getting started
- **Pro** - Professional features for growing teams ($29/month)
- **Enterprise** - Enterprise features for large organizations ($99/month)

### **Admin Actions**
- **Change User Plan** - Upgrade/downgrade any user's subscription
- **View Subscription Details** - See plan, status, billing period
- **Bulk Management** - Manage multiple users efficiently

### **How to Change User Subscription**
1. **Find the user** in the admin dashboard
2. **Select new plan** from the dropdown (Free, Pro, Enterprise)
3. **Click "Update Plan"** to apply changes
4. **Confirm the change** - user will be notified

## 👥 **User Management**

### **User Actions Available**
- **View User Context** - Switch to view the app as that user
- **Remove User** - Completely remove user and all their data
- **Update Subscription** - Change user's plan
- **View User Stats** - See articles, activity, etc.

### **User Removal Process**
1. **Find the user** to remove
2. **Click "Remove"** button
3. **Confirm deletion** - this action cannot be undone
4. **User data is cleaned up** - articles, calculators, contacts, etc.

⚠️ **Warning**: User removal is permanent and cannot be undone!

## 🔧 **Database Functions**

### **Admin Functions**
```sql
-- Check if current user is admin
is_admin()

-- Get all users with details
get_all_users()

-- Get system overview metrics
get_system_overview()

-- Switch to user context
switch_to_user_context(target_user_id)

-- Change user subscription
change_user_subscription(target_user_id, plan_name, status)

-- Remove user completely
remove_user_completely(target_user_id)

-- Get user subscription details
get_user_subscription_details(target_user_id)
```

### **Subscription Plans Table**
```sql
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,           -- Free, Pro, Enterprise
  description TEXT,
  price_monthly DECIMAL(10,2),
  price_yearly DECIMAL(10,2),
  features JSONB,
  is_active BOOLEAN DEFAULT true
);
```

### **User Subscriptions Table**
```sql
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  plan_id UUID REFERENCES subscription_plans(id),
  status TEXT DEFAULT 'free',   -- free, trial, paid, cancelled, expired
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false
);
```

## 🛡️ **Security Features**

### **Row Level Security (RLS)**
- **Admin Access** - Admins can view all data through RLS policies
- **User Isolation** - Regular users only see their own data
- **Secure Functions** - All admin functions require admin role

### **Data Protection**
- **Audit Trail** - Admin actions are logged
- **Confirmation Dialogs** - Destructive actions require confirmation
- **Role Validation** - Functions check admin role before execution

## 📈 **Monitoring & Analytics**

### **System Health**
- **Database Size** - Current database storage usage
- **Active Connections** - Current database connections
- **Backup Status** - Last backup information

### **User Analytics**
- **User Growth** - New signups over time
- **Content Creation** - Articles and calculators created
- **Engagement Metrics** - User activity patterns

## 🚀 **Best Practices**

### **Admin Workflow**
1. **Regular Monitoring** - Check system overview daily
2. **User Support** - Use admin panel to help users
3. **Subscription Management** - Monitor and update plans as needed
4. **Data Cleanup** - Remove inactive users periodically

### **Security Guidelines**
- **Never share admin credentials**
- **Use confirmation dialogs** for destructive actions
- **Monitor admin access** regularly
- **Backup data** before major changes

### **User Management Tips**
- **Communicate changes** to users when updating subscriptions
- **Document admin actions** for audit purposes
- **Test changes** in development environment first
- **Have rollback plans** for major changes

## 🔄 **Future Enhancements**

### **Planned Features**
- **Bulk Operations** - Manage multiple users at once
- **Advanced Analytics** - Detailed user behavior insights
- **Automated Alerts** - Notifications for system issues
- **Audit Logging** - Detailed admin action history
- **User Impersonation** - Full user context switching

### **Integration Opportunities**
- **Payment Processing** - Direct integration with Stripe/PayPal
- **Email Notifications** - Automated user communications
- **API Access** - Programmatic admin operations
- **Reporting Tools** - Advanced analytics and reporting

## 📞 **Support**

### **Getting Help**
- **Check logs** for error details
- **Test functions** in SQL Editor first
- **Verify permissions** before making changes
- **Document issues** for troubleshooting

### **Common Issues**
- **Access Denied** - Check admin role assignment
- **Function Errors** - Verify user exists and data is valid
- **RLS Issues** - Ensure policies are properly configured

---

## ✅ **Admin System Checklist**

- [ ] Admin role assigned to your account
- [ ] Admin panel accessible at `/admin`
- [ ] System overview displaying correctly
- [ ] User management functions working
- [ ] Subscription management operational
- [ ] User removal process tested
- [ ] Security policies in place
- [ ] Documentation updated

Your admin system is now fully operational! 🎉
