param(
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$backlogPath = Join-Path $repoRoot 'docs/SPRINT_BACKLOG.json'

if (-not (Test-Path $backlogPath)) {
  throw "Backlog not found at $backlogPath"
}

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  throw "GitHub CLI (gh) is not installed or not on PATH."
}

$null = gh auth status 2>$null
if ($LASTEXITCODE -ne 0) {
  throw "GitHub CLI is not authenticated. Run: gh auth login"
}

$backlog = Get-Content $backlogPath -Raw | ConvertFrom-Json

# Ensure baseline labels exist (best effort)
$allLabels = @('roadmap')
$allLabels += $backlog.sprints | ForEach-Object { "sprint:$($_.id)" }
$allLabels += @('priority:P0','priority:P1')
$allLabels += $backlog.ownerRoles | ForEach-Object { "owner:$_" }
$allLabels += ($backlog.tasks | Select-Object -ExpandProperty workstream -Unique | ForEach-Object { "workstream:$_" })
$allLabels = $allLabels | Sort-Object -Unique

foreach ($label in $allLabels) {
  if ($DryRun) {
    Write-Host "[DRY RUN] ensure label: $label"
    continue
  }

  gh label create "$label" --color "1f6feb" --description "Roadmap automation label" 2>$null
}

function Get-SprintName($sprintId, $sprints) {
  $s = $sprints | Where-Object { $_.id -eq $sprintId } | Select-Object -First 1
  if ($null -eq $s) { return $sprintId }
  return $s.name
}

foreach ($task in $backlog.tasks) {
  $title = "[$($task.id)] $($task.title)"

  # Skip duplicates by title prefix
  $existing = gh issue list --search "\"[$($task.id)]\" in:title" --state all --limit 1 --json number,title | ConvertFrom-Json
  if ($existing.Count -gt 0) {
    Write-Host "Skipping existing issue for $($task.id): $($existing[0].title)"
    continue
  }

  $sprintName = Get-SprintName $task.sprintId $backlog.sprints
  $deps = if ($task.dependencies.Count -gt 0) { ($task.dependencies -join ', ') } else { 'None' }
  $ac = ($task.acceptanceCriteria | ForEach-Object { "- [ ] $_" }) -join "`n"

  $body = @"
## Summary
$($task.title)

## Metadata
- Task ID: $($task.id)
- Sprint: $($task.sprintId) ($sprintName)
- Priority: $($task.priority)
- Owner role: $($task.ownerRole)
- Workstream: $($task.workstream)
- Story points: $($task.storyPoints)
- Status: $($task.status)

## Dependencies
$deps

## Acceptance Criteria
$ac

## Source
- docs/SPRINT_BACKLOG.json
- docs/ROADMAP_EXECUTION_PLAN.md
"@

  $labels = @(
    'roadmap',
    "sprint:$($task.sprintId)",
    "priority:$($task.priority)",
    "owner:$($task.ownerRole)",
    "workstream:$($task.workstream)"
  )

  if ($DryRun) {
    Write-Host "[DRY RUN] would create: $title"
    Write-Host "          labels: $($labels -join ', ')"
    continue
  }

  gh issue create --title $title --body $body --label ($labels -join ',') | Out-Null
  Write-Host "Created issue: $title"
}

Write-Host "Done."
