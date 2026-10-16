import { cleanE2ECatalog } from "./db";

export default async function globalSetup() {
  await cleanE2ECatalog();
}
