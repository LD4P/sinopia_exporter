import config from 'config'
import fs from 'fs'
import * as getGroupRDF from '../src/getGroupRDF'
import SinopiaServer from 'sinopia_server'

const groupResources = { 'group1': ['resource1', 'resource2', 'resource3'] }
const resourceContent = { 'resource1': 'resource1content', 'resource2': 'resource2content', 'resource3': 'resource3content' }

const mockSinopiaClient = jest.fn()
mockSinopiaClient.apiClient = jest.fn() // need this field present so sinopiaClient() function can set .basePath on it.
mockSinopiaClient.getGroupWithHttpInfo = async (groupName) => { return (!groupResources[groupName] ? null : { response: { body: {contains: groupResources[groupName] } } }) }
mockSinopiaClient.getResourceWithHttpInfo = async (groupName, resourceName) => { return (!groupResources[groupName] ? null : { response: { text: resourceContent[resourceName] } }) }

jest.spyOn(SinopiaServer, 'LDPApi').mockImplementation(() => mockSinopiaClient)

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
    it('retrieves the RDF resources for the specified group, and saves the RDF text (on file per resource, in a dated sub-directory)', async () => {
      const dlDateLowerBound = new Date()
      await getGroupRDF.downloadAllRdfForGroup('group1')
      const dlDateUpperBound = new Date()

      // assume we just want the latest output dir in the export base dir, since we should be the only ones writing there
      const exportBaseDirContents = fs.readdirSync(`./${config.get('exportBasePath')}`)
      const groupDirName = exportBaseDirContents[exportBaseDirContents.length-1]

      // RDF for group exported to subdirectory with name like 'group1_2019-08-05T01:34:13.143Z'
      const groupDirDate = new Date(/^group1_(.*)$/.exec(groupDirName)[1])
      // .toBeGreaterThan and .toBeLessThan only work for numbers
      expect(dlDateLowerBound < groupDirDate && groupDirDate < dlDateUpperBound).toBeTruthy()

      const groupDirPath = `./${config.get('exportBasePath')}/${groupDirName}`
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
})
