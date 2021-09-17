// Copyright 2019 Stanford University see LICENSE for license

import * as sinopia_client from '../src/sinopia_client'
import fetch from 'node-fetch'

jest.mock('node-fetch', ()=>jest.fn())

describe('query', () => {
  it('successfully resolves the promise when response status is OK', async () => {
    const responseBody = { "data": [{ id: 'group1', label: 'Group 1'}, { id: 'group2', label: 'Group 2'}] }

    const response = Promise.resolve({
      ok: true,
      json: () => { return responseBody },
    })
    fetch.mockImplementation(()=> response)

    expect(await sinopia_client.query("http://localhost:3000/groups")).toStrictEqual(responseBody)
  })

  it('returns null if the api call fails', async () => {
    const response = Promise.reject(new Error("ApiError")) // {
    fetch.mockImplementation(()=> response)

    await expect(sinopia_client.query("http://localhost:3000/groups")).rejects.toThrowError('Error parsing resource: ApiError')
  })
})
