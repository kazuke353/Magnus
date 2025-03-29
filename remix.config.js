/** @type {import('@remix-run/dev').AppConfig} */
module.exports = {
  ignoredRouteFiles: ["**/.*"],
  serverDependenciesToBundle: [
    "remix-utils", // If you are using remix-utils, include it
    "@remix-run/css-bundle" // Ensure css-bundle is listed
  ],
  dev: {
	port: 8002,
  },
};
