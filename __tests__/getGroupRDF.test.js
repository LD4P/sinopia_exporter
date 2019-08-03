import * as getGroupRDF from '../src/getGroupRDF'
import SinopiaServer from 'sinopia_server'

const mockSinopiaClient = jest.fn()
mockSinopiaClient.getGroupWithHttpInfo = jest.fn()
mockSinopiaClient.getResourceWithHttpInfo = jest.fn()
mockSinopiaClient.apiClient = jest.fn() //TODO: test that .basePath gets set correctly on this

jest.spyOn(SinopiaServer, 'LDPApi').mockImplementation(() => mockSinopiaClient)

describe('getGroupRDF', () => {
  describe('getResourceTextFromServer', () => {
    it('retrieves the specified resource from the server and returns the RDF as text', async () => {
      const groupResources = { 'group1': ['resource1', 'resource2', 'resource3'] }
      const resourceContent = { 'resource1': 'resource1content', 'resource2': 'resource2content', 'resource3': 'resource3content' }

      mockSinopiaClient.getGroupWithHttpInfo = async (groupName) => { return (!groupResources[groupName] ? null : { response: { body: {contains: resourceList } } }) }
      mockSinopiaClient.getResourceWithHttpInfo = async (groupName, resourceName) => { return (!groupResources[groupName] ? null : { response: { text: resourceContent[resourceName] } }) }

      expect(await getGroupRDF.getResourceTextFromServer('group1', 'resource2')).toEqual('resource2content')
    })
  })
})
