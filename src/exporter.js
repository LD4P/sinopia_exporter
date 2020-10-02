// Copyright 2020 Stanford University see LICENSE for license

import honeybadger from 'honeybadger'
import config from 'config'
import fs from 'fs'
import { query } from './sinopia_client'

const Honeybadger = honeybadger.configure({
  apiKey: process.env.HONEYBADGER_API_KEY
})

const getDateString = () => {
  return (new Date()).toISOString()
}

const initAndGetSavePath = (groupName, exportBasePath) => {
  let dateTag
  if (!exportBasePath) {
    exportBasePath = config.get('exportBasePath')
    dateTag = getDateString()
  }

  let savePathString = [exportBasePath, groupName].join('/')
  if (dateTag)
    savePathString = [savePathString, dateTag].join('_');

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

export const exportGroup = async (groupName, containingDir = '') => {
  console.info(`beginning export of RDF from group: ${groupName}`)

  const savePathString = initAndGetSavePath(groupName, containingDir)
  const uri = [config.get('sinopia_api.basePath'), '/resource/?group=', groupName].join()
  const groupResources = await query(uri, { Accept: 'application/json' })

  if (!groupResources) return null

  groupResources.map((resource) => {
    try {
      const resourcePath = [savePathString, resource.id].join('/')
      fs.writeFileSync(resourcePath, JSON.stringify(resource))
    } catch(err) {
      // just log and proceed so that we move on and download what we can
      reportError(err, `error saving resource ${groupName}/${resource.id} to ${savePathString} : ${err.stack}`)
    }
  })

  const completionMsg = `completed export of ${groupName} at ${getDateString()}`
  fs.writeFileSync(`${savePathString}/complete.log`, completionMsg)
  console.info(completionMsg)
  console.info(`finished export of RDF from group: ${groupName}`)
}

export const exportAllGroups = async () => {
  console.info('beginning export of RDF from all groups')

  // if we can't get a list of groups for which to try to download RDF, we can't do anything else
  const uri = [config.get('sinopia_api.basePath'),'groups'].join('/')
  const groupList = await query(uri, { Accept: 'application/json' })

  if(!groupList) {
    reportError(new Error(), 'error retrieving all groups from API')
    return null
  }

  console.info(`exporting groups:  ${JSON.stringify(groupList)}`)
  const containingDir = initAndGetSavePath('sinopia_export_all')

  await Promise.all(groupList.map((group) => { exportGroup(group.id, containingDir) }))

  const completionMsg = `completed export of all groups at ${getDateString()}`
  fs.writeFileSync(`${containingDir}/complete.log`, completionMsg)
  console.info(completionMsg)
  console.info('finished export of RDF from all groups')
}
