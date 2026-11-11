// See all configuration options: https://remotion.dev/docs/config
// Each option also is available as a CLI flag: https://remotion.dev/docs/cli

// Note: When using the Node.JS APIs, the config file doesn't apply. Instead, pass options directly to the APIs

import fs from "node:fs";
import { Config } from "@remotion/cli/config";
import { enableTailwind } from '@remotion/tailwind-v4';

const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
if (fs.existsSync(chromePath)) {
  Config.setBrowserExecutable(chromePath);
}

Config.setRspack(true);
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setTimeoutInMilliseconds(120000);
Config.setDelayRenderTimeoutInMilliseconds(120000);
Config.overrideBundlerConfig(enableTailwind);
