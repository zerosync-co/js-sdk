import init from "./src/index.js";
import { exit } from "node:process";

const yaml = `
nodes:
  - name: make_auth_call
    bucket: wasm
    object: make-auth-call
    namespace: main
    hash: 4d9edb5a7206035a18078582ed0bd8c70a894415c0ca8728f325e569118a1f68
  - name: create_pop_token
    bucket: wasm
    object: create-pop-token
    namespace: create_pop_token
    hash: 2e628bdd02bf191e6571a0dea5dd1a22bc5b42c629509a98d6b53b96c000a735
  - name: create_jti
    bucket: wasm
    object: create-jti
    namespace: create_guid
    hash: 64edec9d7504e1466d1dc2e39829e792a03878b0b19214b7b143852746b32854

edges:
  - source: make_auth_call
    target: create_pop_token
  - source: create_pop_token
    target: create_jti
`;

init(yaml)
  .then(() => console.log("successfully called init fn"))
  .catch((e) => console.log("failed to call init fn", e))
  .finally(exit);
