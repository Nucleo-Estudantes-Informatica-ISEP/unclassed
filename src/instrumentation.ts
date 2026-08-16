export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { initializeApplication } = await import("@/lib/startup");
  initializeApplication();
}
