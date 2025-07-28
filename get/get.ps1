$path = "$env:TEMP\test.bat"
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/baristorunlar/KolayMenu/main/KolayMenu.bat" -OutFile $path
Start-Process "cmd.exe" -ArgumentList "/c `"$path`""
