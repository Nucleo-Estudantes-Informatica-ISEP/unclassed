export type PartitionKeyInput =
  | { ticketType: "SPECIFIC_CLASS"; subjectId: string }
  | { ticketType: "ALL_CLASSES"; year: number };

export function buildPartitionKey(input: PartitionKeyInput): string {
  if (input.ticketType === "SPECIFIC_CLASS") {
    if (!input.subjectId) {
      throw new Error("A subject id is required for a subject partition");
    }

    return `subject-${input.subjectId}`;
  }

  if (!Number.isInteger(input.year) || input.year < 1) {
    throw new Error("A positive integer year is required for a year partition");
  }

  return `year-${input.year}`;
}
