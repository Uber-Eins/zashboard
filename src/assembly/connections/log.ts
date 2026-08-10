import { stripAnsi } from '@/helper/ansi'
import type { ClashConnectionRawMessage, Connection } from '@/types'
import * as ipaddr from 'ipaddr.js'
import { normalizeConnectionEndpoint, splitConnectionEndpoint } from './endpoint'

export type MihomoLogConnectionReference = {
  source: string
  destination: string
  network: string
  url?: string
  process?: string
  uid?: number
  rule?: string
  rulePayload?: string
  chains: string[]
}

export type LogConnectionReference = { id: string } | MihomoLogConnectionReference

// sing-box 日志以连接 id 开头,如 [3829292130 5ms] router: match[0]
export const getLogConnectionID = (payload: string) => {
  return stripAnsi(payload).match(/^\[(\d+)\s[^\]]*\]/)?.[1] ?? null
}

// mihomo 成功建立连接时的日志格式：
// [TCP] source(process, uid=1000) --> destination match Rule(payload) using Proxy
// destination 既可能是 host:port，也可能是 MITM/明文 HTTP 的完整 URL。
export const getMihomoLogConnectionReference = (
  payload: string,
): MihomoLogConnectionReference | null => {
  const match = stripAnsi(payload).match(
    /^\[(tcp|udp)\]\s+(\[[^\]]+\]:\d+|[^\s()[\]]+:\d+)(?:\((.*?)\))?\s+-->\s+(\S+?)(?:\s+(?:match\s+(.+?)|doesn't match any rule))?\s+using\s+(.+?)\s*$/i,
  )
  if (!match) return null

  const [, network, source, sourceDetail = '', destination, rawRule, chain] = match
  const uidMatch = sourceDetail.match(/(?:^|,\s*)uid=(\d+)$/i)
  const process = sourceDetail.replace(/(?:,\s*)?uid=\d+$/i, '').trim()
  const ruleMatch = rawRule?.match(/^([^()]+)\((.*)\)$/)

  return {
    source,
    destination,
    network: network.toLowerCase(),
    url: /^https?:\/\//i.test(destination) ? destination : undefined,
    process: process || undefined,
    uid: uidMatch ? Number(uidMatch[1]) : undefined,
    rule: ruleMatch?.[1] ?? rawRule,
    rulePayload: ruleMatch?.[2],
    chains: chain ? [chain] : [],
  }
}

const asClash = (connection: Connection) =>
  'metadata' in connection ? (connection as ClashConnectionRawMessage) : null

const connectionURL = (connection: Connection) => asClash(connection)?.metadata.url

const connectionSource = (connection: Connection) => {
  const metadata = asClash(connection)?.metadata
  if (!metadata) return ''

  const { sourceIP, sourcePort } = metadata
  return `${sourceIP.includes(':') ? `[${sourceIP}]` : sourceIP}:${sourcePort}`
}

const connectionDestination = (connection: Connection) => {
  const metadata = asClash(connection)?.metadata
  if (!metadata) return ''

  const host = metadata.host || metadata.sniffHost || metadata.destinationIP
  return `${host.includes(':') ? `[${host}]` : host}:${metadata.destinationPort}`
}

const findConnectionByLogReference = (
  candidates: Connection[],
  reference: MihomoLogConnectionReference,
) => {
  const source = normalizeConnectionEndpoint(reference.source)
  const destination = normalizeConnectionEndpoint(reference.destination)

  // 来源端口在同一时刻最具辨识度；URL、目的地址与网络类型依次用于消除历史端口复用歧义。
  return candidates.reduce<{ connection: Connection; score: number } | null>((best, connection) => {
    const metadata = asClash(connection)?.metadata
    if (!metadata) return best

    const sourceMatches = normalizeConnectionEndpoint(connectionSource(connection)) === source
    const urlMatches = !!reference.url && connectionURL(connection) === reference.url
    if (!sourceMatches && !urlMatches) return best

    const score =
      (sourceMatches ? 8 : 0) +
      (urlMatches ? 4 : 0) +
      (normalizeConnectionEndpoint(connectionDestination(connection)) === destination ? 2 : 0) +
      (metadata.network.toLowerCase() === reference.network ? 1 : 0)

    return !best || score > best.score ? { connection, score } : best
  }, null)?.connection
}

const createConnectionFromLogReference = (reference: MihomoLogConnectionReference): Connection => {
  const [sourceIP, sourcePort] = splitConnectionEndpoint(reference.source)
  const [destinationHost, destinationPort] = splitConnectionEndpoint(reference.destination)
  const destinationIsIP = ipaddr.isValid(destinationHost)

  return {
    id: '',
    download: 0,
    upload: 0,
    downloadSpeed: 0,
    uploadSpeed: 0,
    chains: reference.chains,
    rule: reference.rule ?? '',
    rulePayload: reference.rulePayload ?? '',
    start: new Date().toISOString(),
    metadata: {
      destinationGeoIP: '',
      destinationIP: destinationIsIP ? destinationHost : '',
      destinationIPASN: '',
      destinationPort,
      dnsMode: '',
      dscp: 0,
      host: destinationIsIP ? '' : destinationHost,
      inboundIP: '',
      inboundName: '',
      inboundPort: '',
      inboundUser: '',
      network: reference.network,
      process: reference.process ?? '',
      processPath: '',
      remoteDestination: reference.url ?? destinationHost,
      sniffHost: '',
      sourceGeoIP: '',
      sourceIP,
      sourceIPASN: '',
      sourcePort,
      specialProxy: '',
      specialRules: '',
      type: reference.url ? (/^https:/i.test(reference.url) ? 'HTTPS' : 'HTTP') : 'LOG',
      uid: reference.uid ?? 0,
      smartBlock: '',
      url: reference.url,
    },
  }
}

export const resolveLogConnection = (
  candidates: Connection[],
  reference: LogConnectionReference,
) => {
  if ('id' in reference) {
    return candidates.find(({ id }) => id === reference.id) ?? null
  }

  return (
    findConnectionByLogReference(candidates, reference) ??
    createConnectionFromLogReference(reference)
  )
}
