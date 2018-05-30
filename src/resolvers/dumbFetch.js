// @flow

/*
  The dumbest of all fetch components. Returns a promise and will eventually call next,
  but ultimaltey disconnects the resolver chain by always returning a promise. It doesn't
  matter what next resolvers will return, their results will be discarded.

*/
const dumbFetch = (previous: any, current: { url: string }, next: any ) =>
  fetch(current.url).then(response => response.json()).then(next);

export default dumbFetch;