(function(){
  // Simple client-side auth: fetch password from /password.txt and require prompt match.
  // WARNING: This is NOT secure — the password file is public in the repo and can be read by anyone.
  // Use server-side access controls for real protection.
  const AUTH_KEY = 'site_authed';
  const VISIT_KEY = 'visit_count';
  async function getStoredPassword(){
    try{
      // Fetch the passcode from the external repo's raw file
      const r = await fetch('https://raw.githubusercontent.com/thecheetoman/GSPasscode/main/something.txt', {cache: 'no-store'});
      if(!r.ok) return null;
      const text = await r.text();
      return text.trim();
    }catch(e){
      return null;
    }
  }
  async function ensureAuth(){
    // Increment visit counter and decide whether to prompt on this visit.
    let visits = parseInt(localStorage.getItem(VISIT_KEY) || '0', 10) || 0;
    visits += 1;
    localStorage.setItem(VISIT_KEY, String(visits));

    // If visits is even, require password; if odd, allow without prompting.
    const mustPrompt = (visits % 2) === 0;
    if(!mustPrompt) return true;

    // must prompt path
    const pw = await getStoredPassword();
      if(!pw){
        alert('Site authentication unavailable. Access blocked.');
        location.href = '/fail.html';
        return false;
      }
    let attempt = prompt('Enter site password:');
    if(attempt === null){
      // ensure next visit prompts again
      localStorage.setItem(VISIT_KEY, '1');
      localStorage.removeItem(AUTH_KEY);
        location.href = '/fail.html';
      return false;
    }
    if(attempt === pw){
      // mark auth for current session only
      localStorage.setItem(AUTH_KEY,'1');
      return true;
    }
    // incorrect - force next visit to prompt
    alert('Incorrect password');
    localStorage.setItem(VISIT_KEY, '1');
    localStorage.removeItem(AUTH_KEY);
      location.href = '/fail.html';
    return false;
  }
  // Run immediately
  ensureAuth();
})();
