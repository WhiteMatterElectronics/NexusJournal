# AI Agent Instructions & Constraints

This file contains persistent instructions for any AI agent working on this project. These rules are automatically loaded and MUST be followed strictly.

## 1. Technical Reference
Always refer to `DEVELOPER_GUIDE.md` for the full technical specification of the OS architecture, windowing logic, and theming system.

## 2. Critical Constraints (DO NOT MODIFY WITHOUT PERMISSION)

### 2.1 Windowing Logic
- **NEVER** modify the core movement or snapping logic in `src/components/os/Window.tsx` unless explicitly requested to "fix a bug in the windowing logic".
- **NEVER** add CSS `transition-all` to the window container as it breaks pointer-driven dragging.
- **Snapping Threshold**: Must remain at `30px`.
- **Windows Area Container**: Must maintain its `bottom-12` (or equivalent taskbar height offset) in `App.tsx` to ensure snapping alignment.

### 2.2 UI Consistency
- **Theming**: Always use the `globalTheme` ('retro' vs 'glassy') to determine component styling (rounding, borders, etc.).
- **Rounding**: `rounded-sm` for retro, `rounded-2xl` for glassy.
- **Desktop Labels**: Must be single-line, truncated, `9px`, and uppercase.

### 2.3 Taskbar
- Support both `fixed` and `panel` styles as defined in `SettingsContext.tsx`.
- In `panel` mode, the Start button triggers the `Dash` card.

## 3. Communication Rules
- If a request is ambiguous regarding whether it should affect UI or Logic, **ASK FOR CLARIFICATION**.
- Before making large structural changes to `App.tsx`, summarize the plan and wait for approval.
