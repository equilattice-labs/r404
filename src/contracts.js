export const HOODRADAR_REGISTRY_ABI = [
  { type: 'function', name: 'signalCount', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'signals', stateMutability: 'view', inputs: [{ name: '', type: 'uint256' }], outputs: [{ name: 'curator', type: 'address' }, { name: 'project', type: 'address' }, { name: 'ticker', type: 'string' }, { name: 'evidenceURI', type: 'string' }, { name: 'score', type: 'uint8' }, { name: 'createdAt', type: 'uint64' }, { name: 'expiresAt', type: 'uint64' }, { name: 'attestations', type: 'uint32' }, { name: 'challenges', type: 'uint32' }, { name: 'resolved', type: 'bool' }] }
]

// Set VITE_HOODRADAR_REGISTRY after deployment. Keeping the address in env makes
// the same frontend build portable between testnet and mainnet.
export const HOODRADAR_REGISTRY_ADDRESS = import.meta.env.VITE_HOODRADAR_REGISTRY || '0x0000000000000000000000000000000000000000'
