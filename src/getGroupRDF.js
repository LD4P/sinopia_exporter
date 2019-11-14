// Copyright 2019 Stanford University see LICENSE for license

import Honeybadger from 'honeybadger'
import SinopiaServer from 'sinopia_server'
import asyncPool from 'tiny-async-pool'
import config from 'config'
import fs from 'fs'

let clientInstance = null

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
      trellisBasePath: config.get('trellis.basePath')
    }
  })

  if (consoleErrMessage)
    console.error(consoleErrMessage)
}

const listGroupRdfEntityUris = async (groupName) => {
  const groupResponse = await sinopiaClient().getGroupWithHttpInfo(groupName)
  if (!groupResponse.response.body.contains) {
    return []
  }

  return [].concat(groupResponse.response.body.contains)
}

const listGroupRdfEntityNames = async (groupName) => {
  return (await listGroupRdfEntityUris(groupName)).map((uri) => resourceToName(uri))
}

const getRdfResourceFromServer = async (groupName, resourceName, accept = 'application/ld+json', prefer = 'return=representation; include="http://www.trellisldp.org/ns/trellis#PreferAudit"') => {
  return await sinopiaClient().getResourceWithHttpInfo(groupName, resourceName, { accept, prefer })
}

export const getResourceTextFromServer = async(groupName, resourceName) => {
  return (await getRdfResourceFromServer(groupName, resourceName)).response.text
}

const saveResourceTextFromServer = async(savePathString, groupName, resourceName) => {
  // alternatively, could await https://nodejs.org/api/fs.html#fs_fspromises_writefile_file_data_options
  fs.writeFileSync(`${savePathString}/${resourceName}`, (await getResourceTextFromServer(groupName, resourceName)))
}

export const downloadAllRdfForGroup = async (groupName, containingDir = '') => {
  console.info(`beginning export of RDF from group: ${groupName}`)

  // if we can't get a list of entities to try to download, just log the error and move on (in case there are other groups to download)
  const entityNames = await listGroupRdfEntityNames(groupName).catch((err) => {
    reportError(err, `error listing entities for group: ${groupName} : ${err.stack}`)
  })
  if (!entityNames) return

  const savePathString = initAndGetSavePath(groupName, containingDir)

  await asyncPool(
    config.get('trellis.poolLimit'), // the # of concurrent connections in the pool
    entityNames, // the array of values to feed into the async operation
    (entityName) => saveResourceTextFromServer(savePathString, groupName, entityName) // the async operation
      .catch(
        // just log and proceed so that we move on and download what we can
        (err) => reportError(err, `error saving resource ${groupName}/${entityName} to ${savePathString} : ${err.stack}`)
      )
  )

  const completionMsg = `completed export of ${groupName} at ${getDateString()}`
  fs.writeFileSync(`${savePathString}/complete.log`, completionMsg)
  console.info(completionMsg)
  console.info(`finished export of RDF from group: ${groupName}`)
}

const listAllGroups = async () => {
  const baseResponse = await sinopiaClient().getBaseWithHttpInfo()
  return baseResponse.response.body.contains.map((uri) => resourceToName(uri))
}

export const downloadAllRdfForAllGroups = async () => {
  console.info('beginning export of RDF from all groups')

  // if we can't get a list of groups for which to try to download RDF, we can't do anything else
  const groupList = await listAllGroups().catch((err) => {
    reportError(err, `error listing groups in base container: ${err.stack}`)
  })
  if (!groupList) return

  console.info(`exporting groups:  ${groupList}`)
  const containingDir = initAndGetSavePath('sinopia_export_all')
  await asyncPool(
    config.get('trellis.poolLimit'), // the # of concurrent connections in the pool
    groupList, // the array of values to feed into the async operation
    (groupName) => downloadAllRdfForGroup(groupName, containingDir) // the async operation
  )

  const completionMsg = `completed export of all groups at ${getDateString()}`
  fs.writeFileSync(`${containingDir}/complete.log`, completionMsg)
  console.info(completionMsg)
  console.info('finished export of RDF from all groups')
}
