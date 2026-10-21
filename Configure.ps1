Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$taskEnvPath = Join-Path $PSScriptRoot '.env.local'
$taskSettings = @{}
if (Test-Path -LiteralPath $taskEnvPath) {
    foreach ($taskLine in [IO.File]::ReadAllLines($taskEnvPath)) {
        if ($taskLine -match '^([A-Z_]+)=(.*)$') { $taskSettings[$Matches[1]] = $Matches[2] }
    }
}
function Read-PrivateValue([string]$Prompt) {
    $taskSecure = Read-Host $Prompt -AsSecureString
    $taskPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($taskSecure)
    try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($taskPointer) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($taskPointer) }
}
function Set-PrivateSetting([string]$Key, [string]$Prompt) {
    $taskValue = Read-PrivateValue $Prompt
    if ($taskValue) {
        if ($taskValue -notmatch '^[A-Za-z0-9_-]{10,512}$') { throw 'Unexpected credential format. Copy only the credential value, without quotes or spaces.' }
        $taskSettings[$Key] = $taskValue
    }
}
Write-Host ''
Write-Host 'FairDeal AI - private local setup' -ForegroundColor Green
Write-Host 'Values are hidden. Enter keeps existing settings. Nothing is sent from this script.'
Write-Host 'Use Sandbox app credentials only. Never use your PayPal login password here.'
Write-Host ''
Set-PrivateSetting 'PAYPAL_CLIENT_ID' 'PayPal SANDBOX Client ID (Enter to skip)'
Set-PrivateSetting 'PAYPAL_CLIENT_SECRET' 'PayPal SANDBOX Client Secret (Enter to skip)'
Write-Host ''
Write-Host 'Gemini is optional. Demo mode works without a key.'
Set-PrivateSetting 'GEMINI_API_KEY' 'Gemini API key (Enter to skip)'
if ($taskSettings.ContainsKey('GEMINI_API_KEY') -and $taskSettings['GEMINI_API_KEY']) {
    Write-Host 'Check in Google AI Studio that this key belongs to a FREE TIER project with NO billing account.'
    $taskConfirmation = Read-Host 'Type FREE only if you have confirmed this; otherwise press Enter to keep live AI disabled'
    $taskSettings['GEMINI_FREE_TIER_CONFIRMED'] = if ($taskConfirmation -ceq 'FREE') { 'true' } else { 'false' }
} else { $taskSettings['GEMINI_FREE_TIER_CONFIRMED'] = 'false' }
$taskOutput = @('# Private local configuration. Do not share this file.', 'APP_URL=http://localhost:3000')
foreach ($taskKey in @('PAYPAL_CLIENT_ID','PAYPAL_CLIENT_SECRET','GEMINI_API_KEY','GEMINI_FREE_TIER_CONFIRMED')) {
    $taskSetting = if ($taskSettings.ContainsKey($taskKey)) { $taskSettings[$taskKey] } else { '' }
    $taskOutput += "$taskKey=$taskSetting"
}
[IO.File]::WriteAllLines($taskEnvPath, $taskOutput, [Text.UTF8Encoding]::new($false))
$taskSettings.Clear()
Write-Host ''
Write-Host 'Saved privately to .env.local. Stop the app with Ctrl+C and run START.cmd again.' -ForegroundColor Green
Write-Host 'Do not share .env.local, the data folder, or a screenshot of your keys.'
