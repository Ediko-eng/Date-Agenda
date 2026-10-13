# Rebuild the precompiled Tailwind CSS for each page.
# Run from the project root:  powershell -ExecutionPolicy Bypass -File build\build.ps1
# Requires Node.js (npx). Tailwind is fetched/cached via npx; nothing is installed into this folder.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Push-Location $root
try {
  $tw = "tailwindcss@3.4.17"
  Write-Host "Building tailwind.css (index)..."       -ForegroundColor Cyan
  npx --yes $tw -c build/tailwind.config.index.js   -i build/input.css -o tailwind.css          --minify
  Write-Host "Building tailwind-admin.css (admin)..." -ForegroundColor Cyan
  npx --yes $tw -c build/tailwind.config.admin.js   -i build/input.css -o tailwind-admin.css    --minify
  Write-Host "Building tailwind-account.css (account)..." -ForegroundColor Cyan
  npx --yes $tw -c build/tailwind.config.account.js -i build/input.css -o tailwind-account.css  --minify
  Write-Host "Done. If you changed classes in an .html/.js file, re-run this script and bump the ?v= in the <link> tag." -ForegroundColor Green
}
finally { Pop-Location }
