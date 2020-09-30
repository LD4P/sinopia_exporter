const fetch = require("node-fetch");

export const query = (uri, headers) => {
  return fetch(uri, {
    headers: headers,
  })
    .then((resp) => checkResp(resp)
      .then(() => resp.json())
        .then((json) => json.data))
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
