export function navigateToAuthNeiProfile() {
  // This API route redirects to the external AuthNEI account page.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.href = "/api/auth/profile-url";
}