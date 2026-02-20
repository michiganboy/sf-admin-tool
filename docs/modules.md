# Module Packs Architecture

SF-ADMIN-TOOL uses a plugin architecture where modules are external packages that can be installed and uninstalled at runtime.

## Module Structure

A module pack consists of:

1. **`manifest.json`** - Module metadata
2. **`bundle.mjs`** - Module implementation (ES module)

### Manifest Format

```json
{
  "moduleId": "unique-module-id",
  "name": "Display Name",
  "description": "Module description",
  "version": "1.0.0",
  "category": "admin" | "hygiene" | "diagnostics",
  "sectionCategory": "Optional category name",
  "tags": ["tag1", "tag2"]
}
```

### Bundle Format

The `bundle.mjs` file must be an ES module that default-exports a factory function:

```javascript
export default function createModule(sdk) {
  // Use SDK to access host capabilities
  const { React, ModuleDetailsShell, useStartRun, toast } = sdk;
  
  // Define your DetailsPage component
  function DetailsPage({ onBack, onNavigateToRun }) {
    return React.createElement(ModuleDetailsShell, {
      moduleId: "your-module-id",
      moduleName: "Your Module Name",
      description: "Module description",
      onBack,
      onNavigateToRun,
    });
  }
  
  // Return AdminModule object
  return {
    id: "your-module-id",
    name: "Your Module Name",
    description: "Module description",
    category: "admin",
    sectionCategory: "Your Category",
    tags: ["tag1", "tag2"],
    render: {
      DetailsPage,
    },
  };
}
```

## Module Locations

### Default Modules

Default modules ship with the application in:

```
default-modules/
  <moduleId>/
    manifest.json
    bundle.mjs
    (optional assets/)
```

Default modules are not automatically installed. They must be installed via the first-run wizard or Settings page.

### Installed Modules

At runtime, all modules (including default modules) live in:

```
artifacts/modules/
  <moduleId>/
    current/
      manifest.json
      bundle.mjs
      (optional assets/)
```

There is no distinction between "built-in" and "installed" modules at runtime. If a module exists in `artifacts/modules`, it's available.

**Where artifacts live:** `ARTIFACTS_ROOT` defaults to OS app-data (e.g. `%APPDATA%/sf-admin-tool/artifacts` on Windows), so by default runtime data is outside the repo. For local dev or tests you may set `ARTIFACTS_ROOT` to `./artifacts` so installed modules and runs live in the repo. The repo-root `./artifacts/` folder is in `.gitignore` so runtime data there is never committed.

## SDK Contract

Modules receive a `ModuleSdk` object that provides:

- **`React`** - React library
- **`MUI`** - Material-UI components (Button, Card, TextField, etc.)
- **`ModuleDetailsShell`** - Pre-built shell component for module details
- **`ModuleRunForm`** - Pre-built form for starting runs
- **`useStartRun`** - Hook for creating runs
- **`toast`** - Toast notification API (`success`, `error`, `info`)
- **`apiBaseUrl`** - Base URL for API calls (`/api`)

Modules MUST NOT import host code directly. All capabilities are provided via the SDK.

## Adding New Default Modules

To add a new default module:

1. Create a directory under `default-modules/<moduleId>/`
2. Add `manifest.json` with module metadata
3. Create `bundle.mjs` that exports `createModule(sdk) => AdminModule`
4. The module will appear in the catalog and can be installed

### Building Bundles

For simple modules, you can write `bundle.mjs` directly. For complex modules:

1. Write your module source code (TypeScript/JSX)
2. Build it into a single ES module bundle
3. Ensure it imports the SDK from the host (via dynamic import or provided reference)
4. Place the built `bundle.mjs` in `default-modules/<moduleId>/`

## Module Lifecycle

1. **Installation**: Module files are copied from `default-modules/` to `artifacts/modules/<moduleId>/current/`
2. **Loading**: At runtime, the engine loads installed modules by:
   - Fetching `/api/modules/:id/bundle`
   - Dynamically importing the bundle
   - Calling `createModule(hostSdk)` to get the `AdminModule`
3. **Uninstallation**: Module directory is removed from `artifacts/modules/`

## Module Requirements

- Module IDs must be: alphanumeric, dash, underscore only; 1-64 chars
- Bundles must be valid ES modules
- `createModule` must return a valid `AdminModule` object
- Bundle size limit: 5MB
- Manifest size limit: 64KB

## Examples

See `default-modules/permissions/` and `default-modules/connected-apps/` for reference implementations.
