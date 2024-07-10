import createPlugin from '@extism/extism'
import { connect } from 'nats'

async function runModule(
  path,
  subject,
  pluginConfig,
  params,
  natsServers = {}
) {
  const plugin = await createPlugin(path, pluginConfig)
  const input = new TextEncoder().encode(JSON.stringify(params))
  const output = await plugin.call('_main', input)

  const textOutput = new TextDecoder().decode(output.buffer)

  const nc = await connect(natsServers)
  nc.publish(subject, textOutput)
  await nc.drain()

  return JSON.parse(textOutput)
}

export default runModule
