// Copyright 2019 Stanford University see LICENSE for license

import config from 'config'
import fs from 'fs'
import * as exporter from '../src/exporter'
import * as sinopia_client from '../src/sinopia_client'

// Import fixtures
const resource1 = require('./__fixtures__/004c0602-f3c2-4800-9a21-a14c1a70f3c6.json')
const resource2 = require('./__fixtures__/6d9e3c1b-fc26-4ff2-9951-435ff86e4971.json')
const resource3 = require('./__fixtures__/6f30cb1a-676d-4d5d-9f54-32162c9ab573.json')

const groups = [
  { 'id': 'group1', 'label': 'Group 1'},
  { 'id': 'group2', 'label': 'Group 2'},
  { 'id': 'group3', 'label': 'Group 3'}
]

afterAll(async () => {
  // according to:  https://nodejs.org/api/fs.html#fs_fs_rmdirsync_path_options
  //  "Recursive removal is experimental", and is considered "Stability: 1" (https://nodejs.org/api/documentation.html#documentation_stability_index).
  //  but it seems to work fine for me locally (JM 2019-10-19), and cleanup is nice.
  //  Note: Comment out the next line to avoid deleting export files while testing
  // fs.rmdirSync(config.get('exportBasePath'), { recursive: true})
})

describe('getGroupRDF', () => {
  describe('exportGroup', () => {
    it('retrieves the RDF resources for the specified group, and saves the RDF text (one file per resource, in a dated sub-directory per group)', async () => {
      sinopia_client.query = jest.fn().mockResolvedValue({ data: [resource1, resource2, resource3] })
      const dlDateLowerBound = new Date()
      await exporter.exportGroup('group1')
      const dlDateUpperBound = new Date()

      const exportBaseDirContents = fs.readdirSync(config.get('exportBasePath'))
      const groupDirName = exportBaseDirContents.filter((dirName) => dirName.match(/^group1_.*$/)).slice(-1)[0]

      // RDF for group exported to subdirectory with name like 'group1_2019-08-05T01:34:13.143Z'
      const groupDirDate = new Date(/^group1_(.*)$/.exec(groupDirName)[1])
      // .toBeGreaterThan and .toBeLessThan only work for numbers
      expect(dlDateLowerBound <= groupDirDate && groupDirDate <= dlDateUpperBound).toBeTruthy()

      const groupDirPath = `${config.get('exportBasePath')}/${groupDirName}`
      const groupDirContents = fs.readdirSync(groupDirPath)
      expect(groupDirContents).toEqual(['004c0602-f3c2-4800-9a21-a14c1a70f3c6', '6d9e3c1b-fc26-4ff2-9951-435ff86e4971', '6f30cb1a-676d-4d5d-9f54-32162c9ab573', 'complete.log'])

      expect(fs.readFileSync(`${groupDirPath}/004c0602-f3c2-4800-9a21-a14c1a70f3c6`).toString()).toEqual(JSON.stringify(resource1))
      expect(fs.readFileSync(`${groupDirPath}/6d9e3c1b-fc26-4ff2-9951-435ff86e4971`).toString()).toEqual(JSON.stringify(resource2))
      expect(fs.readFileSync(`${groupDirPath}/6f30cb1a-676d-4d5d-9f54-32162c9ab573`).toString()).toEqual(JSON.stringify(resource3))
      const completionLogText = fs.readFileSync(`${groupDirPath}/complete.log`).toString()
      // completion log text should have date, should fall between group dir creation and downloadAllRdfForGroup resolving
      const completionLogDate = new Date(/^completed export of group1 at (.*)$/.exec(completionLogText)[1])
      expect(groupDirDate <= completionLogDate && completionLogDate <= dlDateUpperBound).toBeTruthy()
    })
  })

  describe('exportAllGroups', () => {
    it('retrieves the RDF resources for all groups, and saves the RDF text (one file per resource, in a dated sub-directory per group, in a dated containing folder)', async () => {
      sinopia_client.query = jest
        .fn()
        .mockResolvedValue({ data: [resource1, resource2, resource3] })
        .mockResolvedValueOnce({ data: groups })

      const dlDateLowerBound = new Date()
      await exporter.exportAllGroups()
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
      expect(exportAllDirContents.length).toEqual(4)

      // TODO: update test to allow async
      // groups.map((group) => {
      //   const groupName = group.id
      //   const groupDir = `${containingDirPath}/${groupName}/`
      //   const groupDirContents = fs.readdirSync(groupDir)
      //   expect(groupDirContents.length).toEqual(4) // 3 resource + complete.log
      //   expect(groupDirContents).toEqual(expect.arrayContaining(['004c0602-f3c2-4800-9a21-a14c1a70f3c6', '6d9e3c1b-fc26-4ff2-9951-435ff86e4971', '6f30cb1a-676d-4d5d-9f54-32162c9ab573', 'complete.log']))
      // })

      const completionLogText = fs.readFileSync(`${containingDirPath}/complete.log`).toString()
      // completion log text should have date, should fall between group dir creation and downloadAllRdfForGroup resolving
      const completionLogDate = new Date(/^completed export of all groups at (.*)$/.exec(completionLogText)[1])
      expect(containingDirDate <= completionLogDate && completionLogDate <= dlDateUpperBound).toBeTruthy()
    })
  })
})
