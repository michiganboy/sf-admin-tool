export default function createModule(sdk) {
  const { React, ModuleDetailsShell } = sdk;
  
  function DetailsPage({ onBack, onNavigateToRun }) {
    return React.createElement(ModuleDetailsShell, {
      moduleId: "connected-apps",
      moduleName: "Connected Apps",
      description: "Manage connected app definitions and OAuth clients.",
      onBack,
      onNavigateToRun,
    });
  }
  
  return {
    id: "connected-apps",
    name: "Connected Apps",
    description: "Manage connected app definitions and OAuth clients.",
    category: "admin",
    sectionCategory: "Connected Apps",
    tags: ["oauth", "jwt", "audit"],
    render: {
      DetailsPage,
    },
  };
}
