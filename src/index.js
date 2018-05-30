// @flow
import type { Node } from 'react';

export type Definition = {
  type: string,
  [string]: any,
};

export type Resolver = (
  previous: any,
  current?: Definition,
  next: (result: any) => Node,
) => Node;

export type ConstructProps = {
  render?: (result: any) => Node,
  definition: Array<Definition>,
  resolvers: Array<{ type: string, resolverFunc: Resolver }>,
};

const identity = <T>(x: T): T => x;

const getResolver = ({ type }: Definition, resolvers: Array<{type: string, resolverFunc: Resolver }>) => {
  const resolver = resolvers.find(resolver => resolver.type === type);
  if (!resolver || !resolver.resolverFunc) {
    throw Error(`Can\'t fine resolver function for type: ${type}`);
  }
  return resolver.resolverFunc;
};

const reducer = resolvers =>
  (next, current) =>
    previous =>
      getResolver(current, resolvers)(previous, current, next)

const Construct = ({ definition, resolvers, render }: ConstructProps) => (
  definition.reduceRight(reducer(resolvers), render || identity)(null)
);

export default Construct;