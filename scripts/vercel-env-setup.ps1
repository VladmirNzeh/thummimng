# Vercel environment variable setup helper
# Usage: run this script in PowerShell after `vercel login`

param(
  [string]$envScope = 'production'  # production | preview | development
)

if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
  Write-Error "Vercel CLI not found. Install it with `npm i -g vercel` and login with `vercel login`."
  exit 1
}

Write-Host "This will prompt you to add environment variables to Vercel (scope: $envScope)."

# Helper to add an env var interactively
function Add-Env($name) {
  Write-Host "Adding $name (press Enter to skip)"
  $value = Read-Host "Enter value for $name (or leave blank to skip)"
  if ([string]::IsNullOrWhiteSpace($value)) {
    Write-Host "Skipping $name"
  } else {
    vercel env add $name $envScope --yes --value "$value"
  }
}

Add-Env -name "OPENAI_API_KEY"
Add-Env -name "CHROMA_SERVER_URL"
Add-Env -name "OPENAI_MODEL"
Add-Env -name "EMBEDDING_MODEL"
Add-Env -name "CHROMA_COLLECTION"
Add-Env -name "USE_MOCK"

Write-Host "Done. Redeploy your project in the Vercel dashboard or run `vercel --prod`."