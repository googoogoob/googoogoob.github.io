$ErrorActionPreference = 'Stop'

$repoRoot = $PSScriptRoot
$outFile = Join-Path $repoRoot 'singlefile.html'

function Get-MimeType([string]$path) {
    switch ([IO.Path]::GetExtension($path).ToLowerInvariant()) {
        '.png' { 'image/png' }
        '.jpg' { 'image/jpeg' }
        '.jpeg' { 'image/jpeg' }
        '.gif' { 'image/gif' }
        '.webp' { 'image/webp' }
        '.svg' { 'image/svg+xml' }
        '.ico' { 'image/x-icon' }
        '.ttf' { 'font/ttf' }
        '.woff' { 'font/woff' }
        '.woff2' { 'font/woff2' }
        default { 'application/octet-stream' }
    }
}

function Get-DataUri([string]$path) {
    $resolved = (Resolve-Path $path).Path
    $mime = Get-MimeType $resolved
    $bytes = [IO.File]::ReadAllBytes($resolved)
    $b64 = [Convert]::ToBase64String($bytes)
    return "data:$mime;base64,$b64"
}

function Resolve-RepoAsset([string]$asset, [string]$baseDir, [string]$rootDir) {
    $clean = $asset.Trim().Trim([char[]]@(34, 39))
    if ($clean -match '^(data:|https?:|blob:|#)') { return $null }

    if ($clean.StartsWith('/')) {
        return [IO.Path]::GetFullPath((Join-Path $rootDir $clean.TrimStart('/')))
    }

    return [IO.Path]::GetFullPath((Join-Path $baseDir $clean))
}

function Replace-CssUrls([string]$content, [string]$baseDir, [string]$rootDir) {
    $pattern = @'
url\((["'']?)(?!data:|https?:|blob:|#)([^)"'']+)\1\)
'@.Trim()
    return [regex]::Replace($content, $pattern, {
        param($match)
        $asset = $match.Groups[2].Value.Trim()
        $resolved = Resolve-RepoAsset $asset $baseDir $rootDir
        if ($resolved -and (Test-Path $resolved)) {
            return "url('$(Get-DataUri $resolved)')"
        }
        return $match.Value
    })
}

function Replace-HtmlAssetAttributes([string]$content, [string]$rootDir) {
    $pattern = @'
(?<attr>\b(?:src|href)=)(?<quote>["''])(?<path>/?assets/[^"'']+)(?<end>\k<quote>)
'@.Trim()
    return [regex]::Replace($content, $pattern, {
        param($match)
        $asset = $match.Groups['path'].Value
        $resolved = Resolve-RepoAsset $asset $rootDir $rootDir
        if ($resolved -and (Test-Path $resolved)) {
            $uri = Get-DataUri $resolved
            return $match.Groups['attr'].Value + $match.Groups['quote'].Value + $uri + $match.Groups['end'].Value
        }
        return $match.Value
    })
}

$html = Get-Content (Join-Path $repoRoot 'index.html') -Raw
$style = Get-Content (Join-Path $repoRoot 'css/style.css') -Raw
$x360 = Get-Content (Join-Path $repoRoot 'css/x360.css') -Raw
$js = Get-Content (Join-Path $repoRoot 'js/script.js') -Raw
$changelog = Get-Content (Join-Path $repoRoot 'changelog.json') -Raw
$version = (Get-Content (Join-Path $repoRoot 'version.json') -Raw | ConvertFrom-Json).version
$tagline = 'super secret definetly game site with rare games'

$style = Replace-CssUrls $style (Join-Path $repoRoot 'css') $repoRoot
$x360 = Replace-CssUrls $x360 (Join-Path $repoRoot 'css') $repoRoot
$combinedCss = @"
<style>
$style

$x360
</style>
"@

$assetMap = [ordered]@{}
Get-ChildItem (Join-Path $repoRoot 'assets') -Recurse -File | Where-Object {
    $_.Extension -match '^\.(png|jpg|jpeg|gif|webp|svg|ico|ttf|woff|woff2)$'
} | ForEach-Object {
    $rel = $_.FullName.Substring($repoRoot.Length + 1).Replace('\', '/')
    $assetMap[$rel] = Get-DataUri $_.FullName
}
$assetsJson = $assetMap | ConvertTo-Json -Compress -Depth 5
$taglineJson = $tagline | ConvertTo-Json -Compress

$bootstrapScripts = @"
<script>
window.SINGLEFILE_ASSETS = $assetsJson;
window.SINGLEFILE_CHANGELOG = $changelog;
window.SINGLEFILE_VERSION = '$version';
window.SINGLEFILE_TAGLINE = $taglineJson;
</script>
<script>
$js
</script>
<script>
function normalizeAssetPath(p) {
    if (!p) return p;
    if (/^(https?:|data:|blob:|#)/i.test(p)) return p;
    const assetMap = window.SINGLEFILE_ASSETS || {};
    const cleaned = String(p)
        .replace(/\\/g, '/')
        .replace(/^\.\//, '')
        .replace(/^\/+/, '');
    return assetMap[cleaned] || p;
}
</script>
"@

$newTaglineScript = @"
<script>
document.addEventListener('DOMContentLoaded', function(){
    const taglineElement = document.getElementById('navbarTagline');
    if(taglineElement){
        taglineElement.innerHTML = String(window.SINGLEFILE_TAGLINE || 'Goob 360').split('\\n').join('<br>');
    }
});
</script>
"@

$newVersionScript = @"
<script>
document.addEventListener('DOMContentLoaded', function(){
    const CLIENT_KEY = 'fake_xbox_client_version';
    const server = window.SINGLEFILE_VERSION || '1.0.0';
    const client = localStorage.getItem(CLIENT_KEY) || server;

    if(client !== server){
        localStorage.setItem(CLIENT_KEY, server);
        localStorage.setItem('show_changelog_after_update', '1');
    }

    if(localStorage.getItem('show_changelog_after_update') === '1'){
        localStorage.removeItem('show_changelog_after_update');
        setTimeout(() => {
            if(typeof showChangelog === 'function') showChangelog();
        }, 300);
    }
});
</script>
"@

$newChangelogScript = @"
<script>
function showChangelog(){
    const modal = document.getElementById('changelogModal');
    const content = document.getElementById('changelogContent');
    const commits = Array.isArray(window.SINGLEFILE_CHANGELOG) ? window.SINGLEFILE_CHANGELOG : [];

    content.innerHTML = '';
    if(!commits.length){
        content.innerHTML = '<p>Changelog not available.</p>';
    } else {
        commits.forEach(commit => {
            const entry = document.createElement('div');
            entry.className = 'changelog-entry';
            entry.innerHTML = `<div class="changelog-date">${commit.date || ''}</div><div class="changelog-message">${commit.message || ''}</div>`;
            content.appendChild(entry);
        });
    }

    modal.classList.add('show');
}

function closeChangelog(){
    document.getElementById('changelogModal').classList.remove('show');
}

document.addEventListener('DOMContentLoaded', function(){
    const modal = document.getElementById('changelogModal');
    modal.addEventListener('click', function(e){
        if(e.target === modal){
            closeChangelog();
        }
    });
});
</script>
"@

$html = [regex]::Replace($html, '<script async src="https://www\.googletagmanager\.com/gtag/js\?id=G-ZRPZ3P6WM2"></script>\s*', '', 1)
$html = [regex]::Replace($html, '(?s)<link rel="stylesheet" href="css/style\.css" />\s*<link rel="stylesheet" href="css/x360\.css" />', [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $combinedCss }, 1)
$html = [regex]::Replace($html, '(?s)<script src="js/script\.js"></script>', [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $bootstrapScripts }, 1)
$html = [regex]::Replace($html, '(?s)<script>\s*// Load navbar tagline from external GitHub repository.*?</script>', [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $newTaglineScript }, 1)
$html = [regex]::Replace($html, '(?s)<script>\s*// Automatic version check on load: if mismatch, redirect to fake update page\..*?</script>', [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $newVersionScript }, 1)
$html = [regex]::Replace($html, '(?s)<script>\s*function showChangelog\(\)\{.*?document\.addEventListener\(''DOMContentLoaded'', function\(\)\{\s*const modal = document\.getElementById\(''changelogModal''\);.*?\}\);\s*</script>', [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $newChangelogScript }, 1)
$html = Replace-HtmlAssetAttributes $html $repoRoot

[IO.File]::WriteAllText($outFile, $html, [System.Text.UTF8Encoding]::new($false))

$remainingRefs = ([regex]::Matches($html, '(?:src|href)=(["''])(?:/?assets/|css/|js/|changelog\.json|version\.json)')).Count
Write-Host "Created $outFile"
Write-Host "Embedded assets: $($assetMap.Count)"
Write-Host "Remaining local dependency refs found: $remainingRefs"
