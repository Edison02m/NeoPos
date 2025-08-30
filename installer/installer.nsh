; Instalador NSIS personalizado para NeoPOS
; Este script añade funcionalidad para cerrar la aplicación antes de instalar

!macro customInstall
  ; Cerrar cualquier instancia de NeoPOS en ejecución con múltiples intentos
  DetailPrint "Verificando procesos de NeoPOS..."
  
  ; Primer intento: cierre suave
  nsExec::ExecToLog 'wmic process where "name='"'"'NeoPOS.exe'"'"'" call terminate'
  Sleep 3000
  
  ; Segundo intento: cierre forzado
  nsExec::ExecToLog 'taskkill /f /im "NeoPOS.exe" /t'
  Sleep 2000
  
  ; Tercer intento: cierre por PID si es necesario
  nsExec::ExecToLog 'for /f "tokens=2" %i in ('"'"'tasklist /fi "imagename eq NeoPOS.exe" /fo csv /nh'"'"') do taskkill /f /pid %i'
  Sleep 1000
  
  ; Verificar que se haya cerrado
  nsExec::ExecToLog 'tasklist /fi "imagename eq NeoPOS.exe" | find /i "NeoPOS.exe"'
  Pop $0
  ${If} $0 == 0
    DetailPrint "Proceso NeoPOS encontrado, esperando cierre..."
    Sleep 3000
  ${Else}
    DetailPrint "NeoPOS cerrado exitosamente o no estaba en ejecución"
  ${EndIf}
  
  ; Limpiar archivos temporales
  Delete "$TEMP\NeoPOS*"
!macroend

!macro customUnInstall
  ; Cerrar cualquier instancia de NeoPOS en ejecución durante desinstalación
  DetailPrint "Cerrando NeoPOS antes de desinstalar..."
  
  ; Cierre forzado inmediato
  nsExec::ExecToLog 'taskkill /f /im "NeoPOS.exe" /t'
  Sleep 2000
  
  ; Verificar y limpiar
  nsExec::ExecToLog 'wmic process where "name='"'"'NeoPOS.exe'"'"'" call terminate'
  Sleep 1000
!macroend
