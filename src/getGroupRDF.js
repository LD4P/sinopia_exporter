// Copyright 2019 Stanford University see LICENSE for license

import honeybadger from 'honeybadger'
import SinopiaServer from 'sinopia_server'
import asyncPool from 'tiny-async-pool'
import config from 'config'
import fs from 'fs'
import { fetchGroups, fetchResources, fetchResource } from './sinopia_client'

let clientInstance = null

const Honeybadger = honeybadger.configure({
  apiKey: process.env.HONEYBADGER_API_KEY
})

// lazy instantiation of the client makes mocking its behavior easier
export const sinopiaClient = () => {
  if (!clientInstance) {
    clientInstance = new SinopiaServer.LDPApi()
    clientInstance.apiClient.basePath = config.get('trellis.basePath')
    console.debug(`Sinopia Server client lazily instantiated.  base URL: ${clientInstance.apiClient.basePath}`)
  }

  return clientInstance
}

const resourceToName = (uri) => {
  if (typeof uri !== 'string') return undefined

  return uri.substr(uri.lastIndexOf('/') + 1)
}

const getDateString = () => {
  return (new Date()).toISOString()
}

const initAndGetSavePath = (groupName, exportBasePath) => {
  if (!exportBasePath)
    exportBasePath = config.get('exportBasePath')

  const savePathString = `${exportBasePath}/${groupName}_${getDateString()}`
  fs.mkdirSync(savePathString, { recursive: true })
  return savePathString
}

const reportError = (errorObject, consoleErrMessage = null) => {
  Honeybadger.notify(errorObject, {
    context: {
      argv: process.argv,
      sinopiaApiBasePath: config.get('sinopia_api.basePath')
    }
  })

  if (consoleErrMessage)
    console.error(consoleErrMessage)
}

export const buildUri = (groupName, resourceName) => {
  return `${sinopiaClient().apiClient.basePath}/repository/${groupName}/${resourceName}`
}

export const getResourceTextFromServer = async(groupName, resourceName) => {
  const resourceJson = JSON.stringify(await fetchResource(resourceName))
  return resourceJson
}

export const downloadAllRdfForGroup = async (groupName, containingDir = '') => {
  console.info(`beginning export of RDF from group: ${groupName}`)

  const savePathString = initAndGetSavePath(groupName, containingDir)
  const groupResources = await fetchResources(groupName)

  groupResources.data.map((resource) => {
    try {
      fs.writeFileSync(`${savePathString}/${resource.id}`, JSON.stringify(resource))
    } catch(err) {
        // just log and proceed so that we move on and download what we can
        reportError(err, `error saving resource ${groupName}/${entityName} to ${savePathString} : ${err.stack}`)
    }
  })

  const completionMsg = `completed export of ${groupName} at ${getDateString()}`
  fs.writeFileSync(`${savePathString}/complete.log`, completionMsg)
  console.info(completionMsg)
  console.info(`finished export of RDF from group: ${groupName}`)
}

// TODO: Figure out if we can avoid the [1] indexing here
const listAllGroups = async () => {
  const baseResponse = await fetchGroups()
  return baseResponse[1].data.map((uri) => resourceToName(uri.id))
}

export const downloadAllRdfForAllGroups = async () => {
  console.info('beginning export of RDF from all groups')

  // if we can't get a list of groups for which to try to download RDF, we can't do anything else
  let groupList
  try {
    groupList = await listAllGroups()
  } catch(err) {
    reportError(err, `error listing groups in base container: ${err.stack}`)
    return null
  }

  if (!groupList) return null

  console.info(`exporting groups:  ${groupList}`)
  const containingDir = initAndGetSavePath('sinopia_export_all')
  await asyncPool(
    config.get('sinopia_api.poolLimit'), // the # of concurrent connections in the pool
    groupList, // the array of values to feed into the async operation
    (groupName) => downloadAllRdfForGroup(groupName, containingDir) // the async operation
  )

  const completionMsg = `completed export of all groups at ${getDateString()}`
  fs.writeFileSync(`${containingDir}/complete.log`, completionMsg)
  console.info(completionMsg)
  console.info('finished export of RDF from all groups')
}
