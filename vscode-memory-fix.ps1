# Script simplificado para diagnosticar problemas de memória do VS Code
# Criado em: 22/06/2025

Write-Host "=== DIAGNÓSTICO VS CODE - MEMÓRIA ===" -ForegroundColor Cyan

# 1. Verificar processos VS Code
Write-Host "`n1. Processos VS Code ativos:" -ForegroundColor Yellow
$vscode = Get-Process | Where-Object { $_.ProcessName -like "*Code*" }
if ($vscode) {
    $totalMB = ($vscode | Measure-Object WorkingSet -Sum).Sum / 1MB
    Write-Host "Memória total: $([math]::Round($totalMB, 2)) MB" -ForegroundColor $(if($totalMB -gt 4000) { "Red" } else { "Green" })
    $vscode | Select-Object ProcessName, Id, @{N="Memory(MB)";E={[math]::Round($_.WorkingSet/1MB,2)}} | Format-Table
} else {
    Write-Host "VS Code não está executando" -ForegroundColor Green
}

# 2. Listar extensões instaladas
Write-Host "`n2. Extensões instaladas:" -ForegroundColor Yellow
$extPath = "$env:USERPROFILE\.vscode\extensions"
if (Test-Path $extPath) {
    $extensions = Get-ChildItem $extPath | Where-Object { $_.PSIsContainer }
    Write-Host "Total: $($extensions.Count) extensões" -ForegroundColor Cyan
    
    # Mostrar apenas extensões relevantes
    $extensions | ForEach-Object {
        $name = $_.Name -replace "^[^.]*\.", ""
        Write-Host "  - $name" -ForegroundColor White
    }
    
    # Identificar extensões problemáticas conhecidas
    $problematic = $extensions | Where-Object { 
        $_.Name -like "*copilot*" -or 
        $_.Name -like "*typescript*" -or 
        $_.Name -like "*powershell*" -or
        $_.Name -like "*git*" -or
        $_.Name -like "*eslint*"
    }
    
    if ($problematic) {
        Write-Host "`nExtensões que podem causar problemas:" -ForegroundColor Red
        $problematic | ForEach-Object {
            $name = $_.Name -replace "^[^.]*\.", ""
            Write-Host "  ⚠️ $name" -ForegroundColor Red
        }
    }
}

# 3. Limpar cache
Write-Host "`n3. Limpando cache..." -ForegroundColor Yellow
$cachePaths = @(
    "$env:APPDATA\Code\logs",
    "$env:APPDATA\Code\CachedExtensions",
    "$env:APPDATA\Code\exthost"
)

foreach ($path in $cachePaths) {
    if (Test-Path $path) {
        Remove-Item $path -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "Cache limpo: $([System.IO.Path]::GetFileName($path))" -ForegroundColor Green
    }
}

# 4. Configurar memória permanente para 12GB
Write-Host "`n4. Configurando memória permanente do VS Code para 12GB..." -ForegroundColor Yellow

# Configurar argv.json global (aplicável a todas as instâncias do VS Code)
$globalArgvPath = "$env:APPDATA\Code\User\argv.json"
$globalArgvDir = Split-Path $globalArgvPath -Parent

if (!(Test-Path $globalArgvDir)) {
    New-Item -ItemType Directory -Path $globalArgvDir -Force | Out-Null
}

$argv = @{
    "max-memory" = "12288"  # 12GB em MB
    "max-old-space-size" = "12288"
    "max-semi-space-size" = "512" 
    "initial-old-space-size" = "4096"
    "gc-interval" = "100"
    "enable-logging" = $false
}

$argv | ConvertTo-Json -Depth 2 | Out-File -FilePath $globalArgvPath -Encoding UTF8 -Force
Write-Host "Configuracao de memoria global aplicada: $globalArgvPath" -ForegroundColor Green

# Criar atalho personalizado do VS Code com parametros de memoria
Write-Host "`n4.1. Criando atalho personalizado..." -ForegroundColor Yellow
$desktopPath = [Environment]::GetFolderPath("Desktop")
$shortcutPath = "$desktopPath\VS Code (12GB).lnk"

# Script para criar atalho
$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($shortcutPath)
$Shortcut.TargetPath = "code"
$Shortcut.Arguments = "--max-memory=12288 --max-old-space-size=12288 --max-semi-space-size=512 --gc-interval=100"
$Shortcut.Description = "VS Code com 12GB de memória"
$Shortcut.Save()

Write-Host "Atalho criado na area de trabalho: VS Code (12GB).lnk" -ForegroundColor Green

# 5. Finalizar processos VS Code
Write-Host "`n5. Finalizando VS Code..." -ForegroundColor Yellow
if ($vscode) {
    Stop-Process -Name "Code" -Force -ErrorAction SilentlyContinue
    Write-Host "✅ VS Code finalizado" -ForegroundColor Green
} else {
    Write-Host "VS Code já estava fechado" -ForegroundColor Green
}

# 6. Verificar memória do sistema
Write-Host "`n6. Memória do sistema:" -ForegroundColor Yellow
$os = Get-WmiObject -Class WIN32_OperatingSystem
$totalGB = [math]::Round($os.TotalVisibleMemorySize / 1MB, 1)
$freeGB = [math]::Round($os.FreePhysicalMemory / 1MB, 1)
$usedPercent = [math]::Round((($totalGB - $freeGB) / $totalGB) * 100, 1)

Write-Host "Total: ${totalGB}GB | Livre: ${freeGB}GB | Uso: ${usedPercent}%" -ForegroundColor Cyan

# 7. Recomendacoes
Write-Host "`n=== RECOMENDACOES ===" -ForegroundColor Cyan
Write-Host "1. Reinicie o VS Code agora" -ForegroundColor White
Write-Host "2. Abra apenas arquivos necessarios" -ForegroundColor White
Write-Host "3. Se persistir, desative extensoes: Ctrl+Shift+X" -ForegroundColor White
Write-Host "4. Monitor continuo: Get-Process *Code* | Select ProcessName,@{N='MB';E={[math]::Round(\$_.WorkingSet/1MB,2)}}" -ForegroundColor White

# 8. Criar script de inicializacao com 12GB
Write-Host "`n8. Criando script de inicializacao otimizado..." -ForegroundColor Yellow
$launchScript = @"
@echo off
REM Script para iniciar VS Code com 12GB de memoria
REM Usar este script ao inves do atalho normal

echo Iniciando VS Code com configuracao de 12GB...
code --max-memory=12288 --max-old-space-size=12288 --max-semi-space-size=512 --gc-interval=100 %*
"@

$launchScript | Out-File -FilePath ".\vscode-12gb.bat" -Encoding ASCII -Force
Write-Host "Script criado: vscode-12gb.bat" -ForegroundColor Green
Write-Host "   Use este script para iniciar o VS Code com 12GB" -ForegroundColor Cyan

Write-Host "`n=== CONFIGURACAO DE MEMORIA 12GB APLICADA ===" -ForegroundColor Green
Write-Host "- Argumentos de inicializacao configurados" -ForegroundColor White
Write-Host "- Configuracao global aplicada (argv.json)" -ForegroundColor White
Write-Host "- Script de inicializacao criado (vscode-12gb.bat)" -ForegroundColor White
Write-Host "- Atalho criado na area de trabalho" -ForegroundColor White

Write-Host "`nCorrecoes aplicadas com sucesso!" -ForegroundColor Green
