import { QueryClient, type FetchQueryOptions, type QueryKey } from '@tanstack/react-query'

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * Loads a query for the first render when it answers within `ms`, and never
 * holds the page longer. On the server a late answer is dropped rather than
 * cached: the SSR query integration would stream it to the browser after the
 * HTML already rendered a placeholder, and hydration would mismatch. The
 * browser then fetches it after hydrating instead.
 */
export async function preloadWithin<TData, TKey extends QueryKey>(
  queryClient: QueryClient,
  options: FetchQueryOptions<TData, Error, TData, TKey>,
  ms: number,
): Promise<void> {
  if (queryClient.getQueryData(options.queryKey) !== undefined) return
  if (typeof window !== 'undefined') {
    await Promise.race([queryClient.prefetchQuery(options), sleep(ms)])
    return
  }
  const late = Symbol('late')
  const result = await Promise.race([
    new QueryClient().fetchQuery(options).catch(() => late),
    sleep(ms).then(() => late),
  ])
  if (result !== late) queryClient.setQueryData<TData>(options.queryKey as QueryKey, result as TData)
}
