// Entr0pic Noise — browser chain reader (GitHub Pages mirror).
// Replicates the former /api endpoints by reading BNB Chain directly,
// so the static site needs no server. Same contracts, same semantics.
(function (root) {
  'use strict';
  const ADDRESS = '0x8624E24604D2177d127978f15B1c898853A4F6f8';   // contract I (#1-#297)
  const ADDRESS2 = '0x2E84B719e584Ff7933E84c873944719013A24B60';  // contract II (#298 onward)
  const MC = '0xcA11bde05977b3631167028862bE2a173976CA11';
  const ABI = ['function seedOf(uint256) view returns (uint256)', 'function totalSupply() view returns (uint256)',
    'function stats(address) view returns (uint256,uint256,uint256,bool,bool,bool)', 'function mintOpen() view returns (bool)'];
  const RPCS = ['https://bsc-dataseed.bnbchain.org', 'https://bsc-dataseed1.binance.org', 'https://bsc-rpc.publicnode.com'];
  let provider = null;
  function getProvider() {
    if (!provider) {
      provider = new ethers.FallbackProvider(RPCS.map((u, i) => ({
        provider: new ethers.JsonRpcProvider(u, 56, { staticNetwork: true }), priority: i + 1, stallTimeout: 1500,
      })), 56, { quorum: 1 });
    }
    return provider;
  }
  const noise = () => new ethers.Contract(ADDRESS, ABI, getProvider());
  const noise2 = () => new ethers.Contract(ADDRESS2, ABI, getProvider());
  async function active() {
    let open2 = false; try { open2 = await noise2().mintOpen(); } catch (e) {}
    return open2 ? { c: noise2(), address: ADDRESS2 } : { c: noise(), address: ADDRESS };
  }
  const hex = (s) => '0x' + s.toString(16).padStart(64, '0');
  async function seed(id) {
    let s = await noise().seedOf(id);
    if (s === 0n) { try { s = await noise2().seedOf(id); } catch (e) {} }
    return s === 0n ? null : hex(s);
  }
  async function stats(who) {
    const { c, address } = await active();
    const s = await c.stats(who || ethers.ZeroAddress);
    return { minted: Number(s[0]), priceWei: s[2].toString(), open: s[3], hasAgentId: s[4], hasMinted: s[5], max: 3333, contract: address };
  }
  async function recent() {
    const { c } = await active(); const n = Number(await c.totalSupply());
    const ids = []; for (let i = n; i > Math.max(0, n - 12); i--) ids.push(i);
    const seeds = await Promise.all(ids.map((i) => seed(i)));
    return { minted: n, items: ids.map((id, k) => ({ id, seed: seeds[k] })).filter((x) => x.seed) };
  }
  async function market() {
    const I = new ethers.Interface(['function seedOf(uint256) view returns (uint256)', 'function ownerOf(uint256) view returns (address)', 'function totalSupply() view returns (uint256)']);
    const mc = new ethers.Contract(MC, ['function aggregate3((address target,bool allowFailure,bytes callData)[] calls) view returns ((bool success,bytes returnData)[])'], getProvider());
    const sup = await mc.aggregate3([ADDRESS, ADDRESS2].map((t) => ({ target: t, allowFailure: true, callData: I.encodeFunctionData('totalSupply') })));
    const n = Math.max(...sup.map((r) => (r.success ? Number(I.decodeFunctionResult('totalSupply', r.returnData)[0]) : 0)));
    const ids = Array.from({ length: n }, (_, i) => i + 1);
    const items = [];
    for (let i = 0; i < ids.length; i += 100) {
      const chunk = ids.slice(i, i + 100);
      const calls = chunk.flatMap((id) => [ADDRESS, ADDRESS2].flatMap((t) => [
        { target: t, allowFailure: true, callData: I.encodeFunctionData('seedOf', [id]) },
        { target: t, allowFailure: true, callData: I.encodeFunctionData('ownerOf', [id]) }]));
      const r = await mc.aggregate3(calls);
      chunk.forEach((id, k) => {
        for (let j = 0; j < 2; j++) {
          const s = r[4 * k + 2 * j], o = r[4 * k + 2 * j + 1];
          if (!s.success || !o.success || s.returnData === '0x' || o.returnData === '0x') continue;
          const sv = I.decodeFunctionResult('seedOf', s.returnData)[0]; if (sv === 0n) continue;
          const contract = j ? ADDRESS2 : ADDRESS;
          const seedStr = hex(sv);
          const { traits } = root.Entr0pic.render(seedStr, id);
          items.push({ id, contract, seed: seedStr, owner: I.decodeFunctionResult('ownerOf', o.returnData)[0], form: traits.Form, palette: traits.Palette, state: traits.State, entropy: traits.Entropy,
            element: `https://element.market/assets/bsc/${contract}/${id}` });
          break;
        }
      });
    }
    return { chain: 'bsc', contracts: [ADDRESS, ADDRESS2], minted: items.length, owners: new Set(items.map((x) => x.owner.toLowerCase())).size, items };
  }
  root.Entr0picChain = { stats, recent, market, ADDRESS, ADDRESS2 };
})(typeof self !== 'undefined' ? self : this);
