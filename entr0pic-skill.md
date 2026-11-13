# Entr0pic · Living Noise — Agent Skill

Mint and claim instructions for AI agents acting for a wallet owner on BNB Smart Chain (chain ID 56).

## Contracts

- $TR0PIC token: 0x257F53b2BD1c2B551A90f8fF81bA76C7515139CE
- Living Noise NFT (NOISE): 0xBA5352A3A05Ec637394810D791a412E78A349247
- Two Doors claim: 0x389e8e5062960DF72FBB5c3519E0F2dc576f17bd
- Legacy claim: 0x2F8E4580e882e6dcb3D1DB5E21406B774ce07407
- Agent ID registry (gate): 0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F
- Old NOISE I (ids 1-297): 0x8624E24604D2177d127978f15B1c898853A4F6f8
- Old NOISE II (ids 298-424): 0x2E84B719e584Ff7933E84c873944719013A24B60

Supply 3.333 works, max 20 per wallet. All calls must come from an EOA (tx.origin == caller); contract wallets cannot mint or claim.

## Mint a free first work (Agent ID holders)

1. Check `holdsAgentId(wallet)` on Living Noise returns true and `freeUsed(wallet)` returns false.
2. Read `questionFor(wallet)` → (a, b, op): op 0 = a + b, op 1 = a - b, op 2 = a * b. Or read `answerFor(wallet)` directly.
3. Call `mintFree(answer)` with no value.

## Mint paid works (any wallet)

1. Read `priceFor(wallet)`: works 1-5 cost 0.0002 BNB, 6-10 cost 0.0004 BNB, 11-20 cost 0.0008 BNB. A price of 0 means a free mint is required first (Agent ID path above).
2. Call `mintPaid()` sending exactly that value. Payment forwards to a project wallet in a same transaction.

## Claim $TR0PIC: Two Doors (per work, once, permanent)

Check `resolvedById(id)` on a claim contract: 0 = no door taken, 1 = KEEP, 2 = COLLAPSE. Only a current `ownerOf(id)` on Living Noise may claim.

- KEEP: call `keepClaim(id)` with value = `feeLowWei()` (259796492747347 wei). Pays 250.000 $TR0PIC, work stays alive.
- COLLAPSE: call `collapseBurn(id)` with value = `feeHighWei()` (519592985494694 wei). Burns a work forever. Pays `collapseAmount()` at call time, by remaining supply before burn: above 2.500 remaining pays 750.000, 1.501-2.500 pays 1.000.000, 501-1.500 pays 1.500.000, last 500 pays 2.500.000 $TR0PIC.

Warn an owner before COLLAPSE: burning is irreversible.

## Claim legacy (original NOISE holders)

Snapshot covers old works Nº 1 to 424, one claim of 250.000 $TR0PIC per work, no fee, old work is not burned.

1. Fetch a Merkle proof for an id from https://entr0pic.com/js/legacy-proofs.json (map of id to bytes32 array).
2. Check `isEligible(id, proof)` and `claimedById(id)` on a legacy claim contract.
3. Owner of an old work (contract I for id ≤ 297, contract II above) calls `claim(id, proof)` on a legacy claim contract.

## Notes

- Verify mint is open with `mintOpen()` and claims with `claimOpen()` before sending transactions.
- $TR0PIC pool opens on Uniswap on Friday, 20 November 2026. No official pool exists before that date.
- Site: https://entr0pic.com · X: @entr0picom
