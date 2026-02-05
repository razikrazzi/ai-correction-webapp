# Setup Instructions for Spline 3D Integration

This project now includes TypeScript, Tailwind CSS, and shadcn/ui components with a Spline 3D integration.

## Prerequisites

Make sure you have Node.js installed (v18 or higher recommended).

## Installation Steps

### 1. Install Dependencies

Run the following command in the `client` directory:

```bash
cd client
npm install
```

### 2. Install Required Packages

Install all the necessary dependencies:

```bash
npm install @splinetool/runtime @splinetool/react-spline framer-motion
npm install -D typescript @types/react @types/react-dom @types/node
npm install tailwindcss postcss autoprefixer tailwindcss-animate
npm install clsx tailwind-merge
```

### 3. Project Structure

The project follows shadcn/ui structure:

```
client/
├── src/
│   ├── components/
│   │   └── ui/          # shadcn/ui components (REQUIRED)
│   │       ├── card.tsx
│   │       ├── splite.tsx
│   │       ├── spotlight.tsx
│   │       └── demo.tsx
│   ├── lib/
│   │   └── utils.ts      # Utility functions (cn helper)
│   └── ...
├── components.json       # (Optional, for shadcn CLI)
└── ...
```

### 4. Why `/components/ui` Folder is Important

The `/components/ui` folder is the standard location for shadcn/ui components. This structure:

- **Standardization**: Follows the shadcn/ui convention that tools and developers expect
- **Maintainability**: Makes it easy to add/remove components using shadcn CLI
- **Organization**: Keeps UI components separate from business logic components
- **Reusability**: Components in this folder are designed to be reusable across the app

If you don't have this folder, create it:
```bash
mkdir -p src/components/ui
```

### 5. TypeScript Configuration

The project includes:
- `tsconfig.json` - Main TypeScript config
- `tsconfig.node.json` - Node-specific config
- Path aliases configured (`@/*` → `./src/*`)

### 6. Tailwind CSS Configuration

- `tailwind.config.js` - Tailwind configuration with shadcn theme
- `postcss.config.js` - PostCSS configuration
- `src/styles.css` - Includes Tailwind directives and CSS variables

### 7. Vite Configuration

The `vite.config.ts` includes:
- Path alias resolution for `@/` imports
- React plugin
- API proxy configuration

## Running the Project

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Features

- ✅ TypeScript support
- ✅ Tailwind CSS with shadcn/ui theme
- ✅ Spline 3D integration
- ✅ Framer Motion animations
- ✅ Path aliases (`@/` imports)
- ✅ Modern React with hooks

## Troubleshooting

### TypeScript Errors
If you see TypeScript errors, make sure:
1. All dependencies are installed
2. `tsconfig.json` is in the root of `client/` folder
3. Restart your IDE/editor

### Tailwind Not Working
1. Make sure `tailwind.config.js` is in the `client/` root
2. Check that `@tailwind` directives are in `src/styles.css`
3. Restart the dev server

### Path Alias Issues
1. Verify `vite.config.ts` has the alias configuration
2. Make sure imports use `@/` prefix
3. Restart the dev server

### Spline Component Not Loading
1. Check that `@splinetool/react-spline` is installed
2. Verify the scene URL is accessible
3. Check browser console for errors

## Next Steps

- Customize the Spline scene URL in `src/components/ui/demo.tsx`
- Add more shadcn/ui components as needed
- Extend the Teacher Dashboard with additional features

