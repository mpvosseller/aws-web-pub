#!/usr/bin/env node

import { spawnSync } from 'child_process'
import path from 'path'
import yargs from 'yargs'

yargs
  .scriptName('aws-web-pub')
  .usage('$0 <cmd> [projectDir]')
  .option('profile', {
    type: 'string',
    description: 'Use the indicated AWS profile as the default environment',
  })
  .command(
    'publish [projectDir]',
    'Publish site',
    (builder) =>
      builder.positional('projectDir', {
        type: 'string',
        describe: 'project directory',
        default: '.',
      }),
    (args) => {
      execCdk(['bootstrap'], args)
      execCdk(['deploy', '--require-approval', 'never'], args)
    }
  )
  .command(
    'unpublish [projectDir]',
    'Unpublish site',
    (builder) =>
      builder.positional('projectDir', {
        type: 'string',
        describe: 'project directory',
        default: '.',
      }),
    (args) => {
      execCdk(['destroy', '--force'], args)
    }
  )
  .demandCommand()
  .help().argv

function execCdk(
  args: string[],
  { projectDir, profile }: { projectDir: string; profile?: string }
): void {
  const packageRootDir = path.resolve(__dirname, '../../') // two directories up from this file
  const outputDir = path.resolve(process.cwd(), 'cdk.out')
  projectDir = path.resolve(projectDir)

  if (profile) {
    args = ['--profile', profile, ...args]
  }

  // hack to allow running with ts-node in development
  if (__filename.endsWith('.ts')) {
    args = ['--app', 'ts-node src/lib/AwsWebPubApp.ts', ...args]
  }

  const cdkProcess = spawnSync(
    'npx',
    ['--no-install', 'cdk', '--output', outputDir, '-c', `project=${projectDir}`, ...args],
    {
      cwd: packageRootDir,
      stdio: 'inherit',
    }
  )

  if (cdkProcess.error) {
    throw cdkProcess.error
  }
}
