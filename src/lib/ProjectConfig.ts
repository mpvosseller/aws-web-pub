import * as cloudfront from '@aws-cdk/aws-cloudfront'
import fs from 'fs'
import path from 'path'
import { DomainInfo } from './DomainInfo'
import { StaticWebsiteStackProps } from './StaticWebsiteStack'

export interface ProjectConfig {
  projectName: string
  publishDir: string
  deleteOldFiles?: boolean
  notFoundPath?: string
  isSinglePageApp?: boolean
  domains?: DomainInfo[]
  certificateArn?: string
}

export function getStackProps(projectPath: string): StaticWebsiteStackProps {
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

  if (typeof obj.deleteOldFiles !== 'undefined' && typeof obj.deleteOldFiles !== 'boolean') {
    throw new Error('config property "deleteOldFiles" must be a boolean')
  }

  if (typeof obj.isSinglePageApp !== 'undefined' && typeof obj.isSinglePageApp !== 'boolean') {
    throw new Error('config property "isSinglePageApp" must be a boolean')
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

function getStackPropsFromProject(
  projectPath: string,
  config: ProjectConfig
): StaticWebsiteStackProps {
  const errorConfigurations: cloudfront.CfnDistribution.CustomErrorResponseProperty[] = []

  if (config.isSinglePageApp) {
    errorConfigurations.push(
      {
        errorCode: 400,
        responseCode: 200,
        responsePagePath: '/',
        errorCachingMinTtl: 300,
      },
      {
        errorCode: 403,
        responseCode: 200,
        responsePagePath: '/',
        errorCachingMinTtl: 300,
      },
      {
        errorCode: 404,
        responseCode: 200,
        responsePagePath: '/',
        errorCachingMinTtl: 300,
      }
    )
  } else if (config.notFoundPath) {
    errorConfigurations.push({
      errorCode: 404,
      responseCode: 404,
      responsePagePath: config.notFoundPath,
    })
  }

  return {
    stackName: config.projectName.replace(/[^a-zA-Z0-9]/g, '-'),
    publishDir: path.resolve(projectPath, config.publishDir),
    deleteOldFiles: config.deleteOldFiles,
    errorConfigurations,
    domains: config.domains,
    certificateArn: config.certificateArn,
  }
}
