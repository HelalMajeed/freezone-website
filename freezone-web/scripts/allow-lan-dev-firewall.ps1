# Opens inbound TCP 3000 (Vite) and 4000 (API) for local dev so other PCs on the LAN can connect.
# Run in an elevated PowerShell: Right-click PowerShell -> Run as administrator, then:
#   Set-Location "...\freezone-web"; .\scripts\allow-lan-dev-firewall.ps1

$ErrorActionPreference = "Stop"
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
        [Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Write-Host "Run this script as Administrator (elevated PowerShell)." -ForegroundColor Yellow
  exit 1
}

function Add-RuleIfMissing {
  param([string]$Name, [int]$Port)
  $existing = Get-NetFirewallRule -DisplayName $Name -ErrorAction SilentlyContinue
  if ($existing) {
    Write-Host "Rule already exists: $Name"
    return
  }
  New-NetFirewallRule -DisplayName $Name -Direction Inbound -Action Allow -Protocol TCP -LocalPort $Port | Out-Null
  Write-Host "Added: $Name (TCP $Port)"
}

Add-RuleIfMissing "Freezone dev — Vite (TCP 3000)" 3000
Add-RuleIfMissing "Freezone dev — API (TCP 4000)" 4000
Write-Host "Done. Restart npm run dev if it was already running."
