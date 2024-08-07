import { createPlugin } from "@extism/extism";
import { connect, StorageType } from "nats";
import { load } from "js-yaml";

async function fromReadableStream(reader) {
  let chunks = [];
  let totalLength = 0;
  let i = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    if (value && value.length) {
      chunks.push(value);
      totalLength += value.length;
    }
  }

  const uint8Array = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    uint8Array.set(chunk, offset);
    offset += chunk.length;
  }

  return uint8Array;
}

async function run(config_yaml_str, fn_name, params) {
  const engineConfig = load(config_yaml_str);

  const nc = await connect({ servers: engineConfig.nats.url });
  const js = nc.jetstream();

  const os = await js.views.os("wasm", { storage: StorageType.File });

  const modules = [];

  for (const node of engineConfig.graph.nodes) {
    const object = await os.get(node.object);

    const data = await fromReadableStream(object.data.getReader());

    modules.push({
      data,
      name: node.namespace,
      hash: node.hash,
    });
  }

  const manifest = {
    wasm: modules,
  };

  const plugin = await createPlugin(manifest, {
    useWasi: engineConfig.plugin.wasi,
    allowedHosts: engineConfig.plugin.allowed_hosts,
    runInWorker: true,
  });

  const parsedInput = new TextEncoder().encode(JSON.stringify(params));
  const output = await plugin.call(fn_name, parsedInput);
  const textOutput = new TextDecoder().decode(output.buffer);
  return JSON.parse(textOutput);
}

export default run;
