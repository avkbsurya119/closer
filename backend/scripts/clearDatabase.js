import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "../.env") });

const clearDatabase = async () => {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const db = mongoose.connection.db;

    // Get all collections
    const collections = await db.listCollections().toArray();

    console.log("\nDropping collections:");
    for (const collection of collections) {
      await db.dropCollection(collection.name);
      console.log(`  - Dropped: ${collection.name}`);
    }

    console.log("\nDatabase cleared successfully!");
  } catch (error) {
    console.error("Error clearing database:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
    process.exit(0);
  }
};

clearDatabase();
