import { loadEnvConfig } from "@next/env"
import { spawn } from "node:child_process"

loadEnvConfig(process.cwd())

type DevMode = "auto" | "local" | "remote"

function hasRemoteTunnelEnv() {
  return Boolean(process.env.REMOTE_DB_SSH_HOST?.trim() && process.env.REMOTE_DB_SSH_USER?.trim())
}

function resolveMode(): DevMode {
  const rawMode = process.env.BRIDGE_DEV_DB_MODE?.trim().toLowerCase()
  if (rawMode === "local") return "local"
  if (rawMode === "remote") return "remote"
  return "auto"
}

function run(command: string, args: string[]) {
  const child = spawn(command, args, {
    stdio: "inherit",
    shell: true,
    env: process.env,
  })

  child.on("exit", (code) => {
    process.exit(code ?? 0)
  })

  child.on("error", (error) => {
    console.error("Failed to start dev server:", error)
    process.exit(1)
  })
}

const mode = resolveMode()
const hasRemote = hasRemoteTunnelEnv()
const useRemote = mode === "remote" || (mode === "auto" && hasRemote)

if (useRemote) {
  console.log("[dev-auto] Starting dev with remote DB tunnel")
  run("npm", ["run", "dev:remote"])
} else {
  console.log("[dev-auto] Starting local dev without DB tunnel")
  run("npm", ["run", "dev:local"])
}
