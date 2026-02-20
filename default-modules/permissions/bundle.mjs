export default function createModule(sdk) {
  const { React, ModuleDetailsShell } = sdk;
  
  function DetailsPage({ onBack, onNavigateToRun }) {
    return React.createElement(ModuleDetailsShell, {
      moduleId: "permissions",
      moduleName: "Permissions",
      description: "Inspect and compare permission sets and profiles.",
      onBack,
      onNavigateToRun,
    });
  }
  
  return {
    id: "permissions",
    name: "Permissions",
    description: "Inspect and compare permission sets and profiles.",
    category: "admin",
    sectionCategory: "Permissions",
    tags: ["profiles", "permission-sets", "audit"],
    render: {
      DetailsPage,
    },
  };
}
