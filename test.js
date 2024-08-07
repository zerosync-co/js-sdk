import run from "./src/index.js";
import { exit } from "node:process";
import fs from "node:fs";

function testTMobileAuthenticate() {
  const yaml = `
wasm:
  - object_name: make-auth-call
    namespace: main
    hash: 4d9edb5a7206035a18078582ed0bd8c70a894415c0ca8728f325e569118a1f68
    plugin_functions:
      - _main
  - object_name: create-pop-token
    namespace: create_pop_token
    hash: 2e628bdd02bf191e6571a0dea5dd1a22bc5b42c629509a98d6b53b96c000a735
    plugin_functions: []
  - object_name: create-jti
    namespace: create_guid
    hash: 64edec9d7504e1466d1dc2e39829e792a03878b0b19214b7b143852746b32854
    plugin_functions: []
workflow:
    nodes: []
    node_holes: []
    edge_property: directed
    edges:
      - - 0
        - 1
        - null
      - - 1
        - 2
        - null
nats:
  url: localhost:4222
  enable_execution_thread: true
  enable_watcher_thread: true
plugin:
    wasi: true
    allowed_hosts:
      - naas-sandbox.t-mobile.com
`;

  const input = JSON.parse(fs.readFileSync("./input.json", "utf8"));
  run(yaml, "_main", input)
    .then((res) => console.log("successfully called run fn;", res))
    .catch((e) => console.log("failed to call run fn;", e))
    .finally(exit);
}

function testRealworldNotificationWorkflow() {
  const yaml = `
wasm:
  - object_name: wasm-fetch
    namespace: main
    hash: 8a323f10bfd7e984f5067236464942a642b810d216a278e6d28367da92aabbb8
    plugin_functions:
      - wasm_fetch
  - object_name: wasm-fetch-filter
    namespace: wasm_fetch_filter
    hash: 6ac45a02c9f8373dfe815b6beb56fc8348c8acf2dd0d4f90f90b7f488c0b387f
    plugin_functions:
      - wasm_fetch_filter
  - object_name: wasm-stdout-notification
    namespace: wasm_stdout_notification
    hash: 720c8ab44134860ba5f4d133320eae6cfd79b682f3fcebc686bc494441cf8212
    plugin_functions:
      - wasm_stdout_notification
workflow:
  nodes:
    - object_name: wasm-fetch
      plugin_function_name: wasm_fetch
    - object_name: wasm-fetch-filter
      plugin_function_name: wasm_fetch_filter
    - object_name: wasm-stdout-notification
      plugin_function_name: wasm_stdout_notification
  node_holes: []
  edge_property: directed
  edges:
    - - 0
      - 1
      - null
    - - 1
      - 2
      - null
nats:
  url: localhost:4222
  enable_execution_thread: true
  enable_watcher_thread: true
plugin:
  wasi: true
  allowed_hosts:
    - api.realworld.io
`;

  const input = {
    method: "GET",
    url: "https://api.realworld.io/api/articles?limit=10&offset=0",
  };
  run(yaml, "wasm_fetch", input)
    .then((res) => console.log("successfully called run fn;", res))
    .catch((e) => console.log("failed to call run fn;", e))
    .finally(exit);
}

// testTMobileAuthenticate();
testRealworldNotificationWorkflow();
