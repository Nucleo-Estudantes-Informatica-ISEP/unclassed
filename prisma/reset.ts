import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function resetData() {
  console.log("🗑️  Resetting database data...");

  try {
    // Delete all matches first (due to foreign key constraints)
    console.log("Deleting all matches...");
    await prisma.match.deleteMany({});
    
    // Delete all swap requests
    console.log("Deleting all single swap requests...");
    await prisma.singleSwapRequest.deleteMany({});
    
    console.log("Deleting all bundle swap requests...");
    await prisma.bundleSwapRequest.deleteMany({});
    
    // Delete all users
    console.log("Deleting all users...");
    await prisma.user.deleteMany({});
    
    console.log("✅ Database reset complete!");
    console.log("📚 Subjects and classes have been preserved");
    console.log("🎯 You can now create your own test data");
    
  } catch (error) {
    console.error("❌ Error during reset:", error);
    throw error;
  }
}

resetData()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
