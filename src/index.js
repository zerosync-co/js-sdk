import createPlugin from '@extism/extism'

async function runModule(path, pluginConfig, params) {
  const plugin = await createPlugin(path, pluginConfig)

  const input = new TextEncoder().encode(JSON.stringify(params))
  const res = await plugin.call('_main', input)
  return JSON.parse(new TextDecoder().decode(res.buffer))
}

export default runModule
