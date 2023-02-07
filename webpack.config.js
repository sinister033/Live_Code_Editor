module.exports = {
  // ... other webpack config options
  resolve: {
    fallback: {
      fs: false,
      tls: false,
      net: false,
      path: false,
      zlib: false,
      http: false,
      https: false,
      stream: false,
      crypto:  require.resolve("crypto-browserify"),
     //if you want to use this module also don't forget npm i crypto-browserify
    },
  },
  
};
