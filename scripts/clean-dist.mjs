import { rm } from "node:fs/promises";
// Resolve a fixed build-output directory relative to this script, not user input.
await rm(new URL("../dist/", import.meta.url), {
  recursive: true,
  force: true,
});
