import { loadEnvConfig } from '@next/env';
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import net from 'node:net';

type PresetOperation = 'migrate' | 'seed' | 'healthcheck' | 'ingest-bridgesport';

const operationMap: Record<PresetOperation, string[]> = {
  migrate: ['npm', 'run', 'db:migrate'],
  seed: ['npm', 'run', 'db:seed'],
  healthcheck: ['npm', 'run', 'db:healthcheck'],
  'ingest-bridgesport': ['npm', 'run', 'db:ingest:bridgesport'],
};

loadEnvConfig(process.cwd());

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for remote DB tunnel command`);
  }
  return value;
}

function toPort(value: string | undefined, fallback: number): number {
  const numeric = Number(value ?? fallback);
  if (!Number.isInteger(numeric) || numeric <= 0 || numeric > 65535) {
    throw new Error(`Invalid port value: ${value}`);
  }
  return numeric;
}

function commandFromArgs(args: string[]): string[] {
  if (args.length === 0) {
    throw new Error('Usage: tsx scripts/run-with-db-tunnel.ts <migrate|seed|healthcheck|ingest-bridgesport> OR -- <command>');
  }

  const separator = args.indexOf('--');
  if (separator >= 0) {
    const command = args.slice(separator + 1);
    if (command.length === 0) {
      throw new Error('No command provided after --');
    }
    return command;
  }

  const preset = args[0] as PresetOperation;
  const mapped = operationMap[preset];
  if (!mapped) {
    throw new Error(`Unknown operation '${args[0]}'`);
  }
  return mapped;
}

function toShellCommand(command: string[]): string {
  const quote = (arg: string) => {
    if (!/[\s"]/u.test(arg)) return arg;
    return `"${arg.replace(/"/g, '\\"')}"`;
  };
  return command.map(quote).join(' ');
}

function startTunnel(options: {
  host: string;
  port: number;
  user: string;
  password?: string;
  hostKey?: string;
  localPort: number;
  remoteHost: string;
  remotePort: number;
}): ChildProcess {
  const plinkPath = process.env.REMOTE_DB_PLINK_PATH?.trim() || 'C:\\Program Files\\PuTTY\\plink.exe';
  const forcePlink = (process.env.REMOTE_DB_SSH_FORCE_PLINK ?? '').toLowerCase() === 'true';
  const canUsePlink = forcePlink || (process.platform === 'win32' && existsSync(plinkPath));

  if (canUsePlink) {
    const args = [
      '-batch',
      '-ssh',
      '-N',
      '-P',
      String(options.port),
      '-l',
      options.user,
    ];
    if (options.hostKey) args.push('-hostkey', options.hostKey);
    if (options.password) args.push('-pw', options.password);
    args.push(
      '-L',
      `${options.localPort}:${options.remoteHost}:${options.remotePort}`,
      options.host,
    );
    return spawn(plinkPath, args, { stdio: 'ignore', windowsHide: true });
  }

  const args = [
    '-N',
    '-o',
    'ExitOnForwardFailure=yes',
    '-p',
    String(options.port),
    '-L',
    `${options.localPort}:${options.remoteHost}:${options.remotePort}`,
    `${options.user}@${options.host}`,
  ];

  return spawn('ssh', args, { stdio: 'ignore' });
}

async function startTunnelAndWait(options: {
  host: string;
  port: number;
  user: string;
  password?: string;
  hostKey?: string;
  localPort: number;
  remoteHost: string;
  remotePort: number;
}): Promise<ChildProcess> {
  const tunnel = startTunnel(options);
  await waitForPortOpen(options.localPort, 15_000);
  return tunnel;
}

function waitForPortOpen(port: number, timeoutMs: number): Promise<void> {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const probe = () => {
      const socket = net.createConnection({ host: '127.0.0.1', port });
      socket.once('connect', () => {
        socket.destroy();
        resolve();
      });
      socket.once('error', () => {
        socket.destroy();
        if (Date.now() - startedAt >= timeoutMs) {
          reject(new Error(`Tunnel did not open on 127.0.0.1:${port} within ${timeoutMs}ms`));
          return;
        }
        setTimeout(probe, 300);
      });
    };

    probe();
  });
}

function buildTunneledDatabaseUrl(localPort: number): string {
  const rawUrl = requiredEnv('DATABASE_URL');
  const parsed = new URL(rawUrl);
  parsed.hostname = '127.0.0.1';
  parsed.port = String(localPort);
  return parsed.toString();
}

async function main() {
  const command = commandFromArgs(process.argv.slice(2));

  const sshHost = requiredEnv('REMOTE_DB_SSH_HOST');
  const sshPort = toPort(process.env.REMOTE_DB_SSH_PORT, 22);
  const sshUser = requiredEnv('REMOTE_DB_SSH_USER');
  const sshPassword = process.env.REMOTE_DB_SSH_PASSWORD?.trim();
  const sshHostKey = process.env.REMOTE_DB_SSH_HOSTKEY?.trim();

  const localPort = toPort(process.env.REMOTE_DB_TUNNEL_LOCAL_PORT, 15433);
  const remoteHost = process.env.REMOTE_DB_REMOTE_HOST?.trim() || '127.0.0.1';
  const remotePort = toPort(process.env.REMOTE_DB_REMOTE_PORT, 5433);

  const tunnelOptions = {
    host: sshHost,
    port: sshPort,
    user: sshUser,
    password: sshPassword,
    hostKey: sshHostKey,
    localPort,
    remoteHost,
    remotePort,
  };

  let tunnel: ChildProcess | null = null;
  let child: ChildProcess | null = null;
  let shuttingDown = false;
  let reconnecting = false;

  try {
    const reconnectTunnel = async () => {
      if (shuttingDown || reconnecting) return;
      reconnecting = true;
      try {
        console.warn('[db-tunnel] Tunnel disconnected, attempting to reconnect...');
        tunnel = await startTunnelAndWait(tunnelOptions);
        attachTunnelExitHandler();
        console.warn('[db-tunnel] Tunnel reconnected.');
      } catch (error) {
        console.error(
          '[db-tunnel] Failed to reconnect tunnel:',
          error instanceof Error ? error.message : error,
        );
        shuttingDown = true;
        if (child && !child.killed) {
          child.kill('SIGTERM');
        }
        process.exitCode = 1;
      } finally {
        reconnecting = false;
      }
    };

    const attachTunnelExitHandler = () => {
      if (!tunnel) return;
      tunnel.once('exit', () => {
        if (shuttingDown) return;
        void reconnectTunnel();
      });
    };

    tunnel = await startTunnelAndWait(tunnelOptions);
    attachTunnelExitHandler();

    const tunneledUrl = buildTunneledDatabaseUrl(localPort);
    child = spawn(toShellCommand(command), {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: tunneledUrl,
      },
      shell: true,
    });

    const runningChild = child;
    const exitCode = await new Promise<number>((resolve, reject) => {
      runningChild.on('error', reject);
      runningChild.on('exit', (code) => resolve(code ?? 1));
    });

    shuttingDown = true;
    process.exitCode = exitCode;
  } finally {
    shuttingDown = true;
    if (tunnel && !tunnel.killed) {
      tunnel.kill('SIGTERM');
    }
  }
}

main().catch((error) => {
  console.error('Remote DB command failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
