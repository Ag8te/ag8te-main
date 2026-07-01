import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const gradleFile = path.resolve(scriptDir, "../android/app/capacitor.build.gradle");
const generatedDependency = "    implementation project(':capacitor-geolocation')\n";

const source = await readFile(gradleFile, "utf8");
if (source.includes(generatedDependency)) {
  await writeFile(gradleFile, source.replace(generatedDependency, ""));
  console.log("Configured store-specific Android geolocation dependencies.");
} else {
  console.log("Store-specific Android geolocation dependencies already configured.");
}
