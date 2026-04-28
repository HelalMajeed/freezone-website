# إيقاف أي خادم على المنفذ 3000 ثم تنظيف الكاش وتشغيل dev (عند Internal Server Error أو ENOENT)
$ErrorActionPreference = "SilentlyContinue"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

try {
  $conns = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
  foreach ($c in $conns) {
    $procId = $c.OwningProcess
    if ($procId -gt 0) {
      Write-Host "[dev-restart] إيقاف العملية $procId (منفذ 3000)"
      Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
  }
} catch {
  Write-Host "[dev-restart] تعذّر قراءة المنفذ — تابع التنظيف والتشغيل يدوياً إن لزم"
}

npm run clean
npm run dev
