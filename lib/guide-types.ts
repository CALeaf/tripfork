import type { TripBranch, TripInput } from "./trip-types";

export type PublishedGuide = {
  id: string;
  title: string;
  destination: string;
  author: string;
  tripDate: string;
  duration: string;
  actualCost: string;
  summary: string;
  story: string;
  bestFor: string;
  highlights: string[];
  tips: string[];
  sourceUrl?: string;
  branch: TripBranch;
  forkInput: TripInput;
  publishedAt: string;
  editorVerified?: boolean;
};

export type GuideDraft = Omit<PublishedGuide, "id" | "publishedAt" | "editorVerified" | "branch" | "forkInput"> & {
  branchId: string;
};
