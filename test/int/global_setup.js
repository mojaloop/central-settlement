var supertest = require('supertest')

module.exports = async () => {
  const server = await require('../../src/api/index.js')
  console.log('app');
  global.server =  server ;
}

// import * as jest from 'jest';
//
// // globalSetup
// async function init() {
//     console.log('Initialization');
//
//     // Do all your initialization stuff
//     // I use a setTimeout to simulate true async
//     return new Promise<void>((resolve, reject) => {
//         setTimeout(() => {
//             console.log('Init finished');
//             resolve();
//         }, 1000)
//     });
// }
//
// // globalTeardown
// async function afterTests() {
//     console.log('End of tests - Execute something');
// }
//
// init()
//     .then(jest.run)
//     .then(afterTests)
//     .catch((e) => console.error(e));
