// Copyright 2019 Stanford University see LICENSE for license

import config from 'config'
import fs from 'fs'
import * as getGroupRDF from '../src/getGroupRDF'
import SinopiaServer from 'sinopia_server'

const groupResources = {
  'group1': ['resource1', 'resource2', 'resource3'],
  'group2': ['resource4', 'resource5', 'resource6'],
  'group3': ['resource7', 'resource8', 'resource9']
}
const resourceContent = {
  'resource1': 'resource1content', 'resource2': 'resource2content', 'resource3': 'resource3content',
  'resource4': 'resource4content', 'resource5': 'resource5content', 'resource6': 'resource6content',
  'resource7': 'resource7content', 'resource8': 'resource8content', 'resource9': 'resource9content'
}

const mockSinopiaClient = jest.fn()
mockSinopiaClient.apiClient = jest.fn() // need this field present so sinopiaClient() function can set .basePath on it.
mockSinopiaClient.getBaseWithHttpInfo = async () => { return { response: { body: {contains: Object.keys(groupResources) } } } }
mockSinopiaClient.getGroupWithHttpInfo = async (groupName) => { return (!groupResources[groupName] ? null : { response: { body: {contains: groupResources[groupName] } } }) }
mockSinopiaClient.getResourceWithHttpInfo = async (groupName, resourceName) => { return (!groupResources[groupName] ? null : { response: { text: resourceContent[resourceName] } }) }

jest.spyOn(SinopiaServer, 'LDPApi').mockImplementation(() => mockSinopiaClient)

afterAll(async () => {
  // according to:  https://nodejs.org/api/fs.html#fs_fs_rmdirsync_path_options
  //  "Recursive removal is experimental", and is considered "Stability: 1" (https://nodejs.org/api/documentation.html#documentation_stability_index).
  //  but it seems to work fine for me locally (JM 2019-10-19), and cleanup is nice.
  fs.rmdirSync(config.get('exportBasePath'), { recursive: true})
})

describe('getGroupRDF', () => {
  describe('sinopiaClient', () => {
    it('returns a client that is properly configured', () => {
      expect(getGroupRDF.sinopiaClient().apiClient.basePath).toEqual(config.get('trellis.basePath'))
    })
  })

  describe('getResourceTextFromServer', () => {
    it('retrieves the specified resource from the server and returns the RDF as text', async () => {
      expect(await getGroupRDF.getResourceTextFromServer('group1', 'resource2')).toEqual('resource2content')
    })
  })

  describe('downloadAllRdfForGroup', () => {
    it('retrieves the RDF resources for the specified group, and saves the RDF text (one file per resource, in a dated sub-directory per group)', async () => {
      const dlDateLowerBound = new Date()
      await getGroupRDF.downloadAllRdfForGroup('group1')
      const dlDateUpperBound = new Date()

      const exportBaseDirContents = fs.readdirSync(config.get('exportBasePath'))
      const groupDirName = exportBaseDirContents.filter((dirName) => dirName.match(/^group1_.*$/)).slice(-1)[0]

      // RDF for group exported to subdirectory with name like 'group1_2019-08-05T01:34:13.143Z'
      const groupDirDate = new Date(/^group1_(.*)$/.exec(groupDirName)[1])
      // .toBeGreaterThan and .toBeLessThan only work for numbers
      expect(dlDateLowerBound <= groupDirDate && groupDirDate <= dlDateUpperBound).toBeTruthy()

      const groupDirPath = `${config.get('exportBasePath')}/${groupDirName}`
      const groupDirContents = fs.readdirSync(groupDirPath)
      expect(groupDirContents).toEqual(['complete.log', 'resource1', 'resource2', 'resource3'])

      expect(fs.readFileSync(`${groupDirPath}/resource1`).toString()).toEqual('resource1content')
      expect(fs.readFileSync(`${groupDirPath}/resource2`).toString()).toEqual('resource2content')
      expect(fs.readFileSync(`${groupDirPath}/resource3`).toString()).toEqual('resource3content')
      const completionLogText = fs.readFileSync(`${groupDirPath}/complete.log`).toString()
      // completion log text should have date, should fall between group dir creation and downloadAllRdfForGroup resolving
      const completionLogDate = new Date(/^completed export of group1 at (.*)$/.exec(completionLogText)[1])
      expect(groupDirDate <= completionLogDate && completionLogDate <= dlDateUpperBound).toBeTruthy()
    })
  })

  describe('downloadAllRdfForAllGroups', () => {
    it('retrieves the RDF resources for all groups, and saves the RDF text (one file per resource, in a dated sub-directory per group, in a dated containing folder)', async () => {
      const dlDateLowerBound = new Date()
      await getGroupRDF.downloadAllRdfForAllGroups()
      const dlDateUpperBound = new Date()

      const exportBaseDirContents = fs.readdirSync(config.get('exportBasePath'))
      const containingDirName = exportBaseDirContents.filter((dirName) => dirName.match(/^sinopia_export_all_.*$/)).slice(-1)[0]

      // containing directory for all exported RDF with name like 'sinopia_export_all_2019-10-18T02:15:41.670Z'
      const containingDirDate = new Date(/^sinopia_export_all_(.*)$/.exec(containingDirName)[1])
      // .toBeGreaterThan and .toBeLessThan only work for numbers
      expect(dlDateLowerBound <= containingDirDate && containingDirDate <= dlDateUpperBound).toBeTruthy()

      // list the group subdirectories in the containing directory.  should have as many entries as there are groups
      const containingDirPath = `${config.get('exportBasePath')}/${containingDirName}`
      const exportAllDirContents = fs.readdirSync(containingDirPath)
      expect(exportAllDirContents.length).toEqual(Object.keys(groupResources).length + 1) // each resource, plus complete.log

      for(const groupName in groupResources) {
        // RDF for group exported to subdirectory with name like 'group1_2019-08-05T01:34:13.143Z'
        const groupDirNameRE = new RegExp(`^${groupName}_(.*)$`)
        const groupDirName = exportAllDirContents.find((dirEntry) => dirEntry.match(groupDirNameRE))
        const groupDirPath = `${config.get('exportBasePath')}/${containingDirName}/${groupDirName}`
        const groupDirDate = new Date(groupDirNameRE.exec(groupDirName)[1])
        expect(containingDirDate <= groupDirDate && groupDirDate <= dlDateUpperBound).toBeTruthy()

        const completionLogText = fs.readFileSync(`${groupDirPath}/complete.log`).toString()
        // completion log text should have date, should fall between group dir creation and downloadAllRdfForGroup resolving
        const completionLogTextRE = new RegExp(`^completed export of ${groupName} at (.*)$`)
        const completionLogDate = new Date(completionLogTextRE.exec(completionLogText)[1])
        expect(groupDirDate <= completionLogDate && completionLogDate <= dlDateUpperBound).toBeTruthy()

        const resourceNames = groupResources[groupName]
        const groupDirContents = fs.readdirSync(groupDirPath)
        expect(groupDirContents).toEqual(expect.arrayContaining(['complete.log'].concat(resourceNames)))

        for(const resourceName of resourceNames) {
          expect(fs.readFileSync(`${groupDirPath}/${resourceName}`).toString()).toEqual(`${resourceName}content`)
        }
      }

      const completionLogText = fs.readFileSync(`${containingDirPath}/complete.log`).toString()
      // completion log text should have date, should fall between group dir creation and downloadAllRdfForGroup resolving
      const completionLogDate = new Date(/^completed export of all groups at (.*)$/.exec(completionLogText)[1])
      expect(containingDirDate <= completionLogDate && completionLogDate <= dlDateUpperBound).toBeTruthy()
    })
  })
})
