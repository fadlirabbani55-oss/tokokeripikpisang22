$ErrorActionPreference = 'Stop'

# Baca konfigurasi dari .env.local (tidak menyimpan password di source code)
$rootDir = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $rootDir '.env.local'

if (!(Test-Path $envPath)) {
    Write-Error "File .env.local tidak ditemukan di $envPath. Salin dari .env.example lalu isi OWNER_EMAIL, OWNER_PASSWORD, SUPABASE_URL, dan SUPABASE_SECRET_KEY."
    exit 1
}

$envVars = @{}
foreach ($line in Get-Content $envPath) {
    $trimmed = $line.Trim()
    if ([string]::IsNullOrWhiteSpace($trimmed) -or $trimmed.StartsWith('#')) { continue }
    $idx = $trimmed.IndexOf('=')
    if ($idx -gt 0) {
        $k = $trimmed.Substring(0, $idx).Trim()
        $v = $trimmed.Substring($idx + 1).Trim().Trim('"').Trim("'")
        $envVars[$k] = $v
    }
}

$sbUrl = $envVars['SUPABASE_URL']
$sbSecret = $envVars['SUPABASE_SECRET_KEY']
$ownerEmail = $envVars['OWNER_EMAIL']
$ownerPassword = $envVars['OWNER_PASSWORD']

if (!$sbUrl -or !$sbSecret -or !$ownerEmail -or !$ownerPassword) {
    Write-Error "Pastikan SUPABASE_URL, SUPABASE_SECRET_KEY, OWNER_EMAIL, dan OWNER_PASSWORD sudah terisi di .env.local."
    exit 1
}

$headers = @{
    'apikey'        = $sbSecret
    'Authorization' = "Bearer $sbSecret"
    'Content-Type'  = 'application/json'
}

$userAgent = 'supabase-admin-cli/1.0'

Write-Host "Memeriksa akun Owner di Supabase Authentication..." -ForegroundColor Cyan

# 1. Cek apakah email Owner sudah terdaftar (mencegah duplikat)
$listResp = Invoke-RestMethod -Uri "$sbUrl/auth/v1/admin/users?page=1&per_page=100" -Method Get -Headers $headers -UserAgent $userAgent
$existingUser = $null
if ($listResp.users) {
    $existingUser = $listResp.users | Where-Object { $_.email -and $_.email.ToLower() -eq $ownerEmail.ToLower() } | Select-Object -First 1
}

if ($existingUser) {
    Write-Host "Akun Owner sudah terdaftar (ID: $($existingUser.id)). Memperbarui password & status konfirmasi..." -ForegroundColor Yellow
    $updateBody = @{
        password      = $ownerPassword
        email_confirm = $true
        user_metadata = @{
            full_name = 'Owner Keripik Pisang Salee'
            role      = 'admin'
        }
    } | ConvertTo-Json -Depth 4
    $null = Invoke-RestMethod -Uri "$sbUrl/auth/v1/admin/users/$($existingUser.id)" -Method Put -Headers $headers -UserAgent $userAgent -Body $updateBody
    Write-Host "Berhasil memperbarui akun Owner tanpa membuat duplikat!" -ForegroundColor Green
} else {
    Write-Host "Mendaftarkan akun Owner baru di Supabase Authentication..." -ForegroundColor Cyan
    $createBody = @{
        email         = $ownerEmail
        password      = $ownerPassword
        email_confirm = $true
        user_metadata = @{
            full_name = 'Owner Keripik Pisang Salee'
            role      = 'admin'
        }
    } | ConvertTo-Json -Depth 4
    $created = Invoke-RestMethod -Uri "$sbUrl/auth/v1/admin/users" -Method Post -Headers $headers -UserAgent $userAgent -Body $createBody
    Write-Host "Akun Owner berhasil dibuat di Supabase Authentication (ID: $($created.id))!" -ForegroundColor Green
}
