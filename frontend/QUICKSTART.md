# Quick Start - Orchestra Frontend

## ⚡ Get Started in 2 Minutes

### 1. Start the Frontend Dev Server
```bash
cd frontend
npm run dev
```

**Output:**
```
▲ Next.js 16.1.6 (Turbopack)
- Local:         http://localhost:3000
```

### 2. Open in Browser
```
http://localhost:3000
```

You'll see the login page!

---

## 📋 Full Command Reference

### Development Commands

```bash
# Start dev server (with hot reload)
cd frontend && npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run TypeScript type checking
npx tsc --noEmit

# Format code with Prettier
npm run format

# Lint code with ESLint
npm run lint
```

### Installation & Setup

```bash
# Install dependencies (already done)
cd frontend && npm install

# Update dependencies
npm update

# Check for security vulnerabilities
npm audit

# Fix security vulnerabilities
npm audit fix
```

---

## 🔧 Configuration

### Environment Variables

Create `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Change Frontend Port

If port 3000 is already taken, modify the dev command in `package.json`:
```json
"dev": "next dev -p 3001"
```

Then access at: `http://localhost:3001`

---

## 🧪 Testing

### Test Login Page
1. Start dev server: `npm run dev`
2. Navigate to: `http://localhost:3000`
3. You should see the login form immediately

### Test All Pages

**Auth Pages (public):**
- `/login` - Login form
- `/register` - Registration form
- `/forgot-password` - Password recovery

**Dashboard Pages (protected):**
- `/dashboard` - Main dashboard (requires login)
- `/add-project` - Create new project
- `/edit-profile` - Edit user profile
- `/settings` - Settings and preferences
- `/passkey-setup` - Passkey configuration

### Test Backend Integration

1. Ensure backend is running: `http://localhost:3000`
2. Try logging in with backend credentials
3. Check Network tab in browser dev tools
4. Verify API calls include Authorization header

---

## 🚀 Deployment

### Build for Production
```bash
cd frontend
npm run build
```

**Output:**
```
✓ Compiled successfully in 6.9s
✓ Collecting page data using 7 workers
✓ Generating static pages (12/12)
✓ Finalizing page optimization
```

### Deploy to Vercel (Recommended)
```bash
npm i -g vercel
vercel
```

### Deploy to Other Platforms
- AWS Amplify: Follow Amplify docs for Next.js
- Netlify: Follow Netlify docs for Next.js
- Docker: See Dockerfile in root
- Manual: Copy `.next` folder to your server

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Option 1: Change port in package.json
"dev": "next dev -p 3001"

# Option 2: Kill process using port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Build Errors
```bash
# Clear cache and rebuild
rm -rf .next
npm run build
```

### Dependencies Issues
```bash
# Reinstall all dependencies
rm -rf node_modules package-lock.json
npm install
```

### API Connection Issues
```bash
# Check API URL configuration
cat .env.local

# Verify backend is running
curl http://localhost:3000/health
```

---

## 📁 Project Structure

```
frontend/
├── app/
│   ├── (auth)/              # Public pages
│   │   ├── login/
│   │   ├── register/
│   │   ├── forgot-password/
│   │   └── reset-password/
│   ├── (dashboard)/         # Protected pages
│   │   ├── page.tsx
│   │   ├── add-project/
│   │   ├── edit-profile/
│   │   ├── settings/
│   │   ├── passkey-setup/
│   │   └── workspace/[projectId]/
│   ├── components/
│   │   ├── ui/              # 45+ shadcn components
│   │   └── Sidebar.tsx
│   ├── context/
│   │   └── AuthContext.tsx  # Auth state
│   ├── lib/
│   │   └── api.ts           # HTTP client
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Root redirect
│   └── globals.css          # Theme system
├── next.config.ts
├── tsconfig.json
├── package.json
└── .env.local               # Create this
```

---

## 💡 Key Features

### ✅ Authentication
- JWT token storage
- Auto-redirect based on auth state
- Secure API integration

### ✅ Modern UI
- OKLch color system
- Dark/light mode
- Responsive design
- 45+ components

### ✅ Performance
- Static site generation
- Incremental static regeneration
- Automatic code splitting
- Turbopack builds

### ✅ Developer Experience
- Hot module reloading
- TypeScript support
- ESLint configured
- Ready for debugging

---

## 📊 Performance

| Metric | Value |
|--------|-------|
| Build Time | ~7-14 seconds |
| Dev Server Startup | ~3 seconds |
| Page Load | <500ms |
| Dev Hot Reload | <1 second |

---

## 🔗 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)
- [Radix UI](https://www.radix-ui.com)
- [TypeScript](https://www.typescriptlang.org)

---

## 📞 Support

If you encounter issues:

1. **Check the build logs**: `npm run build`
2. **Review TypeScript errors**: `npx tsc --noEmit`
3. **Check backend connectivity**: Verify API URL in .env.local
4. **Review documentation**: See FRONTEND_MIGRATION_REPORT.md
5. **Check session notes**: /memories/session/frontend-migration-complete.md

---

## ✅ Quick Checklist

Before deploying:
- [ ] `npm run build` completes without errors
- [ ] `npm run dev` starts successfully
- [ ] Login page displays correctly
- [ ] Backend credentials work for login
- [ ] Dashboard loads after successful login
- [ ] All pages render without errors
- [ ] Environment variables configured
- [ ] Theme switching works

---

**You're all set! 🎉**

Start developing: `npm run dev`

Ready to deploy: `npm run build && npm start`
