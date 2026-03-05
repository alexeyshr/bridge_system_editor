param(
    [Parameter(Mandatory = $true)]
    [string]$Slug
)

$ErrorActionPreference = "Stop"

$date = Get-Date -Format "yyyy-MM-dd"
$root = Split-Path -Parent $PSScriptRoot
$specRoot = Join-Path $root "docs\\specs"
$templateRoot = Join-Path $specRoot "_templates"
$target = Join-Path $specRoot "$date-$Slug"

if (Test-Path $target) {
    Write-Error "Spec folder already exists: $target"
}

New-Item -Path $target -ItemType Directory | Out-Null
Copy-Item (Join-Path $templateRoot "spec.md") (Join-Path $target "spec.md")
Copy-Item (Join-Path $templateRoot "plan.md") (Join-Path $target "plan.md")
Copy-Item (Join-Path $templateRoot "tasks.md") (Join-Path $target "tasks.md")

Write-Output "Created spec skeleton: $target"
