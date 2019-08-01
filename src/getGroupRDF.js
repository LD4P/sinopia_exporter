// Copyright 2019 Stanford University see LICENSE for license

const fs = require('fs');
const path = require('path');
const SinopiaServer = require('sinopia_server')


instance = new SinopiaServer.LDPApi()
instance.apiClient.basePath = 'https://trellis.sinopia.io'


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

const downloadAllRdfForGroup = async (groupName) => {
  const entityNames = await listGroupRdfEntityNames(groupName)

  savePathString = getSavePathString(groupName)
  fs.mkdirSync(savePathString)

  await Promise.all(entityNames.map((entityName) => saveResourceTextFromServer(savePathString, groupName, entityName)))

  const completionMsg = `completed export of ${groupName} at ${getDateString()}`
  fs.writeFileSync(`${savePathString}/complete.log`, completionMsg)
  console.log(completionMsg)
}

/*
TODO: make this something that's usable in a single invocation from the command line.

for now, open a node console, paste the above code in, and then do something like the following:
> downloadPromise = downloadAllRdfForGroup('ucdavis')

and you should end up with something like:

$ tree sinopia_export/
sinopia_export/
└── ucdavis_2019-07-26T01:41:00.002Z
    ├── 0c9895ff-9470-4c70-bee4-b791ee179b34
    └── complete.log

each RDF resource will have its own file.  complete.log will be written at the end of a successful run.

also TODO:  any error handling at all!
*/


