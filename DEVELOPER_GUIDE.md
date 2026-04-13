# Developer Guide: Creating Custom Apps for the OS Platform

Welcome to the Developer Guide! This tutorial will walk you through the process of creating and integrating your own custom application into this web-based OS platform.

## Overview

The OS platform is built with **React**, **TypeScript**, and **Tailwind CSS**. 
Applications are essentially React components that are registered in the main `App.tsx` file. The OS handles window management (dragging, resizing, minimizing, maximizing), taskbar integration, and desktop icon placement automatically.

To create a new app, you need to:
1. Create your app component.
2. Register the app's ID in the global types.
3. Add the app to the OS registry in `App.tsx`.
4. (Optional) Add it to the default desktop icons in `SettingsContext.tsx`.

---

## Step 1: Create Your App Component

Create a new file in the `src/components/apps/` directory. For example, let's create a simple "Notes" app: `src/components/apps/NotesApp.tsx`.

```tsx
import React, { useState } from 'react';

export const NotesApp: React.FC = () => {
  const [note, setNote] = useState('');

  return (
    <div className="flex flex-col h-full bg-hw-black p-4 text-hw-blue">
      <h2 className="text-sm font-bold uppercase tracking-widest mb-4 border-b border-hw-blue/20 pb-2">
        My Notes
      </h2>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Type your notes here..."
        className="flex-1 bg-hw-blue/5 border border-hw-blue/20 p-2 text-xs text-hw-blue outline-none focus:border-hw-blue resize-none custom-scrollbar"
      />
    </div>
  );
};
```

**Styling Tips:**
* Use `bg-hw-black` for the main background.
* Use `text-hw-blue` for the primary text color.
* Use `border-hw-blue/20` for subtle borders.
* Add `custom-scrollbar` to scrollable areas to match the OS theme.

---

## Step 2: Register the App ID

Open `src/App.tsx` and locate the `AppView` type definition. Add your new app's ID to this union type.

```tsx
// In src/App.tsx
type AppView = 'console' | 'eeprom' | 'rfid' | 'binary' | 'cyphonator' | 'flasher' | 'admin' | 'settings' | 'notes'; 
// Added 'notes' here ^
```

---

## Step 3: Add the App to the OS Registry

Still in `src/App.tsx`, locate the `apps` array. This array defines the metadata for all applications installed on the OS.

You will need an icon for your app. The OS uses `lucide-react` for icons.

```tsx
import { FileText } from 'lucide-react'; // Import your icon
import { NotesApp } from './components/apps/NotesApp'; // Import your component

// Inside the App component, find the `apps` array:
const apps = [
  // ... existing apps ...
  { 
    id: 'notes', 
    label: 'Notes', 
    icon: FileText, 
    component: NotesApp,
    defaultSize: { width: 400, height: 500 } // Set your preferred default window size
  },
];
```

---

## Step 4: Enable the Desktop Icon (Optional)

If you want your app to appear on the desktop by default, you need to update the default settings.

Open `src/contexts/SettingsContext.tsx` and locate the `defaultTheme` object. Add your app to the `desktopIcons` record:

```tsx
const defaultTheme: ThemeConfig = {
  // ... other settings ...
  desktopIcons: {
    'console': true,
    'eeprom': true,
    'rfid': true,
    'binary': true,
    'cyphonator': true,
    'flasher': true,
    'admin': true,
    'settings': true,
    'notes': true // Added your app here
  },
  iconPositions: {}
};
```

*Note: If you've already run the app, your previous settings are saved in `localStorage`. You may need to clear your browser's local storage or manually enable the icon in the OS Settings app under "Preferences" -> "Desktop Icons".*

---

## Advanced Integration

### Accessing Global State
Your app can access the global OS settings (like the current theme colors or user profile) using the `useSettings` hook.

```tsx
import { useSettings } from '../../contexts/SettingsContext';

export const MyCustomApp: React.FC = () => {
  const { theme, profile } = useSettings();
  
  return (
    <div style={{ color: theme.mainColor }}>
      Welcome, {profile.name}!
    </div>
  );
};
```

### Window Management
The OS automatically wraps your component in a `Window` component. Your component will automatically stretch to fill the window's content area. 
If you need scrollable content, ensure your root `div` has `h-full` and `flex flex-col`, and the scrollable container has `flex-1 overflow-y-auto`.

## Conclusion

That's it! You've successfully created and integrated a custom application into the OS. The platform is designed to be highly modular, so you can build anything from simple utilities to complex tools using standard React patterns.
