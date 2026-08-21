export function isDevOnlyRequestAllowed(devOnly: boolean, environment: string) {
  return !devOnly || environment === "development";
}
