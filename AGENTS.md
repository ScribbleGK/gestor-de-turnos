# AGENTS.md - Gestor de Turnos

Guidelines for agentic coding agents working on this codebase.

## Project Overview
- **Frontend**: React 19 + Vite + Tailwind CSS 4
- **Database**: Supabase (auth, employees, invoices, logs, attendances)

## Build/Lint/Test Commands

```bash
npm run dev      # Start Vite dev server
npm run build    # Production build
npm run lint     # Run ESLint
npm run preview  # Preview production build
```

### Running a Single Test
No test framework configured. To add tests, install Vitest or Jest.

### ESLint Configuration
- `@eslint/js` (recommended rules)
- `eslint-plugin-react-hooks` (React hooks rules)
- `eslint-plugin-react-refresh` (HMR-safe code checks)
- Custom rule: `no-unused-vars` allows variables starting with `A-Z_` (for React components)

## Code Style Guidelines

### General
- **Language**: Spanish for comments, user-facing messages, and documentation
- **No comments in code** unless explicitly required
- **No TODO comments** - complete tasks or create issues

### File Organization

```
src/
├── App.jsx              # Root component
├── main.jsx             # Entry point
├── supabaseClient.js    # Supabase client
├── apiConfig.js         # (unused, to be removed)
├── components/          # Reusable UI components
├── context/             # React Context (AuthContext)
├── hooks/               # Custom React hooks (useAuth)
├── icons/               # Icon components
├── utils/               # Utility functions
└── views/               # Page-level components
    ├── LoginView.jsx
    ├── Dashboard.jsx
    ├── TableView.jsx
    ├── InvoicesView.jsx
    ├── AdminPanelView.jsx
    └── admin/           # Admin-only views
```

### Naming Conventions
- **Components**: PascalCase (`LoginView.jsx`, `EmployeesManagerView.jsx`)
- **Files**: camelCase for utilities/hooks, PascalCase for components
- **Variables/functions**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Database**: snake_case (Supabase/PostgreSQL convention)

### Imports

```jsx
import { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { supabase } from './supabaseClient';
import LoginView from './views/LoginView';
```
- Use `.js` extension for local imports
- Order: external → internal modules → relative paths

### React Patterns

```jsx
const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
};
export default Modal;
```

```jsx
// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const value = { currentUser, login, logout };
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
```

### Error Handling

```javascript
try {
  const storedUser = localStorage.getItem('currentUser');
  if (storedUser) setCurrentUser(JSON.parse(storedUser));
} catch (error) {
  console.error("Error al leer localStorage", error); 
  localStorage.removeItem('currentUser');
} finally {
  setLoading(false);
}
```

- Always handle Supabase errors: `if (error) console.error(error.message)`
- Use Spanish error messages for user-facing errors

### Tailwind CSS
- Use utility classes for all styling (Tailwind 4)
- Use semantic class names when possible

### Supabase
- All database operations use `@supabase/supabase-js` client
- Use parameterized queries with `.eq()`, `.select()`, `.insert()`, `.update()`, `.delete()`
- Handle async operations with `try/catch`

### Environment Variables
- Never commit `.env` files
- Use `import.meta.env.VITE_*` for frontend variables
- Provide `.env.example` for required variables

### Security
- Never log sensitive data (passwords, PINs)
- Remove sensitive data before storing in localStorage:
  ```javascript
  const userToStore = { ...userData, pin: undefined };
  ```
- Validate all user inputs

### Deprecated (to be removed)
- `src/apiConfig.js` - unused, references removed Express backend

## Cursor/Copilot Rules
No existing `.cursor/rules/`, `.cursorrules`, or `.github/copilot-instructions.md` files.
