$json = Get-Content '.\AssetFlow - Enterprise Asset & Resource Management System - 8 hours.excalidraw' -Raw | ConvertFrom-Json
$elements = $json.elements | Where-Object { $_.type -eq 'text' -and $_.isDeleted -eq $false }
$sorted = $elements | Sort-Object { $_.y }
foreach ($el in $sorted) {
    Write-Output ("Y={0:F0} | X={1:F0} | Font={2} | Text: {3}" -f $el.y, $el.x, $el.fontSize, $el.text)
}
