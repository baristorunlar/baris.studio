# Geçici klasöre .bat dosyasını kaydet
$path = "$env:TEMP\KolayMenu.bat"

# BAT dosyasını GitHub'dan indir
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/baristorunlar/KolayMenu/main/KolayMenu.bat" -OutFile $path

# Komut istemcisinde çalıştır
Start-Process "cmd.exe" -ArgumentList "/c `"$path`""
