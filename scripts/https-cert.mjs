/**
 * Regenerate the local HTTPS certificate for whatever address this machine has
 * right now.
 *
 * The Wi-Fi address changes between networks, and a certificate that names the
 * old one makes the phone show "Your connection is not private" even though the
 * CA is installed. Running this before `next dev --experimental-https` keeps the
 * cert and the address the phone is told to open in agreement.
 *
 * `npm run dev:https` calls this first. It is safe to run repeatedly.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";

const CERT_DIR = "certs";
const CERT_FILE = path.join(CERT_DIR, "dev-cert.pem");
const KEY_FILE = path.join(CERT_DIR, "dev-key.pem");

function findMkcert() {
  // PATH first (winget adds a shim), then the package folder it installed into.
  try {
    const where = execFileSync("where.exe", ["mkcert"], { encoding: "utf8" });
    const first = where.split(/\r?\n/).map((line) => line.trim()).find(Boolean);
    if (first && existsSync(first)) return first;
  } catch {
    // Not on PATH in this shell yet; fall through to the package folder.
  }

  const wingetPackages = path.join(
    process.env.LOCALAPPDATA ?? "",
    "Microsoft",
    "WinGet",
    "Packages",
  );
  if (!existsSync(wingetPackages)) return null;

  for (const entry of readdirSync(wingetPackages)) {
    if (!entry.toLowerCase().startsWith("filosottile.mkcert")) continue;
    const exe = path.join(wingetPackages, entry, "mkcert.exe");
    if (existsSync(exe)) return exe;
  }
  return null;
}

function lanAddresses() {
  // Every non-loopback IPv4 address on the machine. The Wi-Fi address changes
  // between networks, and this laptop also carries Hyper-V/VirtualBox adapters,
  // so naming them all means whichever one the phone reaches still validates.
  //
  // The address on the default-route interface is printed first, so the "open
  // this on the phone" hint names the real LAN address rather than VirtualBox.
  try {
    const output = execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        [
          "$route = Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue",
          "  | Sort-Object RouteMetric | Select-Object -First 1;",
          "if ($route) {",
          "  (Get-NetIPAddress -AddressFamily IPv4 -InterfaceIndex $route.InterfaceIndex",
          "    -ErrorAction SilentlyContinue | Select-Object -First 1).IPAddress",
          "}",
          "Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |",
          "  Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |",
          "  Select-Object -ExpandProperty IPAddress",
        ].join(""),
      ],
      { encoding: "utf8" },
    );
    const addresses = output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => /^\d+\.\d+\.\d+\.\d+$/.test(line));
    return [...new Set(addresses)];
  } catch {
    return [];
  }
}

const mkcert = findMkcert();
if (!mkcert) {
  console.warn(
    "[https] mkcert not found. Install it with `winget install --id FiloSottile.mkcert -e`.\n" +
      "[https] Continuing with the existing certificate in certs/, if any.",
  );
  process.exit(0);
}

const addresses = lanAddresses();
if (addresses.length === 0) {
  console.warn("[https] Could not detect a LAN address; keeping the existing certificate.");
  process.exit(0);
}

mkdirSync(CERT_DIR, { recursive: true });

const names = [...addresses, "localhost", "127.0.0.1", "::1"];

try {
  execFileSync(mkcert, ["-cert-file", CERT_FILE, "-key-file", KEY_FILE, ...names], {
    stdio: "inherit",
  });
  console.log(`[https] Certificate covers ${names.join(", ")}`);
  console.log(`[https] Open https://${addresses[0]}:3000 on the phone.`);
} catch (error) {
  console.warn(`[https] mkcert failed (${error.message}); keeping the existing certificate.`);
}
