# BO Admin Dashboard

A modern admin dashboard built with React, TypeScript, Ant Design, and Tailwind CSS. This dashboard provides comprehensive management tools for user accounts, communication, and business analytics.

## 🛠️ Tech Stack

- **Frontend**: React 19 + TypeScript
- **Routing**: React Router DOM
- **State Management**: React Query (TanStack Query)
- **UI Components**: Ant Design
- **Styling**: Tailwind CSS v4
- **Charts**: Recharts
- **Build Tool**: Vite
- **HTTP Client**: Axios

## 📁 Project Structure

```
src/
├── apis/
│   ├── auth/
│   │   ├── queries.ts      # React Query hooks for auth
│   │   ├── mutations.ts    # Auth mutations (login, etc.)
│   │   ├── request.ts      # Auth API calls
│   │   ├── types.ts        # Auth TypeScript types
│   │   └── index.ts        # Export all auth APIs
│   └── axios.ts            # Axios configuration
├── components/
│   ├── AdminLayout.tsx     # Main layout component
│   ├── Header.tsx          # Dashboard header
│   └── Sidebar.tsx         # Navigation sidebar
├── constants/
│   ├── app.ts              # App constants (storage keys)
│   ├── env.ts              # Environment variables
│   └── path.ts             # Route paths
├── hooks/
│   └── useAuth.ts          # Authentication hooks
├── pages/
│   ├── Dashboard.tsx       # Main dashboard page
│   ├── Accounts.tsx        # User management page
│   ├── Communication.tsx   # Notification sending page
│   └── Login.tsx           # Login page
├── routes/
│   ├── PrivateRoute.tsx    # Protected route wrapper
│   └── PublicRoute.tsx     # Public route wrapper
└── types/
    └── queryKeyEnum.ts     # React Query key enums
```

## 🚦 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or pnpm

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd antd-demo
```

2. Install dependencies:

```bash
npm install
# or
pnpm install
```

3. Set up environment variables:
   Create a `.env` file in the root directory:

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

4. Start the development server:

```bash
npm run dev
# or
pnpm dev
```

The application will be available at `http://localhost:5173`

## 🔐 Authentication

The dashboard uses JWT-based authentication:

- **Login**: `/auth/login`
- **Protected Routes**: All dashboard routes require authentication
- **Token Storage**: Tokens are stored in localStorage
- **Auto Redirect**: Unauthenticated users are redirected to login

### Login Credentials

For testing purposes, you'll need to set up your backend API or use mock credentials.

## 🎨 UI/UX Features

- **Dark Theme**: Consistent dark color scheme
- **Responsive Design**: Works on all device sizes
- **Interactive Charts**: Built with Recharts
- **Form Validation**: Comprehensive form validation with Ant Design
- **Loading States**: Proper loading indicators
- **Error Handling**: User-friendly error messages

## 🔧 API Integration

The dashboard is designed to work with a RESTful API. Key endpoints:

- `GET /auth/me` - Get current user information
- `POST /auth/email/login` - User login
- `GET /users` - Get user list (for accounts page)
- `POST /notifications` - Send notifications

## 🚀 Building & Deploying for Production

### Prerequisites

- Node.js (v18 or higher)
- npm or pnpm
- Access to deployment platform

### Building the App

1. Install dependencies:

```bash
npm install
# or
pnpm install
```

2. Create production environment file `.env.production`:

```env
VITE_API_BASE_URL=https://api.your-domain.com
VITE_S3_BASE_URL=https://your-s3-bucket.s3.region.amazonaws.com
VITE_APP_ENV=production
```

3. Build the application:

```bash
npm run build
# or
pnpm build
```

The built files will be in the `dist` directory.

4. Preview production build locally:

```bash
npm run preview
# or
pnpm preview
```

The preview server will run at `http://localhost:4173`.

### Deployment Options

#### 1. GitHub Pages

1. Configure `vite.config.js`:

```js
export default {
  base: "/your-repo-name/", // If deploying to https://<USERNAME>.github.io/<REPO>/
  // or base: '/' if deploying to custom domain or https://<USERNAME>.github.io
};
```

2. Create GitHub Actions workflow (`.github/workflows/deploy.yml`):

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: ["main"]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: lts/*
          cache: "npm"
      - run: npm ci
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: "./dist"
      - uses: actions/deploy-pages@v4
```

#### 2. Netlify

Option 1 - Netlify CLI:

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy to preview URL
ntl deploy

# Deploy to production
ntl deploy --prod
```

Option 2 - Git Integration:

1. Push code to Git repository
2. Import project in Netlify dashboard
3. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`

#### 3. Vercel

Option 1 - Vercel CLI:

```bash
npm i -g vercel
vercel init vite
cd vite
vercel
```

Option 2 - Git Integration:

1. Push code to Git repository
2. Import project in Vercel dashboard
3. Vercel will automatically detect Vite configuration

#### 4. Firebase

1. Install Firebase tools:

```bash
npm install -g firebase-tools
firebase login
```

2. Create `firebase.json`:

```json
{
  "hosting": {
    "public": "dist",
    "ignore": [],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

3. Create `.firebaserc`:

```json
{
  "projects": {
    "default": "<YOUR_FIREBASE_ID>"
  }
}
```

4. Deploy:

```bash
firebase deploy
```

#### 5. Cloudflare Pages

Option 1 - Wrangler CLI:

```bash
# Install Wrangler
npm install -g wrangler

# Login
wrangler login

# Build
npm run build

# Deploy
npx wrangler pages deploy dist
```

Option 2 - Git Integration:

1. Connect repository in Cloudflare Pages dashboard
2. Configure build settings:
   - Build command: `npm run build`
   - Build output directory: `dist`

### Post-Deployment Verification

1. Verify application loads correctly
2. Test all main features:
   - Authentication
   - User management
   - Communication features
   - API integrations
3. Check for console errors
4. Verify environment variables
5. Test responsive design

### Production Optimizations

The production build includes:

- Minified JavaScript and CSS
- Code splitting and lazy loading
- Asset optimization
- Tree shaking
- Gzip compression (when supported by server)

## 🧪 Development

### Code Style

- TypeScript for type safety
- ESLint for code linting
- Consistent component structure
- Custom hooks for reusable logic

### Component Structure

- Functional components with hooks
- Type-safe props with TypeScript interfaces
- Proper separation of concerns
- Reusable component patterns

## 📱 Responsive Design

The dashboard is fully responsive with:

- Mobile-first approach
- Flexible grid layouts
- Collapsible sidebar on mobile
- Touch-friendly interactive elements

## 🔒 Security Features

- JWT token-based authentication
- Automatic token refresh
- Protected route system
- XSS protection with proper sanitization
- CSRF protection ready

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:

- Create an issue in the repository
- Check the documentation
- Review the code examples

---

Built with ❤️ using React, TypeScript, and Ant Design
