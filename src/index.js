import createPlugin from "@extism/extism";
import { connect } from "nats";

let natsConn;

async function requireNatsConn(natsServers) {
  if (!natsConn) {
    natsConn = await connect(natsServers);

    console.log("successfully required nats connection");
  }
}

async function runModule(
  path,
  subject,
  pluginConfig,
  params,
  natsServers = {},
) {
  const plugin = await createPlugin(path, pluginConfig);
  const input = new TextEncoder().encode(JSON.stringify(params));
  const output = await plugin.call("_main", input);

  const textOutput = new TextDecoder().decode(output.buffer);

  await requireNatsConn(natsServers);
  natsConn.publish(subject, textOutput);
  await natsConn.flush();

  return JSON.parse(textOutput);
}

export default runModule;
