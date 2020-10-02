// Copyright 2020 Stanford University see LICENSE for license

const fetch = require("node-fetch");

export const query = async (uri, headers) => {
  const response = await fetch(uri, { headers: headers })
  if(!response.ok) return null

  try {
    const json = response.json()
    return json.data
  } catch(err) {
    console.error(err, `Error connecting to API: ${uri}`)
    return null
  }
}
