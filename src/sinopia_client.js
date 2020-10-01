// Copyright 2020 Stanford University see LICENSE for license

const fetch = require("node-fetch");

export const query = (uri, headers) => {
  return fetch(uri, {
    headers: headers,
  }).then((resp) => resp.json())
    .then((json) => json.data)
}