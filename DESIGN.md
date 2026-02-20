# Engine + Module Packs Architecture Design

## Overview

Refactor SF-ADMIN-TOOL from a monolithic module system (modules in `src/modules/`) to a plugin architecture where:
- **Engine**: Core application code in `src/`
- **Modules**: External packages loaded from `artifacts/modules/<moduleId>/current/`
- **Default Modules**: Ship in `default-modules/<moduleId>/` and install identically to user-installed modules
- **No distinction**: All modules are equal at runtime; if present in `artifacts/modules`, they're modules

## Hard Constraints

- Modules do NOT live in `src/` at all
- Runtime modules live only in `artifacts/modules/<moduleId>/current/`
- Default modules ship in `default-modules/<moduleId>/` and install into `artifacts/modules` the same way as any other module
- No built-in vs installed distinction at runtime
- Module contract: `bundle.mjs` default-exports `createModule(sdk) => AdminModule`
- First-run Option 1: curated default catalog only (no upload on first run)
- Keep engine modular; avoid giant files

---

## 1. Server File/Module Plan (`apps/server/src/`)

### Structure

```
apps/server/src/
├── index.ts                    # Main server entry (existing, minimal changes)
├── routes/
│   ├── modules/
│   │   ├── catalog.ts          # GET /api/module-catalog
│   │   ├── install.ts          # POST /api/module-catalog/install
│   │   ├── list.ts             # GET /api/modules
│   │   ├── bundle.ts           # GET /api/modules/:moduleId/bundle
│   │   └── uninstall.ts        # DELETE /api/modules/:moduleId
│   └── index.ts                # Route registration
├── modules/
│   ├── catalog.ts              # Catalog discovery (default-modules + installed)
│   ├── installer.ts            # Module installation logic
│   ├── loader.ts               # Module metadata loading
│   └── validator.ts            # ModuleId sanitization, path validation
└── paths.ts                    # Centralized path constants
```

### Route Module: `routes/modules/catalog.ts`

**Endpoint**: `GET /api/module-catalog`

**Response**: Array of catalog entries:
```typescript
{
  moduleId: string;
  name: string;
  description: string;
  version: string;
  installed: boolean;  // true if in artifacts/modules/<moduleId>/current/
  source: "default" | "installed";  // where catalog entry came from
  manifest?: { ... };  // if installed, include manifest.json
}
```

**Logic**:
- Scan `default-modules/` for `manifest.json` files
- Scan `artifacts/modules/` for installed modules
- Merge and deduplicate by `moduleId` (installed takes precedence)
- Return sorted list

### Route Module: `routes/modules/install.ts`

**Endpoint**: `POST /api/module-catalog/install`

**Body**: `{ moduleId: string }`

**Logic**:
1. Validate `moduleId` (sanitize, prevent traversal)
2. Locate source: `default-modules/<moduleId>/` or error 404
3. Validate source structure: `manifest.json` + `bundle.mjs` must exist
4. Atomic install:
   - Create `artifacts/modules/<moduleId>/` if missing
   - Copy to `artifacts/modules/<moduleId>/current/` (overwrite if exists)
   - Write `manifest.json` + `bundle.mjs`
5. Return 201 with module metadata

**Safety**:
- Sanitize `moduleId`: alphanumeric, dash, underscore only; max 64 chars
- Prevent path traversal: reject `..`, `/`, `\`
- Validate file sizes: `bundle.mjs` max 5MB, `manifest.json` max 64KB
- Atomic-ish: write to temp dir, then rename (or copy with error handling)

### Route Module: `routes/modules/list.ts`

**Endpoint**: `GET /api/modules`

**Response**: Array of installed modules:
```typescript
{
  moduleId: string;
  name: string;
  description: string;
  version: string;
  installedAt: string;  // ISO timestamp
  manifest: { ... };
}
```

**Logic**:
- Scan `artifacts/modules/` for `current/manifest.json`
- Parse and return metadata
- Sort by `moduleId`

### Route Module: `routes/modules/bundle.ts`

**Endpoint**: `GET /api/modules/:moduleId/bundle`

**Response**: Serves `artifacts/modules/<moduleId>/current/bundle.mjs` as `application/javascript`

**Safety**:
- Validate `moduleId` (sanitize, prevent traversal)
- Verify file exists, return 404 if not
- Set appropriate headers (Content-Type, Cache-Control)

### Route Module: `routes/modules/uninstall.ts`

**Endpoint**: `DELETE /api/modules/:moduleId`

**Logic**:
1. Validate `moduleId` (sanitize, prevent traversal)
2. Verify module exists in `artifacts/modules/<moduleId>/current/`
3. Remove `artifacts/modules/<moduleId>/` directory (recursive)
4. Return 204 on success, 404 if not found

**Safety**:
- Prevent deletion of non-module paths
- Validate path is within `artifacts/modules/` boundary

### Supporting Modules

**`modules/validator.ts`**:
- `sanitizeModuleId(id: string): string | null` - Returns sanitized ID or null if invalid
- `validateModulePath(path: string): boolean` - Ensures path is within allowed boundaries
- `isValidModuleId(id: string): boolean` - Checks format: alphanumeric, dash, underscore, 1-64 chars

**`modules/catalog.ts`**:
- `discoverDefaultModules(): Promise<CatalogEntry[]>` - Scans `default-modules/`
- `discoverInstalledModules(): Promise<CatalogEntry[]>` - Scans `artifacts/modules/`
- `mergeCatalogEntries(defaults: CatalogEntry[], installed: CatalogEntry[]): CatalogEntry[]` - Merges with deduplication

**`modules/installer.ts`**:
- `installModule(moduleId: string, sourcePath: string, targetPath: string): Promise<void>` - Atomic copy operation
- `validateModuleStructure(sourcePath: string): Promise<boolean>` - Checks for `manifest.json` + `bundle.mjs`

**`modules/loader.ts`**:
- `loadModuleManifest(modulePath: string): Promise<Manifest>` - Reads and parses `manifest.json`
- `getModuleMetadata(moduleId: string): Promise<ModuleMetadata | null>` - Returns installed module info

**`paths.ts`**:
- Centralized constants: `DEFAULT_MODULES_ROOT`, `ARTIFACTS_MODULES_ROOT`, etc.
- Uses same logic as existing `ARTIFACTS_ROOT` pattern

---

## 2. Web File/Module Plan (`src/`)

### Structure

```
src/
├── api/
│   └── modulesClient.ts        # API client for module endpoints
├── moduleEngine/
│   ├── sdk.ts                  # ModuleSdk interface + createHostSdk
│   ├── runtimeLoader.ts        # Dynamic bundle loading + createModule execution
│   ├── useAllModules.ts        # Hook: load all modules, return AdminModule[]
│   └── shared/                 # Moved from src/modules/_shared/
│       ├── ModuleDetailsShell.tsx
│       └── useStartRun.ts
├── pages/
│   ├── ModulesPage.tsx         # Updated: use useAllModules, remove registry
│   ├── SettingsPage.tsx        # Updated: modules tab uses modulesClient
│   └── FirstRunWizard.tsx      # New: catalog selection + install
├── App.tsx                     # Updated: check first-run, show wizard if needed
└── modules/                    # DEPRECATED: remove after migration
    └── ...
```

### API Client: `api/modulesClient.ts`

```typescript
export interface CatalogEntry {
  moduleId: string;
  name: string;
  description: string;
  version: string;
  installed: boolean;
  source: "default" | "installed";
  manifest?: Manifest;
}

export interface InstalledModule {
  moduleId: string;
  name: string;
  description: string;
  version: string;
  installedAt: string;
  manifest: Manifest;
}

// Functions:
- getCatalog(): Promise<CatalogEntry[]>
- installModule(moduleId: string): Promise<InstalledModule>
- listModules(): Promise<InstalledModule[]>
- getModuleBundleUrl(moduleId: string): string  // Returns /api/modules/:id/bundle
- uninstallModule(moduleId: string): Promise<void>
```

### SDK Contract: `moduleEngine/sdk.ts`

```typescript
export interface ModuleSdk {
  // Host-provided capabilities
  // (Define based on what modules need - likely org access, toast, navigation, etc.)
}

export interface HostSdkOptions {
  // Configuration for SDK creation
}

export function createHostSdk(options: HostSdkOptions): ModuleSdk {
  // Returns SDK instance with host capabilities
}
```

**Module Contract**:
```typescript
export interface AdminModule {
  id: string;
  name: string;
  description: string;
  category: "admin" | "hygiene" | "diagnostics";
  sectionCategory?: string;
  tags?: string[];
  render: {
    DetailsPage: ComponentType<{
      onBack: () => void;
      onNavigateToRun?: (runId: string) => void;
    }>;
  };
}

export type CreateModuleFunction = (sdk: ModuleSdk) => AdminModule;
```

### Runtime Loader: `moduleEngine/runtimeLoader.ts`

**`loadModuleBundle(moduleId: string): Promise<AdminModule>`**:
1. Fetch `/api/modules/:moduleId/bundle` (returns `bundle.mjs`)
2. Execute bundle in isolated context (or use dynamic import with URL)
3. Extract default export (should be `createModule` function)
4. Call `createModule(hostSdk)` to get `AdminModule`
5. Validate returned `AdminModule` structure
6. Return module

**Implementation notes**:
- Use `import()` with blob URL or fetch + eval (prefer import for CSP compliance)
- Handle errors: network failures, invalid bundles, missing exports, invalid module structure
- Cache loaded modules per session (Map<moduleId, AdminModule>)

### Hook: `moduleEngine/useAllModules.ts`

```typescript
export function useAllModules(): {
  modules: AdminModule[];
  loading: boolean;
  error: Error | null;
}
```

**Logic**:
1. On mount, fetch `/api/modules` (list installed)
2. For each installed module, call `loadModuleBundle(moduleId)`
3. Filter by enabled state (existing localStorage logic)
4. Return combined array, loading state, errors

**Dependencies**:
- Uses `modulesClient.listModules()`
- Uses `runtimeLoader.loadModuleBundle()`
- Respects existing `getEnabledIds()` / `setEnabledIds()` from registry (keep for compatibility)

### Shared Code Migration: `moduleEngine/shared/`

Move from `src/modules/_shared/`:
- `ModuleDetailsShell.tsx` → `moduleEngine/shared/ModuleDetailsShell.tsx`
- `useStartRun.ts` → `moduleEngine/shared/useStartRun.ts`

Update imports across codebase.

### Pages Updates

**`ModulesPage.tsx`**:
- Replace `getModules()` from registry with `useAllModules()`
- Remove registry import
- Keep existing UI logic (search, filters, favorites, etc.)

**`SettingsPage.tsx`** (modules tab):
- Replace registry usage with `modulesClient.listModules()`
- Add install/uninstall UI:
  - Show catalog entries with install button if not installed
  - Show installed modules with uninstall button
  - Handle install/uninstall actions via `modulesClient`
- Keep existing enable/disable toggle logic (uses localStorage, compatible)

**`App.tsx`**:
- Add first-run check: `localStorage.getItem('firstRunComplete') === null`
- If first run, show `FirstRunWizard` instead of main app
- After wizard completion, set `firstRunComplete = 'true'` and show main app

### First-Run Wizard: `pages/FirstRunWizard.tsx`

**UI Flow**:
1. Welcome screen: "Welcome to SF Admin Tool"
2. Catalog selection:
   - Show default modules from catalog (filter `source === "default"`)
   - Checkboxes to select modules to install
   - "Select All" / "Select None" buttons
   - "Continue" button
3. Installation:
   - Show progress: "Installing module X..."
   - Call `modulesClient.installModule()` for each selected module
   - Handle errors gracefully (show which failed, allow retry)
4. Completion:
   - "Setup complete! You can install more modules later in Settings."
   - "Get Started" button → sets `firstRunComplete` and navigates to dashboard

**State Management**:
- Track selected module IDs
- Track installation progress
- Handle errors per-module

---

## 3. Default Module Packs

### Structure

```
default-modules/
├── permissions/
│   ├── manifest.json
│   └── bundle.mjs
└── connected-apps/
    ├── manifest.json
    └── bundle.mjs
```

### Manifest Format: `manifest.json`

```json
{
  "moduleId": "permissions",
  "name": "Permissions",
  "description": "Inspect and compare permission sets and profiles.",
  "version": "1.0.0",
  "category": "admin",
  "sectionCategory": "Permissions",
  "tags": ["profiles", "permission-sets", "audit"]
}
```

### Bundle Format: `bundle.mjs`

```javascript
import { createHostSdk } from '/src/moduleEngine/sdk.js';

export default function createModule(sdk) {
  // Module implementation
  // Import React components, use SDK, return AdminModule
  
  return {
    id: "permissions",
    name: "Permissions",
    description: "Inspect and compare permission sets and profiles.",
    category: "admin",
    sectionCategory: "Permissions",
    tags: ["profiles", "permission-sets", "audit"],
    render: {
      DetailsPage: DetailsPageComponent
    }
  };
}
```

**Note**: Bundles are ES modules. They can import from:
- Host SDK (`/src/moduleEngine/sdk.js` - exposed via Vite alias or static serve)
- React, MUI (provided by host, available globally or via import)
- Their own code (bundled into `bundle.mjs`)

**Build Strategy**:
- Option A: Manual bundles (write `bundle.mjs` directly, import host SDK)
- Option B: Build step (source in `default-modules/<id>/src/`, build to `bundle.mjs`)
- Start with Option A for simplicity; migrate to B if needed

### Module Content

**`default-modules/permissions/`**:
- `manifest.json`: Metadata for permissions module
- `bundle.mjs`: Contains `createModule` that returns AdminModule with `DetailsPage` using `ModuleDetailsShell` (imported from host SDK or bundled)

**`default-modules/connected-apps/`**:
- `manifest.json`: Metadata for connected-apps module
- `bundle.mjs`: Contains `createModule` that returns AdminModule with `DetailsPage` using `ModuleDetailsShell`

**Migration Strategy**:
- Extract current `src/modules/permissions/module.tsx` logic into `bundle.mjs`
- Extract current `src/modules/connected-apps/module.tsx` logic into `bundle.mjs`
- Ensure `ModuleDetailsShell` is accessible (via SDK or static import)

---

## 4. Verification Plan

### Server Checks

1. **Module Catalog Endpoint**:
   - `GET /api/module-catalog` returns default modules + installed modules
   - Installed modules show `installed: true`
   - Default modules show `installed: false` if not installed

2. **Module Install**:
   - `POST /api/module-catalog/install` with valid `moduleId` installs from `default-modules/`
   - Module appears in `artifacts/modules/<moduleId>/current/` with `manifest.json` + `bundle.mjs`
   - Invalid `moduleId` (traversal, invalid chars) returns 400
   - Non-existent `moduleId` returns 404
   - File size limits enforced (5MB bundle, 64KB manifest)

3. **Module List**:
   - `GET /api/modules` returns only installed modules
   - Includes metadata from `manifest.json`

4. **Bundle Serve**:
   - `GET /api/modules/:moduleId/bundle` returns `bundle.mjs` with correct Content-Type
   - Non-existent module returns 404
   - Invalid `moduleId` returns 400

5. **Module Uninstall**:
   - `DELETE /api/modules/:moduleId` removes module directory
   - Module no longer appears in `/api/modules`
   - Non-existent module returns 404

### Web Checks

1. **First-Run Flow**:
   - Fresh install (no localStorage) shows `FirstRunWizard`
   - Catalog shows default modules
   - Selecting modules and continuing installs them
   - After completion, main app loads
   - `firstRunComplete` flag prevents wizard on subsequent loads

2. **Module Loading**:
   - `useAllModules()` loads all installed modules
   - Modules appear in `ModulesPage`
   - Module details pages render correctly
   - Enabled/disabled state persists (localStorage)

3. **Settings Modules Tab**:
   - Shows installed modules with uninstall option
   - Shows uninstalled default modules with install option
   - Install/uninstall actions work correctly
   - Enable/disable toggles work (existing functionality)

4. **Module Runtime**:
   - `bundle.mjs` executes correctly
   - `createModule(sdk)` returns valid `AdminModule`
   - SDK provides expected capabilities
   - Module components render without errors

5. **Migration**:
   - Old `src/modules/` code removed
   - Registry imports replaced with `useAllModules()`
   - Shared code moved to `moduleEngine/shared/`
   - No broken imports or references

### Integration Checks

1. **End-to-End**:
   - Install default module → appears in ModulesPage → can run → appears in Runs
   - Uninstall module → disappears from ModulesPage
   - Reinstall module → works correctly

2. **Error Handling**:
   - Network failures during install show user-friendly errors
   - Invalid bundles show error messages
   - Missing modules handled gracefully (404, not crash)

3. **Performance**:
   - Module bundles load efficiently (caching, lazy loading)
   - No significant slowdown from dynamic loading
   - First-run wizard completes in reasonable time

---

## Migration Path

1. **Phase 1: Server Infrastructure**
   - Create route modules and supporting code
   - Implement catalog, install, list, bundle, uninstall endpoints
   - Add default-modules structure with manifests

2. **Phase 2: Web Infrastructure**
   - Create `modulesClient.ts`
   - Create `moduleEngine/sdk.ts` and `runtimeLoader.ts`
   - Create `useAllModules` hook
   - Move shared code to `moduleEngine/shared/`

3. **Phase 3: Default Modules**
   - Create `default-modules/permissions/` and `default-modules/connected-apps/`
   - Extract module logic into `bundle.mjs` files
   - Test installation and loading

4. **Phase 4: UI Integration**
   - Update `ModulesPage` to use `useAllModules`
   - Update `SettingsPage` modules tab
   - Create `FirstRunWizard`
   - Update `App.tsx` for first-run check

5. **Phase 5: Cleanup**
   - Remove `src/modules/` directory (except shared migration)
   - Remove registry code
   - Update all imports
   - Verify no broken references

---

## Open Questions / Decisions Needed

1. **SDK Surface**: What capabilities should `ModuleSdk` provide? (org access, toast, navigation, storage, etc.)
2. **Bundle Build**: Manual `bundle.mjs` or build step? (Start manual, migrate if needed)
3. **Module Dependencies**: Can modules import host code? (Yes, via SDK or static imports)
4. **Caching**: Cache loaded modules in memory? (Yes, per session)
5. **Error Recovery**: Retry failed installs? (Yes, in wizard)
6. **Module Updates**: How to handle updates? (Future: version check, reinstall)
