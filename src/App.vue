<script setup>
import { computed, onMounted, ref } from 'vue'
import { createPublicClient, custom, formatEther, http } from 'viem'
import { SCRYV_REGISTRY_ABI, SCRYV_REGISTRY_ADDRESS } from './contracts'

const CHAIN_ID = 46630
const CHAIN_HEX = '0xb626'
const RPC_URL = 'https://rpc.testnet.chain.robinhood.com/rpc'
const EXPLORER = 'https://explorer.testnet.chain.robinhood.com'

const wallet = ref('')
const networkReady = ref(false)
const notice = ref('')
const activeTab = ref('radar')
const query = ref('')
const sort = ref('signal')
const isConnecting = ref(false)
const registryCount = ref(null)
const registryError = ref('')

const signals = ref([
  { name: 'LumaLoop', ticker: 'LUMA', address: '0x7f...a812', heat: 78, velocity: '+24.8%', liquidity: '$188K', age: '2h 14m', status: 'building' },
  { name: 'Common Thread', ticker: 'THREAD', address: '0x19...d04b', heat: 64, velocity: '+11.2%', liquidity: '$92K', age: '5h 06m', status: 'steady' },
  { name: 'Pebble Finance', ticker: 'PEBBLE', address: '0xa3...102e', heat: 53, velocity: '+7.4%', liquidity: '$61K', age: '8h 32m', status: 'early' },
  { name: 'Orbit Orchard', ticker: 'ORCH', address: '0x41...c0fe', heat: 42, velocity: '-2.1%', liquidity: '$45K', age: '11h 08m', status: 'cooling' }
])

const filteredSignals = computed(() => {
  const needle = query.value.toLowerCase().trim()
  const list = signals.value.filter(s => !needle || `${s.name} ${s.ticker}`.toLowerCase().includes(needle))
  return [...list].sort((a, b) => sort.value === 'liquidity' ? parseInt(b.liquidity.replace(/[$K]/g, '')) - parseInt(a.liquidity.replace(/[$K]/g, '')) : b.heat - a.heat)
})

const shortWallet = computed(() => wallet.value ? `${wallet.value.slice(0, 6)}...${wallet.value.slice(-4)}` : '')
const publicClient = computed(() => window.ethereum ? createPublicClient({ transport: custom(window.ethereum) }) : createPublicClient({ transport: http(RPC_URL) }))
const registryDeployed = computed(() => !SCRYV_REGISTRY_ADDRESS.match(/^0x0{40}$/i))

async function addNetwork() {
  if (!window.ethereum) return
  try {
    await window.ethereum.request({ method: 'wallet_addEthereumChain', params: [{ chainId: CHAIN_HEX, chainName: 'Robinhood Chain Testnet', nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: [RPC_URL], blockExplorerUrls: [EXPLORER] }] })
    networkReady.value = true
    notice.value = 'Robinhood Chain Testnet added to your wallet.'
  } catch (error) { notice.value = error?.message || 'Could not add the network.' }
}

async function connectWallet() {
  if (!window.ethereum) { notice.value = 'Install MetaMask or another EVM wallet to connect.'; return }
  isConnecting.value = true
  try {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
    wallet.value = accounts[0]
    const chain = await window.ethereum.request({ method: 'eth_chainId' })
    if (parseInt(chain, 16) !== CHAIN_ID) await addNetwork()
    else { networkReady.value = true; notice.value = 'Wallet connected to Robinhood Chain Testnet.' }
  } catch (error) { notice.value = error?.message || 'Wallet connection was cancelled.' }
  finally { isConnecting.value = false }
}

async function readBalance() {
  if (!wallet.value) return
  try {
    const balance = await publicClient.value.getBalance({ address: wallet.value })
    notice.value = `Testnet balance: ${Number(formatEther(balance)).toFixed(4)} ETH`
  } catch { notice.value = 'Balance is not available yet.' }
}

function copyContract() {
  navigator.clipboard?.writeText(SCRYV_REGISTRY_ADDRESS)
  notice.value = SCRYV_REGISTRY_ADDRESS.startsWith('0x000000000000') ? 'Registry is ready for deployment - set VITE_SCRYV_REGISTRY after the testnet transaction.' : 'Registry contract address copied.'
}

async function refreshRegistry() {
  if (!registryDeployed.value) return
  try {
    registryCount.value = await publicClient.value.readContract({ address: SCRYV_REGISTRY_ADDRESS, abi: SCRYV_REGISTRY_ABI, functionName: 'signalCount' })
    registryError.value = ''
  } catch {
    registryError.value = 'Registry unavailable'
  }
}

onMounted(refreshRegistry)
</script>

<template>
  <div class="app-shell">
    <div class="noise"></div>
    <header class="topbar">
      <a class="brand" href="#top" aria-label="Scryv home"><svg class="brand-mark" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><circle cx="32" cy="32" r="25.5" fill="#0d141e" stroke="#293647"/><path d="M13.5 20.5A22 22 0 0 1 48.5 13.5" fill="none" stroke="#6ee7ff" stroke-width="1.6" stroke-linecap="round"/><path d="M50.5 43.5A22 22 0 0 1 16 51" fill="none" stroke="#a8ff5c" stroke-opacity=".45" stroke-width="1.6" stroke-linecap="round"/><path d="M45 17.5H27.5C19.7 17.5 15 21 15 26.9s4.5 8.8 12.4 8.8H36c7.8 0 12.5 3.4 12.5 9.1S43.8 54 36 54H18" fill="none" stroke="#a8ff5c" stroke-width="5.5" stroke-linecap="square" stroke-linejoin="round"/><path d="M35.5 35.5 50 21" fill="none" stroke="#6ee7ff" stroke-width="2.25" stroke-linecap="round"/><circle cx="35.5" cy="35.5" r="3" fill="#080b12" stroke="#a8ff5c" stroke-width="1.5"/><path d="M50 16v10M45 21h10" fill="none" stroke="#6ee7ff" stroke-opacity=".38"/><circle cx="50" cy="21" r="2.4" fill="#6ee7ff"/></svg><span>SCRY<span class="brand-dim">V</span></span></a>
      <nav><a href="#radar">Live radar</a><a href="#thesis">Thesis</a><a href="#protocol">Protocol</a><a href="#signal">Signal notes</a></nav>
      <button class="wallet-btn" :class="{ connected: wallet }" @click="wallet ? readBalance() : connectWallet()"><span class="dot"></span>{{ wallet ? shortWallet : (isConnecting ? 'Connecting...' : 'Connect wallet') }}</button>
    </header>

    <main id="top">
      <section class="hero section-grid">
        <div class="hero-copy">
          <div class="eyebrow"><span class="pulse"></span> ROBINHOOD CHAIN / TESTNET LIVE</div>
          <h1>See the signal<br /><em>before the crowd.</em></h1>
          <p class="lede">Scryv is the calm layer for Robinhood Chain. We turn noisy on-chain motion into a shared map of conviction - so builders, traders, and communities can move with context.</p>
          <div class="hero-actions"><a class="primary-btn" href="#radar">Open the radar <span>&nearr;</span></a><button class="text-btn" @click="connectWallet">Launch on testnet <span>&rarr;</span></button></div>
          <div class="hero-proof"><div><strong>1,842</strong><span>tokens indexed</span></div><div><strong>42s</strong><span>signal refresh</span></div><div><strong>0%</strong><span>shill tolerance</span></div></div>
        </div>
        <div class="hero-visual" aria-label="Animated radar visualization">
          <div class="radar-orbit orbit-a"></div><div class="radar-orbit orbit-b"></div><div class="radar-orbit orbit-c"></div><div class="radar-cross cross-x"></div><div class="radar-cross cross-y"></div><div class="radar-sweep"></div><div class="radar-core"><span>SV</span></div>
          <span class="signal-dot d1"></span><span class="signal-dot d2"></span><span class="signal-dot d3"></span><span class="signal-dot d4"></span>
          <div class="orbit-label l1">LUMA <b>+24.8%</b></div><div class="orbit-label l2">THREAD <b>+11.2%</b></div><div class="orbit-label l3">PEBBLE <b>+7.4%</b></div>
          <div class="visual-caption"><span class="live-dot"></span> SIGNAL FIELD / 06:42:18 UTC</div>
        </div>
      </section>

      <section id="radar" class="radar-section section-grid">
        <div class="section-heading"><div><div class="eyebrow">01 / THE RADAR</div><h2>A quieter way<br />to find <em>momentum.</em></h2></div><p>Not the loudest coin. Not the last one standing. Scryv scores the middle - the projects where attention, liquidity, and shipping velocity start agreeing.</p></div>
        <div class="radar-toolbar"><div class="tabs"><button :class="{active: activeTab === 'radar'}" @click="activeTab='radar'">Signal map</button><button :class="{active: activeTab === 'watchlist'}" @click="activeTab='watchlist'">Your watchlist <span class="count">03</span></button></div><div class="controls"><label class="search"><span>&#9906;</span><input v-model="query" placeholder="Find a signal" /></label><select v-model="sort"><option value="signal">Sort: signal score</option><option value="liquidity">Sort: liquidity</option></select></div></div>
        <div class="table-wrap"><table><thead><tr><th>Project</th><th>Signal score</th><th>Velocity / 24h</th><th>Liquidity</th><th>Age</th><th></th></tr></thead><tbody><tr v-for="(signal, i) in filteredSignals" :key="signal.ticker"><td><div class="project-cell"><span class="token-icon" :class="`tone-${i+1}`">{{ signal.ticker.slice(0,1) }}</span><span><strong>{{ signal.name }}</strong><small>{{ signal.ticker }} / {{ signal.address }}</small></span></div></td><td><div class="score"><span class="score-bar"><i :style="{width: signal.heat + '%'}"></i></span><b>{{ signal.heat }}</b><span class="status">{{ signal.status }}</span></div></td><td :class="signal.velocity.startsWith('-') ? 'negative' : 'positive'">{{ signal.velocity }}</td><td>{{ signal.liquidity }}</td><td class="muted">{{ signal.age }}</td><td><button class="row-arrow">&nearr;</button></td></tr></tbody></table></div>
        <div class="table-foot"><span><i class="live-dot"></i> Updating every 42 seconds</span><a href="https://explorer.testnet.chain.robinhood.com" target="_blank">View chain explorer &nearr;</a></div>
      </section>

      <section id="thesis" class="thesis-section section-grid"><div class="section-heading"><div><div class="eyebrow">02 / THE THESIS</div><h2>Less noise.<br /><em>More signal.</em></h2></div><p>Scryv is built around a simple belief: early conviction leaves a pattern. We make that pattern legible without turning every new wallet into a casino.</p></div><div class="principles"><article><span>01</span><h3>Map the middle</h3><p>Catch projects with rising attention and intact liquidity - before the chart becomes a headline.</p><a href="#radar">Read the method &nearr;</a></article><article><span>02</span><h3>Reward the work</h3><p>Shipping velocity, holder quality, and transparent treasuries outrank vanity volume.</p><a href="#protocol">Explore the protocol &nearr;</a></article><article><span>03</span><h3>Stay composable</h3><p>Open data, portable lists, and a community-owned signal layer that any Robinhood builder can extend.</p><a href="#signal">Join signal notes &nearr;</a></article></div></section>

      <section id="protocol" class="protocol-section"><div class="protocol-card"><div class="eyebrow">03 / THE PROTOCOL</div><h2>An open radar<br /><em>for an open chain.</em></h2><p>The Scryv Protocol turns signal contributions into a public good. Curators stake reputation, communities publish attestations, and every score can be traced to its source.</p><div class="protocol-stats"><div><strong>SCRY</strong><span>native reputation unit</span></div><div><strong>7 / 9</strong><span>attestation threshold</span></div><div><strong>24h</strong><span>challenge window</span></div></div><div class="registry-state" :class="{ ready: registryDeployed }"><span class="dot"></span><span v-if="registryDeployed">Registry live / {{ registryCount === null ? 'syncing' : `${registryCount} signals` }}</span><span v-else>Registry deployment pending</span><button v-if="registryDeployed" class="refresh-registry" @click="refreshRegistry">Refresh</button></div><button class="outline-btn" @click="copyContract">{{ registryDeployed ? 'Copy registry address' : 'View deployment status' }} <span>&nearr;</span></button></div><div class="protocol-art"><div class="grid-lines"></div><div class="protocol-ring ring-one"></div><div class="protocol-ring ring-two"></div><div class="protocol-ring ring-three"></div><span class="protocol-node n-one">curators</span><span class="protocol-node n-two">builders</span><span class="protocol-node n-three">signal</span><span class="protocol-node n-four">community</span><div class="protocol-center">SV<span>protocol</span></div></div></section>

      <section id="signal" class="notes-section section-grid"><div class="section-heading"><div><div class="eyebrow">04 / SIGNAL NOTES</div><h2>Field notes<br /><em>from the edge.</em></h2></div><p>Short dispatches on what is shipping, what is shifting, and where the next useful primitive on Robinhood Chain might emerge.</p></div><div class="notes-grid"><article><span class="note-meta">FIELD NOTE 014 / 6 MIN READ</span><h3>The "middle" is not a compromise. It is a strategy.</h3><p>Why the most durable communities often begin in the gap between zero attention and total mania.</p><a href="#">Read dispatch &nearr;</a></article><article><span class="note-meta">FIELD NOTE 013 / 4 MIN READ</span><h3>What a healthy liquidity curve looks like at 3am.</h3><p>A visual guide to separating real participation from a single wallet making noise.</p><a href="#">Read dispatch &nearr;</a></article><article><span class="note-meta">FIELD NOTE 012 / 8 MIN READ</span><h3>Robinhood Chain is an interface, not a destination.</h3><p>The primitives that make a consumer-first chain feel like a place to build.</p><a href="#">Read dispatch &nearr;</a></article></div></section>
    </main>

    <footer><div class="footer-brand"><svg class="brand-mark" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><circle cx="32" cy="32" r="25.5" fill="#0d141e" stroke="#293647"/><path d="M13.5 20.5A22 22 0 0 1 48.5 13.5" fill="none" stroke="#6ee7ff" stroke-width="1.6" stroke-linecap="round"/><path d="M50.5 43.5A22 22 0 0 1 16 51" fill="none" stroke="#a8ff5c" stroke-opacity=".45" stroke-width="1.6" stroke-linecap="round"/><path d="M45 17.5H27.5C19.7 17.5 15 21 15 26.9s4.5 8.8 12.4 8.8H36c7.8 0 12.5 3.4 12.5 9.1S43.8 54 36 54H18" fill="none" stroke="#a8ff5c" stroke-width="5.5" stroke-linecap="square" stroke-linejoin="round"/><path d="M35.5 35.5 50 21" fill="none" stroke="#6ee7ff" stroke-width="2.25" stroke-linecap="round"/><circle cx="35.5" cy="35.5" r="3" fill="#080b12" stroke="#a8ff5c" stroke-width="1.5"/><path d="M50 16v10M45 21h10" fill="none" stroke="#6ee7ff" stroke-opacity=".38"/><circle cx="50" cy="21" r="2.4" fill="#6ee7ff"/></svg><span>SCRYV</span></div><p>Conviction signals for Robinhood Chain.</p><div class="footer-links"><a href="https://x.com/Scryv_fun" target="_blank">X / @Scryv_fun</a><a href="mailto:hello@scryv.fun">Contact</a><a href="#top">Back to top &uarr;</a></div><small>&copy; 2026 Scryv. Built in public on Robinhood Chain.</small></footer>
    <div v-if="notice" class="toast" @click="notice=''">{{ notice }} <span>&times;</span></div>
  </div>
</template>

