/**
 * Typed Supabase query helper.
 * Until we connect a real Supabase project and run `npx supabase gen types typescript`,
 * we cast the client to `any` for table operations to avoid `never` type errors.
 *
 * Usage:
 *   const admin = getSupabaseAdminClient()
 *   const { data } = await db(admin).from('submissions').select('*')
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function db(client: unknown): any {
  return client
}
