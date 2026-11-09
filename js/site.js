(function () {
  'use strict';
  const ADDRESS = '0x2E84B719e584Ff7933E84c873944719013A24B60';
  const $ = (id) => document.getElementById(id);
  const E = window.Entr0pic;
  const rndSeed = () => { const b = new Uint8Array(32); crypto.getRandomValues(b); return [...b].map((x) => x.toString(16).padStart(2, '0')).join(''); };
  let state = { minted: 0, freeLeft: 500, priceWei: '0', open: true };

  // ---------- Stage ----------
  const A = $('stageA'), B = $('stageB'); let front = A, n = 0;
  function nextStage() {
    const back = front === A ? B : A;
    const { svg, traits } = E.render(rndSeed(), null);
    back.innerHTML = svg; void back.offsetWidth;
    back.classList.add('on'); front.classList.remove('on'); front = back;
    $('stageCap').textContent = `Preview · ${traits.Form} · ${traits.Palette} · H ${traits.Entropy}`;
    n++;
  }
  nextStage();
  let stageTimer = setInterval(nextStage, 4200);
  $('stage').addEventListener('click', () => { clearInterval(stageTimer); nextStage(); stageTimer = setInterval(nextStage, 4200); });

  // ---------- Forms + palettes ----------
  const forms = $('forms');
  const wantPal = { Signal: 'Obsidian', Flow: 'Bone', Orbit: 'Cobalt', Fracture: 'Vermilion' };
  E.FORMS.forEach((f) => {
    let r = null;
    for (let i = 0; i < 400; i++) { const t = E.render(rndSeed(), null, { noLabel: true, noGrain: true }); if (t.traits.Form === f.name && (t.traits.Palette === wantPal[f.name] || i > 300)) { r = t; break; } }
    const el = document.createElement('div'); el.className = 'form reveal';
    el.innerHTML = (r ? r.svg : '') + `<span class="tag">${f.name} · ${f.w}%</span>`;
    forms.appendChild(el);
  });
  const pals = $('palettes');
  E.PALETTES.forEach((p) => {
    const el = document.createElement('div'); el.className = 'pal';
    el.innerHTML = `<div class="sw"><i style="background:${p.bg}"></i><i style="background:${p.ink}"></i><i style="background:${p.acc}"></i></div><b>${p.name}</b><span>${p.w}%</span>`;
    pals.appendChild(el);
  });

  // ---------- Stats ----------
  const fmt = (x) => x.toLocaleString('en-US');
  function paint() {
    const { minted, freeLeft, open } = state;
    const soldOut = minted >= 3333;
    $('barCount').textContent = fmt(minted);
    $('mcMinted').textContent = fmt(minted);
    $('mcFill').style.width = (minted / 3333 * 100) + '%';
    const left = 3333 - minted;
    $('mcLeft').textContent = soldOut ? '0' : fmt(left);
    $('dockPrice').textContent = soldOut ? 'SOLD OUT' : 'MINT LIVE';
    $('dockLeft').textContent = soldOut ? '3,333 minted' : `${fmt(left)} left`;
    $('mcNote').textContent = !open ? 'Mint is paused.' : soldOut ? 'All 3,333 pieces are minted.' : 'One per wallet. Agent ID required.';
    $('btnMint').disabled = soldOut || !open;
  }
  async function loadStats() {
    try { const j = await window.Entr0picChain.stats(); if (!j.error) { const was = state.minted; state = j; paint(); if (j.contract) document.querySelectorAll('.caddr').forEach((e) => (e.textContent = j.contract)); if (j.minted !== was) loadRecent(); } } catch (e) {}
  }
  loadStats(); setInterval(loadStats, 8000);

  // ---------- Gallery ----------
  async function loadRecent() {
    try {
      const j = await window.Entr0picChain.recent();
      if (!j.items || !j.items.length) return;
      const g = $('gallery'); g.innerHTML = '';
      j.items.slice(0, 8).forEach((it) => {
        const a = document.createElement('a'); a.href = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(E.render(it.seed, it.id).svg); a.target = '_blank'; a.rel = 'noopener';
        a.innerHTML = E.render(it.seed, it.id, { noLabel: true, noGrain: true }).svg + `<span class="tag">Nº ${String(it.id).padStart(4, '0')}</span>`;
        g.appendChild(a);
      });
    } catch (e) {}
  }

  // ---------- Mint with browser wallet ----------
  const status = (t) => { $('mcStatus').textContent = t; };
  async function mint() {
    const eth = window.ethereum || (window.BinanceChain && window.BinanceChain.ethereum);
    if (!eth) { status('No browser wallet found. Agents can mint with the prompt below.'); location.hash = 'agents'; return; }
    try {
      const provider = new ethers.BrowserProvider(eth);
      await provider.send('eth_requestAccounts', []);
      try { await provider.send('wallet_switchEthereumChain', [{ chainId: '0x38' }]); } catch (e) {}
      const net = await provider.getNetwork(); if (net.chainId !== 56n) { status('Switch your wallet to BNB Chain.'); return; }
      const signer = await provider.getSigner(); const me = await signer.getAddress();
      const s = await window.Entr0picChain.stats(me);
      if (!s.hasAgentId) { status('This wallet has no Agent ID. Only Binance Agentic Wallets with an Agent ID can mint.'); return; }
      if (s.hasMinted) { status('This wallet already minted its piece.'); return; }
      status('Confirm in your wallet…');
      const c = new ethers.Contract(s.contract || ADDRESS, ['function mint() payable'], signer);
      const tx = await c.mint({ value: BigInt(s.priceWei) });
      status('Minting… ' + tx.hash);
      await tx.wait(); status('Minted. Your piece is in the gallery.'); loadStats();
    } catch (e) { status((e && (e.shortMessage || e.message)) || 'Mint failed'); }
  }
  $('btnMint').addEventListener('click', mint);
  $('btnDock').addEventListener('click', () => { $('mint').scrollIntoView({ behavior: 'smooth', block: 'center' }); });

  // ---------- Copy ----------
  document.querySelectorAll('.copy').forEach((b) => b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($(b.dataset.copy).innerText); b.textContent = 'Copied'; setTimeout(() => (b.textContent = 'Copy'), 1400); } catch (e) {}
  }));

  // ---------- Ticker, dock, reveal ----------
  const tk = $('ticker'); tk.textContent = tk.textContent.repeat(4);
  const dock = document.querySelector('.dock');
  new IntersectionObserver(([en]) => dock.classList.toggle('show', !en.isIntersecting && en.boundingClientRect.top < 0), { threshold: 0 }).observe($('mint'));
  document.querySelectorAll('.sec-head, .steps li, .codecard, .pal, .entropy, details').forEach((el) => el.classList.add('reveal'));
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
})();
