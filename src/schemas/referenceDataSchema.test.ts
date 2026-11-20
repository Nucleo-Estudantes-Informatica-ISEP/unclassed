import { describe, expect, it } from "vitest";

import {
  createClassSchema,
  createSubjectSchema,
  updateClassSchema,
  updateSubjectSchema,
} from "./referenceDataSchema";

describe("referenceDataSchema", () => {
  describe("subjects", () => {
    it("accepts a valid subject", () => {
      expect(createSubjectSchema.safeParse({
        code: "PROG",
        name: "Programming",
        year: 1,
        semester: 1,
      }).success).toBe(true);
    });

    it.each([0, 4, 5, 6])("rejects an invalid academic year: %i", (year) => {
      expect(createSubjectSchema.safeParse({
        code: "PROG", name: "Programming", year, semester: 1,
      }).success).toBe(false);
    });

    it.each([0, 3])("rejects an invalid semester: %i", (semester) => {
      expect(createSubjectSchema.safeParse({
        code: "PROG", name: "Programming", year: 1, semester,
      }).success).toBe(false);
    });

    it("rejects an update without fields", () => {
      expect(updateSubjectSchema.safeParse({ id: "subject-1" }).success).toBe(false);
    });

    it("rejects an invalid subject year update", () => {
      expect(updateSubjectSchema.safeParse({ id: "subject-1", year: 4 }).success).toBe(false);
    });
  });

  describe("classes", () => {
    it.each([
      ["1DA", 1],
      ["1DB-E", 1],
      ["2DA", 2],
      ["3 Special Group", 3],
    ])("accepts a class name matching its year: %s", (name, year) => {
      expect(createClassSchema.safeParse({ name, year }).success).toBe(true);
    });

    it.each([
      ["2DA", 1],
      ["3NB", 2],
      ["Special Group", 2],
      ["4DA", 3],
    ])("rejects a class name that does not match its year: %s", (name, year) => {
      expect(createClassSchema.safeParse({ name, year }).success).toBe(false);
    });

    it.each(["", "  "])('rejects an empty class name: "%s"', (name) => {
      expect(createClassSchema.safeParse({ name, year: 1 }).success).toBe(false);
    });

    it.each([0, 4])("rejects an invalid academic year: %i", (year) => {
      expect(createClassSchema.safeParse({ name: "1DA", year }).success).toBe(false);
    });

    it("rejects an update without fields", () => {
      expect(updateClassSchema.safeParse({ id: "class-1" }).success).toBe(false);
    });

    it("accepts updating the name and year together", () => {
      expect(updateClassSchema.safeParse({
        id: "class-1", name: "2DA", year: 2,
      }).success).toBe(true);
    });

    it("allows a partial update to be validated against the stored year", () => {
      expect(updateClassSchema.safeParse({
        id: "class-1", name: "2DA",
      }).success).toBe(true);
    });

    it("accepts a partial update with a free-form name", () => {
      expect(updateClassSchema.safeParse({
        id: "class-1", name: "2 Evening Group",
      }).success).toBe(true);
    });

    it("rejects a partial update with an empty name", () => {
      expect(updateClassSchema.safeParse({
        id: "class-1", name: "  ",
      }).success).toBe(false);
    });
  });
});
