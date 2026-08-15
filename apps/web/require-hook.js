const Module = require('module');
const path = require('path');

const originalResolveFilename = Module._resolveFilename;

let reactPath, reactDomPath;
try {
  reactPath = require.resolve('react', { paths: [__dirname] });
  reactDomPath = require.resolve('react-dom', { paths: [__dirname] });
} catch (e) {
  // If resolution fails during init, just let it be handled later
}

const reactDir = path.resolve(__dirname, 'node_modules/react');
const reactDomDir = path.resolve(__dirname, 'node_modules/react-dom');

Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === 'react' && reactPath) return reactPath;
  
  if (request.startsWith('react/')) {
    try {
      return require.resolve(path.join(reactDir, request.slice(6)));
    } catch (e) {}
  }

  if (request === 'react-dom' && reactDomPath) return reactDomPath;
  
  if (request.startsWith('react-dom/')) {
    try {
      return require.resolve(path.join(reactDomDir, request.slice(10)));
    } catch (e) {}
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};
