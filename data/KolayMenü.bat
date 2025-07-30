@echo off
chcp 65001 > nul
set "params=%*"
cd /d "%~dp0" && ( if exist "%temp%\getadmin.vbs" del "%temp%\getadmin.vbs" ) && fsutil dirty query %systemdrive% 1>nul 2>nul || (  echo Set UAC = CreateObject^("Shell.Application"^) : UAC.ShellExecute "cmd.exe", "/k cd ""%~sdp0"" && ""%~s0"" %params%", "", "runas", 1 >> "%temp%\getadmin.vbs" && "%temp%\getadmin.vbs" && exit /B )
:menu
mode con:cols=50 lines=30
color 2
cls
echo "██████╗  █████╗ ██████╗ ██╗███████╗";v0.3
echo "██╔══██╗██╔══██╗██╔══██╗██║██╔════╝";
echo "██████╔╝███████║██████╔╝██║███████╗";	
echo "██╔══██╗██╔══██║██╔══██╗██║╚════██║";
echo "██████╔╝██║  ██║██║  ██║██║███████║";
echo "╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚══════╝";
echo -------------------------------------;
echo  1. Sistem bilgisi göster       
echo  2. Online log dosyası onarma   
echo.             
echo  3. Windows Lisansla
echo.
echo. 4. Temp ve Prefetch Klasörlerini Temizle
echo. 5. DNS Önbelleğini Temizle
echo  6. RAM Ve Arka Plan İşlemleri Temizle 
echo  7. Pc kapatma zamanlayıcısı 
echo.
echo  8. Programlari Kur (Chrome ve WinRAR)  
echo  9. Masaustu Simgelerini Goster
echo.  
echo  0. !Yasak
echo -------------------------------------
echo.
set /p choice="Lutfen bir secenek secin (1-10): "

if "%choice%"=="0" goto loop
if "%choice%"=="1" goto system_stats
if "%choice%"=="2" goto restorehealth
if "%choice%"=="3" goto license
if "%choice%"=="4" goto clean_temp_prefetch
if "%choice%"=="5" goto flush_dns
if "%choice%"=="6" goto clear_ram
if "%choice%"=="7" goto shutdown_pc
if "%choice%"=="8" goto programlar
if "%choice%"=="9" goto masaustu_simgeleri

echo Geçersiz seçenek! Lütfen tekrar deneyin.
pause
goto menu

:system_stats
mode con:cols=50 lines=35
@echo off
title Sistem Bilgi Toplayıcı

echo ┌───────────────────────────────────────────┐
echo │          Sistem Ana Bileşenleri           │
echo ├───────────────────────────────────────────┤

echo │ İşlemci Bilgisi:               		  
wmic cpu get Name | findstr /v "Name"

echo │ Ekran Kartı Bilgisi:                 	
wmic path win32_videocontroller get caption | findstr /v "caption"

echo │ Ethernet Kartı Bilgisi:              	
wmic nic where "PhysicalAdapter=True" get Name | findstr /v "Name"

echo │ WiFi Kartı Bilgisi:                     
wmic nic where "NetEnabled=True" get Name | findstr /v "Name"

echo │ Bellek Bilgisi:                 			
wmic memorychip get Capacity | findstr /v "Capacity"

echo │ Disk Bilgisi:                      	
wmic diskdrive get Model,Size | findstr /v "Model"

echo └───────────────────────────────────────────┘
pause
goto menu

:restorehealth
echo Online Log Dosyası Onarma:
    dism /online /cleanup-image /restorehealth /source:C:
\RepairSource\Windows /limitaccess
    pause
    goto menu

:clean_temp_prefetch
cls
echo Temp ve Prefetch klasorleri temizleniyor...
echo.

del /q /f /s "%TEMP%\*.*" 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Temp klasoru temizlendi!
) else (
    echo Temp klasoru temizlenemedi!
)

del /q /f /s "%WINDIR%\Prefetch\*.*" 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Prefetch klasoru temizlendi!
) else (
    echo Prefetch klasoru temizlenemedi!
)

echo.
pause
goto menu

:license
powershell -Command "iwr https://get.activated.win | iex"
pause
goto menu

:flush_dns
echo DNS Önbelleği temizleniyor...
ipconfig /flushdns >nul 2>&1
echo DNS Önbelleği temizlendi.
pause
goto menu

:clear_ram
echo RAM temizleniyor...
start "" %SystemRoot%\System32\rundll32.exe advapi32.dll,ProcessIdleTasks
echo RAM temizlendi.
echo Arka planda çalışan uygulamalar kapatılıyor...
taskkill /f /im explorer.exe >nul 2>&1
timeout /t 1 >nul
start explorer.exe
echo Arka planda çalışan uygulamalar kapatıldı.
pause
goto menu

:shutdown_pc
mode con:cols=55 lines=5
cls
set /p saat="Bilgisayari kac saat sonra kapatmak istersiniz: "
set /a saniye=%saat%*3600
shutdown /s /t %saniye%
echo Bilgisayariniz %saat% saat sonra kapanacak.
echo Kapatmayi iptal etmek icin herhangi bir tusa basin.
pause >nul
shutdown /a
echo Kapatma iptal edildi.
pause
goto menu

:programlar
cls
echo Programlar kuruluyor...
echo.

winget install --id Google.Chrome -e --silent
if %ERRORLEVEL% EQU 0 (
    echo Chrome basariyla kuruldu!
) else (
    echo Chrome kurulumu basarisiz!
)

winget install --id RARLab.WinRAR -e --silent
if %ERRORLEVEL% EQU 0 (
    echo WinRAR basariyla kuruldu!
) else (
    echo WinRAR kurulumu basarisiz!
)

echo.
pause
goto menu

:masaustu_simgeleri
cls
echo Masaustu simgeleri gösteriliyor...
REG ADD "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" /V HideIcons /T REG_DWORD /D 0 /F >nul
taskkill /f /im explorer.exe >nul
start explorer.exe
if %ERRORLEVEL% EQU 0 (
    echo Masaustu simgeleri basariyla gosterildi!
) else (
    echo Masaustu simgeleri gosterilemedi!
)
echo.
pause
goto menu

:loop
echo %random%%random% %random% %random% %random% %random% %random% %random%%random%
goto loop
