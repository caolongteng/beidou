'use strict';

const path = require('path');
const basicPolyfill = require('./lib/polyfill').basicPolyfill;
const isomorphic = require('./lib/isomorphic');

/**
 * inject env variables into global
 * used to separate server side code from client side
 * @param {*} ENV dev/production
 */
function setGlobal(ENV) {
  global.__ENV__ = ENV;
  global.__CLIENT__ = false;
  global.__SERVER__ = true;
  global.__DEVELOPMENT__ = ENV !== 'production';
  global.__DEV__ = ENV === 'local';
}

module.exports = (app) => {
  const config = app.config.isomorphic;
  // set global variables
  setGlobal(app.config.env || /* istanbul ignore next */ app.loader.serverEnv);

  // jsdom polyfill, enabled by default
  config.polyfill && basicPolyfill();

  // babel-register
  const { babel } = config;

  if (babel) {
    const finalConfig = {
      ...babel,
      ignore(filename) {
        // NOT ignore client code
        const { alias } = config;
        for (const key of Object.keys(alias)) {
          if (filename.includes(alias[key])) {
            return false;
          }
        }
        const { root } = app.config.view;
        const viewRoots = Array.isArray(root) ? root : [root];
        for (const dir of viewRoots) {
          if (filename.includes(dir)) {
            return false;
          }
        }

        // NOT ignore '/test/' code
        if (/\/test\//.test(filename)) {
          return false;
        }

        // Always ignore application files
        const appDirs = ['app', 'config', 'agent.js', 'index.js'].map(name =>
          path.resolve(app.config.baseDir, name)
        );
        for (const dir of appDirs) {
          if (filename.includes(dir)) {
            return true;
          }
        }

        // Ignore 'packages/beidou-' code for development purpose
        if (/node_modules|\/packages\/beidou-/.test(filename)) {
          return true;
        }

        // User defines ignore rules
        const oriIgnore = babel.ignore;
        if (oriIgnore instanceof RegExp) {
          return oriIgnore.test(filename);
        } else if (typeof oriIgnore === 'function') {
          return oriIgnore(filename);
        }
        return false;
      },
    };

    require('babel-register')(finalConfig);
  }

  // isomorphic register
  isomorphic(app);
};
