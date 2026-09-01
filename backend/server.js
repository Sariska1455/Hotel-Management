const app = require('./src/app');
const initAdmin = require('./src/config/initAdmin');

// We default to port 5000 if not specified in the environment variables
const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  // Bootstrap or sync the single Owner Admin configured in .env
  await initAdmin();
});

