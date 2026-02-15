import { createClient } from '@supabase/supabase-js'
import { resolveSupabaseEnv } from '../src/lib/supabaseEnv'

async function checkAuthSettings(url: string, key: string) {
  const response = await fetch(`${url}/auth/v1/settings`, {
    headers: { apikey: key },
  })

  const body = await response.text()

  if (!response.ok) {
    throw new Error(
      `Auth settings probe failed (${response.status}): ${body.slice(0, 240)}`,
    )
  }

  return body
}

async function checkExercisesTable(url: string, key: string) {
  const response = await fetch(`${url}/rest/v1/exercises?select=id&limit=1`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  })

  const body = await response.text()

  return {
    ok: response.ok,
    status: response.status,
    body,
  }
}

async function checkWithSupabaseJs(url: string, key: string) {
  const supabase = createClient(url, key)

  const { data, error, count } = await supabase
    .from('exercises')
    .select('id', { count: 'exact', head: false })
    .limit(1)

  return { data, error, count }
}

async function main() {
  console.log('🔎 Supabase database debug')

  const { url, key, urlSource, keySource } = resolveSupabaseEnv(process.env, {
    allowNonExpoFallback: true,
  })
  console.log(`- URL source: ${urlSource}`)
  console.log(`- KEY source: ${keySource}`)
  console.log(`- URL: ${url}`)
  console.log(`- Key prefix: ${key.slice(0, 15)}...`)

  await checkAuthSettings(url, key)
  console.log('✅ Auth endpoint reachable (/auth/v1/settings)')

  const restProbe = await checkExercisesTable(url, key)

  if (!restProbe.ok) {
    console.log(
      `❌ REST probe failed (/rest/v1/exercises): HTTP ${restProbe.status}`,
    )
    console.log(`- Response: ${restProbe.body.slice(0, 260)}`)

    if (restProbe.status === 404) {
      console.log(
        '- Hint: table public.exercises is likely missing. Apply supabase/seed.sql to this Supabase project.',
      )
    }

    process.exitCode = 1
    return
  }

  console.log('✅ REST probe succeeded (/rest/v1/exercises)')

  const sdkProbe = await checkWithSupabaseJs(url, key)

  if (sdkProbe.error) {
    console.log(`❌ Supabase JS query failed: ${sdkProbe.error.message}`)
    process.exitCode = 1
    return
  }

  console.log('✅ Supabase JS query succeeded (.from("exercises"))')
  console.log(
    `- Sample rows returned: ${sdkProbe.data?.length ?? 0}, table count: ${sdkProbe.count ?? 'unknown'}`,
  )
}

main().catch((error) => {
  console.error(
    `❌ Debug script failed: ${error instanceof Error ? error.message : String(error)}`,
  )
  process.exitCode = 1
})
