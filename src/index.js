import { createPlugin } from "@extism/extism";
import { connect, StorageType } from "nats";
import { load } from "js-yaml";
import { Graph } from "@dagrejs/graphlib";
// import fs from "node:fs/promises";

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

function buildGraphFromConfig(config) {
  const graph = new Graph({ directed: true });

  for (const node of config.nodes) {
    graph.setNode(node.name, node);
  }

  for (const edge of config.edges) {
    graph.setEdge(edge.source, edge.target);
  }

  return graph;
}

async function init(config_yaml_str) {
  // const defaultConfigPath = "./config.yaml";
  const defaultNatsEndpoint = "localhost:4222";

  // const configContents = await fs.readFile(defaultConfigPath, "utf8");
  // const graphConfig = load(configContents);
  const graphConfig = load(config_yaml_str);

  const graph = buildGraphFromConfig(graphConfig);

  const nc = await connect({ servers: defaultNatsEndpoint });
  const js = nc.jetstream();

  const os = await js.views.os("wasm", { storage: StorageType.File });

  const modules = [];

  for (const node of graph.nodes()) {
    const nodeData = graph.node(node);

    const object = await os.get(nodeData.object);

    const data = await fromReadableStream(object.data.getReader());

    modules.push({
      data,
      name: nodeData.namespace,
      hash: nodeData.hash,
    });
  }

  const manifest = {
    wasm: modules,
  };

  const url = new URL("https://naas-sandbox.t-mobile.com");
  const allowedHost = url.host;
  return await createPlugin(manifest, {
    useWasi: true,
    allowedHosts: [allowedHost],
    runInWorker: true,
  });
}

export default init;
