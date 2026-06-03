// @ts-check
'use strict';

/** @type {() => Promise<void>} */
module.exports = async function globalTeardown() {
  await global.__PG_CONTAINER__?.stop();
};
