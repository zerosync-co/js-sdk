import createPlugin from '@extism/extism'

const baseUrl = 'https://gihub.com/zerosync-co/js-sdk/blob/main'

const registry = {
  fetch: `${baseUrl}/wasm_fetch.wasm`,
}

async function runModule(name, pluginConfig, params) {
  let moduleUrl = registry[name]
  if (!moduleUrl) {
    throw new Error(
      `failed to resolve module from name; ${name} does not exist`
    )
  }

  const plugin = await createPlugin(
    {
      url: moduleUrl,
    },
    {
      ...pluginConfig,
      useWasi: true,
    }
  )

  const input = new TextEncoder().encode(params)
  const res = await plugin.call('_main', input)
  return JSON.parse(new TextDecoder().decode(res.buffer))
}

export default runModule