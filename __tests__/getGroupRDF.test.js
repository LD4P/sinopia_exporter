// Copyright 2019 Stanford University see LICENSE for license

import config from 'config'
import fs from 'fs'
import * as getGroupRDF from '../src/getGroupRDF'
import SinopiaServer from 'sinopia_server'
import Honeybadger from 'honeybadger'

const groupResources = {
  'group1': ['resource1', 'resource2', 'resource3'],
  'group2': ['resource4', 'resource5', 'resource6'],
  'group3': ['resource7', 'resource8', 'resource9']
}
const resourceContent = {
  'resource1': '{"@graph":[{"@id":"","label":"resource1content"}]}',
  'resource2': '{"@graph":[{"@id":"","label":"resource2content"}]}',
  'resource3': '{"@graph":[{"@id":"","label":"resource3content"}]}',
  'resource4': '{"@graph":[{"@id":"","label":"resource4content"}]}',
  'resource5': '{"@graph":[{"@id":"","label":"resource5content"}]}',
  'resource6': '{"@graph":[{"@id":"","label":"resource6content"}]}',
  'resource7': '{"@graph":[{"@id":"","label":"resource7content"}]}',
  'resource8': '{"@graph":[{"@id":"","label":"resource8content"}]}',
  'resource9': '{"@graph":[{"@id":"","label":"resource9content"}]}'
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
      const resource2Uri = getGroupRDF.buildUri('group1', 'resource2')
      expect(await getGroupRDF.getResourceTextFromServer('group1', 'resource2')).toEqual(`{"@graph":[{"@id":"${resource2Uri}","label":"resource2content"}]}`)
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
      const resource1Uri = getGroupRDF.buildUri('group1', 'resource1')
      const resource2Uri = getGroupRDF.buildUri('group1', 'resource2')
      const resource3Uri = getGroupRDF.buildUri('group1', 'resource3')

      expect(fs.readFileSync(`${groupDirPath}/resource1`).toString()).toEqual(`{"@graph":[{"@id":"${resource1Uri}","label":"resource1content"}]}`)
      expect(fs.readFileSync(`${groupDirPath}/resource2`).toString()).toEqual(`{"@graph":[{"@id":"${resource2Uri}","label":"resource2content"}]}`)
      expect(fs.readFileSync(`${groupDirPath}/resource3`).toString()).toEqual(`{"@graph":[{"@id":"${resource3Uri}","label":"resource3content"}]}`)
      const completionLogText = fs.readFileSync(`${groupDirPath}/complete.log`).toString()
      // completion log text should have date, should fall between group dir creation and downloadAllRdfForGroup resolving
      const completionLogDate = new Date(/^completed export of group1 at (.*)$/.exec(completionLogText)[1])
      expect(groupDirDate <= completionLogDate && completionLogDate <= dlDateUpperBound).toBeTruthy()
    })

    describe('error handling behavior', () => {
      const consoleErrSpy = jest.spyOn(console, 'error')
      const honeybadgerNotifySpy = jest.spyOn(Honeybadger, 'notify')
      const originalGetBaseWithHttpInfo = mockSinopiaClient.getBaseWithHttpInfo
      const originalGetGroupWithHttpInfo = mockSinopiaClient.getGroupWithHttpInfo
      const originalGetResourceWithHttpInfo = mockSinopiaClient.getResourceWithHttpInfo

      beforeEach(() => {
        consoleErrSpy.mockReset()
        honeybadgerNotifySpy.mockReset()
      })
      afterEach(() => {
        mockSinopiaClient.getBaseWithHttpInfo = originalGetBaseWithHttpInfo
        mockSinopiaClient.getGroupWithHttpInfo = originalGetGroupWithHttpInfo
        mockSinopiaClient.getResourceWithHttpInfo = originalGetResourceWithHttpInfo
      })

      it('logs and moves on if a resource errors out', async () => {
        const mockRequestErr = new Error("timeout or something")
        const errFn = (mockRequestErr) => {
          throw mockRequestErr
        }
        mockSinopiaClient.getResourceWithHttpInfo = async (groupName, resourceName) => {
          return (resourceName === 'resource5' ? errFn(mockRequestErr) : { response: { text: resourceContent[resourceName] } })
        }
        await getGroupRDF.downloadAllRdfForGroup('group2')

        const exportBaseDirContents = fs.readdirSync(config.get('exportBasePath'))
        const groupDirName = exportBaseDirContents.filter((dirName) => dirName.match(/^group2_.*$/)).slice(-1)[0]

        const groupDirPath = `${config.get('exportBasePath')}/${groupDirName}`
        expect(fs.readdirSync(groupDirPath).length).toEqual(3) // two resources and complete.log

        const resource4Uri = getGroupRDF.buildUri('group2', 'resource4')
        const resource6Uri = getGroupRDF.buildUri('group2', 'resource6')

        expect(fs.readFileSync(`${groupDirPath}/resource4`).toString()).toEqual(`{"@graph":[{"@id":"${resource4Uri}","label":"resource4content"}]}`)
        expect(fs.existsSync(`${groupDirPath}/resource5`)).toBe(false)
        expect(fs.readFileSync(`${groupDirPath}/resource6`).toString()).toEqual(`{"@graph":[{"@id":"${resource6Uri}","label":"resource6content"}]}`)
        const errMsgRegex = new RegExp(`^error saving resource group2/resource5 to ${groupDirPath} : Error: timeout or something`)
        expect(consoleErrSpy).toHaveBeenCalledWith(expect.stringMatching(errMsgRegex))
        const contextObj = { context: { argv: process.argv, trellisBasePath: config.get('trellis.basePath') } }
        expect(honeybadgerNotifySpy).toHaveBeenCalledWith(mockRequestErr, contextObj)
      })
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

      for (const groupName in groupResources) {
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

        for (const resourceName of resourceNames) {
          const resourceUri = getGroupRDF.buildUri(groupName, resourceName)
          expect(fs.readFileSync(`${groupDirPath}/${resourceName}`).toString()).toEqual(`{"@graph":[{"@id":"${resourceUri}","label":"${resourceName}content"}]}`)
        }
      }

      const completionLogText = fs.readFileSync(`${containingDirPath}/complete.log`).toString()
      // completion log text should have date, should fall between group dir creation and downloadAllRdfForGroup resolving
      const completionLogDate = new Date(/^completed export of all groups at (.*)$/.exec(completionLogText)[1])
      expect(containingDirDate <= completionLogDate && completionLogDate <= dlDateUpperBound).toBeTruthy()
    })

    describe('error handling behavior', () => {
      const consoleErrSpy = jest.spyOn(console, 'error')
      const honeybadgerNotifySpy = jest.spyOn(Honeybadger, 'notify')
      const originalGetBaseWithHttpInfo = mockSinopiaClient.getBaseWithHttpInfo
      const originalGetGroupWithHttpInfo = mockSinopiaClient.getGroupWithHttpInfo
      const originalGetResourceWithHttpInfo = mockSinopiaClient.getResourceWithHttpInfo

      beforeEach(() => {
        consoleErrSpy.mockReset()
        honeybadgerNotifySpy.mockReset()
      })
      afterEach(() => {
        mockSinopiaClient.getBaseWithHttpInfo = originalGetBaseWithHttpInfo
        mockSinopiaClient.getGroupWithHttpInfo = originalGetGroupWithHttpInfo
        mockSinopiaClient.getResourceWithHttpInfo = originalGetResourceWithHttpInfo
      })

      const errFn = (mockErr) => {
        throw mockErr
      }

      it('logs and moves on if listing resources in a group errors out', async () => {
        const mockRequestErr = new Error("timeout or something")
        mockSinopiaClient.getGroupWithHttpInfo = async (groupName) => {
          return (groupName == 'group1' ? errFn(mockRequestErr) : { response: { body: {contains: groupResources[groupName] } } })
        }
        await getGroupRDF.downloadAllRdfForAllGroups()

        const exportBaseDirContents = fs.readdirSync(config.get('exportBasePath'))
        const containingDirName = exportBaseDirContents.filter((dirName) => dirName.match(/^sinopia_export_all_.*$/)).slice(-1)[0]

        // list the group subdirectories in the containing directory.  should have as many entries as there are groups
        const containingDirPath = `${config.get('exportBasePath')}/${containingDirName}`
        expect(fs.readdirSync(containingDirPath).length).toEqual(3) // 2 groups, plus complete.log
        const exportAllDirContents = fs.readdirSync(containingDirPath)

        const resource4Uri = getGroupRDF.buildUri('group2', 'resource4')
        const resource7Uri = getGroupRDF.buildUri('group3', 'resource7')

        const group1Dir = exportAllDirContents.find((dirName) => dirName.startsWith('group1'))
        expect(fs.existsSync(`${containingDirPath}/${group1Dir}`)).toBe(false)
        const group2Dir = exportAllDirContents.find((dirName) => dirName.startsWith('group2'))
        expect(fs.readFileSync(`${containingDirPath}/${group2Dir}/resource4`).toString()).toEqual(`{"@graph":[{"@id":"${resource4Uri}","label":"resource4content"}]}`) // spot check
        const group3Dir = exportAllDirContents.find((dirName) => dirName.startsWith('group3'))
        expect(fs.readFileSync(`${containingDirPath}/${group3Dir}/resource7`).toString()).toEqual(`{"@graph":[{"@id":"${resource7Uri}","label":"resource7content"}]}`) // spot check

        const errMsgRegex = new RegExp(`^error listing entities for group: group1 : Error: timeout or something`)
        expect(consoleErrSpy).toHaveBeenCalledWith(expect.stringMatching(errMsgRegex))
        const contextObj = { context: { argv: process.argv, trellisBasePath: config.get('trellis.basePath') } }
        expect(honeybadgerNotifySpy).toHaveBeenCalledWith(mockRequestErr, contextObj)
      })

      it('logs an error if listing groups on the base errors out', async () => {
        const mockRequestErr = new Error("timeout or something")
        mockSinopiaClient.getBaseWithHttpInfo = async () => { errFn(mockRequestErr) }
        const dlDateLowerBound = new Date()
        await getGroupRDF.downloadAllRdfForAllGroups()

        const errMsgRegex = new RegExp(`^error listing groups in base container: Error: timeout or something`)
        expect(consoleErrSpy).toHaveBeenCalledWith(expect.stringMatching(errMsgRegex))
        const contextObj = { context: { argv: process.argv, trellisBasePath: config.get('trellis.basePath') } }
        expect(honeybadgerNotifySpy).toHaveBeenCalledWith(mockRequestErr, contextObj)

        expect(fs.statSync(config.get('exportBasePath')).mtime <= dlDateLowerBound).toBe(true)
      })
    })
  })
})
