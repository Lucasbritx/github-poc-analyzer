const baseUrl = process.env.APP_URL || "http://localhost:3000";

const response = await fetch(baseUrl);
if (!response.ok) {
  throw new Error(`Expected ${baseUrl} to return 200, got ${response.status}.`);
}

const html = await response.text();
const assets = [...html.matchAll(/["'](\/_next\/static\/[^"']+)/g)]
  .map((match) => match[1].replace(/\\$/, ""))
  .filter((value, index, all) => all.indexOf(value) === index);

if (!assets.length) {
  throw new Error("No Next.js static assets were found in the homepage HTML.");
}

const failures = [];
for (const asset of assets) {
  const assetResponse = await fetch(new URL(asset, baseUrl));
  if (!assetResponse.ok) {
    failures.push(`${asset} -> ${assetResponse.status}`);
  }
}

if (failures.length) {
  throw new Error(`Next.js static assets failed:\n${failures.join("\n")}`);
}

console.log(`Checked ${assets.length} Next.js static assets from ${baseUrl}.`);
