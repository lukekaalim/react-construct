var identity = function identity(x) {
  return x;
};
var identityResolver = function identityResolver(previous, current, next) {
  return next(previous);
};

var Construct = function Construct(_ref) {
  var definition = _ref.definition,
      resolvers = _ref.resolvers,
      render = _ref.render;

  var getResolver = function getResolver(_ref2) {
    var type = _ref2.type;
    return (resolvers.find(function (resolver) {
      return resolver.type === type;
    }) || { resolverFunc: identityResolver }).resolverFunc;
  };

  var constructed = definition.reduceRight(function (next, current) {
    return function (previous) {
      return getResolver(current)(previous, current, next);
    };
  }, render || identity);
  return constructed(null);
};

export default Construct;
