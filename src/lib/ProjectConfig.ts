import * as cloudfront from '@aws-cdk/aws-cloudfront'
import fs from 'fs'
import path from 'path'
import { DomainInfo } from './DomainInfo'
import { StaticWebStackProps } from './StaticWebStack'

export interface ProjectConfig {
  projectName: string
  publishDir: string
  notFoundPath?: string
  domains?: DomainInfo[]
  certificateArn?: string
}

export function getStackProps(projectPath: string): StaticWebStackProps {
  const config = getProjectConfig(projectPath)
  return getStackPropsFromProject(projectPath, config)
}

function getProjectConfig(projectPath: string): ProjectConfig {
  const configPath = path.resolve(projectPath, '.aws-web-pub.json')
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
  return validateConfig(config)
}

function validateConfig(obj: Partial<ProjectConfig>): ProjectConfig {
  if (!obj.projectName || typeof obj.projectName !== 'string') {
    throw new Error('config property "projectName" must exist and must be a string')
  }

  if (!obj.publishDir || typeof obj.publishDir !== 'string') {
    throw new Error('config property "publishDir" must exist and must be a string')
  }

  if (obj.notFoundPath && typeof obj.notFoundPath !== 'string') {
    throw new Error('config property "notFoundPath" must be a string')
  }

  if (obj.domains) {
    if (!Array.isArray(obj.domains)) {
      throw new Error('config property "domains" must be an array')
    }

    for (const domain of obj.domains) {
      if (!domain.name) {
        throw new Error('domain.name missing')
      }

      if (domain.dnsZoneName) {
        if (typeof domain.dnsZoneName !== 'string') {
          throw new Error('when present domain.dnsZoneName must be a string')
        }
      }
    }
  }

  if (obj.certificateArn && typeof obj.certificateArn !== 'string') {
    throw new Error('config property "certificateArn" must be a string')
  }

  return obj as ProjectConfig
}

function getStackPropsFromProject(projectPath: string, config: ProjectConfig): StaticWebStackProps {
  const errorConfigurations: cloudfront.CfnDistribution.CustomErrorResponseProperty[] = []
  if (config.notFoundPath) {
    errorConfigurations.push({
      errorCode: 404,
      responseCode: 404,
      responsePagePath: config.notFoundPath,
    })
  }

  return {
    stackName: config.projectName,
    publishDir: path.resolve(projectPath, config.publishDir),
    errorConfigurations,
    domains: config.domains,
    certificateArn: config.certificateArn,
  }
}
