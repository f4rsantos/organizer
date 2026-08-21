# Writes keystore.properties with your password. File is git-ignored.
$out = "C:\UA\organizer\android\keystore.properties"
$ks  = "C:\UA\organizer\android\organizer-release.jks"
$kt  = "C:\Program Files\Microsoft\jdk-21.0.10.7-hotspot\bin\keytool.exe"

$sec = Read-Host "Keystore password" -AsSecureString
$pw  = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
         [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))

# verify password before writing
& $kt -list -keystore $ks -storepass $pw -alias organizer > $null 2>&1
if ($LASTEXITCODE -ne 0) { Write-Host "Wrong password or bad alias. Nothing written." -ForegroundColor Red; exit 1 }

@"
storeFile=organizer-release.jks
storePassword=$pw
keyAlias=organizer
keyPassword=$pw
"@ | Out-File -FilePath $out -Encoding ascii -NoNewline

Write-Host "Password verified. Wrote $out" -ForegroundColor Green
