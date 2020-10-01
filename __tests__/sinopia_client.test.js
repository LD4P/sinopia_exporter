// Copyright 2019 Stanford University see LICENSE for license

import * as sinopia_client from '../src/sinopia_client'
import fetch from 'node-fetch'

jest.mock('node-fetch', ()=>jest.fn())

describe('query', () => {
  it('successfully resolves the promise when response status is OK', async () => {
    const responseBody = { "data": {} }

    const response = Promise.resolve({
      ok: true,
      json: () => { return responseBody },
    })
    fetch.mockImplementation(()=> response)

    expect(await sinopia_client.query("http://localhost:3000/groups")).toStrictEqual({})
  })
})
