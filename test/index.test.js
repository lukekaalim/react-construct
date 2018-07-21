import Construct from '../src/index';

describe('Construct', () => {
  test('Does not throw an error when called with empty arguments', () => {
    expect(() => Construct({ definition: [], resolvers: [], render: null })).not.toThrow();
  });

  test('Does throw an error when called invalid arguments', () => {
    expect(() => Construct({})).toThrow();
  });

  test('Will return the value of a single resolver when it calls next', () => {
    const THING = 'https://thing';

    const resolvers = [
      { type: 'fetch', resolverFunc: (previous, current, next) => next(THING) },
    ];
    const definition = [
      { type: 'fetch' },
    ];

    expect(Construct({ resolvers, definition })).toBe(THING);
  });

  test('Will call each resolver with the previous result sequencially', () => {
    const STARTING_VALUE = 10;

    const resolvers = [
      { type: 'start', resolverFunc: (previous, current, next) => next(STARTING_VALUE) },
      { type: 'increment', resolverFunc: (previous, current, next) => next(previous + 1) },
    ];
    const definition = [
      { type: 'start' },
      { type: 'increment' },
      { type: 'increment' },
      { type: 'increment' },
    ];
    expect(Construct({ resolvers, definition })).toBe(13);
  });

  test('Will call each resolver with its current aargument equal to the definition\'s properties', () => {
    const mockResolver = jest.fn();
    const EXPECTED_DEFINITION = { type: 'mock', contents: 'arbitrary-value', func: () => 'function expression' }
    const resolvers = [
      { type: 'mock', resolverFunc: mockResolver },
    ];
    const definition = [
      EXPECTED_DEFINITION,
    ];

    Construct({ resolvers, definition });

    expect(mockResolver.mock.calls.length).toBe(1);
    expect(mockResolver.mock.calls[0][1]).toBe(EXPECTED_DEFINITION);
  });
});
