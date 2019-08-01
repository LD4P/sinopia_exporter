// Copyright 2019 Stanford University see LICENSE for license

import fs from 'fs'
import path from 'path'
import config from 'config'
import SinopiaServer from 'sinopia_server'


const instance = new SinopiaServer.LDPApi()
instance.apiClient.basePath = config.get('trellis.basePath')
console.info(`Sinopia Server base URL: ${instance.apiClient.basePath}`)


const resourceToName = (uri) => {
  if (typeof uri !== 'string') return undefined

  return uri.substr(uri.lastIndexOf('/') + 1)
}

const getDateString = () => {
  return (new Date()).toISOString()
}

const getSavePathString = (groupName) => {
  return `./sinopia_export/${groupName}_${getDateString()}/`
}


const listGroupRdfEntityUris = async (groupName) => {
  const groupResponse = await instance.getGroupWithHttpInfo(groupName)
  if(!groupResponse.response.body.contains) {
    return
  }

  return [].concat(groupResponse.response.body.contains)
}

const listGroupRdfEntityNames = async (groupName) => {
  return (await listGroupRdfEntityUris(groupName)).map((uri) => resourceToName(uri))
}


const getRdfResourceFromServer = async (groupName, resourceName, accept = 'application/ld+json') => {
  // TODO: do we need to do any error handling in case we request a resource that's not RDF?
  return await instance.getResourceWithHttpInfo(groupName, resourceName, { accept })
}

const getResourceTextFromServer = async(groupName, resourceName) => {
  return (await getRdfResourceFromServer(groupName, resourceName)).response.text
}



const saveResourceTextFromServer = async(savePathString, groupName, resourceName) => {
  // alternatively, could await https://nodejs.org/api/fs.html#fs_fspromises_writefile_file_data_options
  fs.writeFileSync(`${savePathString}/${resourceName}`, (await getResourceTextFromServer(groupName, resourceName)))
}

export const downloadAllRdfForGroup = async (groupName) => {
  const entityNames = await listGroupRdfEntityNames(groupName)

  const savePathString = getSavePathString(groupName)
  fs.mkdirSync(savePathString)

  await Promise.all(entityNames.map((entityName) => saveResourceTextFromServer(savePathString, groupName, entityName)))

  const completionMsg = `completed export of ${groupName} at ${getDateString()}`
  fs.writeFileSync(`${savePathString}/complete.log`, completionMsg)
  console.log(completionMsg)
}
