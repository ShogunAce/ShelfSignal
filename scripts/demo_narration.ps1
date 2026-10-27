$ErrorActionPreference='Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$out=Join-Path (Get-Location) 'docs/submission/video/audio'
New-Item -ItemType Directory -Force -Path $out | Out-Null
Add-Type -AssemblyName System.Speech
$speaker=New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
    $speaker.SelectVoice('Microsoft Zira Desktop')
    $speaker.Rate=1
    $segments=Get-Content scripts/demo_segments.json -Raw | ConvertFrom-Json
    foreach ($segment in $segments) {
        $target=Join-Path $out ($segment.id+'.wav')
        $speaker.SetOutputToWaveFile($target)
        $speaker.Speak($segment.narration)
        $speaker.SetOutputToNull()
        Write-Output ('Narrated '+$segment.id)
    }
} finally { $speaker.Dispose() }
