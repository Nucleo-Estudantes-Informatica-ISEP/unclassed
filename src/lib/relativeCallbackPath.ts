import { z } from "zod";

export const relativeCallbackPath = z.string().refine((value) => {
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return false;
  }
  const origin = "https://unclassed.invalid";
  try {
    const url = new URL(value, origin);
    return url.origin === origin && !url.pathname.startsWith("//");
  } catch {
    return false;
  }
});
