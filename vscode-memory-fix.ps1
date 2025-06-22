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
        Write-Host "✅ Cache limpo: $([System.IO.Path]::GetFileName($path))" -ForegroundColor Green
    }
}

# 4. Criar configuração otimizada
Write-Host "`n4. Aplicando configuração otimizada..." -ForegroundColor Yellow
$config = @{
    "typescript.preferences.includePackageJsonAutoImports" = "off"
    "typescript.suggest.autoImports" = $false
    "editor.suggest.showInlineDetails" = $false
    "telemetry.telemetryLevel" = "off"
    "git.autoRepositoryDetection" = $false
    "extensions.autoUpdate" = $false
    "files.watcherExclude" = @{
        "**/node_modules/**" = $true
        "**/.git/**" = $true
        "**/dist/**" = $true
        "**/.next/**" = $true
    }
    "editor.minimap.enabled" = $false
    "breadcrumbs.enabled" = $false
}

$vscodeDir = ".\.vscode"
if (!(Test-Path $vscodeDir)) {
    New-Item -ItemType Directory -Path $vscodeDir -Force | Out-Null
}

$config | ConvertTo-Json -Depth 3 | Out-File -FilePath "$vscodeDir\settings.json" -Encoding UTF8 -Force
Write-Host "✅ Configuração otimizada aplicada" -ForegroundColor Green

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

# 7. Recomendações
Write-Host "`n=== RECOMENDAÇÕES ===" -ForegroundColor Cyan
Write-Host "1. Reinicie o VS Code agora" -ForegroundColor White
Write-Host "2. Abra apenas arquivos necessários" -ForegroundColor White
Write-Host "3. Se persistir, desative extensões: Ctrl+Shift+X" -ForegroundColor White
Write-Host "4. Monitor contínuo: Get-Process *Code* | Select ProcessName,@{N='MB';E={[math]::Round(\$_.WorkingSet/1MB,2)}}" -ForegroundColor White

Write-Host "`n✅ Correções aplicadas!" -ForegroundColor Green
