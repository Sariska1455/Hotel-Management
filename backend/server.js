const app = require('./src/app');

// We default to port 5000 if not specified in the environment variables
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
