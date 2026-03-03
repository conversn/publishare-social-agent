# 🚀 Development Setup Guide

Welcome to Publishare! This guide will help you set up your development environment and get started with the project.

## 📋 **Prerequisites**

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **npm** or **yarn** - Package managers
- **Git** - Version control
- **VS Code** (recommended) - Code editor
- **Supabase CLI** (optional) - For local development

## 🔧 **Initial Setup**

### **1. Clone the Repository**
```bash
git clone https://github.com/your-org/publishare.git
cd publishare
```

### **2. Install Dependencies**
```bash
npm install
# or
yarn install
```

### **3. Environment Configuration**
```bash
# Copy the example environment file
cp docs/setup/development/env.example .env.local

# Edit .env.local with your configuration
nano .env.local
```

### **4. Required Environment Variables**
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

## 🗄️ **Database Setup**

### **1. Supabase Project Setup**
1. Create a new project at [supabase.com](https://supabase.com)
2. Get your project URL and API keys
3. Update your `.env.local` file

### **2. Database Migrations**
```bash
# Run the multi-user schema setup
# Copy the SQL from docs/setup/database/fix-multi-user-schema.sql
# Execute in your Supabase SQL Editor

# Run the authors management schema
# Copy the SQL from docs/setup/database/authors-management-schema.sql
# Execute in your Supabase SQL Editor
```

### **3. Verify Database Setup**
```bash
# Test the database connection
node scripts/test-supabase.js
```

## 🏃‍♂️ **Running the Application**

### **1. Development Server**
```bash
npm run dev
# or
yarn dev
```

The application will be available at `http://localhost:3000`

### **2. Build for Production**
```bash
npm run build
npm start
```

### **3. Type Checking**
```bash
npm run type-check
```

## 🧪 **Testing**

### **1. Run Tests**
```bash
npm test
# or
npm run test:watch
```

### **2. Test Coverage**
```bash
npm run test:coverage
```

## 📁 **Project Structure**

```
publishare/
├── 📁 app/                    # Next.js App Router
│   ├── 📁 (auth)/            # Authentication routes
│   ├── 📁 (dashboard)/       # Dashboard routes
│   ├── 📁 api/               # API routes
│   └── 📄 layout.tsx         # Root layout
├── 📁 components/            # React components
│   ├── 📁 ui/               # Base UI components
│   ├── 📁 features/         # Feature-specific components
│   └── 📁 layout/           # Layout components
├── 📁 docs/                 # Project documentation
├── 📁 hooks/                # Custom React hooks
├── 📁 lib/                  # Utility libraries
├── 📁 services/             # API services
├── 📁 types/                # TypeScript types
└── 📁 utils/                # Utility functions
```

## 🔍 **Development Workflow**

### **1. Feature Development**
1. Create a new branch: `git checkout -b feature/feature-name`
2. Follow the [feature development guide](../guides/feature-development.md)
3. Write tests for your feature
4. Update documentation
5. Create a pull request

### **2. Code Organization**
- Follow the [project structure guide](../guides/project-structure.md)
- Use the [naming conventions](../guides/naming-conventions.md)
- Organize imports according to [import patterns](../guides/import-patterns.md)

### **3. Documentation**
- Document new features in `docs/features/`
- Update API documentation in `docs/api/`
- Keep setup guides current

## 🛠️ **Development Tools**

### **1. VS Code Extensions (Recommended)**
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **TypeScript Importer** - Auto-import TypeScript
- **Tailwind CSS IntelliSense** - CSS class suggestions
- **GitLens** - Git integration
- **Thunder Client** - API testing

### **2. Browser Extensions**
- **React Developer Tools** - React debugging
- **Redux DevTools** - State management debugging

### **3. Database Tools**
- **Supabase Dashboard** - Database management
- **pgAdmin** (optional) - PostgreSQL client

## 🔧 **Configuration Files**

### **1. TypeScript Configuration**
```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### **2. Tailwind Configuration**
```javascript
// tailwind.config.js
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      // Custom theme configuration
    }
  }
}
```

### **3. Next.js Configuration**
```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Next.js experimental features
  }
}

module.exports = nextConfig
```

## 🐛 **Debugging**

### **1. Common Issues**
- **Port conflicts**: Change port in `package.json` scripts
- **Environment variables**: Ensure `.env.local` is properly configured
- **Database connection**: Verify Supabase credentials
- **Type errors**: Run `npm run type-check`

### **2. Debugging Tools**
- **Browser DevTools** - Frontend debugging
- **Supabase Logs** - Database debugging
- **Next.js Debug Mode** - Server-side debugging

### **3. Logging**
```javascript
// Use console.log for development
console.log('Debug info:', data)

// Use structured logging for production
logger.info('User action', { userId, action })
```

## 📚 **Learning Resources**

### **1. Framework Documentation**
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

### **2. Project-Specific**
- [Project Architecture](../architecture/system-architecture.md)
- [Database Schema](../architecture/database-schema.md)
- [API Documentation](../api/README.md)
- [Component Guidelines](../guides/component-guidelines.md)

### **3. Best Practices**
- [React Best Practices](https://react.dev/learn)
- [Next.js Best Practices](https://nextjs.org/docs/basic-features/best-practices)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)

## 🤝 **Getting Help**

### **1. Project Resources**
- **Documentation**: Check the [main docs](../README.md)
- **Issues**: Search existing [GitHub issues](https://github.com/your-org/publishare/issues)
- **Discussions**: Use [GitHub discussions](https://github.com/your-org/publishare/discussions)

### **2. Community Resources**
- **Stack Overflow** - Tag with `publishare`, `nextjs`, `supabase`
- **Discord/Slack** - Join our community channels
- **Blog Posts** - Check our [blog](https://blog.publishare.com)

### **3. Direct Support**
- **Email**: dev-support@publishare.com
- **GitHub Issues**: Create a new issue with detailed information
- **Code Reviews**: Request review from team members

## ✅ **Verification Checklist**

Before you start developing, ensure you can:

- [ ] **Run the development server** without errors
- [ ] **Connect to the database** and see data
- [ ] **Create a new user account** and sign in
- [ ] **Create an article** and see it in the dashboard
- [ ] **Invite an author** and see them in the authors list
- [ ] **Run tests** and see them pass
- [ ] **Build the project** without errors

## 🎉 **Next Steps**

Once you're set up:

1. **Explore the codebase** - Familiarize yourself with the structure
2. **Read the documentation** - Understand the architecture
3. **Pick a simple issue** - Start with a beginner-friendly task
4. **Join the community** - Connect with other developers
5. **Contribute** - Share your knowledge and improvements

---

**Need help?** Check our [troubleshooting guide](../guides/troubleshooting.md) or [create an issue](https://github.com/your-org/publishare/issues/new).

**Status**: ✅ **READY** - Development environment setup complete
