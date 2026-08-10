const getConnectionSourceEndpoint = (source = '') =>
  source.match(/^(\[[^\]]+\]:\d+|[^\s()[\]]+:\d+)/)?.[1] ?? source

export const splitConnectionEndpoint = (value = ''): [string, string] => {
  const endpoint = getConnectionSourceEndpoint(value)

  if (/^https?:\/\//i.test(endpoint)) {
    try {
      const url = new URL(endpoint)
      return [
        url.hostname.replace(/^\[|\]$/g, ''),
        url.port || (url.protocol === 'https:' ? '443' : '80'),
      ]
    } catch {
      return [endpoint, '']
    }
  }

  const ipv6 = endpoint.match(/^\[([^\]]+)\]:(\d+)$/)
  if (ipv6) return [ipv6[1], ipv6[2]]

  const separator = endpoint.lastIndexOf(':')
  if (separator === -1) return [endpoint, '']
  return [endpoint.slice(0, separator), endpoint.slice(separator + 1)]
}

export const normalizeConnectionEndpoint = (endpoint: string) => {
  const [host, port] = splitConnectionEndpoint(endpoint)
  if (!port) return endpoint.toLowerCase()

  const normalizedHost = host.toLowerCase()
  return `${normalizedHost.includes(':') ? `[${normalizedHost}]` : normalizedHost}:${port}`
}
