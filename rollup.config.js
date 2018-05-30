import babel from 'rollup-plugin-babel';

export default {
  input: 'src/index.js',
  output: [{
    file: 'dist/react-construct.cjs.js',
    format: 'cjs'
  }, {
    file: 'dist/react-construct.es6.js',
    format: 'es'
  }],
  plugins: [babel()],
};