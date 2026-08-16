export const mongoIndexSpecifications = [
  {
    collection: "SingleSwapRequest",
    fields: ["userId", "subjectId"],
    index: {
      key: { userId: 1, subjectId: 1 },
      name: "uniq_active_single_request_per_user_subject",
      unique: true,
      partialFilterExpression: { status: "ACTIVE" },
    },
  },
  {
    collection: "BundleSwapRequest",
    fields: ["userId", "currentClassId"],
    index: {
      key: { userId: 1, currentClassId: 1 },
      name: "uniq_active_bundle_request_per_user_class",
      unique: true,
      partialFilterExpression: { status: "ACTIVE" },
    },
  },
];
