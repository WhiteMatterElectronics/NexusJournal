# OS Platform Technical Specification & Developer Guide

This document provides a structured technical overview of the OS architecture. It is designed to be parsed by both human developers and AI agents to ensure consistency and rapid application development.

---

## 1. Core Architecture Overview

The OS is a Single Page Application (SPA) built with **React 18**, **Vite**, **Tailwind CSS**, and **Framer Motion**. It simulates a desktop environment with window management, a taskbar, and a persistent settings system.

### 1.1 Key Files & Responsibilities
- `src/App.tsx`: The "Kernel". Manages global state for windows, desktop icons, and the application registry.
- `src/components/os/Window.tsx`: The "Window Manager". Handles dragging, resizing, snapping, and window state (min/max/close).
- `src/components/os/Taskbar.tsx`: The "Shell". Renders the taskbar, start menu, and handles window switching.
- `src/contexts/SettingsContext.tsx`: The "Registry". Manages persistent theme settings, user profiles, and desktop icon visibility.
- `src/components/apps/`: Directory for all application-specific logic.

---

## 2. Windowing System (Critical Logic)

The windowing system is built on a custom pointer-event-driven movement logic combined with `motion/react` for state transitions.

### 2.1 Snapping Rules
- **Threshold**: `30px` from any edge.
- **Top Edge**: Triggers `onMaximize`.
- **Left Edge**: Snaps to `x: 0, width: screenWidth / 2, height: screenHeight - taskbarHeight`.
- **Right Edge**: Snaps to `x: screenWidth / 2, width: screenWidth / 2, height: screenHeight - taskbarHeight`.

**Implementation Example (from `Window.tsx`):**
```tsx
const handlePointerUp = (upEvent: PointerEvent) => {
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  
  if (upEvent.clientY < 30) {
    if (!isMaximized) onMaximize();
  } else if (upEvent.clientX < 30) {
    if (isMaximized) onMaximize();
    setBounds({ x: 0, y: 0, width: screenWidth / 2, height: screenHeight - taskbarHeight });
  } else if (upEvent.clientX > screenWidth - 30) {
    if (isMaximized) onMaximize();
    setBounds({ x: screenWidth / 2, y: 0, width: screenWidth / 2, height: screenHeight - taskbarHeight });
  }
};
```

### 2.2 Animation Standards
- **Duration**: `0.15s` for all window state changes.
- **Constraint**: The "Windows Area" container in `App.tsx` MUST have its `bottom` offset dynamically calculated based on `theme.taskbarStyle` (48px for fixed, 60px for panel) to account for the taskbar height.

**Transition Config:**
```tsx
<motion.div
  animate={windowState}
  transition={{ duration: 0.15, display: { delay: isVisible ? 0 : 0.15 } }}
  className={cn(
    "flex flex-col bg-hw-black border shadow-2xl overflow-hidden",
    // CRITICAL: No transition-all here as it breaks dragging
    isMaximized ? "border-none" : cn("border-hw-border", globalTheme === 'glassy' ? "rounded-2xl" : "rounded-sm")
  )}
>
```

---

## 3. Theming & UI Consistency

The OS supports two primary visual styles: **Retro Terminal** and **Modern Glassy**.

### 3.1 Global Theme Rules
| Element | Retro Terminal (`retro`) | Modern Glassy (`glassy`) |
| :--- | :--- | :--- |
| **Rounding** | `rounded-sm` (2px) | `rounded-2xl` (16px) |
| **Borders** | `border-hw-blue/30` | `border-white/10` |
| **Background** | Solid `bg-hw-black` | `bg-hw-black/60` + `backdrop-blur-xl` |

**Conditional Styling Example:**
```tsx
const { theme } = useSettings();
const isGlassy = theme.globalTheme === 'glassy';

return (
  <div className={cn(
    "p-4 border transition-all",
    isGlassy ? "rounded-2xl bg-white/5 backdrop-blur-md border-white/10" : "rounded-sm bg-black border-hw-blue/30"
  )}>
    {/* Content */}
  </div>
);
```

---

## 4. Desktop Grid System

The desktop uses a dynamic grid where icons snap to cells on release.

- **Cell Size**: `100px x 100px`.
- **Snapping Logic**:
```tsx
const snapToGrid = (x: number, y: number) => {
  const col = Math.round(x / cellWidth);
  const row = Math.round(y / cellHeight);
  return {
    x: col * cellWidth,
    y: row * cellHeight
  };
};
```

---

## 5. Application Development Workflow

### 5.1 Registration Pattern

**1. Define ID (`src/App.tsx`):**
```tsx
type AppView = 'console' | 'settings' | 'my-new-app';
```

**2. Registry Entry (`src/App.tsx`):**
```tsx
const apps = [
  { 
    id: 'my-new-app', 
    label: 'My App', 
    icon: LayoutIcon, 
    component: MyAppComponent, 
    defaultSize: { width: 600, height: 400 } 
  },
];
```

**3. Default Visibility (`src/contexts/SettingsContext.tsx`):**
```tsx
const defaultTheme: ThemeConfig = {
  desktopIcons: {
    'console': true,
    'my-new-app': true, // Enable by default
  },
};
```

---

## 6. Accessing Global State

Always use the `useSettings` hook to ensure your app matches the OS environment.

```tsx
import { useSettings } from '../../contexts/SettingsContext';

export const MyAppComponent = () => {
  const { theme, profile } = useSettings();
  
  return (
    <div className="h-full flex flex-col" style={{ color: theme.mainColor }}>
      <header className="p-2 border-b border-current opacity-50 uppercase text-[10px] font-bold">
        {profile.name}'s Workspace
      </header>
      <main className="flex-1 p-4 custom-scrollbar overflow-y-auto">
        {/* App Content */}
      </main>
    </div>
  );
};
```

---

## 7. Constraints & Anti-Patterns

- **NO `window.alert`**: Use custom modals.
- **NO `transition-all` on Windows**: It creates lag during dragging.
- **Z-Index**: Taskbar is `z-[9999]`. Windows use dynamic `zIndex` from state.
- **Labels**: Desktop labels MUST be single-line:
```tsx
<span className="text-[9px] font-bold uppercase truncate block w-full text-center">
  {app.label}
</span>
```
