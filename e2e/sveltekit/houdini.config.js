/// <references types="houdini-svelte">
/// <references types="houdini-plugin-svelte-global-stores">

/** @type {import('houdini').ConfigFile} */
const config = {
  schemaPath: '../_api/*.graphql',
  defaultCachePolicy: 'CacheOrNetwork',
  defaultPartial: true,
  scalars: {
    DateTime: {
      type: 'Date',
      // turn the api's response into that type
      unmarshal(val) {
        return new Date(val);
      },
      // turn the value into something the API can use
      marshal(val) {
        return val.getTime();
      }
    },
    File: {
      type: 'File'
    }
  },
  plugins: {
    'houdini-plugin-svelte-global-stores': {},
    'houdini-svelte': {}
  }
};

export default config;
