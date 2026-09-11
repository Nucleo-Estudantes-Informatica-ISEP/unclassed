import { auth } from "@/auth";
import {
  resolveSessionUser,
  type SessionUser,
} from "@/application/services/userService";

const getServerSession = async (): Promise<SessionUser | null> => {
  const session = await auth();
  return resolveSessionUser(session);
};

export type { SessionUser };
export default getServerSession;
