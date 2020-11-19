#!/usr/bin/env node

import { spawnSync } from 'child_process'
import fs from 'fs'
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
    ['deploy [projectDir]', 'publish'],
    'Publish website',
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
    ['destroy [projectDir]', 'unpublish'],
    'Unpublish website',
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
  projectDir = path.resolve(projectDir)
  const buildDir = path.resolve(projectDir, 'aws-web-pub.out')
  const cdkOutputDir = path.resolve(buildDir, 'cdk.out')
  const appPath = require.resolve('../lib/AwsWebPubApp')

  const cdkArgs: string[] = []

  // --profile
  if (profile) {
    cdkArgs.push('--profile', profile)
  }

  // --output
  cdkArgs.push('--output', cdkOutputDir)

  // --context
  const context = {
    '@aws-cdk/core:enableStackNameDuplicates': 'true',
    'aws-cdk:enableDiffNoFail': 'true',
    '@aws-cdk/core:stackRelativeExports': 'true',
    project: projectDir,
  }
  for (const [key, value] of Object.entries(context)) {
    cdkArgs.push('--context', `${key}=${value}`)
  }

  // --app
  const isTsNode = __filename.endsWith('.ts')
  const nodeCmd = isTsNode ? `ts-node --dir ${process.cwd()}` : 'node'
  cdkArgs.push('--app', `${nodeCmd} ${appPath}`)

  // rest of the args
  cdkArgs.push(...args)

  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir)
  }
  const cdkProcess = spawnSync('npx', ['--no-install', 'cdk', ...cdkArgs], {
    cwd: buildDir,
    stdio: 'inherit',
  })

  if (cdkProcess.status !== 0) {
    throw new Error(`CDK failed with status: ${cdkProcess.status}`)
  }
}
