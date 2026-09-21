# Add Vite/Supabase env vars to the linked Vercel project (run after: npx vercel link)
$envFile = Join-Path $PSScriptRoot '..' '.env'
if (-not (Test-Path $envFile)) {
  Write-Error ".env not found at $envFile"
  exit 1
}

$keys = @('VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY')
foreach ($line in Get-Content $envFile) {
  if ($line -match '^\s*#' -or $line -notmatch '=') { continue }
  $name, $value = $line.Split('=', 2)
  $name = $name.Trim()
  if ($keys -notcontains $name) { continue }
  Write-Host "Setting $name on Vercel (production)..."
  $value | npx vercel@latest env add $name production --force
}

Write-Host "Done. Redeploy with: npm run deploy"
