// app.json is the config; this only adds the Firebase file, which push
// notifications on Android need. It is kept out of the public repo: on a PC it
// sits in the project root (git-ignored), in GitHub Actions the workflow writes
// it from the GOOGLE_SERVICES_JSON secret and passes its path here.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    googleServicesFile: process.env.GOOGLE_SERVICES_FILE ?? "./google-services.json",
  },
});
