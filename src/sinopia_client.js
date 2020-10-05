// Copyright 2020 Stanford University see LICENSE for license

const fetch = require("node-fetch");

export const query = async (uri, headers) => {
  try {
    const resp = await fetch(uri, { headers: headers })
    const json = await resp.json()
    return json.data
  } catch (err) {
    throw new Error(`Error parsing resource: ${err.message || err}`)
  }
}
