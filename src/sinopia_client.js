import config from 'config'
import { JsonLdParser } from 'jsonld-streaming-parser'
import rdf from 'rdf-ext'

const fetch = require("node-fetch");
const Readable = require('stream').Readable

/**
 * Fetches the groups from the Sinopia API.
 * @return {Promise{[rdf.Dataset, Object]} resource as dataset, response JSON.
 * @throws when error occurs retrieving or parsing the resource template.
 */ 
export const fetchGroups = () => {
  let fetchPromise
  const uri = config.get('sinopia_api.basePath') + "/groups"

  console.log("API URI: " + uri)
  fetchPromise = fetch(uri, {
    headers: { Accept: 'application/json' },
  })
    .then((resp) => checkResp(resp)
      .then(() => resp.json()))

  return fetchPromise
    .then((response) => Promise.all([datasetFromJsonld(response.data), Promise.resolve(response)]))
    .catch((err) => {
      throw new Error(`Error parsing resource: ${err.message || err}`)
    })
}

export const fetchResources = (group) => {
  let fetchPromise
  const uri = config.get('sinopia_api.basePath') + "/resource/?group=" + group

  console.log("API URI: " + uri)
  fetchPromise = fetch(uri, {
    headers: { Accept: 'application/json' },
  })
    .then((resp) => checkResp(resp)
      .then(() => resp.json()))

  return fetchPromise
    .then((response) => Promise.all([datasetFromJsonld(response.data), Promise.resolve(response)]))
    .catch((err) => {
      throw new Error(`Error parsing resource: ${err.message || err}`)
    })
}

export const fetchResource = (resourceId) => {
  let fetchPromise
  const uri = config.get('sinopia_api.basePath') + "/resource/" + resourceId

  console.log("API URI: " + uri)
  // fetchPromise = fetch(uri, {
  return fetch(uri, {
    headers: { Accept: 'application/json' },
  }).then(response => checkResp(response)
      .then(() => response.json())) // response.json())
    // .then(data => {
    //   console.log("DATA = " + await data.json())
    //   return data
    // })


    // .then((resp) => checkResp(resp)
    //   .then(() => resp.json()))

  // return fetchPromise
  //   // .then((response) => Promise.all([datasetFromJsonld(response), Promise.resolve(response)]))
  //   .then((response) => Promise.all([getData(response), Promise.resolve(response)]))
  //   .catch((err) => {
  //     throw new Error(`Error parsing resource: ${err.message || err}`)
  //   })
}

const getData = (resp) => {
  console.log(" === getData === ")
  console.log(resp)

  return resp
}

const checkResp = (resp) => {
  console.log("checkResp = " + resp)

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

const datasetFromJsonld = (jsonld) => {
  console.log(" === HERE === ")
  console.log(jsonld)
  const parserJsonld = new JsonLdParser()

  const input = new Readable({
    read: () => {
      input.push(JSON.stringify(jsonld))
      input.push(null)
    },
  })

  console.log(" === HERE 2 === ")
  console.log(input)
  const output = parserJsonld.import(input)
  const dataset = rdf.dataset()

  output.on('data', (quad) => {
    dataset.add(quad)
  })

  console.log("OUTPUT = " + output)
  return new Promise((resolve, reject) => {
    output.on('end', resolve)
    output.on('error', reject)
  })
    .then(() => dataset)
}