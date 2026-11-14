/* ENTR0PIC Living Noise — papan live, dompet, mint, klaim Dua Pintu,
   klaim legacy, dan Living Wall. Baca rantai via perlombaan RPC. */
(function () {
  "use strict";
  var C = {
    token: "0x257F53b2BD1c2B551A90f8fF81bA76C7515139CE",
    nft: "0xBA5352A3A05Ec637394810D791a412E78A349247",
    claim: "0x389e8e5062960DF72FBB5c3519E0F2dc576f17bd",
    legacy: "0x2F8E4580e882e6dcb3D1DB5E21406B774ce07407",
    old1: "0x8624E24604D2177d127978f15B1c898853A4F6f8",
    old2: "0x2E84B719e584Ff7933E84c873944719013A24B60",
    agentId: "0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F",
    split: 297, legacyMax: 424, supply: 3333
  };
  var RPCS = [
    "https://bsc-dataseed.bnbchain.org",
    "https://bsc-dataseed.binance.org",
    "https://bsc-dataseed1.defibit.io",
    "https://bsc-dataseed2.defibit.io",
    "https://bsc-dataseed3.bnbchain.org"
  ];
  var NFT_ABI = [
    "function totalMinted() view returns (uint256)",
    "function totalBurned() view returns (uint256)",
    "function remainingSupply() view returns (uint256)",
    "function mintOpen() view returns (bool)",
    "function ownerOf(uint256) view returns (address)",
    "function balanceOf(address) view returns (uint256)",
    "function holdsAgentId(address) view returns (bool)",
    "function freeUsed(address) view returns (bool)",
    "function mintedBy(address) view returns (uint256)",
    "function priceFor(address) view returns (uint256)",
    "function questionFor(address) view returns (uint256,uint256,uint256)",
    "function mintFree(uint256)",
    "function mintPaid() payable"
  ];
  var CLAIM_ABI = [
    "function claimOpen() view returns (bool)",
    "function poolBalance() view returns (uint256)",
    "function totalKept() view returns (uint256)",
    "function totalCollapsed() view returns (uint256)",
    "function resolvedById(uint256) view returns (uint8)",
    "function keepAmount() view returns (uint256)",
    "function collapseAmount() view returns (uint256)",
    "function feeLowWei() view returns (uint256)",
    "function feeHighWei() view returns (uint256)",
    "function keepClaim(uint256) payable",
    "function collapseBurn(uint256) payable"
  ];
  var LEGACY_ABI = [
    "function claimOpen() view returns (bool)",
    "function poolBalance() view returns (uint256)",
    "function totalClaimed() view returns (uint256)",
    "function claimedById(uint256) view returns (bool)",
    "function isEligible(uint256,bytes32[]) view returns (bool)",
    "function claim(uint256,bytes32[])"
  ];
  var ERC721_ABI = ["function ownerOf(uint256) view returns (address)"];

  function $(id) { return document.getElementById(id); }
  function fmt(n) { return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
  function fmtTok(wei) { return fmt((wei / 10n ** 18n).toString()); }
  function fmtBnb(wei) {
    var s = (Number(wei) / 1e18).toFixed(6).replace(/0+$/, "").replace(/\.$/, ".0");
    return s + " BNB";
  }
  function short(a) { return a.slice(0, 6) + "…" + a.slice(-4); }

  /* ---------- baca rantai: perlombaan RPC ---------- */
  function readProvider() {
    return new ethers.JsonRpcProvider(RPCS[Math.floor(Math.random() * RPCS.length)], 56);
  }
  async function race(fn) {
    var ps = RPCS.map(function (rpc) {
      var p = new ethers.JsonRpcProvider(rpc, 56);
      return Promise.race([
        fn(p),
        new Promise(function (_, rej) { setTimeout(function () { rej(new Error("timeout")); }, 9000); })
      ]);
    });
    return Promise.any(ps);
  }
  function readNft(fn, args) { return race(function (p) { return new ethers.Contract(C.nft, NFT_ABI, p)[fn].apply(null, args || []); }); }
  function readClaim(fn, args) { return race(function (p) { return new ethers.Contract(C.claim, CLAIM_ABI, p)[fn].apply(null, args || []); }); }
  function readLegacy(fn, args) { return race(function (p) { return new ethers.Contract(C.legacy, LEGACY_ABI, p)[fn].apply(null, args || []); }); }

  var state = { minted: 0, burned: 0, remaining: 0, wallet: null, signer: null, provider: null };

  /* ---------- papan live ---------- */
  async function loadBoard() {
    try {
      var vals = await Promise.all([
        readNft("totalMinted"), readNft("totalBurned"), readNft("remainingSupply"),
        readClaim("poolBalance"), readClaim("totalKept"), readClaim("totalCollapsed"),
        readClaim("collapseAmount"), readLegacy("poolBalance"), readLegacy("totalClaimed"),
        readNft("mintOpen"), readClaim("claimOpen")
      ]);
      state.minted = Number(vals[0]); state.burned = Number(vals[1]); state.remaining = Number(vals[2]);
      if ($("stMinted")) $("stMinted").textContent = fmt(state.minted.toString());
      if ($("stRemaining")) $("stRemaining").textContent = fmt(state.remaining.toString());
      if ($("stBurned")) $("stBurned").textContent = fmt(state.burned.toString());
      if ($("stIndex")) $("stIndex").textContent = fmtTok(vals[6]);
      if ($("stPool")) $("stPool").textContent = fmtTok(vals[3]);
      if ($("stKept")) $("stKept").textContent = fmt(Number(vals[4]).toString());
      if ($("stCollapsed")) $("stCollapsed").textContent = fmt(Number(vals[5]).toString());
      if ($("stLegacyPool")) $("stLegacyPool").textContent = fmtTok(vals[7]);
      if ($("stLegacyClaimed")) $("stLegacyClaimed").textContent = fmt(Number(vals[8]).toString());
      if ($("boardNote")) {
        $("boardNote").innerHTML = "Mint <b>" + (vals[9] ? "open" : "closed") + "</b> · Claim <b>" +
          (vals[10] ? "open" : "closed") + "</b> · Collapse Index pays <b>" + fmtTok(vals[6]) +
          " $TR0PIC</b> at " + fmt(state.remaining.toString()) + " works remaining";
      }
      renderWall();
    } catch (e) { /* papan dicoba lagi pada siklus berikut */ }
  }

  /* ---------- Living Wall ---------- */
  var wallDone = false;
  async function renderWall() {
    var wall = $("wall");
    if (!wall || wallDone || state.minted === 0) {
      if (wall && state.minted === 0 && !wallDone) {
        wall.innerHTML = "";
        for (var i = 1; i <= 24; i++) {
          var d = document.createElement("div");
          d.className = "tile empty"; d.textContent = "Nº " + i;
          wall.appendChild(d);
        }
        wallDone = true;
      }
      return;
    }
    wallDone = true;
    var show = Math.min(state.minted, 64);
    var start = state.minted - show + 1;
    var relic = state.remaining <= 500;
    var html = "";
    for (var id = start; id <= state.minted; id++) {
      html += '<div class="tile" id="tile' + id + '"><img loading="lazy" src="art/living/' + id +
        '.png" alt="Living Noise #' + id + '"><span class="tid">Nº ' + id + "</span></div>";
    }
    wall.innerHTML = html;
    var p = readProvider();
    var nft = new ethers.Contract(C.nft, NFT_ABI, p);
    var claim = new ethers.Contract(C.claim, CLAIM_ABI, p);
    for (var id2 = start; id2 <= state.minted; id2++) {
      (async function (tid) {
        var tile = $("tile" + tid);
        if (!tile) return;
        try { await nft.ownerOf(tid); }
        catch (e) { tile.classList.add("burned"); return; }
        try {
          var r = await claim.resolvedById(tid);
          if (Number(r) === 1) tile.classList.add("kept");
          if (Number(r) === 0 && relic) tile.classList.add("relic");
        } catch (e) {}
      })(id2);
    }
  }

  /* ---------- dompet ---------- */
  async function connect() {
    if (!window.ethereum) { alert("No wallet found. Open this page in a wallet browser, or mint through your agent."); return null; }
    var bp = new ethers.BrowserProvider(window.ethereum);
    var net = await bp.getNetwork();
    if (Number(net.chainId) !== 56) {
      try {
        await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x38" }] });
        bp = new ethers.BrowserProvider(window.ethereum);
      } catch (e) { alert("Switch your wallet to BNB Smart Chain (56)."); return null; }
    }
    state.provider = bp;
    state.signer = await bp.getSigner();
    state.wallet = await state.signer.getAddress();
    document.querySelectorAll(".connectBtn").forEach(function (b) { b.textContent = short(state.wallet); });
    refreshMintPanel(); refreshMyCounts();
    return state.wallet;
  }
  document.querySelectorAll(".connectBtn").forEach(function (b) {
    b.addEventListener("click", connect);
  });

  /* ---------- mint ---------- */
  async function refreshMintPanel() {
    var box = $("mintState");
    if (!box || !state.wallet) return;
    try {
      var p = readProvider();
      var nft = new ethers.Contract(C.nft, NFT_ABI, p);
      var holds = await nft.holdsAgentId(state.wallet);
      var used = await nft.freeUsed(state.wallet);
      var price = await nft.priceFor(state.wallet);
      var mine = await nft.mintedBy(state.wallet);
      var html = "Wallet <b>" + short(state.wallet) + "</b> · works minted <b>" + mine + " / 20</b> · Agent ID <b>" +
        (holds ? "held" : "not held") + "</b><br>";
      if (holds && !used) {
        var q = await nft.questionFor(state.wallet);
        var ops = ["+", "−", "×"];
        html += 'First work is <b>free</b>. Answer: <b>' + q[0] + " " + ops[Number(q[2])] + " " + q[1] + " = ?</b>";
        box.innerHTML = html;
        if ($("freeRow")) $("freeRow").style.display = "flex";
        if ($("paidRow")) $("paidRow").style.display = "none";
      } else {
        html += "Next work price: <b>" + fmtBnb(price) + "</b>" + (holds && used ? " · free work used" : "");
        box.innerHTML = html;
        if ($("freeRow")) $("freeRow").style.display = "none";
        if ($("paidRow")) $("paidRow").style.display = "flex";
        state.nextPrice = price;
      }
    } catch (e) { box.textContent = "Could not read wallet state. Try again."; }
  }
  async function refreshMyCounts() {
    if (!state.wallet || !$("myWorks")) return;
    try {
      var bal = await readNft("balanceOf", [state.wallet]);
      $("myWorks").textContent = Number(bal);
    } catch (e) {}
  }
  if ($("btnFree")) $("btnFree").addEventListener("click", async function () {
    if (!state.wallet && !(await connect())) return;
    var ans = $("freeAnswer").value.trim();
    if (!/^\d+$/.test(ans)) { $("mintStatus").innerHTML = '<span class="bad">Enter the answer as a number.</span>'; return; }
    try {
      $("mintStatus").textContent = "Sending free mint…";
      var nft = new ethers.Contract(C.nft, NFT_ABI, state.signer);
      var tx = await nft.mintFree(BigInt(ans));
      $("mintStatus").innerHTML = "Transaction sent. Waiting…";
      await tx.wait();
      $("mintStatus").innerHTML = '<span class="ok">Minted. Your living work is on chain.</span>';
      loadBoard(); refreshMintPanel(); refreshMyCounts();
    } catch (e) { $("mintStatus").innerHTML = '<span class="bad">Mint failed: ' + (e.shortMessage || e.message || "rejected") + "</span>"; }
  });
  if ($("btnPaid")) $("btnPaid").addEventListener("click", async function () {
    if (!state.wallet && !(await connect())) return;
    try {
      var price = state.nextPrice;
      if (price === undefined) { await refreshMintPanel(); price = state.nextPrice; }
      $("mintStatus").textContent = "Sending paid mint…";
      var nft = new ethers.Contract(C.nft, NFT_ABI, state.signer);
      var tx = await nft.mintPaid({ value: price });
      await tx.wait();
      $("mintStatus").innerHTML = '<span class="ok">Minted. Your living work is on chain.</span>';
      loadBoard(); refreshMintPanel(); refreshMyCounts();
    } catch (e) { $("mintStatus").innerHTML = '<span class="bad">Mint failed: ' + (e.shortMessage || e.message || "rejected") + "</span>"; }
  });

  /* ---------- klaim Dua Pintu ---------- */
  var doorState = {};
  if ($("btnCheckWork")) $("btnCheckWork").addEventListener("click", async function () {
    var id = parseInt($("workId").value, 10);
    var st = $("workStatus");
    if (!id || id < 1 || id > C.supply) { st.innerHTML = '<span class="bad">Enter a work number, 1 to 3.333.</span>'; return; }
    st.textContent = "Reading work Nº " + id + "…";
    try {
      var owner = await readNft("ownerOf", [id]).catch(function () { return null; });
      if (!owner) { st.innerHTML = "Work Nº " + id + " is <b>burned</b> or not minted yet."; $("doorsBox").style.display = "none"; return; }
      var resolved = Number(await readClaim("resolvedById", [id]));
      var fees = await Promise.all([readClaim("feeLowWei"), readClaim("feeHighWei"), readClaim("keepAmount"), readClaim("collapseAmount")]);
      doorState = { id: id, feeLow: fees[0], feeHigh: fees[1] };
      var mine = state.wallet && owner.toLowerCase() === state.wallet.toLowerCase();
      st.innerHTML = "Owner <b>" + short(owner) + "</b>" + (mine ? ' · <span class="ok">yours</span>' : " · not your wallet") +
        (resolved === 1 ? " · door taken: <b>KEEP</b>" : resolved === 2 ? " · door taken: <b>COLLAPSE</b>" : " · no door taken yet");
      if ($("keepAmt")) $("keepAmt").textContent = fmtTok(fees[2]);
      if ($("keepFee")) $("keepFee").textContent = "Fee " + fmtBnb(fees[0]) + " · NFT stays alive";
      if ($("colAmt")) $("colAmt").textContent = fmtTok(fees[3]);
      if ($("colFee")) $("colFee").textContent = "Fee " + fmtBnb(fees[1]) + " · NFT burns forever";
      $("doorsBox").style.display = resolved === 0 ? "grid" : "none";
    } catch (e) { st.innerHTML = '<span class="bad">Read failed. Try again.</span>'; }
  });
  async function door(kind) {
    if (!doorState.id) return;
    if (!state.wallet && !(await connect())) return;
    var st = $("workStatus");
    try {
      st.textContent = kind === "keep" ? "Keeping…" : "Collapsing…";
      var claim = new ethers.Contract(C.claim, CLAIM_ABI, state.signer);
      var tx = kind === "keep"
        ? await claim.keepClaim(doorState.id, { value: doorState.feeLow })
        : await claim.collapseBurn(doorState.id, { value: doorState.feeHigh });
      await tx.wait();
      st.innerHTML = '<span class="ok">Done. $TR0PIC is in your wallet.</span>';
      loadBoard();
    } catch (e) { st.innerHTML = '<span class="bad">Failed: ' + (e.shortMessage || e.message || "rejected") + "</span>"; }
  }
  if ($("btnKeep")) $("btnKeep").addEventListener("click", function () { door("keep"); });
  if ($("btnCollapse")) $("btnCollapse").addEventListener("click", function () { door("collapse"); });

  /* ---------- klaim legacy ---------- */
  var proofsCache = null;
  async function getProofs() {
    if (proofsCache) return proofsCache;
    var r = await fetch("js/legacy-proofs.json");
    proofsCache = await r.json();
    return proofsCache;
  }
  if ($("btnCheckLegacy")) $("btnCheckLegacy").addEventListener("click", async function () {
    var id = parseInt($("legacyId").value, 10);
    var st = $("legacyStatus");
    if (!id || id < 1 || id > C.legacyMax) { st.innerHTML = '<span class="bad">Snapshot covers Nº 1 to 424.</span>'; return; }
    st.textContent = "Reading legacy work Nº " + id + "…";
    try {
      var proofs = await getProofs();
      var proof = proofs[String(id)];
      var oldAddr = id <= C.split ? C.old1 : C.old2;
      var p = readProvider();
      var old = new ethers.Contract(oldAddr, ERC721_ABI, p);
      var owner = await old.ownerOf(id).catch(function () { return null; });
      var claimed = await readLegacy("claimedById", [id]);
      var elig = await readLegacy("isEligible", [id, proof]);
      window._legacySel = { id: id, proof: proof };
      var mine = state.wallet && owner && owner.toLowerCase() === state.wallet.toLowerCase();
      st.innerHTML = "Contract <b>" + (id <= C.split ? "I" : "II") + "</b> · owner <b>" + (owner ? short(owner) : "none") + "</b>" +
        (mine ? ' · <span class="ok">yours</span>' : "") +
        " · in snapshot <b>" + (elig ? "yes" : "no") + "</b> · claimed <b>" + (claimed ? "yes" : "no") + "</b>";
      $("btnLegacyClaim").style.display = elig && !claimed ? "inline-block" : "none";
    } catch (e) { st.innerHTML = '<span class="bad">Read failed. Try again.</span>'; }
  });
  if ($("btnLegacyClaim")) $("btnLegacyClaim").addEventListener("click", async function () {
    if (!window._legacySel) return;
    if (!state.wallet && !(await connect())) return;
    var st = $("legacyStatus");
    try {
      st.textContent = "Claiming legacy…";
      var legacy = new ethers.Contract(C.legacy, LEGACY_ABI, state.signer);
      var tx = await legacy.claim(window._legacySel.id, window._legacySel.proof);
      await tx.wait();
      st.innerHTML = '<span class="ok">Done. 250.000 $TR0PIC claimed, no fee.</span>';
      loadBoard();
    } catch (e) { st.innerHTML = '<span class="bad">Failed: ' + (e.shortMessage || e.message || "rejected") + "</span>"; }
  });

  /* ---------- panggung hero: fase harian ---------- */
  (function stage() {
    var main = $("stageMain"), sideA = $("stageSideA"), sideB = $("stageSideB");
    if (!main) return;
    var day = Math.floor(Date.now() / 86400000);
    var a = (day % 12) + 1, b = ((day + 4) % 12) + 1, c2 = ((day + 8) % 12) + 1;
    main.src = "art/living/" + a + ".gif";
    if (sideA) sideA.src = "art/living/" + b + ".png";
    if (sideB) sideB.src = "art/living/" + c2 + ".png";
    if ($("stageCap")) $("stageCap").innerHTML = "On stage today: <b>Nº " + a + "</b>, <b>Nº " + b + "</b> and <b>Nº " + c2 + "</b> · phase of " + new Date().toISOString().slice(0, 10) + " UTC";
  })();

  loadBoard();
  setInterval(loadBoard, 60000);
})();
