export type MatchClass = {
  id: string;
  name: string;
  year: number;
};

export type MatchUser = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  sharePhoneOnMatch?: boolean | null;
};

export type MatchParticipant = {
  userId: string;
  fromClass: string | MatchClass;
  toClass: string | MatchClass;
  requestId: string;
  requestType: "single" | "bundle";
  satisfactionScore: number;
  status?: "pending" | "accepted" | "rejected" | "completed";
  user?: MatchUser;
};

export type MatchDto = {
  id: string;
  matchType: "SINGLE" | "BUNDLE";
  swapPattern: "DIRECT" | "THREE_WAY" | "MULTI_WAY";
  status:
    | "PROPOSED"
    | "ACCEPTED"
    | "REJECTED"
    | "COMPLETED"
    | "PROVISIONAL"
    | "UPGRADED";
  isProvisional: boolean;
  provisionalUntil: string | null;
  satisfactionScore: number | null;
  participants: MatchParticipant[];
  singleSwapRequestIds: string[];
  bundleSwapRequestIds: string[];
  createdAt: string;
  updatedAt: string;
  subject?: {
    id: string;
    code: string;
    name: string;
    year: number;
    semester: number;
  };
};
