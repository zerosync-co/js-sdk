# js-sdk

## Overview

`js-sdk` is the Deadlift JavaScript SDK designed to facilitate the creation and execution of WASM using [deadlift](https://github.com/zerosync-co/deadlift)

## Features

- **WASM Plugin Creation**: Easily create and manage WASM plugins using Extism.
- **NATS**: Publish messages to NATS servers.
- **Asynchronous Execution**: Run modules asynchronously and handle responses.
- **Reusable**: Run public, prewritten modules for everyday application needs.

## Installation

To install the dependencies, run:

```
npm install git+https://github.com/zerosync-co/js-sdk.git
```

## Usage

### Running a Module
To run a module, use the default `run` exported function. Check out [realworld](https://github.com/zerosync-co/realworld-deadlift-example) for an in-depth example of usage in a fullstack application.
