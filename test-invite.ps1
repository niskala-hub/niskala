# ─── Test Invitation Edge Function ─────────────────────────────────
# Usage: .\test-invite.ps1 -Email "owner@example.com" -Password "yourpassword" -TargetEmail "newadmin@example.com"

param(
  [string]$Email = "faridlan@niskalawear.com",      # GANTI: email owner
  [string]$Password = "",                            # GANTI: password owner
  [string]$TargetEmail = "test-admin@example.com",   # GANTI: email yang akan diundang
  [string]$TargetPassword = "Password123!",           # password default untuk admin baru
  [string]$Role = "admin"
)

$SUPABASE_URL = "https://bixscslbxhiuvtgogqbi.supabase.co"
$ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpeHNjc2xieGhpdXZ0Z29ncWJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwNjc1ODEsImV4cCI6MjA5OTY0MzU4MX0.WFSO4OErX5hsTKWXSchImcG4g7z7PfXY9Gu0eauxY20"
$FUNCTION_URL = "$SUPABASE_URL/functions/v1/create-admin"

if (-not $Password) {
  $Password = Read-Host "Password owner ($Email)"
}

Write-Host "`n[1/3] Login sebagai owner: $Email" -ForegroundColor Cyan

$loginBody = @{ email = $Email; password = $Password } | ConvertTo-Json
try {
  $loginResp = Invoke-RestMethod -Uri "$SUPABASE_URL/auth/v1/token?grant_type=password" `
    -Method POST `
    -Headers @{ "apikey" = $ANON_KEY; "Content-Type" = "application/json" } `
    -Body $loginBody `
    -ErrorAction Stop

  $ACCESS_TOKEN = $loginResp.access_token
  Write-Host "  ✅ Login berhasil. Token: $($ACCESS_TOKEN.Substring(0,30))..." -ForegroundColor Green
} catch {
  $errBody = $_.Exception.Response
  Write-Host "  ❌ Login GAGAL: $_" -ForegroundColor Red
  Write-Host "  Pastikan email dan password owner benar." -ForegroundColor Yellow
  exit 1
}

Write-Host "`n[2/3] Mengirim undangan ke: $TargetEmail (Role: $Role)" -ForegroundColor Cyan

$inviteBody = @{
  action   = "invite"
  email    = $TargetEmail
  password = $TargetPassword
  role     = $Role
} | ConvertTo-Json

try {
  $inviteResp = Invoke-WebRequest -Uri $FUNCTION_URL `
    -Method POST `
    -Headers @{
      "Authorization" = "Bearer $ACCESS_TOKEN"
      "Content-Type"  = "application/json"
      "apikey"        = $ANON_KEY
    } `
    -Body $inviteBody `
    -ErrorAction Stop

  $statusCode = $inviteResp.StatusCode
  $respContent = $inviteResp.Content | ConvertFrom-Json

  Write-Host "  HTTP Status: $statusCode" -ForegroundColor $(if ($statusCode -eq 200) { "Green" } else { "Red" })
  Write-Host "`n  Response:" -ForegroundColor White
  $respContent | Format-List

  if ($respContent.ok -eq $true) {
    Write-Host "  ✅ Fungsi berhasil dipanggil!" -ForegroundColor Green
    Write-Host "  email_sent  : $($respContent.email_sent)" -ForegroundColor $(if ($respContent.email_sent) { "Green" } else { "Red" })
    Write-Host "  email_error : $($respContent.email_error)" -ForegroundColor $(if ($respContent.email_error) { "Red" } else { "Gray" })
    Write-Host "  user_id     : $($respContent.user_id)" -ForegroundColor Cyan
  } else {
    Write-Host "  ❌ Fungsi mengembalikan error: $($respContent.error)" -ForegroundColor Red
  }
} catch {
  $statusCode = $_.Exception.Response.StatusCode.value__
  $errStream = $_.Exception.Response.GetResponseStream()
  $reader = New-Object System.IO.StreamReader($errStream)
  $errBody = $reader.ReadToEnd() | ConvertFrom-Json

  Write-Host "  HTTP Status: $statusCode" -ForegroundColor Red
  Write-Host "  ❌ Error dari Edge Function: $($errBody.error)" -ForegroundColor Red
}

Write-Host "`n[3/3] Cek Supabase Auth (pastikan user terdaftar di auth.users)" -ForegroundColor Cyan
Write-Host "  Buka: https://supabase.com/dashboard/project/bixscslbxhiuvtgogqbi/auth/users" -ForegroundColor White
Write-Host "  Cari email: $TargetEmail`n" -ForegroundColor White
