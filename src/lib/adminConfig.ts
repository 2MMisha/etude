// Config for the hidden /admin/ content panel — see README section
// "Editing content: the admin panel" for full documentation.
//
// Important: this password is a UI lock, not the real access-control
// boundary. This is a static site with no server, so the only thing that
// actually grants write access is the GitHub personal access token the admin
// enters in the panel (stored solely in their own browser's localStorage).
// The password just keeps the hidden URL from being usable by someone who
// merely stumbles onto it — it ships inside the public JS bundle like any
// client-side check, so treat it as a deterrent, not a secret.
//
// To change the password: run
//   node scripts/hash-admin-password.mjs "your new password"
// and paste the printed hash below.
export const ADMIN_PASSWORD_SHA256 =
  '82fb6a9c3550de9e896a2725bffc27a329dd69204f0214d87c840013c0d425cd'; // current password: Etude#Dance2026

// Branch the admin panel commits to. Matches the branch GitHub Pages deploys
// from (see .github/workflows/deploy.yml) — pushing here triggers a rebuild.
export const ADMIN_BRANCH = 'main';
