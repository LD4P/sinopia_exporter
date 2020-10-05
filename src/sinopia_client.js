// Copyright 2020 Stanford University see LICENSE for license

const fetch = require("node-fetch");

export const query = async (uri, headers) => {
  const fetchPromise = fetch(uri, { headers: headers })
    .then((resp) => checkResp(resp)
      .then(() => resp.json()))

  return fetchPromise
    .then((response) => Promise.all([response.data, Promise.resolve(response)]))
    .catch((err) => {
      throw new Error(`Error parsing resource: ${err.message || err}`)
    })
}

const checkResp = (resp) => {
  if (resp.ok) return Promise.resolve()

  return resp.json()
    .then((errors) => {
      // Assuming only one for now.
      const error = errors[0]
      const newError = new Error(`${error.title}: ${error.details}`)
      newError.name = 'ApiError'
      throw newError
    })
    .catch((err) => {
      if (err.name === 'ApiError') throw err
      throw new Error(`Sinopia API returned ${resp.statusText}`)
    })
}