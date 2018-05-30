// @flow
import type { Node } from 'react';

type Definition = {
  type: string,
  dependencies?: Array<{name: string, definition: Array<Definition>}>,
  [string]: any,
};

type Resolver = (
  previous: any,
  current?: Definition,
  next: (result: any) => Node,
) => Node;

type Props = {
  render?: (result: any) => Node,
  definition: Array<Definition>,
  resolvers: Array<{ type: string, resolverFunc: Resolver }>,
};

const identity = x => x;
const identityResolver: Resolver = (previous, current, next) => next(previous);

const Construct = ({ definition, resolvers, render }: Props) => {
  const getResolver = ({ type }: Definition) => (
    resolvers.find(resolver => resolver.type === type) || { resolverFunc: identityResolver }
  ).resolverFunc;

  const constructed = definition.reduceRight(
      (next, current) => previous => getResolver(current)(previous, current, next),
      render || identity,
    )
  return constructed(null);
};
export default Construct;