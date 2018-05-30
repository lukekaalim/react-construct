# React Construct
**Unrolling React trees from serializable definitions**

### Basic Use

Feed the component a definition

```javascript
import { Construct } from 'react-construct';
import { standardResolvers } from 'react-construct/resolvers';

const def = [
  { type: 'fetch', url: 'https://dog.ceo/api/breeds/image/random' },
  { type: 'getProperty', propertyName: 'message' }
];

return <Construct definition={def} resolvers={standardResolvers} />
```

Unrolls to the react tree

```javascript
<Construct definition={deps} resolvers={standardResolvers}>
  <WithFetch url={'https://dog.ceo/api/breeds/image/random'} render={data => (
    getProperty(data, 'message')
  )}>
</Construct>

```

Which (eventually) renders to the string:
```https://images.dog.ceo/breeds/borzoi/n02090622_7489.jpg```

### Advanced Use

Do something useful with the data

```javascript
import { Construct } from 'react-construct';
import { standardResolvers } from 'react-construct/resolvers';

const def = [
  { type: 'fetch', url: 'https://dog.ceo/api/breeds/image/random' },
  { type: 'getProperty', propertyName: 'message' }
];

const renderWithDog = dogImageUrl => (
  <img src={dogImageUrl} alt="A random Dog!" />
);

return <Construct definition={def} resolvers={standardResolvers} render={renderWithDog}/>;
```

Or build your own resolver for more control

```javascript
import { Construct } from 'react-construct';
import { standardResolvers } from 'react-construct/resolvers';

import Dog from 'src/components/Dog';

const renderDog = (previous, current, next) => {
  if (previous === null) {
    return next(null); // fetch hasn't completed yet, potentially include a loading state
  }
  return next(<Dog src={previous.message} alt={currrent.alt} title={current.title} />);
}

const resolvers = [
  { type: 'renderDog', resolverFunc: renderDog }
  ...standardResolvers,
]

const def = [
  { type: 'fetch', url: 'https://dog.ceo/api/breeds/image/random' },
  { type: 'renderDog', title: 'That\'s one cool dog!', alt: 'Doggy!' }
];

return <Construct definition={def} resolvers={resolvers}/>;
```
### Complex Example
Render a whole react tree from an arbitrary payload using custom resolvers with dependencies, multiple api calls, authentication from tokens stored in the redux state, loading states, higher-order resolvers and more.

```javascript
// page.js

import React, { Component } from 'react'
import { Construct } from 'react-construct';

import Fetch from 'src/components/Fetch';
import resolvers from 'src/resolvers';

// this.props.pageUrl = 'https://my-service.com.au/api/pages/home'
// which has the following JSON contents in this example:
/*
  [
    {
      type: 'fetch-api',
      endpoint: 'tv-series/all',
      dependencies: [{
        name: 'queryString',
        definition: [{ type: 'authentication-token', service: 'my-service' }]
      }],
    },
    { type: 'slice-array', max: 100 },
    {
      type: 'combine-to-page',
      requiresArgs: ['metadata', previous],
      dependencies: [{
        name: 'metadata'
        definition: [{ name: 'fetch-api', endpoint: 'tv-series/all/metadata' }],
      }]
    },
    { type: 'load-if-null', loadingComponent: 'spinner' },
    { type: 'render-to-component', components: ['Title', 'Count', 'TvList'] }
  ]
*/

const Page = ({ pageSrc }) => (
  <Fetch
    url={pageSrc}
    render={pageDef => (
      pageDef ? <Construct resolvers={resolvers} definition={pageDef} /> : null
    )}
  />
);

```

Elsewhere in various files...

```javascript

// resolvers.js
export const resolvers = [
  { type: 'fetch-api',            resolverFunc: fetchApiResolver },
  { type: 'authentication-token', resolverFunc: authenticationTokenResolver },
  { type: 'slice-array',          resolverFunc: sliceArrayResolver },
  { type: 'combine-to-page',      resolverFunc: requiredArgsEnhancer(combineToPageResolver) },
  { type: 'load-if-null',         resolverFunc: loadIfNullResolver },
  { type: 'render-to-component',  resolverFunc: renderToComponentResolver },
]

// Fetch.js
// Simple Map backed data fetching component which caches off url.
// (this example breaks when considering query headers or anything in init)
// (or if the response errors otu)
const FETCH_CACHE = new Map();

export class Fetch extends Component {
  render() {
    const { url, init, render } = this.props;
    const cachedResponse = FETCH_CACHE.get(url);
    if (!cachedResponse) {
      FETCH_CACHE.set(url, { status: 'pending', response: null });
      fetch(url, init)
        .then(reponse => {
          FETCH_CACHE.set(url, { status: 'complete', response: response.json() });
          this.forceUpdate(); // redraw component once promise is complete
        })
        .catch(console.error);
      return render(null);
    }
    const { status, response } = cachedResponse;
    if(status === 'complete') {
      // fetch has resolved; server the data to the render function
      return render(response)
    }
    // wait for pending fetch to resolve
    return render(null);
  }
}

// fetchApiResolver.js
// Staticly define all endpoints
const getUrl = endpoint => {
  switch (endpoint) {
    case 'tv-series/all': return 'https://my-service.com.au/api/tv-series/all';
    case 'tv-series/all/meta': return 'https://my-service.com.au/api/tv-series/all/meta';
    default:  throw Error('Invalid endpoint', endpoint);
  }
}
export const fetchApiResolver = (previous, current, next) => (
  <Fetch url={getUrl(current.endpoint)} render={next} />
);

// authenticationTokenResolver.js
// Use a connected component to get a token from the redux store
import { connect } from 'src/reduxStore';
import { getAllTokens } from 'src/selectors';

const mapStateToProps = (state, props) => ({
  token: getAllTokens(state)
    .find(token => token.service === props.service)
});

const SelectToken = connect(mapStateToProps)({ token, render }) => (
  render(token ? token.contents : null)
);

export const authenticationTokenResolver = (previous, current, next) => (
  <SelectToken service={current.service} render={next} />
);

// sliceArrayResolver.js
// use defaults, deconstruction (or flowtypes)
export const sliceArrayResolver = (previous = [], { min = 0, max = 999 }, next) => (
  next(previous ? previous.slice(min, max) : []),
);

// combineToPageResolver.js
// Composes various properties into a single object
export const combineToPageResolver = (previous, { metadata }, next) => (
  next({
    title: metadata.title,
    subtitle: metadata.subtitle,
    length: previous.length,
    items: previous,
  })
);

// loadIfNullResolver.js
// this resolver does not call the next function if it's loading
// this forces all the subsequent resolvers not to be called
const getLoadingComponent = loadingComponentName => {
  switch (loadingComponent) {
    default:
    case 'spinner':
      return <Spinner />
  }
}
export const loadIfNullResolver = (previous, { loadingComponent }, next) => {
  const Component = getLoadingComponent(loadingComponent);
  return previous === null ? <Component /> : next(previous);
};

// getComponentToRender.js
// This resolver returns a collection of react nodes
import React, { Fragment } from 'react';

const Title = ({ title }) => (
  <h1>{title}</h1>
);
const Count = ({ length }) => (
  <h1>There are {length} items in this array!</h1>
);
const TvList = ({ items }) => (
  items.map((tvSeries) => <div key={tvSeries.id}>{tvSeries.name}</div>)
);

const getComponentToRender = componentName => {
  switch(componentName) {
    case 'Title': return Title;
    case 'Count': return Count;
    case 'TvList': return TvList;
    default: throw Error('Invalid Component', componentName);
  }
}
export const renderToComponentResolver = (previous, { components }, next) => (
  next(components.map(componentName, index) => {
    const Component = getComponentToRender(componentName);
    return <Component key={index} {...previous} />
  });
);
```