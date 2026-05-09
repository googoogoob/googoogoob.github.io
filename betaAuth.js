(function(){
  // Simple client-side auth: fetch password from remote file and require user to provide a file with matching contents.
  // WARNING: This is NOT secure — the password file is public in the repo and can be read by anyone.
  // Use server-side access controls for real protection.
  const AUTH_KEY = 'site_authed';
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
  async function getFileContents(){
    return new Promise((resolve) => {
      // Create overlay
      const overlay = document.createElement('div');
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      overlay.style.backgroundColor = 'rgba(0,0,0,0.8)';
      overlay.style.zIndex = '9998';
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      document.body.appendChild(overlay);

      // Create menu
      const menu = document.createElement('div');
      menu.style.backgroundColor = 'white';
      menu.style.padding = '20px';
      menu.style.borderRadius = '10px';
      menu.style.textAlign = 'center';
      menu.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
      overlay.appendChild(menu);

      // Title
      const title = document.createElement('h2');
      title.textContent = 'Authentication Required';
      title.style.color = 'black';
      menu.appendChild(title);

      // Instructions
      const instructions = document.createElement('p');
      instructions.textContent = 'only for the goobers';
      instructions.style.color = 'black';
      menu.appendChild(instructions);

      // File input
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.goob360';
      input.style.margin = '10px 0';
      menu.appendChild(input);

      // Cancel button
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.color = 'black';
      cancelBtn.style.marginLeft = '10px';
      cancelBtn.onclick = () => {
        document.body.removeChild(overlay);
        resolve(null);
      };
      menu.appendChild(cancelBtn);

      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) {
          return;
        }
        const text = await file.text();
        document.body.removeChild(overlay);
        resolve(text.trim());
      };

      // Timeout
      setTimeout(() => {
        if (document.body.contains(overlay)) {
          document.body.removeChild(overlay);
          resolve(null);
        }
      }, 30000);
    });
  }
  async function ensureAuth(){
    // Always require authentication
    const pw = await getStoredPassword();
      if(!pw){
        alert('Site authentication unavailable. Access blocked');
        location.href = '/fail.html';
        return false;
      }
    let attempt = await getFileContents();
    if(attempt === null){
        location.href = '/fail.html';
      return false;
    }
    if(attempt === pw){
      // mark auth for current session only
      localStorage.setItem(AUTH_KEY,'1');
      return true;
    }
    // incorrect
    alert('unsigma');
      location.href = '/fail.html';
    return false;
  }
  // Run immediately
  ensureAuth();
})();
