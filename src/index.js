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

async function run(configYamlStr, fnName, params) {
  const engineConfig = load(configYamlStr);

  const nc = await connect({ servers: engineConfig.nats.url });
  const js = nc.jetstream();

  const os = await js.views.os("wasm", { storage: StorageType.File });

  const modules = [];

  for (const wasm of engineConfig.wasm) {
    const object = await os.get(wasm.object_name);

    const data = await fromReadableStream(object.data.getReader());

    modules.push({
      data,
      name: wasm.namespace,
      hash: wasm.hash,
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

  const thisStage = engineConfig.wasm.find(
    ({ namespace }) => namespace === "main",
  );
  let jsonOutput;
  try {
    const rawOutput = await plugin.call(fnName, parsedInput);
    jsonOutput = rawOutput.json();

    nc.publish(`deadlift.logs.${thisStage.object_name}.success`, "");
  } catch (e) {
    nc.publish(`deadlift.logs.${thisStage.object_name}.error`, "");

    throw e;
  }

  // move into async function that runs in the background
  let wasmWithFn = engineConfig.wasm.find(({ plugin_functions }) =>
    plugin_functions.includes(fnName),
  );
  let matchingStageIdx = engineConfig.workflow.nodes.findIndex(
    ({ object_name }) => wasmWithFn.object_name === object_name,
  );
  let nextInput = JSON.parse(JSON.stringify(jsonOutput));

  while (matchingStageIdx >= 0 && !!nextInput) {
    let nextStages = engineConfig.workflow.edges.reduce(
      (acc, [sourceIdx, targetIdx]) => {
        if (sourceIdx === matchingStageIdx) {
          acc.push(engineConfig.workflow.nodes[targetIdx]);
        }
        return acc;
      },
      [],
    );

    // FIXME-- handle branching and multiple next stages

    let nextStage = nextStages[0];
    if (nextStage) {
      try {
        const object = await os.get(nextStage.object_name);
        const data = await fromReadableStream(object.data.getReader());
        const nextStageManifest = {
          wasm: [
            {
              data,
            },
          ],
        };
        const nextStagePlugin = await createPlugin(nextStageManifest, {
          useWasi: engineConfig.plugin.wasi,
          allowedHosts: engineConfig.plugin.allowed_hosts,
          runInWorker: true,
        });

        const parsedInput = new TextEncoder().encode(JSON.stringify(nextInput));
        const nextRawOutput = await nextStagePlugin.call(
          nextStage.plugin_function_name,
          parsedInput,
        );
        nextInput = nextRawOutput.json();

        nc.publish(`deadlift.logs.${nextStage.object_name}.success`, "");

        wasmWithFn = engineConfig.wasm.find(({ plugin_functions }) =>
          plugin_functions.includes(nextStage.plugin_function_name),
        );
        matchingStageIdx = engineConfig.workflow.nodes.findIndex(
          ({ object_name }) => wasmWithFn.object_name === object_name,
        );

        continue;
      } catch (e) {
        console.log("failed to continue workflow;", e.message);
        nc.publish(`deadlift.logs.${nextStage.object_name}.error`, "");
        nextInput = null;
      }
    }
  }

  // TODO-- broadcast to nats
  return jsonOutput;
}

export default run;
