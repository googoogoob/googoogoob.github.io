// Simple fake Xbox update flow
(function(){
  const CLIENT_KEY = 'fake_xbox_client_version';
  const DEFAULT_CLIENT = '1.0.0';
  const SITE_FAVICON = '/assets/images/favicon.png';

  const clientSpan = document.getElementById('client-version');
  const serverSpan = document.getElementById('server-version');
  const checkBtn = document.getElementById('check-btn');
  const overlay = document.getElementById('overlay');
  const status = document.getElementById('status');
  const progressBar = document.getElementById('progress-bar');

  function getClientVersion(){
    return localStorage.getItem(CLIENT_KEY) || DEFAULT_CLIENT;
  }
  function setClientVersion(v){
    localStorage.setItem(CLIENT_KEY, v);
    clientSpan.textContent = v;
  }

  function fetchServerVersion(){
    return fetch('/version.json', {cache: 'no-store'})
      .then(r=>{ if(!r.ok) throw new Error('no server version'); return r.json(); })
      .then(j=> j.version );
  }

  function showOverlay(){ overlay.classList.remove('hidden'); overlay.setAttribute('aria-hidden','false'); }
  function hideOverlay(){ overlay.classList.add('hidden'); overlay.setAttribute('aria-hidden','true'); }

  function runFakeUpdate(toVersion){
    // set logo
    const logo = document.getElementById('boot-logo');
    if(logo) logo.src = SITE_FAVICON;

    showOverlay();
    status.textContent = 'Preparing update…';
    progressBar.style.width = '2%';

    const steps = [
      {pct:12, text:'Verifying update package…'},
      {pct:34, text:'Preparing files…'},
      {pct:58, text:'Installing updates…'},
      {pct:80, text:'Verifying installed update'},
      {pct:98, text:'Finalizing'},
      {pct:100, text:'Restarting...'}
    ];

    let i = 0;
    function next(){
      if(i >= steps.length) return finish();
      const s = steps[i++];
      status.textContent = s.text;
      animateTo(s.pct, 1100 + Math.random()*700).then(()=>{
        setTimeout(next, 350 + Math.random()*700);
      });
    }

    function animateTo(target, duration){
      return new Promise(res=>{
        const start = parseFloat(progressBar.style.width) || 0;
        const from = start;
        const to = target;
        const t0 = performance.now();
        function frame(t){
          const dt = Math.min(1, (t - t0) / duration);
          const cur = from + (to - from) * dt;
          progressBar.style.width = cur + '%';
          if(dt < 1) requestAnimationFrame(frame); else res();
        }
        requestAnimationFrame(frame);
      });
    }

    function finish(){
      progressBar.style.width = '100%';
      setTimeout(()=>{
        // persist client version and mark that changelog should show after returning
        setClientVersion(toVersion);
        try{ localStorage.setItem('show_changelog_after_update','1'); }catch(e){}
        status.textContent = 'Your system is up to date — ' + toVersion;
        // redirect back to return url (or root) so index can show changelog
        const params = new URLSearchParams(window.location.search);
        const returnTo = params.get('return') || '/';
        setTimeout(()=>{ window.location.href = returnTo; }, 700);
      }, 700);
    }

    setTimeout(next, 600);
  }

  // initialize UI
  clientSpan.textContent = getClientVersion();
  checkBtn.addEventListener('click', ()=>{
    checkBtn.disabled = true;
    checkBtn.textContent = 'Checking...';
    fetchServerVersion().then(ver=>{
      serverSpan.textContent = ver;
      const client = getClientVersion();
      if(client !== ver){
        runFakeUpdate(ver);
      } else {
        status.textContent = 'Already up to date.';
        showOverlay();
        progressBar.style.width = '100%';
        setTimeout(hideOverlay, 900);
      }
    }).catch(err=>{
      serverSpan.textContent = 'unavailable';
      alert('Could not fetch server version: '+err.message);
    }).finally(()=>{
      checkBtn.disabled = false;
      checkBtn.textContent = 'Check for update';
    });
  });

  // Auto-start update if requested via URL param or when mismatch detected.
  function autoStartCheck(){
    const params = new URLSearchParams(window.location.search);
    const auto = params.get('autostart');
    // Attempt to fetch server version and auto-run update when mismatch
    fetchServerVersion().then(ver=>{
      serverSpan.textContent = ver;
      const client = getClientVersion();
      if(client !== ver){
        // begin update automatically when mismatch
        runFakeUpdate(ver);
      } else if(auto){
        // no mismatch but autostart requested: show a brief message
        showOverlay();
        status.textContent = 'System is already up to date.';
        progressBar.style.width = '100%';
        setTimeout(hideOverlay, 900);
      }
    }).catch(()=>{
      // ignore failures; leave page interactive
    });
  }

  if(document.readyState === 'loading'){
    window.addEventListener('DOMContentLoaded', autoStartCheck);
  } else {
    autoStartCheck();
  }

})();
