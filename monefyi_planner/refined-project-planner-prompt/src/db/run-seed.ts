import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

async function main() {
  const { seedDatabase } = await import("./seed");
  const result = await seedDatabase();
  console.log(result);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
