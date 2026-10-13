param(
  [string]$Root = "C:\wamp64\www\date-agenda"
)
function Esc([string]$s) {
  $sb = New-Object System.Text.StringBuilder
  foreach ($ch in $s.ToCharArray()) {
    if ("$ch" -match '[A-Za-z0-9_-]') { [void]$sb.Append($ch) }
    else { [void]$sb.Append('\'); [void]$sb.Append($ch) }
  }
  return $sb.ToString()
}
function Get-ClassTokens([string[]]$files) {
  $tokens = New-Object System.Collections.Generic.HashSet[string]
  foreach ($f in $files) {
    $p = Join-Path $Root $f
    if (-not (Test-Path -LiteralPath $p)) { continue }
    $text = Get-Content -Raw -LiteralPath $p
    foreach ($m in [regex]::Matches($text, 'class="([^"]*)"')) {
      $val = [regex]::Replace($m.Groups[1].Value, '\$\{[^}]*\}', ' ')
      foreach ($t in ($val -split '\s+')) { if ($t) { [void]$tokens.Add($t) } }
    }
  }
  return $tokens
}
$pages = @(
  @{ name = "index";  css = "tailwind.css";         files = @("index.html","script.js","simple-db.js") },
  @{ name = "admin";  css = "tailwind-admin.css";   files = @("admin.html","admin.js","simple-db.js") },
  @{ name = "account";css = "tailwind-account.css"; files = @("account.html","account.js","simple-db.js") }
)
$custom = @(
  "glass","glass-card","glass-card-elevated","hidden-app","tab-content","sidebar-btn","sidebar-active",
  "nav-indicator","stat-card","stat-card-active","input-field","btn-primary","delete-btn","table-container",
  "romance-btn","romance-btn-primary","romance-btn-secondary","no-escape-btn","heart-open-btn",
  "envelope-overlay","envelope-container","closed-envelope","open-animation","envelope-front","envelope-flap",
  "envelope-body","wax-seal","letter-card","hidden-letter","letter-content","romance-icon","letter-title",
  "letter-question","button-pair","letter-footnote","fade-in","lightbox-overlay","lightbox-content",
  "lightbox-caption","close-lightbox","lightbox-love-message","confetti","invite-gradient","loading-overlay",
  "loading-box","loading-heart","loading-spinner","loading-text","shake","delete-user-btn","delete-login-btn",
  "display","sidebar","main"
)
foreach ($pg in $pages) {
  $css = Get-Content -Raw -LiteralPath (Join-Path $Root $pg.css)
  $tokens = Get-ClassTokens $pg.files
  $miss = @()
  foreach ($t in $tokens) {
    if ($custom -contains $t) { continue }
    $needle = "." + (Esc $t)
    if (-not $css.Contains($needle)) { $miss += $t }
  }
  "== {0}: {1} tokens, {2} not found in {3} ==" -f $pg.name, $tokens.Count, $miss.Count, $pg.css
  if ($miss.Count) { ($miss | Sort-Object) -join "  " }
}
