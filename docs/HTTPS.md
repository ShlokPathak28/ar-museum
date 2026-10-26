# Local HTTPS (phones, camera, WebXR, VR)

`http://` is not a secure context, and browsers disable three things we need on
anything that is not `https://` or `localhost`:

| Feature | Needs a secure context |
| --- | --- |
| `getUserMedia` (QR scanning at `/scan`) | yes |
| `navigator.xr` / `immersive-ar` (WebXR AR) | yes |
| `DeviceOrientationEvent` (360° VR) | yes |

Without HTTPS, `<model-viewer>` falls back to **Scene Viewer** on Android, which
hands the model to the Google app. With HTTPS it uses **WebXR**, which runs
inside Chrome and does not depend on the Google app at all. WebXR is the path we
want for the demo.

## One-time setup (this machine)

```powershell
winget install --id FiloSottile.mkcert -e
mkcert -install
```

Find the LAN address (ignore `192.168.56.1`, that is a virtual adapter):

```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" }
```

Generate a certificate that covers the LAN address and localhost:

```powershell
mkcert -cert-file certs/dev-cert.pem -key-file certs/dev-key.pem <lan-ip> localhost 127.0.0.1 ::1
```

`certs/` is gitignored — the key never leaves the machine.

You normally do **not** need to run this by hand: `npm run dev:https` runs
`scripts/https-cert.mjs` first, which finds the address that owns the default
route and regenerates the certificate for it. That matters because the Wi-Fi
address changes between networks, and a stale certificate makes the phone show
"Your connection is not private" even when the CA is installed.

## Run

```powershell
npm run dev:https
```

The script prints the address to open, e.g. `https://10.118.43.217:3000`.

`.env` must match the address you are testing from:

```dotenv
NEXT_PUBLIC_SITE_URL="https://<lan-ip>:3000"
BETTER_AUTH_URL="https://<lan-ip>:3000"
DEV_ALLOWED_ORIGINS="<lan-ip>"
```

`DEV_ALLOWED_ORIGINS` is what lets the phone load `/_next/*`. If it is missing,
the page renders but never hydrates and the viewer stays on "Preparing viewer".

## Trust the certificate on the Android phone (once per phone)

1. Open `https://<lan-ip>:3000/dev-ca.crt` in Chrome.
   Chrome will warn about the certificate — **Advanced → Proceed** first.
   The file is the local CA certificate, not a private key.
2. Open **Settings → Security → Encryption & credentials → Install a
   certificate → CA certificate → Install anyway**.
3. Pick the downloaded `dev-ca.crt` (usually in **Downloads**).
4. Reload the site. Chrome should show a normal padlock.

Android requires a screen lock (PIN/pattern) to install a user certificate.

## Verify

Open `/spike/ar` on the phone and check the diagnostics panel:

- **Secure context**: `yes`
- **WebXR immersive-ar**: `supported`
- **canActivateAR**: `true`

Then tap **Place in your room** — the camera should open inside Chrome.

## Troubleshooting

- **"Your connection is not private"** → the CA is not installed, or the
  certificate was generated before the IP changed. Re-run the `mkcert` command
  above and reload.
- **Page loads but the viewer stays on "Preparing viewer"** → `DEV_ALLOWED_ORIGINS`
  is missing the current host; add it and restart.
- **`ERR_CONNECTION_REFUSED` on `http://`** → expected; the dev server is now
  HTTPS only. Use `https://`.
