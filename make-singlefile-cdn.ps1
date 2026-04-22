# PowerShell script to create a single-file HTML with CDN assets (no embedded base64)
# Usage: .\make-singlefile-cdn.ps1

$repoUrl = 'https://cdn.jsdelivr.net/gh/googoogoob/googoogoob.github.io@latest'

# Read source files
$indexHtml = Get-Content -Path 'index.html' -Raw
$styleCss = Get-Content -Path 'css/style.css' -Raw
$x360Css = Get-Content -Path 'css/x360.css' -Raw
$scriptJs = Get-Content -Path 'js/script.js' -Raw

# Convert asset paths in CSS to CDN URLs
$cssReplaceUrls = $styleCss -replace '(?<!([''""]))\.\./assets/', "$repoUrl/assets/"
$cssReplaceUrls = $cssReplaceUrls -replace "url\('\.\.\/assets/", "url('$repoUrl/assets/"
$cssReplaceUrls = $cssReplaceUrls -replace 'url\("\.\.\/assets/', "url(`"$repoUrl/assets/"
$cssReplaceUrls = $cssReplaceUrls -replace "url\('/assets/", "url('$repoUrl/assets/"
$cssReplaceUrls = $cssReplaceUrls -replace 'url\("/assets/', "url(`"$repoUrl/assets/"

# Convert asset paths in JS to CDN URLs
$scriptReplaced = $scriptJs -replace "'assets/", "'$repoUrl/assets/"
$scriptReplaced = $scriptReplaced -replace '"assets/', "`"$repoUrl/assets/"
$scriptReplaced = $scriptReplaced -replace "'/assets/", "'$repoUrl/assets/"

# Update normalizeAssetPath function to use CDN
$scriptReplaced = $scriptReplaced -replace "return '/' \+ p\.replace\(/\^\(\.\/\|\/+\)\+/, ''\);", "return '$repoUrl/' + p.replace(/^(\.\/|\/+)+/, '');"

# Convert asset paths in HTML to CDN URLs (before we parse the head)
$htmlWithCdnAssets = $indexHtml -replace 'href="assets/', "href=`"$repoUrl/assets/"
$htmlWithCdnAssets = $htmlWithCdnAssets -replace 'src="assets/', "src=`"$repoUrl/assets/"

# Extract just the body content
$bodyStart = $htmlWithCdnAssets.IndexOf('<body')
if ($bodyStart -eq -1) {
    Write-Host "ERROR: Could not find body tag in index.html"
    exit 1
}
$bodyTagEnd = $htmlWithCdnAssets.IndexOf('>', $bodyStart) + 1
$bodyContentStart = $bodyTagEnd
$bodyEnd = $htmlWithCdnAssets.IndexOf('</body>', $bodyContentStart)
$bodyContent = $htmlWithCdnAssets.Substring($bodyContentStart, $bodyEnd - $bodyContentStart)

# Build the single file HTML
$singleFile = @"
<!DOCTYPE html>
<html>
<head>
    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-ZRPZ3P6WM2"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-ZRPZ3P6WM2');
    </script>
    
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Goob 360</title>
    <link rel="shortcut icon" href="$repoUrl/assets/images/favicon.png">
    
    <style>
    /* Combined styles from style.css and x360.css */
    $cssReplaceUrls
    </style>
    
    <meta content="Goob 360" property="og:title">
    <meta content="super secret definetly game site with rare games" property="og:description">
    <meta content="#008a00" data-react-helmet="true" name="theme-color">
    <meta http-equiv="Permissions-Policy" content="storage-access-by-user-activation=*, geolocation=(), camera=(), microphone=()">
</head>
<body>
    $bodyContent

    <script>
    // Inline page scripts
    $scriptReplaced
    </script>
    
    <script>
    // Load navbar tagline from external GitHub repository
    fetch('https://raw.githubusercontent.com/thecheetoman/GSPasscode/main/quote.txt')
        .then(response => response.text())
        .then(text => {
            const taglineElement = document.getElementById('navbarTagline');
            if(taglineElement){
                taglineElement.innerHTML = text.split('\n').join('<br>');
            }
        })
        .catch(error => {
            console.log('Could not load navbar tagline from external repository');
        });
    </script>
    
    <script>
    // Automatic version check on load
    document.addEventListener('DOMContentLoaded', function(){
        const CLIENT_KEY = 'fake_xbox_client_version';
        const DEFAULT_CLIENT = '1.0.0';

        async function checkVersion(){
            try{
                const r = await fetch('$repoUrl/version.json', {cache: 'no-store'});
                if(!r.ok) return;
                const j = await r.json();
                const server = j.version;
                const client = localStorage.getItem(CLIENT_KEY) || DEFAULT_CLIENT;
                if(client !== server){
                    if(location.pathname !== '/assets/fake-xbox/xbox-update.html'){
                        const ret = '/';
                        location.href = '$repoUrl/assets/fake-xbox/xbox-update.html?return=' + encodeURIComponent(ret) + '&autostart=1';
                    }
                    return;
                }

                if(localStorage.getItem('show_changelog_after_update') === '1'){
                    localStorage.removeItem('show_changelog_after_update');
                    setTimeout(()=>{ if(typeof showChangelog === 'function') showChangelog(); }, 300);
                }
            }catch(e){
                console.warn('Version check failed', e);
            }
        }

        checkVersion();
    });
    </script>
    
    <script>
    function showChangelog(){
        const modal = document.getElementById('changelogModal');
        const content = document.getElementById('changelogContent');
        
        fetch('$repoUrl/changelog.json')
            .then(response => response.json())
            .then(commits => {
                content.innerHTML = '';
                commits.forEach(commit => {
                    const entry = document.createElement('div');
                    entry.className = 'changelog-entry';
                    entry.innerHTML = `<div class="changelog-date">\${commit.date}</div><div class="changelog-message">\${commit.message}</div>`;
                    content.appendChild(entry);
                });
                modal.classList.add('show');
            })
            .catch(error => {
                content.innerHTML = '<p>Changelog not available.</p>';
                modal.classList.add('show');
            });
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
    
    <script>
    function showDiscord(){
        document.getElementById('discordModal').classList.add('show');
    }
    
    function closeDiscord(){
        document.getElementById('discordModal').classList.remove('show');
    }
    
    document.addEventListener('DOMContentLoaded', function(){
        document.getElementById('discordButton').onclick = showDiscord;
        
        const modal = document.getElementById('discordModal');
        modal.addEventListener('click', function(e){
            if(e.target === modal){
                closeDiscord();
            }
        });
    });
    </script>
    
    <script>
    (function(){
        function startSequence(){
            var overlay = document.getElementById('xboxStartupOverlay');
            if(!overlay) return;

            var t0 = 40;
            var sphereAt = 300;
            var letterAt = 800;
            var goobAt = 1200;
            var fadeOutAt = 3200;

            setTimeout(function(){ overlay.classList.add('phase-sphere'); }, t0 + sphereAt);
            setTimeout(function(){ overlay.classList.add('phase-letter'); }, t0 + letterAt);
            setTimeout(function(){ overlay.classList.add('phase-goob'); }, t0 + goobAt);

            setTimeout(function(){ overlay.classList.add('hide'); overlay.setAttribute('aria-hidden','true');
                setTimeout(function(){ if(overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 700);
            }, fadeOutAt);
        }

        if(document.readyState === 'complete' || document.readyState === 'interactive'){
            setTimeout(startSequence, 60);
        } else {
            document.addEventListener('DOMContentLoaded', startSequence);
        }
    })();
    </script>
    
    <script>
    alert("BTW in game click shift+tab to be able to return to menu!")
    </script>
</body>
</html>
"@

# Write output file
$outputPath = 'singlefile-cdn.html'
$singleFile | Out-File -FilePath $outputPath -Encoding UTF8

Write-Host "Created $outputPath"
Write-Host "Asset source: $repoUrl"
