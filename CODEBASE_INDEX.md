# CrossNotes - Codebase Index

**Project**: Vite + React + TypeScript + Shadcn UI
**Build Tool**: Vite
**Package Manager**: Bun
**Testing**: Vitest
**Generated**: January 30, 2026

---

## 📋 Project Overview

CrossNotes is a modern note-taking application built with React, TypeScript, and Shadcn UI components. It features authentication, real-time editing, and a responsive design with light/dark theme support.

### Key Technologies
- **Frontend Framework**: React 18+ (TypeScript)
- **Build Tool**: Vite
- **UI Component Library**: Shadcn/ui (Radix UI based)
- **Styling**: Tailwind CSS
- **State Management**: React Query (TanStack Query)
- **Form Handling**: React Hook Form
- **Backend**: Firebase
- **Editor**: @uiw/react-md-editor
- **Icons**: Lucide React

---

## 📁 Directory Structure

```
src/
├── pages/                    # Route pages
│   ├── Index.tsx            # Main dashboard (home page)
│   ├── AuthPage.tsx         # Authentication page
│   └── NotFound.tsx         # 404 page
│
├── components/              # React components
│   ├── Editor.tsx           # Main editor component
│   ├── Sidebar.tsx          # Left sidebar with note list
│   ├── NavLink.tsx          # Navigation link component
│   ├── ThemeToggle.tsx      # Theme switcher (light/dark)
│   └── ui/                  # Shadcn/ui components (30+ components)
│
├── hooks/                   # Custom React hooks
│   ├── useAuth.tsx          # Authentication logic & context
│   ├── useNotes.tsx         # Notes management logic
│   ├── useTheme.tsx         # Theme context provider
│   ├── use-toast.ts         # Toast notifications hook
│   └── use-mobile.tsx       # Mobile detection hook
│
├── lib/                     # Utility functions & services
│   ├── firebase.ts          # Firebase configuration & services
│   ├── deepseek.ts          # DeepSeek API integration
│   ├── debounce.ts          # Debounce utility
│   └── utils.ts             # General utilities
│
├── test/                    # Test files
│   ├── example.test.ts      # Example tests
│   └── setup.ts             # Vitest setup
│
├── App.tsx                  # Root app component with routing
├── main.tsx                 # Application entry point
├── index.css                # Global styles
└── vite-env.d.ts            # Vite environment types
```

---

## 🧩 Component Architecture

### Layout Structure
```
App.tsx (Root)
├── QueryClientProvider (React Query)
├── ThemeProvider (Light/Dark mode)
├── AuthProvider (Authentication context)
├── TooltipProvider (Shadcn tooltip)
├── BrowserRouter (React Router v6)
│   └── Routes
│       ├── / → Index.tsx
│       │   ├── AuthPage (if not authenticated)
│       │   └── Main Layout (if authenticated)
│       │       ├── Sidebar
│       │       └── Editor
│       └── /* → NotFound.tsx
└── UI Providers (Toaster, Sonner)
```

### Core Components

#### **Pages**
- **Index.tsx** - Main page with authentication checks, sidebar & editor layout
- **AuthPage.tsx** - Authentication/login interface
- **NotFound.tsx** - 404 error page

#### **Components**
- **Editor.tsx** - Main markdown editor component with note editing
- **Sidebar.tsx** - Left sidebar showing note list, note selection
- **NavLink.tsx** - Styled navigation link wrapper
- **ThemeToggle.tsx** - Light/dark mode toggle button

#### **UI Components** (Shadcn/ui - Auto-generated)
- Accordion, Alert, Alert Dialog, Aspect Ratio
- Avatar, Badge, Breadcrumb, Button
- Calendar, Card, Carousel, Chart
- Checkbox, Collapsible, Command, Context Menu
- Dialog, Drawer, Dropdown Menu, Form
- Hover Card, Input OTP, Input, Label
- Menubar, Navigation Menu, Pagination, Popover
- Progress, Radio Group, Resizable, Scroll Area
- Select, Separator, Sheet, Sidebar
- Skeleton, Slider, Switch, Table, Tabs
- Textarea, Toast, Toaster, Toggle, Toggle Group, Tooltip

---

## 🎣 Custom Hooks

### **useAuth.tsx**
**Purpose**: Authentication context and logic
**Exports**:
- `AuthProvider` - Context provider component
- `useAuth()` - Hook to access auth state
**Features**: User authentication, configuration checks, login/logout

### **useNotes.tsx**
**Purpose**: Note management logic and state
**Features**: Fetch, create, update, delete notes; loading state
**Integrations**: Firebase backend

### **useTheme.tsx**
**Purpose**: Theme context provider
**Exports**: Theme switching between light and dark modes
**Storage**: Persists theme preference

### **use-toast.ts**
**Purpose**: Toast notification trigger hook
**Provider**: Sonner toast library

### **use-mobile.tsx**
**Purpose**: Responsive design - detect mobile screens
**Returns**: Boolean indicating if viewing on mobile device

---

## 🛠 Utilities & Services

### **lib/firebase.ts**
- Firebase configuration and initialization
- Authentication services
- Database operations for notes
- User profile management

### **lib/deepseek.ts**
- DeepSeek AI API integration
- AI-powered features for note processing/generation

### **lib/debounce.ts**
- Debounce utility for input optimization
- Used for search and auto-save functionality

### **lib/utils.ts**
- General utility functions
- Class name utilities (cn function for Tailwind)
- Type helpers

---

## 📦 Key Dependencies

### Core
- `react@18.x` - UI library
- `react-dom@18.x` - DOM rendering
- `react-router-dom@6.x` - Routing
- `typescript@5.x` - Type safety

### UI & Styling
- `@radix-ui/*` - Unstyled component primitives
- `tailwindcss` - Utility-first CSS
- `shadcn/ui` - Pre-built components (via components.json)
- `class-variance-authority` - Component variants
- `clsx` - Conditional CSS classes
- `lucide-react` - Icon library

### State & Data
- `@tanstack/react-query@5.x` - Server state management
- `firebase` - Backend services
- `@hookform/resolvers` - Form validation resolvers

### Editor & Content
- `@uiw/react-md-editor@4.x` - Markdown editor
- `date-fns@3.x` - Date utilities

### Dev Tools
- `vite` - Build tool
- `vitest` - Testing framework
- `eslint` - Code linting
- `postcss` - CSS processing
- `autoprefixer` - CSS vendor prefixes

---

## 🚀 Available Scripts

```bash
npm run dev           # Start Vite dev server (http://localhost:5173)
npm run build         # Build for production
npm run build:dev     # Build in development mode
npm run lint          # Run ESLint
npm run preview       # Preview production build locally
npm run test          # Run Vitest once
npm run test:watch    # Run Vitest in watch mode
```

---

## 🔄 Data Flow

### Authentication Flow
```
App.tsx → AuthProvider (useAuth)
  ├── Check Firebase auth status
  ├── Load user configuration
  └── Redirect to AuthPage if needed
```

### Notes Management Flow
```
Index.tsx → useNotes hook
  ├── Fetch notes from Firebase
  ├── Sidebar displays note list
  ├── On selection → Editor loads note
  └── Editor updates note via Firebase
```

### Theme Management Flow
```
App.tsx → ThemeProvider (useTheme)
  └── ThemeToggle.tsx → Toggle between light/dark
```

---

## ⚙️ Configuration Files

- **vite.config.ts** - Vite build configuration
- **vitest.config.ts** - Vitest testing setup
- **tsconfig.json** - TypeScript compiler options
- **tailwind.config.ts** - Tailwind CSS configuration
- **postcss.config.js** - PostCSS plugins
- **eslint.config.js** - ESLint rules
- **components.json** - Shadcn/ui configuration

---

## 📱 Responsive Design

- **Mobile Detection**: `use-mobile.tsx` hook for responsive behavior
- **Mobile Sidebar**: Toggle sidebar open/close on mobile
- **Tailwind CSS**: Utility-first responsive classes
- **Shadcn Components**: Built-in responsive design

---

## 🔐 Security & Authentication

- **Firebase Authentication**: Email/password based
- **User Configuration**: Stored in Firebase
- **Protected Routes**: Index page checks authentication status
- **Token Management**: Handled by Firebase SDK

---

## 🧪 Testing

- **Framework**: Vitest
- **Test Location**: `src/test/`
- **Example Test**: `example.test.ts`
- **Setup**: `setup.ts` for test configuration

---

## 📝 Notes on Project Structure

1. **Component Pattern**: Each major feature is a separate component
2. **Hook Pattern**: Business logic isolated in custom hooks
3. **Context API**: Used for global state (Auth, Theme)
4. **Service Layer**: Firebase and API calls in `lib/`
5. **Type Safety**: Full TypeScript throughout
6. **UI Library**: Shadcn/ui provides consistent, accessible components

---

## 🎯 Common Development Tasks

### Adding a New Note Feature
1. Extend `useNotes.tsx` hook
2. Update `Sidebar.tsx` to display new property
3. Update `Editor.tsx` to edit new property
4. Add Firebase logic in `lib/firebase.ts`

### Adding a New Page
1. Create file in `src/pages/`
2. Add route in `App.tsx`
3. Import necessary hooks and components

### Adding a UI Component
1. Use Shadcn CLI or copy from `shadcn-ui` library
2. Place in `src/components/ui/`
3. Import in desired components

### Styling Changes
1. Use Tailwind CSS classes
2. Create Tailwind @layer blocks in `src/index.css`
3. Use `cn()` utility from `lib/utils.ts` for conditional classes

---

## 🔗 Important Files to Know

| File | Purpose |
|------|---------|
| `src/App.tsx` | Root app, routing, providers |
| `src/pages/Index.tsx` | Main dashboard page |
| `src/hooks/useAuth.tsx` | Authentication context |
| `src/hooks/useNotes.tsx` | Notes state management |
| `src/lib/firebase.ts` | Firebase integration |
| `src/components/Editor.tsx` | Note editor component |
| `src/components/Sidebar.tsx` | Notes list & navigation |
| `tailwind.config.ts` | Tailwind customization |
| `vite.config.ts` | Build configuration |

---

## 📚 Learning Resources

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Shadcn/ui Components](https://ui.shadcn.com/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [React Query Docs](https://tanstack.com/query/latest)

---

**Last Updated**: January 30, 2026
