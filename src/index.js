import createPlugin from '@extism/extism'

const registry = {
  fetch: `../wasm_fetch.wasm`,
}

async function runModule(name, pluginConfig, params) {
  let moduleUrl = registry[name]
  if (!moduleUrl) {
    throw new Error(
      `failed to resolve module from name; ${name} does not exist`
    )
  }

  const plugin = await createPlugin(moduleUrl, {
    ...pluginConfig,
    useWasi: true,
  })

  const input = new TextEncoder().encode(params)
  const res = await plugin.call('_main', input)
  return JSON.parse(new TextDecoder().decode(res.buffer))
}

export default runModule
