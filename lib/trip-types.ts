export type DecisionStatus = "pending" | "positive" | "negative";

export type TimelineDay = {
  day: string;
  title: string;
  detail: string;
};

export type TripBranch = {
  id: string;
  name: string;
  subtitle: string;
  days: number;
  cost: number;
  driveHours: number;
  fatigue: number;
  experienceScore: number;
  flexibility: "Low" | "Medium" | "High";
  summary: string;
  changes: string[];
  tradeoffs: string[];
  timeline: TimelineDay[];
};

export type Recommendation = {
  branchId: string;
  title: string;
  rationale: string;
  actions: string[];
};

export type ChecklistItem = {
  id: string;
  label: string;
  dueDate: string;
  kind: "book" | "cancel" | "check" | "decide";
  done: boolean;
};

export type TripDocument = {
  id: string;
  title: string;
  destination: string;
  dateSummary: string;
  travelers: string;
  budget: string;
  sourceNotes: string;
  decision: {
    name: string;
    question: string;
    decisionDate: string;
    status: DecisionStatus;
    positiveLabel: string;
    negativeLabel: string;
  };
  recommendations: Record<DecisionStatus, Recommendation>;
  branches: TripBranch[];
  checklist: ChecklistItem[];
  committedBranchId?: string;
  updatedAt: string;
};

export type TripInput = {
  title: string;
  destination: string;
  dates: string;
  travelers: string;
  budget: string;
  notes: string;
  mustHaves: string;
  fixedBookings: string;
  uncertainty: string;
  decisionDate: string;
  constraints: string;
};

export const branchAccents = ["#ff7048", "#254e3d", "#4e68d8"];

export function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}
