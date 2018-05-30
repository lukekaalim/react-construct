# React Construct
**Unrolling React trees from serializable definitions**

### Basic Use

Feed the component a definition

```javascript
import React from 'react';
import { Construct } from 'react-construct';
import { standardResolvers } from 'react-construct/resolvers';

const definition = [
  { type: 'fetch', url: 'https://dog.ceo/api/breeds/image/random' },
  { type: 'getProperty', propertyName: 'message' }
];
export const Dog = () => <Construct definition={definition} resolvers={standardResolvers} />;
```

Unrolls to the react tree

```javascript
export const RandomDog = () => (
  <Fetch url={'https://dog.ceo/api/breeds/image/random'} render={data => (
    getProperty(data, 'message')
  )}>
);
```

Which when used like:
```javsscript
<Dog />
```
*eventually* renders to a string:
```https://images.dog.ceo/breeds/borzoi/n02090622_7489.jpg```

### Advanced Use

Do something useful with the data like plug the string into an ```<img>``` tag

```javascript
import { Construct } from 'react-construct';
import standardResolvers from 'react-construct/resolvers';

const def = [
  { type: 'fetch', url: 'https://dog.ceo/api/breeds/image/random' },
  { type: 'getProperty', propertyName: 'message' }
];

const renderWithDog = dogImageUrl => (
  <img src={dogImageUrl} alt="A random Dog!" />
);

export const RandomDog = () => (
  <Construct definition={def} resolvers={standardResolvers} render={renderWithDog}/>;
);
```
``` <Dog /> ```
becomes:

![A random Dog!](https://images.dog.ceo/breeds/borzoi/n02090622_7489.jpg)

Or build your own resolver for more control

```javascript
import { Construct } from 'react-construct';
import { standardResolvers } from 'react-construct/resolvers';

// Your own custom Dog component that takes in a src, and alt and a title
import Dog from 'src/components/Dog';

const renderDog = (previous, current, next) => {
  if (previous === null) {
    return next(null); // fetch hasn't completed yet, potentially include a loading state
  }
  return next(<Dog src={previous.message} alt={currrent.alt} title={current.title} />);
}

const resolvers = [
  { type: 'render-dog', resolverFunc: renderDog }
  ...standardResolvers,
]

const def = [
  { type: 'fetch', url: 'https://dog.ceo/api/breeds/image/random' },
  { type: 'render-dog', title: 'That\'s one cool dog!', alt: 'Doggy!' }
];

export const RandomDog = () => (
  <Construct definition={def} resolvers={resolvers}/>
);
```

### Stateful re-rendering

Now, lets add some user input! For this example, we'll use Redux, but make no mistake, state changing can happen locally inside a component in a resolver!

```javascript

// Reducer.js
const reducer = (state = {}, action) => {
  switch (action.type) {
    case 'DOG_NAME_CHANGE':
      return { ...state, dogName: action.name };
    default:
      return state;
  }
}

// RandomDog.js
import { Construct } from 'react-construct';
import { standardResolvers } from 'react-construct/resolvers';
import Dog from 'src/components/Dog';

const renderDog = (previous, current, next) => (
  next(previous ? <Dog {...previous} /> : 'loading doggo');
);

// A connected render prop component that returns the dog's name
const ConnectDogName = connect(state => ({ dogName: state.dogName }))
(({ render, dogName }) => render(dogName));

const editDog = (previous, current, next) => {
  previous ?
    <ConnectDogName render={dogName => (
      next({
        title: dogName,
        alt: `A picture of ${dogName}. How nice!`
        src: previous,
      })
    )} />
    :
    next(null);
}

const resolvers = [
  { type: 'render-dog', resolverFunc: renderDog }
  { type: 'edit-dog', resolverFunc: editDog }
  ...standardResolvers,
];

const def = [
  { type: 'fetch', url: 'https://dog.ceo/api/breeds/image/random' },
  { type: 'edit-dog' }
  { type: 'render-dog' }
];

const RandomDog = ({ dispatch }) => (
  <Fragment>
    <input
      type="text"
      onChange={event => dispatch({ type: 'DOG_NAME_CHANGE', name: event.target.value })}
    />
    <Construct definition={def} resolvers={resolvers}/>
  </Fragment>
);
export default connect()(RandomDog)
```

### Explanation

*Right, so, what's going on?*

You feed the Construct component a definition array, and an array of resolver functions, and then it tries to match each element in the definition array with its corresponding resolver. Each resolver has the signature `(previous, current, next) => React.Node`, and is invoked for each matching definition in order.

**previous** refers to what the previous resolver put as the first argument when it invoked `next()`. The very first resolver that runs normally recieves `null` as it's previous, but this can be overriden.

**current** is an object representing the properties attached to the current definition. Things like `type` and `url` and `title` and the like.

**next** is a function that invokes the next resolver. Whatever you put in here as an argument is what pops out of the next resolver's `previous`. Typically, resolvers want to return the result of this in each step. The final resolver normally recieves an identity function (`x => x`) as it's next, but this can be overriden.

The most simple resolver is written as:
```javascript
const identityResolver = (previous, current, next) => next(previous);
```
or
```javascript
function identityResolver(previous, current, next) {
  return next(previous);
}
```
which is the identity resolver, which does nothing but continue the chain.

Under the hood, Construct is actually very simple. It's implemented something like this:
```javascript
const Construct = ({ definition, resolvers }) => {
  const getResolver = ({ type }) => resolvers.find(resolver => resolver.type === type).resolverFunc;
  const render = definition.reduceRight(
      (current, next) => previous => getResolver(current)(previous, current, next),
      input => input,
    )
  return render(null);
};
export default Construct;
```

This will create one big nest of react components or functions. When a component inside the chain calls set-state and/or re-renders, it will re-render all of its dependant children as well.

But this pattern opens up a lot of oppurtunities when used with react. (But, as you can see above, react is not actually needed. it works with plain javascript fine).

As each resolver just needs to return something to render, and *eventually* call the next function, you can have resolvers that half the chain half way through and wait for something, you can have resolvers that call next synchronously and keep the chain going.

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
      dependency: {
        name: 'queryString',
        definition: [{ type: 'authentication-token', service: 'my-service' }]
      },
    },
    { type: 'slice-array', max: 100 },
    {
      type: 'combine-to-page',
      requiresArgs: ['metadata', previous],
      dependency: {
        name: 'metadata'
        definition: [{ name: 'fetch-api', endpoint: 'tv-series/all/metadata' }],
      }
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
  { type: 'fetch-api',            resolverFunc: dynamicDependencyEnhancer(fetchApiResolver, resolvers) },
  { type: 'authentication-token', resolverFunc: authenticationTokenResolver },
  { type: 'slice-array',          resolverFunc: sliceArrayResolver },
  { type: 'combine-to-page',      resolverFunc: dynamicDependencyEnhancer(requiredArgsEnhancer(combineToPageResolver), resolvers) },
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
// Staticly define all endpoints, and switch on them based on the
// string
const getUrl = endpoint => {
  switch (endpoint) {
    case 'tv-series/all': return 'https://my-service.com.au/api/tv-series/all';
    case 'tv-series/all/meta': return 'https://my-service.com.au/api/tv-series/all/meta';
    default:  throw Error('Invalid endpoint', endpoint);
  }
}
export const fetchApiResolver = (previous, current, next) => (
  <Fetch url={`${getUrl(current.endpoint)}?${current.queryString}`} render={next} />
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

// requiredArgsEnhancer.js
// Higher Order resolver (or resolver enhancer)
// wraps a child resolver, and makes a generic assertion on it.
// can modify its args
export const requiredArgsEnhancer = resolver => (previous, current, next) => {
  if(!current.requiredArgs) {
    return resolver(previous, current, next);
  }
  const args = previous === null ? Object.Keys(current) : [...Object.Keys(current), 'previous'];
  const nonNullArgs = args.filter(Boolean);
  const requiredArgsResolved = current.requiredArgs.every(requiredArg =>
    nonNullArgs.includes(requiredArg)
  );

  return requiredArgsResolved ? resolver(previous, current, next) : next(null);
}

// dynamicDependencyEnhancer.js
// Possibly the craziest enhancer, use with care.
// Recursivley calls Construct, and basically allows branches
// There is a more complex implementation of this that allows multiple dependencies
// But that's not needed in this example presently
import { Construct } from 'react-construct';

export const dynamicDependencyEnhancer = (resolver, resolvers) => (previous, current, next) => (
  current.dependency ?
    <Construct
      resolvers={resolvers}
      definition={current.dependency.definition}
      render={result =>
        resolver(previous, { ...current, [current.dependency.name]: result }, next)
      }
    />
    :
  resolver(previous, current, next);
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

Most of those resolvers or something like them can be found in the package `react-construct/resolvers`
So all you need to do it
```javascript
import { standardResolvers } from 'react-construct/resolvers';
```

### Best Practices
While stunningly easy to use (but a little difficult to grok), it is important to identity some best practices so you don't get caught out by any pit traps. Ultimatley a resolved is

 -