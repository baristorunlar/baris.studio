$path = "$env:TEMP\test.bat"
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/baristorunlar/baris.studio/refs/heads/main/data/KolayMen%C3%BC.bat" -OutFile $path
Start-Process "cmd.exe" -ArgumentList "/c `"$path`""
