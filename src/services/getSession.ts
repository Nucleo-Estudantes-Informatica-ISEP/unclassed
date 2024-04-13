import { User } from "@prisma/client";

const getSession = async () => {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/auth/session`,
    { cache: "no-store" }
  );
  if (response.status !== 200) return null;
  const data = await response.json();
  return data as User;
};

export default getSession;
